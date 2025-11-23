import { ethers } from 'ethers';

// Contract ABIs
const VERIFIER_ABI = [
  "function verify(bytes calldata proof, bytes calldata publicInputs) external returns (bool success)",
  "function verifyAndExtract(bytes calldata proof, bytes calldata publicInputs) external returns (bool success, address userAddress, uint256 score, uint256 timestamp)",
  "event ProofVerified(bytes32 indexed proofHash, address indexed verifier)"
];

const REPUTATION_ORACLE_ABI = [
  "function publishScore(bytes calldata proof, bytes calldata publicInputs) external",
  "function getScore(address user) external view returns (uint256 score, uint256 timestamp, bool verified)",
  "function hasMinimumScore(address user, uint256 minimumScore) external view returns (bool)",
  "function getScoreDetails(address user) external view returns (tuple(uint256 score, uint256 timestamp, bytes32 proofHash, bool verified))",
  "event ScorePublished(address indexed user, uint256 score, uint256 timestamp, bytes32 proofHash)",
  "event ScoreUpdated(address indexed user, uint256 oldScore, uint256 newScore, uint256 timestamp)"
];

// Environment variables
const RONIN_RPC_URL = process.env.RONIN_RPC_URL || 'https://saigon-testnet.roninchain.com/rpc';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const VERIFIER_CONTRACT_ADDRESS = process.env.VERIFIER_CONTRACT_ADDRESS || '';
const ORACLE_CONTRACT_ADDRESS = process.env.PROVER_CONTRACT_ADDRESS || process.env.ORACLE_CONTRACT_ADDRESS || '';

// Validar que las direcciones estén configuradas
if (!VERIFIER_CONTRACT_ADDRESS) {
  console.error('❌ VERIFIER_CONTRACT_ADDRESS not configured in .env');
  console.error('   Please deploy contracts and add the address to .env');
}

if (!ORACLE_CONTRACT_ADDRESS) {
  console.error('❌ ORACLE_CONTRACT_ADDRESS not configured in .env');
  console.error('   Please deploy contracts and add the address to .env');
}

// Initialize provider and wallet only if we have the required config
let provider: ethers.JsonRpcProvider | null = null;
let wallet: ethers.Wallet | null = null;
let verifierContract: ethers.Contract | null = null;
let oracleContract: ethers.Contract | null = null;

try {
  if (PRIVATE_KEY && RONIN_RPC_URL) {
    provider = new ethers.JsonRpcProvider(RONIN_RPC_URL);
    wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    if (VERIFIER_CONTRACT_ADDRESS && ethers.isAddress(VERIFIER_CONTRACT_ADDRESS)) {
      verifierContract = new ethers.Contract(VERIFIER_CONTRACT_ADDRESS, VERIFIER_ABI, wallet);
    }
    
    if (ORACLE_CONTRACT_ADDRESS && ethers.isAddress(ORACLE_CONTRACT_ADDRESS)) {
      oracleContract = new ethers.Contract(ORACLE_CONTRACT_ADDRESS, REPUTATION_ORACLE_ABI, wallet);
    }
  }
} catch (error) {
  console.error('Error initializing blockchain service:', error);
}

interface PublishScoreData {
  walletAddress: string;
  score: number;
  proof: string;
  publicInputs: string;
}

/**
 * Publicar score verificado en blockchain
 * Este método llama directamente al smart contract
 */
export const publishToRonin = async (data: PublishScoreData): Promise<string> => {
  console.log('📝 Publishing score to Ronin blockchain...');
  console.log('📍 Oracle Contract:', ORACLE_CONTRACT_ADDRESS);
  console.log('📍 Verifier Contract:', VERIFIER_CONTRACT_ADDRESS);
  console.log('👤 User Address:', data.walletAddress);
  
  if (!oracleContract || !wallet || !provider) {
    throw new Error('Blockchain service not properly initialized. Check your .env configuration.');
  }
  
  console.log('👤 Signer Address:', wallet.address);

  try {
    // Validar que el signer tiene fondos
    const balance = await provider.getBalance(wallet.address);
    console.log('💰 Signer balance:', ethers.formatEther(balance), 'RON');
    
    if (balance === 0n) {
      throw new Error('Signer has no funds. Please fund the wallet with RON tokens.');
    }

    // Preparar los datos
    const proofBytes = ethers.getBytes(data.proof);
    const publicInputsBytes = ethers.getBytes(data.publicInputs);

    console.log('📦 Proof length:', proofBytes.length, 'bytes');
    console.log('📦 Public inputs length:', publicInputsBytes.length, 'bytes');

    // Estimar gas
    let gasEstimate;
    try {
      gasEstimate = await oracleContract.publishScore.estimateGas(
        proofBytes,
        publicInputsBytes
      );
      console.log('⛽ Estimated gas:', gasEstimate.toString());
    } catch (error: any) {
      console.warn('⚠️  Could not estimate gas:', error.message);
      
      // Si hay error de "Address mismatch", necesitamos que el usuario llame al contrato
      if (error.message.includes('Address mismatch')) {
        console.error('❌ The contract requires msg.sender to match the user address');
        console.error('💡 Solution: The user needs to call publishScore from their own wallet');
        throw new Error('User must submit their own score from their wallet address');
      }
      
      // Usar gas fijo si la estimación falla
      gasEstimate = 500000n;
    }

    // Enviar transacción
    console.log('📤 Sending transaction...');
    const tx = await oracleContract.publishScore(
      proofBytes,
      publicInputsBytes,
      {
        gasLimit: gasEstimate * 120n / 100n, // +20% buffer
      }
    );

    console.log('⏳ Transaction sent:', tx.hash);
    console.log('⏳ Waiting for confirmation...');

    // Esperar confirmación
    const receipt = await tx.wait();
    
    console.log('✅ Transaction confirmed!');
    console.log('   Block:', receipt.blockNumber);
    console.log('   Gas used:', receipt.gasUsed.toString());
    console.log('   TX Hash:', receipt.hash);

    return receipt.hash;
  } catch (error: any) {
    console.error('❌ Error publishing to Ronin:', error.message);
    
    if (error.code) {
      console.error('Error Code:', error.code);
    }
    
    throw error;
  }
};

