import { ethers } from 'ethers'
import * as providers from './ethereum/provider'
export * as account from './ethereum/account'

export type Wallet = 'metamask' | 'silent'

export type Details = {
  provider: ethers.providers.Provider
  signer?: ethers.providers.JsonRpcSigner
  account?: string
}

// metamask se connecte au portefeuille Metamask, demande la permission d'accéder aux comptes de l'utilisateur, et récupère le provider et signer nécessaires pour interagir avec Ethereum

const metamask = async (requestAccounts = true): Promise<Details | null> => {
  const ethereum = (window as any).ethereum
  if (ethereum) {
    if (requestAccounts)
      await ethereum.request({ method: 'eth_requestAccounts' })
    const provider = new ethers.providers.Web3Provider(ethereum as any)
    const accounts = await provider.listAccounts()
    const account = accounts.length ? accounts[0] : undefined
    const signer = account ? provider.getSigner() : undefined
    return { provider, signer, account }
  }
  return null
}

// silent se connecte au fournisseur de blockchain en silence, sans demander l'accès aux comptes de l'utilisateur.
const silent = async (): Promise<Details> => {
  const ethereum = (window as any).ethereum
  if (ethereum) {
    const unlocked = await ethereum?._metamask?.isUnlocked?.()
    if (unlocked) return (await metamask(false))!
    const provider = new ethers.providers.Web3Provider(ethereum as any)
    return { provider }
  }
  const provider = providers.fromEnvironment()
  return { provider }
}

export const connect = async (provider: Wallet) => {
  switch (provider) {
    case 'metamask':
      return metamask()
    case 'silent':
      return silent()
    default:
      return null
  }
}

// fonctions permettent d'écouter les changements de compte ou de réseau dans Metamask et de déclencher des actions (blockchain locale)
export const accountsChanged = (callback: (accounts: string[]) => void) => {
  const ethereum = (window as any).ethereum
  if (ethereum && ethereum.on) {
    ethereum.on('accountsChanged', callback)
    return () => ethereum.removeListener('accountsChanged', callback)
  } else {
    return () => {}
  }
}

export const chainChanged = (callback: (accounts: string[]) => void) => {
  const ethereum = (window as any).ethereum
  if (ethereum && ethereum.on) {
    ethereum.on('chainChanged', callback)
    return () => ethereum.removeListener('chainChanged', callback)
  } else {
    return () => {}
  }
}
