import { expect } from "chai";
import { ethers } from "hardhat";
import { TCG } from "../../typechain/src/Main.sol/TCG";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { TCG__factory } from "../../typechain/factories/src/Main.sol/TCG__factory";

describe("TCG", function () {
  let tcg: TCG;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;

  beforeEach(async function () {
    // Deploy the contract before each test
    [owner, addr1, addr2] = await ethers.getSigners();
    const TCGFactory = await ethers.getContractFactory("TCG");
    tcg = (await TCGFactory.deploy()) as unknown as TCG;
    await tcg.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await tcg.owner()).to.equal(owner.address);
    });

    it("Should have the correct name and symbol", async function () {
      expect(await tcg.name()).to.equal("Trading Card Game");
      expect(await tcg.symbol()).to.equal("TCG");
    });
  });

  describe("Collection Creation", function () {
    it("Should create a collection", async function () {
      await tcg.createCollection("Test Collection", 10);
      const collection = await tcg.collections(0);
      expect(collection.name).to.equal("Test Collection");
      expect(collection.cardCount).to.equal(10);
    });

    it("Should increment collectionIdTracker", async function () {
      await tcg.createCollection("Collection 1", 10);
      await tcg.createCollection("Collection 2", 20);
      expect(await tcg.collectionIdTracker()).to.equal(2);
    });

    it("Should only allow owner to create collections", async function () {
      await expect(tcg.connect(addr1).createCollection("Unauthorized", 5))
        .to.be.revertedWith("OwnableUnauthorizedAccount");
    });
  });

  describe("Card Minting", function () {
    beforeEach(async function () {
      await tcg.createCollection("Test Collection", 10);
    });

    it("Should mint a card", async function () {
      await tcg.mintCard(addr1.address, 0, 5);
      const [collectionName, cardNumber] = await tcg.getCard(0);
      expect(collectionName).to.equal("Test Collection");
      expect(cardNumber).to.equal(5);
    });

    it("Should increment tokenIdTracker", async function () {
      await tcg.mintCard(addr1.address, 0, 5);
      await tcg.mintCard(addr2.address, 0, 6);
      expect(await tcg.tokenIdTracker()).to.equal(2);
    });

    it("Should fail when minting from non-existent collection", async function () {
      await expect(tcg.mintCard(addr1.address, 1, 5))
        .to.be.revertedWith("Collection does not exist");
    });

    it("Should fail when minting invalid card number", async function () {
      await expect(tcg.mintCard(addr1.address, 0, 10))
        .to.be.revertedWith("Invalid card number");
    });

    it("Should only allow owner to mint cards", async function () {
      await expect(tcg.connect(addr1).mintCard(addr2.address, 0, 5))
        .to.be.revertedWith("OwnableUnauthorizedAccount");
    });
  });

  describe("Card Retrieval", function () {
    beforeEach(async function () {
      await tcg.createCollection("Test Collection", 10);
      await tcg.mintCard(addr1.address, 0, 5);
    });

    it("Should retrieve correct card information", async function () {
      const [collectionName, cardNumber] = await tcg.getCard(0);
      expect(collectionName).to.equal("Test Collection");
      expect(cardNumber).to.equal(5);
    });

    it("Should fail for non-existent token", async function () {
      await expect(tcg.getCard(1))
        .to.be.revertedWith("ERC721: query for nonexistent token");
    });
  });

  describe("Token URI", function () {
    beforeEach(async function () {
      await tcg.createCollection("Test Collection", 10);
      await tcg.mintCard(addr1.address, 0, 5);
    });

    it("Should return correct token URI", async function () {
      const uri = await tcg.tokenURI(0);
      expect(uri).to.equal("https://your-api.com/metadata/0/5");
    });

    it("Should fail for non-existent token", async function () {
      await expect(tcg.tokenURI(1))
        .to.be.revertedWith("ERC721Metadata: URI query for nonexistent token");
    });
  });

  describe("Token Transfer", function () {
    beforeEach(async function () {
      await tcg.createCollection("Test Collection", 10);
      await tcg.mintCard(addr1.address, 0, 5);
    });

    it("Should transfer token between accounts", async function () {
      await tcg.connect(addr1).transferFrom(addr1.address, addr2.address, 0);
      expect(await tcg.ownerOf(0)).to.equal(addr2.address);
    });

    it("Should maintain card information after transfer", async function () {
      await tcg.connect(addr1).transferFrom(addr1.address, addr2.address, 0);
      const [collectionName, cardNumber] = await tcg.getCard(0);
      expect(collectionName).to.equal("Test Collection");
      expect(cardNumber).to.equal(5);
    });
  });
});
