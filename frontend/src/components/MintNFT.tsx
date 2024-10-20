import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Web3 from 'web3';
import { ethers } from 'ethers';

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
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  useEffect(() => {
    fetchMintedUsers();
    // const listenForEvent = async () => {
    //   const provider = new ethers.providers.Web3Provider(window.ethereum);
    //   const contract = new ethers.Contract(contractAddress, contractABI, provider);
    //   contract.on('CardMinted', (to, tokenId, collectionId, cardNumber, event) => {
    //     console.log(`NFT Minted! Token ID: ${tokenId}, Collection ID: ${collectionId}, Card Number: ${cardNumber}`);
        
    //     if (to.toLowerCase() === window.ethereum.selectedAddress.toLowerCase()) {
    //       // Notify the user only if the NFT is minted to their address
    //       setNotification(`You have received a new NFT: Token ID ${tokenId} from Collection ${collectionId}!`);
    //     }
    //   });
    // }
    // listenForEvent()
  }, []);

  const fetchMintedUsers = async () => {
    try {
      const response = await axios.get<string[]>('http://localhost:3000/minted-users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching minted users:', error);
    }
  };

  const mintCards = async () => {
    try {
      const userAddress = useExistingUser ? selectedUser : mintAddress;
      await axios.post('http://localhost:3000/mint-nfts', {
        userAddress,
        collectionId,
        cardNumbers: cards.map(card => card.number)
      });

      setNotification({ type: 'success', message: `Minting succeeded! ${cards.length} cards minted to address: ${userAddress}` });
      console.log(notification);
      setTimeout(() => {
        closeModal(); // Close the modal after a delay
      }, 5000); // 3-second delay
    } catch (error) {
      setNotification({ type: 'error', message: 'Minting failed. Please try again.' });
      console.error('Error minting cards:', error);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Mint Cards</h2>
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
        {notification && (
          <div className={`notification ${notification.type}`}>
            {notification.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default MintCardModal;
