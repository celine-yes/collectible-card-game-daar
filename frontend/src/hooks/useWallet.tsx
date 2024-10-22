import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { TCG_CONTRACT_ADDRESS } from '../config';
import TCGJSON from '@/abis/TCG.json';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useWallet() {
  const [isOwner, setIsOwner] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);

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
    } else {
      await checkOwnership();
    }
  };

  const checkOwnership = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send('eth_requestAccounts', []);
        const signer = provider.getSigner();
        const userAddress = await signer.getAddress();
        const contract = new ethers.Contract(TCG_CONTRACT_ADDRESS, TCGJSON, provider);
        const ownerAddress = await contract.owner();
        setIsOwner(userAddress.toLowerCase() === ownerAddress.toLowerCase());
        setWalletConnected(true);
      } catch (error) {
        console.error('Erreur lors de la vérification de la propriété :', error);
      }
    } else {
      console.log('Veuillez installer Metamask');
    }
  };

  return { isOwner, walletConnected, checkOwnership };
}
