import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../css/Collections.css';
import MintNFT from './MintNFT';

interface Collection {
  id: string;
  name: string;
  cardCount: string;
  imageUrl: string;
}

interface Card {
  id: string;
  name: string;
  number: string;
  imageUrl: string;
}

const CollectionManager: React.FC = () => {
  const [collections, setCollections] = useState<Collection[]>([]);
  // const [newCollectionName, setNewCollectionName] = useState('');
  // const [newCollectionCardCount, setNewCollectionCardCount] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      const response = await axios.get<Collection[]>('http://localhost:3000/collections');
      setCollections(response.data);
      setIsInitialized(response.data.length > 0);
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  // const createCollection = async (e: React.FormEvent<HTMLFormElement>) => {
  //   e.preventDefault();
  //   try {
  //     await axios.post('http://localhost:3000/create-collection', {
  //       name: newCollectionName,
  //       cardCount: parseInt(newCollectionCardCount)
  //     });
  //     setNewCollectionName('');
  //     setNewCollectionCardCount('');
  //     fetchCollections();
  //   } catch (error) {
  //     console.error('Error creating collection:', error);
  //   }
  // };

  const initializePokemonSets = async () => {
    try {
      await axios.post('http://localhost:3000/initialize-pokemon-sets');
      fetchCollections();
    } catch (error) {
      console.error('Error initializing Pokemon sets:', error);
    }
  };

  const fetchCollectionCards = async (collectionId: string) => {
    try {
      const response = await axios.get<Card[]>(`http://localhost:3000/collection-cards/${collectionId}`);
      setCards(response.data);
    } catch (error) {
      console.error('Error fetching collection cards:', error);
    }
  };

  const handleCollectionClick = (collection: Collection) => {
    setSelectedCollection(collection);
    fetchCollectionCards(collection.id);
  };

  const toggleCardSelection = (card: Card) => {
    setSelectedCards(prev => 
      prev.find(c => c.id === card.id)
        ? prev.filter(c => c.id !== card.id)
        : [...prev, card]
    );
  };

  const handleMintClick = () => {
    setShowModal(true);
  };

  const resetCardSelection = () => {
    setSelectedCards([]);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    resetCardSelection();
  };

  return (
    <div className="collections-page">
      {!isInitialized && (
        <button onClick={initializePokemonSets}>Initialize Pokemon Sets</button>
      )}

      <h2>Collections</h2>
      <div className="collections-grid">
        {collections.map((collection) => (
          <div key={collection.id} className="collection-card" onClick={() => handleCollectionClick(collection)}>
            <div className="collection-image">
              {collection.imageUrl ? (
                <img src={collection.imageUrl} alt={`${collection.name} logo`} />
              ) : (
                <div className="placeholder-image">{collection.name[0]}</div>
              )}
            </div>
            <div className="collection-info">
              <h3>{collection.name}</h3>
              <p>Cards: {collection.cardCount}</p>
            </div>
          </div>
        ))}
      </div>

      {selectedCollection && (
        <div className="collection-details">
          <h3>{selectedCollection.name} Cards</h3>
          <button 
            onClick={handleMintClick} 
            disabled={selectedCards.length === 0}
            className="mint-button"
          >
            Mint Selected Cards ({selectedCards.length})
          </button>
          <div className="cards-grid">
            {cards.map((card) => (
              <div 
                key={card.id} 
                className={`card ${selectedCards.some(c => c.id === card.id) ? 'selected' : ''}`}
                onClick={() => toggleCardSelection(card)}
              >
                <img src={card.imageUrl} alt={card.name} />
                <div className="card-info">
                  <p>{card.name}</p>
                  <p>#{card.number}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showModal && (
        <MintNFT
          cards={selectedCards}
          collectionId={selectedCollection!.id}
          closeModal={handleCloseModal}
        />
      )}
    </div>
  );
};

export default CollectionManager;
