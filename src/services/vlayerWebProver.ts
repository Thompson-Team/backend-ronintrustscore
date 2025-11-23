import { ethers } from 'ethers';


interface ReputationProofInput {
  walletAddress: string;
  score: number;
  breakdown: {
    trustworthiness: number;
    security: number;
    experience: number;
    behavior: number;
  };
  verifications: {
    twitter?: {
      verified: boolean;
      followerCount: number;
      proof: string;
    };
    google?: {
      verified: boolean;
      vouchScore: number;
      proof: string;
    };
  };
  timestamp: string;
}

interface VlayerWebProof {
  proof: string;
  publicInputs: string;
  proofId: string;
  verified: boolean;
  compressed: boolean;
}

/**
 * Step 1: Generar proof local
 * Este es el proof que se verificará on-chain
 */
export const generateReputationProof = async (
  data: ReputationProofInput
): Promise<{ proof: string; publicInputs: string }> => {
  console.log('🔐 Step 1: Generating reputation proof...');

  try {
    // Preparar datos del proof
    const proofInput = {
      userAddress: data.walletAddress,
      score: data.score,
      timestamp: Math.floor(new Date(data.timestamp).getTime() / 1000),
      breakdown: data.breakdown,
      verifications: data.verifications
    };

    // Codificar public inputs según el formato esperado por el contrato
    // El contrato espera: (address, uint256, uint256)
    const publicInputs = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'uint256', 'uint256'],
      [data.walletAddress, data.score, proofInput.timestamp]
    );

    // Generar hash del proof basado en todos los datos
    // Este hash representa la integridad de los datos
    const proof = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify(proofInput))
    );

    console.log('✅ Reputation proof generated');
    console.log('   Proof hash:', proof.substring(0, 20) + '...');
    console.log('   Public inputs length:', publicInputs.length);
    console.log('   User address:', data.walletAddress);
    console.log('   Score:', data.score);
    console.log('   Timestamp:', proofInput.timestamp);

    return { proof, publicInputs };
  } catch (error) {
    console.error('Error generating reputation proof:', error);
    throw new Error('Failed to generate reputation proof');
  }
};

/**
 * Step 2: "Comprimir" el proof 
 */
export const compressWebProof = async (
  proof: string,
  publicInputs: string
): Promise<VlayerWebProof> => {
  console.log('📦 Step 2: Preparing proof for on-chain verification...');

  try {
    const webProof: VlayerWebProof = {
      proof: proof,
      publicInputs: publicInputs,
      proofId: 'proof_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      verified: false,
      compressed: false
    };

    console.log('✅ Proof prepared for verification');
    console.log('   Proof ID:', webProof.proofId);
    console.log('   Proof ready for on-chain verification');

    return webProof;
  } catch (error: any) {
    console.error('Error preparing proof:', error.message);
    throw error;
  }
};

/**
 * Step 3: Verificación local (pre-verificación)
 * La verificación real ocurre on-chain en el contrato Verifier
 */
export const verifyZKProof = async (
  compressedProof: VlayerWebProof
): Promise<{ valid: boolean; reason?: string }> => {
  console.log('🔍 Step 3: Pre-verifying proof locally...');

  try {
    // Validaciones básicas
    const isValidFormat = 
      compressedProof.proof.length > 0 &&
      compressedProof.publicInputs.length > 0 &&
      ethers.isHexString(compressedProof.proof) &&
      ethers.isHexString(compressedProof.publicInputs);

    if (!isValidFormat) {
      console.warn('⚠️  Invalid proof format');
      return {
        valid: false,
        reason: 'Invalid proof format'
      };
    }

    // Decodificar public inputs para validar
    try {
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
        ['address', 'uint256', 'uint256'],
        compressedProof.publicInputs
      );

      const [userAddress, score, timestamp] = decoded;

      // Validar los valores
      if (!ethers.isAddress(userAddress)) {
        return {
          valid: false,
          reason: 'Invalid user address in public inputs'
        };
      }

      if (score > 100) {
        return {
          valid: false,
          reason: 'Score out of valid range (0-100)'
        };
      }

      const now = Math.floor(Date.now() / 1000);
      if (Number(timestamp) > now) {
        return {
          valid: false,
          reason: 'Timestamp is in the future'
        };
      }

      console.log('✅ Pre-verification passed');
      console.log('   User:', userAddress);
      console.log('   Score:', score.toString());
      console.log('   Timestamp:', new Date(Number(timestamp) * 1000).toISOString());
      
      return {
        valid: true,
        reason: 'Local pre-verification passed'
      };
    } catch (decodeError) {
      console.error('❌ Failed to decode public inputs:', decodeError);
      return {
        valid: false,
        reason: 'Failed to decode public inputs'
      };
    }
  } catch (error: any) {
    console.error('❌ Pre-verification failed:', error.message);
    return {
      valid: false,
      reason: error.message
    };
  }
};

/**
 * PIPELINE COMPLETO
 * Genera y valida el proof localmente
 * La verificación final ocurre on-chain
 */
export const generateAndVerifyProof = async (
  data: ReputationProofInput
): Promise<VlayerWebProof> => {
  console.log('🚀 Starting proof generation pipeline...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    // Step 1: Generar proof inicial
    const { proof, publicInputs } = await generateReputationProof(data);

    // Step 2: Preparar proof
    const webProof = await compressWebProof(proof, publicInputs);

    // Step 3: Pre-verificar localmente
    const verification = await verifyZKProof(webProof);

    if (!verification.valid) {
      throw new Error(`Pre-verification failed: ${verification.reason}`);
    }

    // Marcar como verificado localmente
    webProof.verified = true;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Proof pipeline completed');
    console.log('   📋 Summary:');
    console.log('   • Local verification:', webProof.verified);
    console.log('   • Proof ID:', webProof.proofId);
    console.log('   • Ready for on-chain verification');
    console.log('   ⚠️  Note: Final verification happens on-chain');

    return webProof;
  } catch (error: any) {
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Proof pipeline failed');
    console.error('   Error:', error.message);
    throw error;
  }
};

/**
 * Helper: Decodificar public inputs
 */
export const decodePublicInputs = (publicInputs: string): {
  userAddress: string;
  score: number;
  timestamp: number;
} => {
  const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
    ['address', 'uint256', 'uint256'],
    publicInputs
  );

  return {
    userAddress: decoded[0],
    score: Number(decoded[1]),
    timestamp: Number(decoded[2])
  };
};

/**
 * Helper: Validar proof antes de enviar on-chain
 */
export const validateProofForOnChain = (proof: VlayerWebProof): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (!proof.proof || proof.proof.length === 0) {
    errors.push('Proof is empty');
  }

  if (!proof.publicInputs || proof.publicInputs.length === 0) {
    errors.push('Public inputs are empty');
  }

  if (!ethers.isHexString(proof.proof)) {
    errors.push('Proof is not a valid hex string');
  }

  if (!ethers.isHexString(proof.publicInputs)) {
    errors.push('Public inputs are not a valid hex string');
  }

  try {
    const decoded = decodePublicInputs(proof.publicInputs);
    
    if (!ethers.isAddress(decoded.userAddress)) {
      errors.push('Invalid user address');
    }

    if (decoded.score > 100) {
      errors.push('Score out of range');
    }
  } catch (error) {
    errors.push('Failed to decode public inputs');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

export default {
  generateReputationProof,
  compressWebProof,
  verifyZKProof,
  generateAndVerifyProof,
  decodePublicInputs,
  validateProofForOnChain
};