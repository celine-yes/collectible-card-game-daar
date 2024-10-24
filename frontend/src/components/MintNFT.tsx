import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { TCG_CONTRACT_ADDRESS } from '../config';
import TCGJSON from '@/abis/TCG.json';
import { useWallet } from '../hooks/useWallet';
import '../css/MintNFT.css';

interface Card {
  id: string;
  name: string;
  number: string;
}

interface MintCardModalProps {
  cards: Card[];
  collectionId: string;
  closeModal: () => void;
}

const MintCardModal: React.FC<MintCardModalProps> = ({ cards, collectionId, closeModal }) => {
  const [mintAddress, setMintAddress] = useState('');
  const [useExistingUser, setUseExistingUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [users, setUsers] = useState<string[]>([]);
  const { isOwner, walletConnected, checkOwnership } = useWallet();

  useEffect(() => {
    fetchMintedUsers();
  }, []);

  const fetchMintedUsers = async () => {
    try {
      // Appeler le contrat pour obtenir la liste des utilisateurs mintés
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const contract = new ethers.Contract(TCG_CONTRACT_ADDRESS, TCGJSON, provider);
      const mintedUsers = await contract.getAllMintedUsers();
      setUsers(mintedUsers);
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs mintés:', error);
    }
  };

  const mintCards = async () => {
    if (!isOwner) {
      alert('Seul le propriétaire du contrat peut mint des NFTs.');
      return;
    }
  
    try {
      const userAddress = useExistingUser ? selectedUser : mintAddress;
  
      if (!ethers.utils.isAddress(userAddress)) {
        alert('Veuillez entrer une adresse Ethereum valide.');
        return;
      }
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const contract = new ethers.Contract(TCG_CONTRACT_ADDRESS, TCGJSON, signer);
      const toAddresses = cards.map(() => userAddress);
      const collectionIds = cards.map(() => parseInt(collectionId));
      const cardNumbers = cards.map(card => parseInt(card.number));
  
      // Estimer la limite de gaz
      const gasEstimate = await contract.estimateGas.batchMintCards(toAddresses, collectionIds, cardNumbers);
      // Ajouter une marge de sécurité (par exemple, 20% de plus)
      const gasLimit = gasEstimate.mul(ethers.BigNumber.from(120)).div(ethers.BigNumber.from(100));
      
      // Envoyer la transaction avec la limite de gaz spécifiée
      const tx = await contract.batchMintCards(toAddresses, collectionIds, cardNumbers, { gasLimit });
      await tx.wait();
  
      alert('NFTs mintés avec succès.');
      closeModal();
    } catch (error: any) {
      console.error('Erreur lors du mint des cartes:', error);
  
      if (error.code === 'CALL_EXCEPTION') {
        alert('Transaction échouée : vous n\'êtes pas autorisé à exécuter cette action.');
      } else if (error.code === -32603) {
        // Affichez les détails de l'erreur
        if (error.data && error.data.message) {
          console.error('Erreur détaillée:', error.data.message);
          alert(`Erreur lors de l'exécution du contrat : ${error.data.message}`);
        } else {
          alert('Une erreur interne s\'est produite.');
        }
      } else {
        alert('Une erreur est survenue lors du mint des cartes.');
      }
    }
  };
  

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Mint Cards</h2>
        {!walletConnected && (
          <button onClick={checkOwnership}>Connect Wallet</button>
        )}
        {walletConnected && (
          <>
            <div>
              <label>
                <input
                  type="radio"
                  checked={useExistingUser}
                  onChange={() => setUseExistingUser(true)}
                />
                Utiliser un utilisateur existant
              </label>
              {useExistingUser && (
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                >
                  <option value="">Sélectionner un utilisateur</option>
                  {users.map((user) => (
                    <option key={user} value={user}>
                      {user}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label>
                <input
                  type="radio"
                  checked={!useExistingUser}
                  onChange={() => setUseExistingUser(false)}
                />
                Saisir une nouvelle adresse
              </label>
              {!useExistingUser && (
                <input
                  type="text"
                  value={mintAddress}
                  onChange={(e) => setMintAddress(e.target.value)}
                  placeholder="Nouvelle adresse de l'utilisateur"
                />
              )}
            </div>

            <div>
              <h3>Cartes à minter :</h3>
              <ul>
                {cards.map(card => (
                  <li key={card.id}>{card.name}</li>
                ))}
              </ul>
            </div>

            <button onClick={mintCards} disabled={cards.length === 0}>Mint Selected Cards</button>
            <button onClick={closeModal}>Fermer</button>
          </>
        )}
      </div>
    </div>
  );
};

export default MintCardModal;