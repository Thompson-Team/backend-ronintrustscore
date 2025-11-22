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
 */
const getRoninProvider = () => {
  const provider = new ethers.JsonRpcProvider(RONIN_RPC_URL);
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
    const { signer } = getRoninProvider();

    // Conectar al contrato
    const contract = new ethers.Contract(
      PROVER_CONTRACT_ADDRESS,
      REPUTATION_ORACLE_ABI,
      signer
    );

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

    console.log('✅ Score published on-chain. Block:', receipt.blockNumber);

    return tx.hash;
  } catch (error) {
    console.error('Error publishing to Ronin:', error);
    
    // Simular transacción en modo desarrollo
    if (!PRIVATE_KEY || PRIVATE_KEY === '') {
      console.log('⚠️  Using mock transaction (no private key configured)');
      await new Promise(resolve => setTimeout(resolve, 2000));
      return '0x' + Math.random().toString(16).substring(2, 66);
    }
    
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
    const { provider } = getRoninProvider();

    const contract = new ethers.Contract(
      PROVER_CONTRACT_ADDRESS,
      REPUTATION_ORACLE_ABI,
      provider
    );

    // Llamar al contrato
    const [score, timestamp, verified] = await contract.getScore(address);

    if (!verified) {
      return null;
    }

    return {
      score: Number(score),
      timestamp: new Date(Number(timestamp) * 1000).toISOString(),
      verified,
      walletAddress: address
    };
  } catch (error: any) {
    // Si el error es "No score found", retornar null
    if (error.message?.includes('No score found')) {
      return null;
    }

    console.error('Error fetching score:', error);
    
    // En modo desarrollo sin contrato deployado
    if (!PROVER_CONTRACT_ADDRESS || PROVER_CONTRACT_ADDRESS === '') {
      console.log('⚠️  No contract address configured');
      return null;
    }
    
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
    const { provider } = getRoninProvider();

    const contract = new ethers.Contract(
      PROVER_CONTRACT_ADDRESS,
      REPUTATION_ORACLE_ABI,
      provider
    );

    return await contract.hasMinimumScore(address, minimumScore);
  } catch (error) {
    console.error('Error checking minimum score:', error);
    return false;
  }
};
