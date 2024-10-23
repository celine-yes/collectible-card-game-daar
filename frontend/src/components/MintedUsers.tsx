import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../css/MintedUsers.css'

interface NFT {
  tokenId: string;
  collectionName: string;
  cardNumber: string;
  name?: string;
  imageUrl?: string;
  cardId?: string;
}

interface User {
  address: string;
  nfts: NFT[];
}

const MintedUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [openUser, setOpenUser] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Récupère les utilisateurs et leurs NFTs depuis le backend
  const fetchMintedUsers = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('http://localhost:3000/minted-users');
      const mintedAddresses = response.data;
      
      const usersWithNFTs = await Promise.all(mintedAddresses.map(async (address: string) => {
        const nftsResponse = await axios.get(`http://localhost:3000/user-nfts/${address}`);
        return { address, nfts: nftsResponse.data };
      }));
      
      setUsers(usersWithNFTs);
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs mintés', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMintedUsers();
  }, []);

  const toggleUserCards = (address: string) => {
    if (openUser === address) {
      setOpenUser(null);
    } else {
      setOpenUser(address);
    }
  };

  if (isLoading) {
    return <div className="loading">Chargement des utilisateurs...</div>;
  }

  return (
    <div>
      <h1>Liste des utilisateurs mintés et leurs cartes</h1>
      <div className="users-container">
        {users.length > 0 ? (
          users.map((user, index) => (
            <div key={index} className="user-card">
              <h2 onClick={() => toggleUserCards(user.address)} className="user-address">
                Utilisateur : {user.address}
              </h2>
              {openUser === user.address && (
                <div className="nft-list">
                  {user.nfts.map((nft: NFT, nftIndex: number) => (
                    <div key={nftIndex} className="nft-card">
                      <h3>{nft.name || `Carte #${nft.cardNumber}`}</h3>
                      {nft.imageUrl && <img src={nft.imageUrl} alt={nft.name || `Carte #${nft.cardNumber}`} />}
                      <p>{nft.collectionName}</p>
                    </div>
                  ))}
                </div>
              )}
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
