import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { TCG_CONTRACT_ADDRESS, BOOSTER_CONTRACT_ADDRESS } from '../config';
import TCGJSON from '@/abis/TCG.json';
import BoosterJSON from '@/abis/Booster.json';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useWallet() {
  const [isOwner, setIsOwner] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);

  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [tcgContract, setTcgContract] = useState<ethers.Contract | null>(null);
  const [boosterContract, setBoosterContract] = useState<ethers.Contract | null>(null);

  useEffect(() => {
    checkOwnership();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  const handleAccountsChanged = async (accounts: string[]) => {
    if (accounts.length === 0) {
      setWalletConnected(false);
      setIsOwner(false);
      setUserAddress(null);
      setSigner(null);
      setProvider(null);
      setTcgContract(null);
      setBoosterContract(null);
    } else {
      await checkOwnership();
    }
  };

  const checkOwnership = async () => {
    if (window.ethereum) {
      try {
        const provider_ = new ethers.providers.Web3Provider(window.ethereum);
        await provider_.send('eth_requestAccounts', []);
        const signer_ = provider_.getSigner();
        const userAddress_ = await signer_.getAddress();
        const tcgContract_ = new ethers.Contract(TCG_CONTRACT_ADDRESS, TCGJSON, signer_);
        const ownerAddress = await tcgContract_.owner();

        const boosterContract_ = new ethers.Contract(BOOSTER_CONTRACT_ADDRESS, BoosterJSON, signer_);

        setProvider(provider_);
        setSigner(signer_);
        setUserAddress(userAddress_);
        setTcgContract(tcgContract_);
        setBoosterContract(boosterContract_);

        setIsOwner(userAddress_.toLowerCase() === ownerAddress.toLowerCase());
        setWalletConnected(true);
      } catch (error) {
        console.error('Erreur lors de la vérification de la propriété :', error);
      }
    } else {
      console.log('Veuillez installer Metamask');
    }
  };

  return {
    isOwner,
    walletConnected,
    checkOwnership,
    provider,
    signer,
    userAddress,
    tcgContract,
    boosterContract,
  };
}
