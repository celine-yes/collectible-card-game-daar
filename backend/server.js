require('dotenv').config(); // Ajout pour charger les variables d'environnement
const express = require('express');
const { ethers } = require('ethers');
const app = express();
const cors = require('cors');
const { contractAddress, contractAbi, boosterContractAddress, boosterContractAbi } = require('./config');
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
const boosterContract = new ethers.Contract(boosterContractAddress, boosterContractAbi, signer);

// Au début de server.js
const defaultSets = [
  'sv7', 'sv6pt5'
  /*, 'swsh6',
  'sm12', 'sm11', 'sm10', 
  'xy12', 'xy11', 'xy10', 
  'bw11', 'bw10', 'bw9',*/
];

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

// Route pour créer un booster
app.post('/create-booster', async (req, res) => {
  const { to } = req.body;
  try {
    const tx = await boosterContract.createBooster(to);
    await tx.wait();
    res.json({ success: true, message: 'Booster créé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la création du booster:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la création du booster' });
  }
});

// // Route pour définir le contenu d'un booster
// app.post('/set-booster-content', async (req, res) => {
//   const { boosterId, cardIds } = req.body;
//   try {
//     const tx = await contract.setBoosterCards(boosterId, cardIds);
//     await tx.wait();
//     res.json({ success: true, message: 'Contenu du booster défini avec succès' });
//   } catch (error) {
//     console.error('Erreur lors de la définition du contenu du booster:', error);
//     res.status(500).json({ success: false, error: 'Erreur serveur lors de la définition du contenu du booster' });
//   }
// });


app.post('/set-booster-content', async (req, res) => {
  const { boosterId, collectionId, userAddress } = req.body;
  try {
    // Trouver le booster pré-généré pour cette collection
    const booster = potentialBoosters.find(b => b.collectionId === collectionId);
    if (!booster) {
      throw new Error('Booster non trouvé pour cette collection');
    }

    // Générer le contenu du booster
    const boosterContent = booster.cards;

    // Définir le contenu du booster en appelant setBoosterCards
    const tx = await contract.setBoosterCards(boosterId, boosterContent);
    await tx.wait();

    res.json({ success: true, message: 'Contenu du booster défini avec succès' });
  } catch (error) {
    console.error('Erreur lors de la définition du contenu du booster:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la définition du contenu du booster' });
  }
});


