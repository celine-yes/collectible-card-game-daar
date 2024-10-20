// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

//import "./Collection.sol";


contract TCG is ERC721, Ownable {
    using Strings for uint256;


    struct Collection {
        string name;
        uint256 cardCount;
        mapping(uint256 => uint256) cards; // tokenId => cardNumber
    }

    uint public collectionIdTracker = 0;
    uint public tokenIdTracker = 0;

    mapping(uint => Collection) public collections;
    mapping(uint => uint) public tokenCollection;

    address[] public mintedUsers; 
    mapping(address => bool) public hasMinted; // Pour vérifier si un utilisateur a déjà reçu un NFT

    event CollectionCreated(uint indexed collectionId, string name, uint256 cardCount);
    event CardMinted(address indexed to, uint256 indexed tokenId, uint256 indexed collectionId, uint256 cardNumber);

    // Mapping pour stocker les cartes de chaque booster
    mapping(uint256 => uint256[]) private boosterCards;

    // Fonction pour définir les cartes d'un booster (appelée par le propriétaire ou un contrat autorisé)
    function setBoosterCards(uint256 boosterId, uint256[] memory cardIds) external onlyOwner {
        boosterCards[boosterId] = cardIds;
    }

    // Fonction pour minter les cartes d'un booster
    function mintBoosterCards(address to, uint256 boosterId) external {
        require(msg.sender == address(boosterContract), "Only booster contract can call this function");
        uint256[] memory cardIds = boosterCards[boosterId];
        require(cardIds.length > 0, "Booster content not set");

        for (uint i = 0; i < cardIds.length; i++) {
            uint256 collectionId = cardIds[i] / 1000; // Exemple de calcul de l'ID de collection
            uint256 cardNumber = cardIds[i] % 1000; // Exemple de calcul du numéro de carte
            mintCard(to, collectionId, cardNumber);
        }

        // Effacer les données du booster après l'avoir ouvert
        delete boosterCards[boosterId];
    }

    // Adresse du contrat Booster
    address public boosterContract;

    // Fonction pour définir l'adresse du contrat Booster (appelée par le propriétaire)
    function setBoosterContract(address _boosterContract) external onlyOwner {
        boosterContract = _boosterContract;
    }

    constructor() ERC721("Trading Card Game", "TCG") Ownable(msg.sender) {}

    function createCollection(string memory _name, uint _cardCount) public onlyOwner {
        collections[collectionIdTracker].name = _name;
        collections[collectionIdTracker].cardCount = _cardCount;
        emit CollectionCreated(collectionIdTracker, _name, _cardCount);
        collectionIdTracker++;
    }

    function mintCard(address _to, uint256 _collectionId, uint256 _cardNumber) public onlyOwner {
        require(_collectionId < collectionIdTracker, "Collection does not exist");
        require(_cardNumber < collections[_collectionId].cardCount, "Invalid card number");

        uint256 tokenId = tokenIdTracker;
        tokenIdTracker++;

        _safeMint(_to, tokenId);

        collections[_collectionId].cards[tokenId] = _cardNumber;
        tokenCollection[tokenId] = _collectionId;

        if (!hasMinted[_to]) {
            mintedUsers.push(_to);
            hasMinted[_to] = true;
        }

        emit CardMinted(_to, tokenId, _collectionId, _cardNumber);
    }

    function batchMintCards(address[] memory _to, uint256[] memory _collectionIds, uint256[] memory _cardNumbers) public onlyOwner {
        require(_to.length == _collectionIds.length && _to.length == _cardNumbers.length, "Input arrays must have the same length");
        
        for (uint i = 0; i < _to.length; i++) {
            mintCard(_to[i], _collectionIds[i], _cardNumbers[i]);
        }
    }

    function getAllMintedUsers() public view returns (address[] memory) {
        return mintedUsers;
    }

    function getCard(uint256 _tokenId) public view returns (string memory collectionName, uint256 cardNumber) {
        require(_ownerOf(_tokenId) != address(0), "ERC721: query for nonexistent token");
        uint256 collectionId = tokenCollection[_tokenId];
        Collection storage collection = collections[collectionId];
        return (collection.name, collection.cards[_tokenId]);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "ERC721Metadata: URI query for nonexistent token");
        return string(abi.encodePacked("http://localhost:3000/metadata/", tokenId.toString()));
    }

    function getAllCollections() public view returns (uint[] memory, string[] memory, uint256[] memory) {
        uint[] memory ids = new uint[](collectionIdTracker);
        string[] memory names = new string[](collectionIdTracker);
        uint256[] memory cardCounts = new uint256[](collectionIdTracker);
        
        for (uint i = 0; i < collectionIdTracker; i++) {
            ids[i] = i;
            names[i] = collections[i].name;
            cardCounts[i] = collections[i].cardCount;
        }
        
        return (ids, names, cardCounts);
    }

    //fonction pour récupérer les NFTs d'un utilisateur
    function getNFTsOfUser(address user) public view returns (uint256[] memory) {
        uint256 balance = balanceOf(user);
        uint256[] memory tokenIds = new uint256[](balance);
        uint256 counter = 0;
        
        for (uint256 i = 0; i < tokenIdTracker; i++) {
            if (_ownerOf(i) == user) {
                tokenIds[counter] = i;
                counter++;
            }
        }
        
        return tokenIds;
    }

}



