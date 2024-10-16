import React, { useEffect, useState } from 'react';
import axios from 'axios';
import '../css/Collections.css';
import { ethers } from 'ethers';
import { contracts } from '@/contracts.json';

const Collections = () => {

    const [collections, setCollections] = useState<any[]>([]);

    //recuperation des collections du contrat
    const fetchCollections = async () => {
        try {
          const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
          const contract = new ethers.Contract(contracts.Main.address, contracts.Main.abi, provider);
          const collectionsFromContract = await contract.getCollections(); 
          
          const enrichedCollections = await Promise.all(
            collectionsFromContract.map(async (collection: any) => {
              const pokemonData = await fetchPokemonData(collection.pokemonSetId);
              return {
                ...collection,
                pokemonName: pokemonData.name,
                pokemonImage: pokemonData.image,
              };
            })
          );
    
          setCollections(enrichedCollections);
        } catch (error) {
          console.error('Error fetching collections', error);
        }
      };

      // Simule un appel à l'API Pokémon TCG
const fetchPokemonData = async (setId: string) => {
    const response = await axios.get(`https://api.pokemontcg.io/v2/cards?q=set.id:${setId}`);
    return {
      name: response.data.data[0].name, // Récupère le nom du set
      image: response.data.data[0].images.large, // Récupère l'image de la carte
    };
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  return (
    <div>
      <h1>Collections Disponibles</h1>
      <div className="collections-container">
        {collections.map((collection, index) => (
          <div key={index} className="card">
            <h2>{collection.pokemonName}</h2>
            <img src={collection.pokemonImage} alt={collection.pokemonName} />
            <p>ID du set : {collection.pokemonSetId}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Collections;