// Route pour ouvrir un booster
app.post('/open-booster', async (req, res) => {
  const { userAddress, boosterId } = req.body;
  try {
    //vérifier l'utilisateur est le propriétaire du booster
    const owner = await boosterContract.ownerOf(boosterId);
    if (owner.toLowerCase() !== userAddress.toLowerCase()) {
      throw new Error('Vous n\'êtes pas le propriétaire de ce booster');
    }

    console.log('Ouverture du booster:', boosterId, 'pour l\'utilisateur:', userAddress);
    const tx = await boosterContract.connect(signer).openBooster(boosterId);
    console.log('Transaction envoyée:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmée');

    // Récupérer le contenu du booster
    const boosterContent = await contract.getBoosterCards(boosterId);

    res.json({ 
      success: true, 
      message: 'Booster ouvert avec succès', 
      boosterId: boosterId.toString(),
      cards: boosterContent
    });
  } catch (error) {
    console.error('Erreur lors de l\'ouverture du booster:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});


// Fonction pour générer un contenu aléatoire pour un booster
async function generateBoosterContent(collectionId, collectionName, cardCount) {
  try {
    const boosterSize = 8; // Nombre de cartes dans un booster

    async function getRandomCards(count) {
      const response = await axios.get('https://api.pokemontcg.io/v2/cards', {
        headers: { 'X-Api-Key': process.env.POKEMON_TCG_API_KEY },
        params: {
          q: `set.name:"${collectionName}"`,
          pageSize: cardCount,
          page: 1
        }
      });
      const cards = response.data.data;
      return cards.sort(() => 0.5 - Math.random()).slice(0, count);
    }

    const cards = await getRandomCards(boosterSize);
    const boosterContent = cards.map(card => {
      const cardNumber = parseInt(card.number);
      if (isNaN(cardNumber)) {
        console.error(`Invalid card number for card: ${card.id}`);
        return null;
      }
      return {
        id: (BigInt(collectionId) * BigInt(1000) + BigInt(cardNumber)).toString(), // Convertir en chaîne
        name: card.name,
        imageUrl: card.images.small,
        number: card.number
      };
    }).filter(card => card !== null);

    // Vérifiez si boosterContent a le bon nombre de cartes
    if (boosterContent.length !== boosterSize) {
      console.error(`Expected ${boosterSize} cards, but got ${boosterContent.length}`);
    }

    // Retourner les IDs des cartes en tant que chaînes
    return boosterContent.map(card => card.id);
  } catch (error) {
    console.error('Erreur lors de la génération du contenu du booster:', error);
    throw error;
  }
}

let potentialBoosters = []; // Variable globale pour stocker les boosters potentiels

app.post('/generate-boosters-for-all-collections', async (req, res) => {
  try {
    const [collectionIds, collectionNames, cardCounts] = await contract.getAllCollections();
    potentialBoosters = [];

    for (let i = 0; i < collectionIds.length; i++) {
      const collectionId = collectionIds[i].toString();
      const collectionName = collectionNames[i];
      const cardCount = cardCounts[i].toString();

      // Générer le contenu potentiel du booster sans le créer
      const boosterContent = await generateBoosterContent(collectionId, collectionName, cardCount);

      // Obtenir l'URL de l'image de la collection
      let imageUrl = '';
      try {
        const response = await axios.get(`https://api.pokemontcg.io/v2/sets`, {
          headers: { 'X-Api-Key': process.env.POKEMON_TCG_API_KEY },
          params: { q: `name:"${collectionName}"` }
        });
        if (response.data.data && response.data.data.length > 0) {
          imageUrl = response.data.data[0].images.logo;
        }
      } catch (error) {
        console.error(`Erreur lors de la récupération de l'image pour la collection ${collectionName}:`, error.message);
      }

      potentialBoosters.push({
        collectionId,
        collectionName,
        cards: boosterContent,
        imageUrl
      });
    }

    res.json({ 
      success: true, 
      message: 'Boosters potentiels générés avec succès pour toutes les collections', 
      boosters: potentialBoosters 
    });
  } catch (error) {
    console.error('Erreur lors de la génération des boosters potentiels:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la génération des boosters potentiels' });
  }
});

// Nouvelle route pour réclamer un booster
app.post('/claim-booster', async (req, res) => {
  const { userAddress, collectionId } = req.body;
  try {
    // Trouver le booster pré-généré pour cette collection
    const booster = potentialBoosters.find(b => b.collectionId === collectionId);
    if (!booster) {
      throw new Error('Booster non trouvé pour cette collection');
    }

    console.log('Création du booster pour:', userAddress);
    const tx = await boosterContract.createBooster(userAddress);
    console.log('Transaction envoyée:', tx.hash);
    const receipt = await tx.wait();
    console.log('Transaction confirmée');
    
    console.log('Receipt complet:', JSON.stringify(receipt, null, 2));
    
    if (!receipt.logs || receipt.logs.length === 0) {
      throw new Error('Aucun log d\'événement trouvé dans la transaction');
    }
    
    const boosterCreatedLog = receipt.logs.find(log => {
      try {
        const decoded = boosterContract.interface.parseLog(log);
        return decoded.name === 'BoosterCreated';
      } catch (e) {
        return false;
      }
    });
    
    if (!boosterCreatedLog) {
      throw new Error('BoosterCreated event not found in transaction logs');
    }
    
    const decodedLog = boosterContract.interface.parseLog(boosterCreatedLog);
    const boosterId = decodedLog.args.boosterId;
    console.log('Booster ID:', boosterId);

    // Utiliser le contenu pré-généré du booster
    const boosterContent = booster.cards;

    // Définir le contenu du booster
    await contract.setBoosterCards(boosterId, boosterContent);

    res.json({ 
      success: true, 
      message: 'Booster réclamé avec succès', 
      boosterId: boosterId.toString(),
      cards: boosterContent
    });
  } catch (error) {
    console.error('Erreur détaillée lors de la réclamation du booster:', error);
    res.status(500).json({ success: false, error: 'Erreur serveur lors de la réclamation du booster' });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Erreur serveur');
});

app.listen(port, () => {
  console.log(`Serveur en cours d'exécution sur le port ${port}`);
});
