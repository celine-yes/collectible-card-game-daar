import React from 'react';
import welcomeImage from '/Bienvenue-sur-PokemonTCG-10-23-2024.png';

const Home: React.FC = () => {
  return (
    <div className="welcome-container">
      <img src={welcomeImage} alt="Bienvenue sur PokemonTCG" className="welcome-image" />
    </div>
  );
};

export default Home;

