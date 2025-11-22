// src/services/blockchainService.ts
import { ethers } from 'ethers';

const RONIN_RPC_URL = process.env.RONIN_RPC_URL || 'https://api.roninchain.com/rpc';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const PROVER_CONTRACT_ADDRESS = process.env.PROVER_CONTRACT_ADDRESS || '';

// ABI del contrato ReputationOracle
const REPUTATION_ORACLE_ABI = [
  'function publishScore(bytes calldata proof, bytes calldata publicInputs) external',
  'function getScore(address user) external view returns (uint256 score, uint256 timestamp, bool verified)',
  'function hasMinimumScore(address user, uint256 minimumScore) external view returns (bool)',
  'event ScorePublished(address indexed user, uint256 score, uint256 timestamp, bytes32 proofHash)'
];

/**
 * Obtiene el provider y signer para Ronin
 * FIX: Configuración especial para Ronin sin ENS
 */
const getRoninProvider = () => {
  // Crear network personalizada para Ronin (chainId 2020, sin ENS)
  const roninNetwork = new ethers.Network('ronin', 2020);
  
  // Configurar provider con la red personalizada
  const provider = new ethers.JsonRpcProvider(
    RONIN_RPC_URL,
    roninNetwork,
    {
      staticNetwork: roninNetwork, // Importante: evita lookups de ENS
      batchMaxCount: 1
    }
  );
  
  // Crear signer con la private key
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  
  return { provider, signer };
};

/**
 * Publica un score en la blockchain Ronin usando ZK proof
 */
export const publishToRonin = async (scoreData: {
  walletAddress: string;
  score: number;
  proof: string;
  publicInputs: string;
}): Promise<string> => {
  console.log('📝 Publishing score to Ronin blockchain...');

  try {
    // Validar que tengamos private key
    if (!PRIVATE_KEY || PRIVATE_KEY === '' || PRIVATE_KEY === '0x...') {
      console.log('⚠️  No private key configured - Using mock transaction');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return '0x' + Math.random().toString(16).substring(2, 66);
    }

    // Validar que tengamos contract address
    if (!PROVER_CONTRACT_ADDRESS || PROVER_CONTRACT_ADDRESS === '' || PROVER_CONTRACT_ADDRESS === '0x...') {
      console.log('⚠️  No contract address configured - Using mock transaction');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return '0x' + Math.random().toString(16).substring(2, 66);
    }

    const { signer } = getRoninProvider();

    console.log('📍 Contract Address:', PROVER_CONTRACT_ADDRESS);
    console.log('👤 Signer Address:', await signer.getAddress());

    // Conectar al contrato
    const contract = new ethers.Contract(
      PROVER_CONTRACT_ADDRESS,
      REPUTATION_ORACLE_ABI,
      signer
    );

    // Estimar gas (opcional pero recomendado)
    try {
      const gasEstimate = await contract.publishScore.estimateGas(
        scoreData.proof,
        scoreData.publicInputs
      );
      console.log('⛽ Gas Estimate:', gasEstimate.toString());
    } catch (gasError) {
      console.warn('⚠️  Could not estimate gas:', gasError);
    }

    // Publicar score con proof
    const tx = await contract.publishScore(
      scoreData.proof,
      scoreData.publicInputs,
      {
        gasLimit: 500000 // Ajustar según necesidad
      }
    );

    console.log('⏳ Transaction sent:', tx.hash);

    // Esperar confirmación
    const receipt = await tx.wait();

    console.log('✅ Score published on-chain');
    console.log('📦 Block:', receipt.blockNumber);
    console.log('⛽ Gas Used:', receipt.gasUsed.toString());

    return tx.hash;
  } catch (error: any) {
    console.error('❌ Error publishing to Ronin:', error);
    
    // Logging detallado del error
    if (error.code) console.error('Error Code:', error.code);
    if (error.reason) console.error('Error Reason:', error.reason);
    if (error.transaction) console.error('Failed Transaction:', error.transaction);
    
    throw error;
  }
};

/**
 * Obtiene el score de una wallet desde la blockchain
 */
export const getScoreFromChain = async (
  address: string
): Promise<{
  score: number;
  timestamp: string;
  verified: boolean;
  walletAddress: string;
} | null> => {
  console.log('🔍 Fetching score from blockchain for:', address);

  try {
    // Validar configuración
    if (!PROVER_CONTRACT_ADDRESS || PROVER_CONTRACT_ADDRESS === '' || PROVER_CONTRACT_ADDRESS === '0x...') {
      console.log('⚠️  No contract address configured');
      return null;
    }

    const { provider } = getRoninProvider();

    const contract = new ethers.Contract(
      PROVER_CONTRACT_ADDRESS,
      REPUTATION_ORACLE_ABI,
      provider
    );

    // Llamar al contrato
    const [score, timestamp, verified] = await contract.getScore(address);

    if (!verified) {
      console.log('ℹ️  Score found but not verified');
      return null;
    }

    const result = {
      score: Number(score),
      timestamp: new Date(Number(timestamp) * 1000).toISOString(),
      verified,
      walletAddress: address
    };

    console.log('✅ Score retrieved:', result);

    return result;
  } catch (error: any) {
    // Si el error es "No score found", retornar null
    if (error.message?.includes('No score found') || 
        error.message?.includes('revert') ||
        error.code === 'CALL_EXCEPTION') {
      console.log('ℹ️  No score found for address');
      return null;
    }

    console.error('❌ Error fetching score:', error);
    throw error;
  }
};

/**
 * Verifica si una wallet tiene un score mínimo
 */
export const checkMinimumScore = async (
  address: string,
  minimumScore: number
): Promise<boolean> => {
  try {
    if (!PROVER_CONTRACT_ADDRESS || PROVER_CONTRACT_ADDRESS === '' || PROVER_CONTRACT_ADDRESS === '0x...') {
      console.log('⚠️  No contract address configured');
      return false;
    }

    const { provider } = getRoninProvider();

    const contract = new ethers.Contract(
      PROVER_CONTRACT_ADDRESS,
      REPUTATION_ORACLE_ABI,
      provider
    );

    const hasMinScore = await contract.hasMinimumScore(address, minimumScore);
    
    console.log(`✅ Address ${address} has minimum score ${minimumScore}:`, hasMinScore);
    
    return hasMinScore;
  } catch (error: any) {
    console.error('❌ Error checking minimum score:', error);
    return false;
  }
};

/**
 * Obtiene información de la red Ronin
 */
export const getNetworkInfo = async (): Promise<{
  chainId: bigint;
  blockNumber: number;
  gasPrice: bigint;
}> => {
  try {
    const { provider } = getRoninProvider();
    
    const [chainId, blockNumber, feeData] = await Promise.all([
      provider.getNetwork().then(n => n.chainId),
      provider.getBlockNumber(),
      provider.getFeeData()
    ]);

    console.log('🌐 Network Info:', {
      chainId: chainId.toString(),
      blockNumber,
      gasPrice: feeData.gasPrice?.toString() || 'N/A'
    });

    return {
      chainId,
      blockNumber,
      gasPrice: feeData.gasPrice || BigInt(0)
    };
  } catch (error) {
    console.error('Error getting network info:', error);
    throw error;
  }
};

/**
 * Verifica la conexión con el RPC de Ronin
 */
export const testRoninConnection = async (): Promise<boolean> => {
  try {
    const { provider } = getRoninProvider();
    const blockNumber = await provider.getBlockNumber();
    console.log('✅ Connected to Ronin - Block:', blockNumber);
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Ronin:', error);
    return false;
  }
};