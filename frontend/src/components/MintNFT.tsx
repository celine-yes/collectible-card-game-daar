import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Card {
  id: string;
  name: string;
  number: string;
}

interface MintCardModalProps {
  card: Card;
  collectionId: string;
  closeModal: () => void;
}

const MintCardModal: React.FC<MintCardModalProps> = ({ card, collectionId, closeModal }) => {
  const [mintAddress, setMintAddress] = useState('');
  const [useExistingUser, setUseExistingUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [users, setUsers] = useState<string[]>([]);

  useEffect(() => {
    fetchMintedUsers();
  }, []);

  const fetchMintedUsers = async () => {
    try {
      const response = await axios.get<string[]>('http://localhost:3000/minted-users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching minted users:', error);
    }
  };

  const mintCard = async () => {
    try {
      const userAddress = useExistingUser ? selectedUser : mintAddress;
      await axios.post('http://localhost:3000/mint-nft', {
        userAddress,
        collectionId,
        cardNumber: card.number
      });
      closeModal();
    } catch (error) {
      console.error('Error minting card:', error);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <h2>Mint {card.name}</h2>
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

        <button onClick={mintCard}>Mint</button>
        <button onClick={closeModal}>Fermer</button>
      </div>
    </div>
  );
};

export default MintCardModal;
