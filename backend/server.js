require('dotenv').config(); // Ajout pour charger les variables d'environnement
const express = require('express');
const { ethers } = require('ethers');
const app = express();
const cors = require('cors');
const { contractAddress, contractAbi } = require('./config');
const axios = require('axios');

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

if (!process.env.RPC_URL || !process.env.PRIVATE_KEY || !process.env.POKEMON_TCG_API_KEY) {
  console.error('Les variables d\'environnement RPC_URL, PRIVATE_KEY et POKEMON_TCG_API_KEY doivent être définies');
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(contractAddress, contractAbi, signer);


// Route pour récupérer toutes les collections disponibles
app.get('/collections', async (req, res) => {
  try {
    const [ids, names, cardCounts] = await contract.getAllCollections();
    console.log('Données reçues du contrat:', { ids, names, cardCounts });

    const collections = await Promise.all(ids.map(async (id, index) => {
      let imageUrl = '';
      try {
        console.log(`Tentative de récupération de l'image pour ${names[index]}`);
        const response = await axios.get(`https://api.pokemontcg.io/v2/sets`, {
          headers: {
            'X-Api-Key': process.env.POKEMON_TCG_API_KEY
          },
          params: {
            q: `name:"${names[index]}"`
          }
        });
        console.log(`Réponse de l'API pour ${names[index]}:`, response.data);
        if (response.data.data && response.data.data.length > 0) {
          imageUrl = response.data.data[0].images.logo;
        } else {
          console.log(`Aucun set trouvé pour ${names[index]}`);
        }
      } catch (error) {
        console.error(`Erreur lors de la récupération de l'image pour la collection ${names[index]}:`, error.message);
      }
      return {
        id: id.toString(),
        name: names[index],
        cardCount: cardCounts[index].toString(),
        imageUrl: imageUrl
      };
    }));
    console.log('Collections envoyées au frontend:', collections);
    res.json(collections);
  } catch (error) {
    console.error('Erreur lors de la récupération des collections:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des collections' });
  }
});

app.get('/collection-cards/:collectionId', async (req, res) => {
  try {
    const { collectionId } = req.params;
    const [collectionName, cardCount] = await contract.collections(collectionId);
    
    // Récupérer les informations du set depuis l'API Pokémon TCG
    const setResponse = await axios.get(`https://api.pokemontcg.io/v2/sets`, {
      headers: {
        'X-Api-Key': process.env.POKEMON_TCG_API_KEY
      },
      params: {
        q: `name:"${collectionName}"`
      }
    });

    if (setResponse.data.data.length === 0) {
      return res.status(404).json({ error: 'Set not found' });
    }

    const setId = setResponse.data.data[0].id;

    // Récupérer les cartes du set
    const cardsResponse = await axios.get(`https://api.pokemontcg.io/v2/cards`, {
      headers: {
        'X-Api-Key': process.env.POKEMON_TCG_API_KEY
      },
      params: {
        q: `set.id:${setId}`,
        pageSize: cardCount
      }
    });

    const cards = cardsResponse.data.data.map(card => ({
      id: card.id,
      name: card.name,
      number: card.number,
      imageUrl: card.images.small
    }));

    res.json(cards);
  } catch (error) {
    console.error('Erreur lors de la récupération des cartes de la collection:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des cartes' });
  }
});

// Route pour récupérer les NFTs d'un utilisateur
app.get('/user-nfts/:userAddress', async (req, res) => {
  try {
    const { userAddress } = req.params;
    const tokenIds = await contract.getNFTsOfUser(userAddress);
    const nfts = await Promise.all(tokenIds.map(async (tokenId) => {
      const [collectionName, cardNumber] = await contract.getCard(tokenId);
      
      // Récupérer les détails de la carte depuis l'API Pokémon TCG
      let cardDetails = {};
      try {
        const response = await axios.get(`https://api.pokemontcg.io/v2/cards`, {
          headers: { 'X-Api-Key': process.env.POKEMON_TCG_API_KEY },
          params: { q: `set.name:"${collectionName}" number:${cardNumber}` }
        });
        if (response.data.data && response.data.data.length > 0) {
          const card = response.data.data[0];
          cardDetails = {
            name: card.name,
            imageUrl: card.images.small,
            cardId: card.id
          };
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des détails de la carte:', error);
      }

      return {
        tokenId: tokenId.toString(),
        collectionName,
        cardNumber: cardNumber.toString(),
        ...cardDetails
      };
    }));
    res.json(nfts);
  } catch (error) {
    console.error('Erreur lors de la récupération des NFTs de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des NFTs' });
  }
});