/**
 * Obtener score de un usuario desde el blockchain
 */
export const getScoreFromBlockchain = async (
  userAddress: string
): Promise<{
  score: number;
  timestamp: number;
  verified: boolean;
} | null> => {
  try {
    if (!oracleContract) {
      throw new Error('Oracle contract not initialized');
    }
    
    console.log('🔍 Fetching score for:', userAddress);
    
    const result = await oracleContract.getScore(userAddress);
    
    return {
      score: Number(result.score),
      timestamp: Number(result.timestamp),
      verified: result.verified
    };
  } catch (error: any) {
    if (error.message.includes('No score found')) {
      console.log('ℹ️  No score found for address:', userAddress);
      return null;
    }
    
    console.error('Error fetching score:', error.message);
    throw error;
  }
};

/**
 * Verificar si un usuario tiene score mínimo
 */
export const checkMinimumScore = async (
  userAddress: string,
  minimumScore: number
): Promise<boolean> => {
  try {
    if (!oracleContract) {
      throw new Error('Oracle contract not initialized');
    }
    
    const hasMinScore = await oracleContract.hasMinimumScore(
      userAddress,
      minimumScore
    );
    
    return hasMinScore;
  } catch (error: any) {
    console.error('Error checking minimum score:', error.message);
    return false;
  }
};

/**
 * Obtener detalles completos del score
 */
export const getScoreDetails = async (
  userAddress: string
): Promise<{
  score: number;
  timestamp: number;
  proofHash: string;
  verified: boolean;
} | null> => {
  try {
    if (!oracleContract) {
      throw new Error('Oracle contract not initialized');
    }
    
    const details = await oracleContract.getScoreDetails(userAddress);
    
    return {
      score: Number(details.score),
      timestamp: Number(details.timestamp),
      proofHash: details.proofHash,
      verified: details.verified
    };
  } catch (error: any) {
    if (error.message.includes('No score found')) {
      return null;
    }
    
    console.error('Error fetching score details:', error.message);
    throw error;
  }
};

/**
 * Verificar proof off-chain usando el contrato Verifier
 */
export const verifyProofOffChain = async (
  proof: string,
  publicInputs: string
): Promise<{
  success: boolean;
  userAddress?: string;
  score?: number;
  timestamp?: number;
}> => {
  try {
    if (!verifierContract) {
      console.warn('Verifier contract not initialized, skipping off-chain verification');
      return { success: false };
    }
    
    console.log('🔍 Verifying proof off-chain...');
    
    const proofBytes = ethers.getBytes(proof);
    const publicInputsBytes = ethers.getBytes(publicInputs);

    // Llamar a verifyAndExtract
    const result = await verifierContract.verifyAndExtract.staticCall(
      proofBytes,
      publicInputsBytes
    );

    console.log('✅ Proof verified off-chain');
    console.log('   User:', result.userAddress);
    console.log('   Score:', result.score.toString());
    console.log('   Timestamp:', result.timestamp.toString());

    return {
      success: result.success,
      userAddress: result.userAddress,
      score: Number(result.score),
      timestamp: Number(result.timestamp)
    };
  } catch (error: any) {
    console.error('❌ Off-chain verification failed:', error.message);
    return { success: false };
  }
};

/**
 * Obtener eventos de scores publicados
 */
export const getScoreEvents = async (
  userAddress?: string,
  fromBlock: number = 0
): Promise<any[]> => {
  try {
    if (!oracleContract) {
      throw new Error('Oracle contract not initialized');
    }
    
    const filter = userAddress
      ? oracleContract.filters.ScorePublished(userAddress)
      : oracleContract.filters.ScorePublished();

    const events = await oracleContract.queryFilter(filter, fromBlock);

    return events.map(event => {
      // Forzamos el tipo a 'any' para que TS deje usar 'args'
      const e = event as any;
      return {
        user: e.args?.user,
        score: Number(e.args?.score),
        timestamp: Number(e.args?.timestamp),
        proofHash: e.args?.proofHash,
        blockNumber: e.blockNumber,
        transactionHash: e.transactionHash
      };
    });

  } catch (error: any) {
    console.error('Error fetching events:', error.message);
    return [];
  }
};

/**
 * Helper: Formatear dirección Ronin
 */
export const formatRoninAddress = (address: string): string => {
  if (address.startsWith('ronin:')) {
    return '0x' + address.slice(6);
  }
  return address;
};

/**
 * Helper: Verificar configuración
 */
export const checkConfiguration = (): {
  configured: boolean;
  missing: string[];
} => {
  const missing: string[] = [];
  
  if (!RONIN_RPC_URL) missing.push('RONIN_RPC_URL');
  if (!PRIVATE_KEY) missing.push('PRIVATE_KEY');
  if (!VERIFIER_CONTRACT_ADDRESS) missing.push('VERIFIER_CONTRACT_ADDRESS');
  if (!ORACLE_CONTRACT_ADDRESS) missing.push('ORACLE_CONTRACT_ADDRESS');
  
  return {
    configured: missing.length === 0,
    missing
  };
};

export default {
  publishToRonin,
  getScoreFromBlockchain,
  checkMinimumScore,
  getScoreDetails,
  verifyProofOffChain,
  getScoreEvents,
  formatRoninAddress,
  checkConfiguration
};