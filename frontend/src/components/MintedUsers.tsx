import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../css/MintedUsers.css'

const MintedUsers = () => {
  const [users, setUsers] = useState<any[]>([]);

  // Récupère les utilisateurs et leurs NFTs depuis le backend
  const fetchMintedUsers = async () => {
    try {
      const response = await axios.get('http://localhost:4000/minted-users');
      setUsers(response.data);
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs mintés', error);
    }
  };

  useEffect(() => {
    fetchMintedUsers();
  }, []);

  return (
    <div>
      <h1>Liste des utilisateurs mintés et leurs cartes</h1>
      <div className="users-container">
        {users.length > 0 ? (
          users.map((user, index) => (
            <div key={index} className="user-card">
              <h2>Adresse : {user.address}</h2>
              <p>Cartes possédées :</p>
              <div className="nft-list">
                {user.nfts.map((nft: any, nftIndex: number) => ( // Utilisation de "any" pour nft
                  <div key={nftIndex} className="nft-card">
                    <h3>{nft.name}</h3>
                    <img src={nft.imageUrl} alt={nft.name} />
                    <p>ID de la carte : {nft.cardId}</p>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p>Aucun utilisateur n'a encore reçu de NFTs.</p>
        )}
      </div>
    </div>
  );
};

export default MintedUsers;
