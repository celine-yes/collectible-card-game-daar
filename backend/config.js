const TCGDeployment = require('../contracts/deployments/localhost/TCG.json');
const BoosterDeployment = require('../contracts/deployments/localhost/Booster.json');

const contractAddress = TCGDeployment.address;
const contractAbi = TCGDeployment.abi;

const boosterContractAddress = BoosterDeployment.address;
const boosterContractAbi = BoosterDeployment.abi;

module.exports = {
  contractAddress,
  contractAbi,
  boosterContractAddress,
  boosterContractAbi
};
