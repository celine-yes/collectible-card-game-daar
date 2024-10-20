import 'dotenv/config'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const deployer: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // Déployer le contrat TCG
  const tcg = await deploy('TCG', {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 1,
  });

  // Déployer le contrat Booster
  await deploy('Booster', {
    from: deployer,
    args: [tcg.address], // Passer l'adresse du contrat TCG comme argument
    log: true,
    waitConfirmations: 1,
  });

  // Optionnel : Configurer l'adresse du contrat Booster dans le contrat TCG
  const TCG = await hre.ethers.getContract('TCG', deployer);
  const Booster = await hre.ethers.getContract('Booster', deployer);
  await TCG.setBoosterContract(Booster.address);
};

deployer.tags = ['TCG', 'Booster'];

export default deployer
