import hre from "hardhat";
import * as fs from "fs";

async function main() {
  console.log('🚀 Deploying Reputation Oracle contracts to Ronin...');

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log('Deploying with account:', deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log('Account balance:', hre.ethers.formatEther(balance), 'RON');

  // 1️⃣ Deploy Verifier
  console.log('\n📝 Deploying Verifier contract...');
  
  // Mock Image ID para RISC Zero (en producción, Vlayer proporciona esto)
  const IMAGE_ID = hre.ethers.keccak256(hre.ethers.toUtf8Bytes('reputation-oracle-v1'));
  
  const Verifier = await hre.ethers.getContractFactory('Verifier');
  const verifier = await Verifier.deploy(IMAGE_ID);
  await verifier.waitForDeployment();
  
  const verifierAddress = await verifier.getAddress();
  console.log('✅ Verifier deployed to:', verifierAddress);

  // 2️⃣ Deploy ReputationOracle (ProverContract)
  console.log('\n📝 Deploying ReputationOracle contract...');
  
  const ReputationOracle = await hre.ethers.getContractFactory('ReputationOracle');
  const oracle = await ReputationOracle.deploy(verifierAddress);
  await oracle.waitForDeployment();
  
  const oracleAddress = await oracle.getAddress();
  console.log('✅ ReputationOracle deployed to:', oracleAddress);

  // 3️⃣ Verification info
  console.log('\n📋 Deployment Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Verifier Address:', verifierAddress);
  console.log('ReputationOracle Address:', oracleAddress);
  console.log('Image ID:', IMAGE_ID);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // 4️⃣ Save addresses to file
  const deploymentInfo = {
    network: 'ronin',
    verifier: verifierAddress,
    oracle: oracleAddress,
    imageId: IMAGE_ID,
    deployer: deployer.address,
    timestamp: new Date().toISOString()
  };

  fs.writeFileSync(
    'deployed-contracts.json',
    JSON.stringify(deploymentInfo, null, 2)
  );

  console.log('\n✅ Deployment info saved to deployed-contracts.json');
  console.log('\n⚠️  Update your .env file with:');
  console.log(`PROVER_CONTRACT_ADDRESS=${oracleAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });