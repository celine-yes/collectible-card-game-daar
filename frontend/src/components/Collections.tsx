import React, { useState, useEffect } from 'react';
import { useWallet } from '../hooks/useWallet';
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
  const { isOwner } = useWallet();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isLoadingCards, setIsLoadingCards] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    setIsLoadingCollections(true);
    try {
      const response = await axios.get<Collection[]>('http://localhost:3000/collections');
      setCollections(response.data);
      setIsInitialized(response.data.length > 0);
    } catch (error) {
      console.error('Error fetching collections:', error);
    } finally {
      setIsLoadingCollections(false);
    }
  };

  const initializePokemonSets = async () => {
    setIsInitializing(true);
    try {
      await axios.post('http://localhost:3000/initialize-pokemon-sets');
      await fetchCollections();
    } catch (error) {
      console.error('Error initializing Pokemon sets:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const fetchCollectionCards = async (collectionId: string) => {
    setIsLoadingCards(true);
    try {
      const response = await axios.get<Card[]>(`http://localhost:3000/collection-cards/${collectionId}`);
      setCards(response.data);
    } catch (error) {
      console.error('Error fetching collection cards:', error);
    } finally {
      setIsLoadingCards(false);
    }
  };

  const handleCollectionClick = (collection: Collection) => {
    setSelectedCollection(collection);
    setCards([]); // Réinitialiser les cartes
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
    console.log("Opening mint modal"); // Ajoutez ce log pour déboguer
    setShowModal(true);
  };

  return (
    <>
      <div className="collections-page">
        {!isInitialized && isOwner && (
          <button onClick={initializePokemonSets} disabled={isInitializing}>
            {isInitializing ? 'Initializing...' : 'Initialize Pokemon Sets'}
          </button>
        )}
        <h2>Collections</h2>
        {isLoadingCollections ? (
          <div className="loading">Loading collections...</div>
        ) : (
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
        )}

        {selectedCollection && (
          <div className="collection-details">
            <h3>{selectedCollection.name} Cards</h3>
            <div className="mint-section">
              <button 
                onClick={handleMintClick} 
                disabled={selectedCards.length === 0}
                className="mint-button"
              >
                Mint Selected Cards ({selectedCards.length})
              </button>
            </div>
            {isLoadingCards ? (
              <div className="loading">Loading cards...</div>
            ) : (
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
            )}
          </div>
        )}
      </div>
      {showModal && (
        <MintNFT
          cards={selectedCards}
          collectionId={selectedCollection!.id}
          closeModal={() => {
            setShowModal(false);
            setSelectedCards([]);
          }}
        />
      )}
    </>
  );
};

export default CollectionManager;
