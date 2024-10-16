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
      return {
        tokenId: tokenId.toString(),
        collectionName,
        cardNumber: cardNumber.toString()
      };
    }));
    res.json(nfts);
  } catch (error) {
    console.error('Erreur lors de la récupération des NFTs de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur lors de la récupération des NFTs' });
  }
});

// Route pour mint un NFT à un utilisateur
app.post('/mint-nft', async (req, res) => {
  const { userAddress, collectionId, cardNumber } = req.body;
  if (!userAddress || collectionId === undefined || cardNumber === undefined) {
    return res.status(400).json({ error: 'Paramètres manquants' });
  }
  try {
    const tx = await contract.mintCard(userAddress, collectionId, cardNumber);
    await tx.wait();
    res.json({ success: true, message: `NFT minté avec succès à l'utilisateur ${userAddress}` });
  } catch (error) {
    console.error('Erreur lors du mint du NFT:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur lors du mint du NFT' });
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
  const defaultSets = ['sv7', 'sv6pt5', 'swsh6']; // Exemple de sets à ajouter
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
