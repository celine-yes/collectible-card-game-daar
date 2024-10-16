const express = require('express');
const { ethers } = require('ethers');
const app = express();
const cors = require('cors');

const port = 3000;

app.use(cors());
app.use(express.json());

// Configuration d'Ethers.js
const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
const signer = provider.getSigner();
const contractAddress = '0xYourContractAddress'; // Adresse de ton contrat principal
const contractAbi = [ /* ABI de ton contrat */ ];
const contract = new ethers.Contract(contractAddress, contractAbi, provider);

// Route pour récupérer toutes les collections disponibles pour mint
app.get('/collections', async (req, res) => {
  try {
    const collections = await contract.getCollections(); // Appelle la fonction dans ton contrat pour récupérer les collections
    res.json(collections);
  } catch (error) {
    console.error('Erreur lors de la récupération des collections:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des collections' });
  }
});

// Route pour récupérer les utilisateurs mintés et leurs NFTs
app.get('/minted-users', async (req, res) => {
  try {
    // Appelle la fonction dans ton contrat pour récupérer les utilisateurs mintés
    const mintedUsers = await contract.getMintedUsers(); // Assure-toi que cette méthode existe dans le contrat

    const usersWithNFTs = await Promise.all(
      mintedUsers.map(async (user) => {
        const nfts = await contract.getUserNFTs(user); // Récupère les NFTs pour chaque utilisateur
        return {
          address: user,
          nfts: nfts.map((nft) => ({
            cardId: nft.cardId,
            name: nft.name, // Tu devras peut-être ajuster selon les propriétés de ton NFT
            imageUrl: nft.imageUrl, // Par exemple, l'image ou d'autres métadonnées
          })),
        };
      })
    );

    res.json(usersWithNFTs);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs et leurs NFTs:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs et leurs NFTs' });
  }
});

// Route pour mint un NFT à un utilisateur
app.post('/mint-nft', async (req, res) => {
  const { userAddress, cardId } = req.body;

  try {
    const tx = await contract.mintNFT(userAddress, cardId); // Assure-toi que cette méthode existe dans ton contrat
    await tx.wait(); // Attend que la transaction soit minée
    res.json({ success: true, message: `NFT minté avec succès à l'utilisateur ${userAddress}` });
  } catch (error) {
    console.error('Erreur lors du mint du NFT:', error);
    res.status(500).json({ success: false, error: 'Erreur lors du mint du NFT' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});