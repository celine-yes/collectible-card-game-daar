import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
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
  const { isOwner, walletConnected, checkOwnership, tcgContract, userAddress } = useWallet();

  useEffect(() => {
    fetchMintedUsers();
  }, [tcgContract]);

  const fetchMintedUsers = async () => {
    try {
      if (!tcgContract) {
        console.error('Contrat TCG non disponible');
        return;
      }
      const mintedUsers = await tcgContract.getAllMintedUsers();
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

    if (!tcgContract) {
      console.error('Contrat TCG non disponible');
      return;
    }

    try {
      const userAddressToMint = useExistingUser ? selectedUser : mintAddress;

      if (!ethers.utils.isAddress(userAddressToMint)) {
        alert('Veuillez entrer une adresse Ethereum valide.');
        return;
      }

      const toAddresses = cards.map(() => userAddressToMint);
      const collectionIds = cards.map(() => parseInt(collectionId));
      const cardNumbers = cards.map(card => parseInt(card.number));

      const gasEstimate = await tcgContract.estimateGas.batchMintCards(toAddresses, collectionIds, cardNumbers);
      const gasLimit = gasEstimate.mul(ethers.BigNumber.from(0.2)).div(ethers.BigNumber.from(100));

      const tx = await tcgContract.batchMintCards(toAddresses, collectionIds, cardNumbers, { gasLimit });
      await tx.wait();

      alert('NFTs mintés avec succès.');
      closeModal();
    } catch (error: any) {
      console.error('Erreur lors du mint des cartes:', error);

      if (error.code === 'CALL_EXCEPTION') {
        alert('Transaction échouée : vous n\'êtes pas autorisé à exécuter cette action.');
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