app.post('/mint-nft', async (req, res) => {
  console.log('Requête reçue pour mint un NFT');
  const { userAddress, collectionId, cardNumber } = req.body;
  console.log('userAddress :', userAddress);

  if (!userAddress || collectionId === undefined || cardNumber === undefined) {
    console.log('Paramètres manquants:', req.body);
    return res.status(400).json({ error: 'Paramètres manquants' });
  }

  try {
    // Afficher l'adresse du propriétaire du contrat
    const ownerAddress = await contract.owner();
    console.log('Adresse du propriétaire du contrat :', ownerAddress);

    // Afficher l'adresse du signataire (celui qui exécute la transaction)
    const signerAddress = await signer.getAddress();
    console.log('Adresse du signataire :', signerAddress);

    if (signerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
      return res.status(403).json({ error: "Seul l'admin peut effectuer le mint." });
    }

    //const tokenURI = `http://localhost:3000/metadata/${cardNumber}`;  

    console.log('Appel du contrat pour mint une carte...');
    const tx = await contract.mintCard(userAddress, collectionId, cardNumber);
    await tx.wait();
    console.log('Transaction confirmée !');

    const nfts = await contract.getNFTsOfUser(userAddress);
    console.log('NFTs de l\'utilisateur après mint:', nfts);
    console.log(`NFT minté avec succès à l'utilisateur ${userAddress}`);

    res.json({ 
      success: true, 
      message: `NFT minté avec succès à l'utilisateur ${userAddress}`,
      ownerAddress: ownerAddress,
      signerAddress: signerAddress
    });
  } catch (error) {
    console.error('Erreur lors du mint du NFT:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur lors du mint du NFT' });
  }
});

app.get('/minted-users', async (req, res) => {
  try {
    const mintedUsers = await contract.getAllMintedUsers(); 
    res.json(mintedUsers);
  } catch (error) {
    console.error('Erreur lors de la récupération des utilisateurs:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des utilisateurs.' });
  }
});

app.post('/mint-nfts', async (req, res) => {
  console.log('Requête reçue pour mint plusieurs NFTs');
  const { userAddress, collectionId, cardNumbers } = req.body;
  console.log('userAddress :', userAddress);

  if (!userAddress || collectionId === undefined || !cardNumbers || !Array.isArray(cardNumbers)) {
    console.log('Paramètres manquants ou invalides:', req.body);
    return res.status(400).json({ error: 'Paramètres manquants ou invalides' });
  }

  try {
    console.log('Appel du contrat pour mint plusieurs cartes...');
    const tx = await contract.batchMintCards(
      Array(cardNumbers.length).fill(userAddress),
      Array(cardNumbers.length).fill(collectionId),
      cardNumbers
    );
    await tx.wait();
    console.log('Transaction confirmée !');

    const nfts = await contract.getNFTsOfUser(userAddress);
    console.log('NFTs de l\'utilisateur après mint:', nfts);
    console.log(`${cardNumbers.length} NFTs mintés avec succès à l'utilisateur ${userAddress}`);

    res.json({ 
      success: true, 
      message: `${cardNumbers.length} NFTs mintés avec succès à l'utilisateur ${userAddress}`
    });
  } catch (error) {
    console.error('Erreur lors du mint des NFTs:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur lors du mint des NFTs' });
  }
});

async function addPokemonSet(setId) {
  try {
    const response = await axios.get(`https://api.pokemontcg.io/v2/sets/${setId}`, {
      headers: {
        'X-Api-Key': process.env.POKEMON_TCG_API_KEY
      }
    });
    const set = response.data.data;
    await contract.createCollection(set.name, set.total);
    console.log(`Set Pokémon ajouté : ${set.name}`);
  } catch (error) {
    console.error('Erreur lors de l\'ajout du set Pokémon:', error);
  }
}

async function initializePokemonSets() {
  const defaultSets = [
    'sv7', 'sv6pt5', 'swsh6',
    'sm12', 'sm11', 'sm10', 
    'xy12', 'xy11', 'xy10', 
    'bw11', 'bw10', 'bw9',
  ]; 
  for (const setId of defaultSets) {
    await addPokemonSet(setId);
  }
}

// initialiser les sets Pokémon
app.post('/initialize-pokemon-sets', async (req, res) => {
  try {
    await initializePokemonSets();
    res.json({ success: true, message: 'Sets Pokémon initialisés avec succès' });
  } catch (error) {
    console.error('Erreur lors de l\'initialisation des sets Pokémon:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de l\'initialisation des sets Pokémon' });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Erreur serveur');
});

app.listen(port, () => {
  console.log(`Serveur en cours d'exécution sur le port ${port}`);
});
