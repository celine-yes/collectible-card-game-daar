import React, { useState, useEffect } from 'react';
import axios from 'axios';

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

  const mintCards = async () => {
    try {
      const userAddress = useExistingUser ? selectedUser : mintAddress;
      await axios.post('http://localhost:3000/mint-nfts', {
        userAddress,
        collectionId,
        cardNumbers: cards.map(card => card.number)
      });
      closeModal();
    } catch (error) {
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
      </div>
    </div>
  );
};

export default MintCardModal;
