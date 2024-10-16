import 'dotenv/config'
import { DeployFunction } from 'hardhat-deploy/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

const deployer: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  await deploy('TCG', {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 1,
  });
};

deployer.tags = ['TCG'];

export default deployer
