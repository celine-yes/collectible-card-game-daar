// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Main.sol";

contract Booster is ERC721, Ownable {
    TCG public mainContract;

    struct BoosterContent {
        bool opened;
    }

    mapping(uint256 => BoosterContent) public boosters;
    uint256 private _nextBoosterId;

    event BoosterCreated(uint256 boosterId, address owner);
    event BoosterOpened(uint256 indexed boosterId, address indexed owner);

    constructor(address _mainContractAddress) ERC721("TCG Booster", "TCGB") Ownable(msg.sender) {
        mainContract = TCG(_mainContractAddress);
        _nextBoosterId = 1;
    }

    function createBooster() external returns (uint256) {
        uint256 newBoosterId = _nextBoosterId++;
        _safeMint(msg.sender, newBoosterId);
        boosters[newBoosterId] = BoosterContent({opened: false});
        emit BoosterCreated(newBoosterId, msg.sender);
        return newBoosterId;
    }


    function openBooster(uint256 boosterId) external {
        require(ownerOf(boosterId) == msg.sender, "Not the owner of this booster");
        require(!boosters[boosterId].opened, "Booster already opened");

        boosters[boosterId].opened = true;

        //Appel de la fonction du contrat Main pour mint les cartes du booster
        mainContract.mintBoosterCards(msg.sender, boosterId);

        emit BoosterOpened(boosterId, msg.sender);
    }

    // Override function to disable transfers of unopened boosters
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        require(from == address(0) || boosters[tokenId].opened, "Cannot transfer unopened booster");
        return super._update(to, tokenId, auth);
    }
}