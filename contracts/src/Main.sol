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

    event CollectionCreated(uint indexed collectionId, string name, uint256 cardCount);
    event CardMinted(address indexed to, uint256 indexed tokenId, uint256 indexed collectionId, uint256 cardNumber);

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

        emit CardMinted(_to, tokenId, _collectionId, _cardNumber);
    }

    function getCard(uint256 _tokenId) public view returns (string memory collectionName, uint256 cardNumber) {
        require(_ownerOf(_tokenId) != address(0), "ERC721: query for nonexistent token");
        uint256 collectionId = tokenCollection[_tokenId];
        Collection storage collection = collections[collectionId];
        return (collection.name, collection.cards[_tokenId]);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "ERC721Metadata: URI query for nonexistent token");

        uint256 collectionId = tokenCollection[tokenId];
        uint256 cardNumber = collections[collectionId].cards[tokenId];

        // Construire l'URI des métadonnées
        string memory baseURI = "https://your-api.com/metadata/";
        return string(abi.encodePacked(baseURI, collectionId.toString(), "/", cardNumber.toString()));
    }




}



