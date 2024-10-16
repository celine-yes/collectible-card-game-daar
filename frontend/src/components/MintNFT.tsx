import React, { useState } from 'react';
import axios from 'axios';
import '../css/MintNFT.css'

const MintNFT = () => {
  const [userAddress, setUserAddress] = useState('');
  const [cardId, setCardId] = useState('');
  const [message, setMessage] = useState('');

  const handleMintNFT = async () => {
    try {
      const response = await axios.post('http://localhost:4000/mint-nft', {
        userAddress,
        cardId,
      });
      if (response.data.success) {
        setMessage(`NFT minté avec succès à ${userAddress}`);
      } else {
        setMessage('Erreur lors du mint du NFT.');
      }
    } catch (error) {
      console.error('Erreur lors du mint du NFT:', error);
      setMessage('Une erreur est survenue.');
    }
  };

  return (
    <div>
      <h1>Mint un NFT à un utilisateur</h1>
      <form onSubmit={(e) => { e.preventDefault(); handleMintNFT(); }}>
        <div>
          <label>Adresse de l'utilisateur</label>
          <input
            type="text"
            value={userAddress}
            onChange={(e) => setUserAddress(e.target.value)}
            placeholder="0x123..."
          />
        </div>
        <div>
          <label>ID de la carte</label>
          <input
            type="text"
            value={cardId}
            onChange={(e) => setCardId(e.target.value)}
            placeholder="Ex : 1"
          />
        </div>
        <button type="submit">Mint NFT</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default MintNFT;
