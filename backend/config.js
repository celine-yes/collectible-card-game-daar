const TCGDeployment = require('../contracts/deployments/localhost/TCG.json');

const contractAddress = TCGDeployment.address;
const contractAbi = TCGDeployment.abi;

module.exports = {
  contractAddress,
  contractAbi
};