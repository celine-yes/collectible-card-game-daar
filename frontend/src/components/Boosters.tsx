import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import { TCG_CONTRACT_ADDRESS, BOOSTER_CONTRACT_ADDRESS } from '../config';
import TCGJSON from '@/abis/TCG.json';
import BoosterJSON from '@/abis/Booster.json';

interface Booster {
  collectionId: string;
  collectionName: string;
  cards: string[];
  imageUrl?: string;
  boosterId?: string;
  isClaimed: boolean;
  isOpened: boolean;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

const Boosters: React.FC = () => {
  const [boosters, setBoosters] = useState<Booster[]>([]);
  const [loading, setLoading] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [boostersInitialized, setBoostersInitialized] = useState(false);
  const [boosterContract, setBoosterContract] = useState<ethers.Contract | null>(null);
  const [tcgContract, setTcgContract] = useState<ethers.Contract | null>(null);

  useEffect(() => {
    const initializeEthers = async () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        try {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          setProvider(provider);
          
          const signer = provider.getSigner();
          setSigner(signer);
          
          const address = await signer.getAddress();
          setUserAddress(address);

          } catch (error) {
          console.error('Erreur lors de l\'initialisation d\'Ethers:', error);
        }
      } else {
        console.log('Ethereum object not found, do you have MetaMask installed?');
      }
    };
    initializeEthers();
  }, []);

  useEffect(() => {
    const initializeContracts = async () => {
      if (provider && signer) {
        try {
          const boosterInstance = new ethers.Contract(BOOSTER_CONTRACT_ADDRESS, BoosterJSON, signer);
          setBoosterContract(boosterInstance);

          const tcgInstance = new ethers.Contract(TCG_CONTRACT_ADDRESS, TCGJSON, signer);
          setTcgContract(tcgInstance);

          console.log('Contrats initialisés avec succès');
        } catch (error) {
          console.error('Erreur lors de l\'initialisation des contrats:', error);
        }
      }
    };

    initializeContracts();
  }, [provider, signer]);

  const initializeBoosters = async () => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:3000/generate-boosters-for-all-collections');
      if (response.data.success) {
        setBoosters(response.data.boosters.map((booster: Booster) => ({ ...booster, isClaimed: false, isOpened: false })));
        setBoostersInitialized(true); //marque les boosters comme initialisés
      }
    } catch (error) {
      console.error('Error initializing boosters:', error);
    }
    setLoading(false);
  };

  const claimBooster = async (collectionId: string) => {
    if (!userAddress || !boosterContract) {
      console.error('User address or contracts not available');
      return;
    }
    setLoading(true);
    try {
      const tx = await boosterContract.createBooster();
      const receipt = await tx.wait();
      console.log('Transaction receipt:', receipt);

      const boosterCreatedEvent = receipt.events?.find((event: any) => event.event === 'BoosterCreated');

      if (!boosterCreatedEvent) {
        console.error('BoosterCreated event not found in transaction receipt');
        setLoading(false);
        return;
      }

      console.log('BoosterCreated event args:', boosterCreatedEvent.args);

      //accède aux arguments par indice
      const boosterId = boosterCreatedEvent.args[0].toString();
      const owner = boosterCreatedEvent.args[1];

      console.log('Booster créé avec ID:', boosterId);
      console.log('Propriétaire du booster:', owner);

      //appel le backend pour définir le contenu du booster
      const response = await axios.post('http://localhost:3000/set-booster-content', {
        boosterId,
        collectionId,
        userAddress,
      });

      if (!response.data.success) {
        console.error('Erreur lors de la définition du contenu du booster:', response.data.error);
        setLoading(false);
        return;
      }

      //met à jour l'état local
      setBoosters(prevBoosters => prevBoosters.map(b => 
        b.collectionId.toString() === collectionId.toString() ? { ...b, isClaimed: true, boosterId } : b
      ));

    } catch (error) {
      console.error('Error claiming booster:', error);
    }
    setLoading(false);
  };

  const openBooster = async (boosterId: string) => {
    if (!boosterContract || !signer || !userAddress) {
      console.error('Contrat, signer ou adresse utilisateur non disponible');
      return;
    }
    setLoading(true);
    try {
      console.log('Tentative d\'ouverture du booster:', boosterId);
      const gasEstimate = await boosterContract.estimateGas.openBooster(boosterId);
      
      const tx = await boosterContract.openBooster(boosterId, {gasLimit: gasEstimate.mul(2)});
      console.log('Transaction envoyée:', tx.hash);
      
      const receipt = await tx.wait();
      console.log('Transaction confirmée:', receipt);

      setBoosters(prevBoosters => prevBoosters.map(booster => 
        booster.boosterId === boosterId ? { ...booster, isOpened: true } : booster
      ));
      console.log('État des boosters mis à jour');
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du booster:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    console.log('Boosters mis à jour:', boosters);
  }, [boosters]);

  return (
    <div>
      <h1>Boosters</h1>
      {userAddress && !boostersInitialized ? (
        <button onClick={initializeBoosters} disabled={loading}>
          {loading ? 'Initialisation...' : 'Initialiser les boosters'}
        </button>
      ) : !userAddress ? (
        <p>Veuillez connecter votre portefeuille pour initialiser les boosters.</p>
      ) : null}
      <div style={{ display: 'flex', flexWrap: 'wrap' }}>
        {boosters.map((booster) => {
          console.log('Booster rendu:', booster);
          return (
            <div key={booster.collectionId} style={{ margin: '10px', textAlign: 'center' }}>
              <img src={booster.imageUrl || 'placeholder.jpg'} alt={booster.collectionName} style={{ width: '200px', height: '300px', objectFit: 'cover' }} />
              <p>{booster.collectionName}</p>
              {!booster.isClaimed ? (
                <button onClick={() => claimBooster(booster.collectionId)} disabled={loading}>
                  Réclamer le Booster
                </button>
              ) : !booster.isOpened && booster.boosterId ? (
                <button onClick={() => openBooster(booster.boosterId!)} disabled={loading}>
                  Ouvrir le Booster
                </button>
              ) : (
                <p>Booster ouvert</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Boosters;