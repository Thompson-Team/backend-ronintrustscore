import crypto from 'crypto';
import fetch from 'node-fetch';

// Configuración del cliente vlayer
const VLAYER_CONFIG = {
  proverUrl: process.env.VLAYER_PROVER_URL || 'https://stable-fake-prover.vlayer.xyz',
  notaryUrl: process.env.VLAYER_NOTARY_URL || 'https://test-notary.vlayer.xyz',
  apiToken: process.env.VLAYER_API_TOKEN
};

interface TwitterVerification {
  verified: boolean;
  followerCount: number;
  zkProof: string;
  error?: string;
}

interface GoogleVerification {
  verified: boolean;
  vouchScore: number;
  zkProof: string;
  error?: string;
}

/**
 * Verifica un Web Proof de Twitter generado por el cliente
 * El Web Proof contiene datos autenticados de la API de Twitter
 */
export const verifyTwitterWebProof = async (
  walletAddress: string,
  webProof: any,
  twitterHandle: string
): Promise<TwitterVerification> => {
  try {
    console.log('Verifying Twitter Web Proof for:', twitterHandle);

    // 1. Verificar que el Web Proof sea válido
    if (!webProof || !webProof.presentationJson) {
      throw new Error('Invalid Web Proof format');
    }

    // 2. Extraer datos del Web Proof
    const proofData = JSON.parse(webProof.presentationJson);
    
    // 3. Verificar que la URL sea de la API correcta de Twitter
    const expectedUrl = 'https://api.x.com/1.1/users/show.json';
    if (!proofData.url || !proofData.url.startsWith(expectedUrl)) {
      throw new Error('Web Proof is not from Twitter API');
    }

    // 4. Verificar la firma del TLS Notary
    const notaryVerified = await verifyNotarySignature(
      proofData.transcript,
      proofData.notarySignature,
      proofData.notaryPubKey
    );

    if (!notaryVerified) {
      throw new Error('TLS Notary signature verification failed');
    }

    // 5. Parsear respuesta JSON de Twitter
    const twitterData = JSON.parse(proofData.body);
    
    // 6. Verificar que el handle coincida
    if (twitterData.screen_name.toLowerCase() !== twitterHandle.toLowerCase()) {
      throw new Error('Twitter handle does not match proof data');
    }

    // 7. Extraer follower count
    const followerCount = twitterData.followers_count;

    // 8. Verificar que cumple con requisito mínimo (100+ followers)
    if (followerCount < 100) {
      return {
        verified: false,
        followerCount,
        zkProof: '',
        error: 'Follower count below minimum requirement (100)'
      };
    }

    // 9. Generar ZK proof usando vlayer
    const zkProof = await generateZKProof(webProof, walletAddress);

    return {
      verified: true,
      followerCount,
      zkProof
    };

  } catch (error) {
    console.error('Twitter Web Proof verification error:', error);
    return {
      verified: false,
      followerCount: 0,
      zkProof: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Verifica un Web Proof de Google usando vouch
 */
export const verifyGoogleWebProof = async (
  walletAddress: string,
  webProof: any,
  googleEmail: string
): Promise<GoogleVerification> => {
  try {
    console.log('Verifying Google Web Proof for:', googleEmail);

    // 1. Verificar formato del Web Proof
    if (!webProof || !webProof.presentationJson) {
      throw new Error('Invalid Web Proof format');
    }

    // 2. Extraer datos del Web Proof
    const proofData = JSON.parse(webProof.presentationJson);

    // 3. Verificar que sea de Google
    const expectedDomain = 'accounts.google.com';
    if (!proofData.url || !proofData.url.includes(expectedDomain)) {
      throw new Error('Web Proof is not from Google');
    }

    // 4. Verificar firma del TLS Notary
    const notaryVerified = await verifyNotarySignature(
      proofData.transcript,
      proofData.notarySignature,
      proofData.notaryPubKey
    );

    if (!notaryVerified) {
      throw new Error('TLS Notary signature verification failed');
    }

    // 5. Parsear respuesta de Google
    const googleData = JSON.parse(proofData.body);
    
    // 6. Verificar que el email coincida
    if (googleData.email.toLowerCase() !== googleEmail.toLowerCase()) {
      throw new Error('Google email does not match proof data');
    }

    // 7. Verificar que la cuenta está verificada
    if (!googleData.verified_email) {
      throw new Error('Google email is not verified');
    }

    // 8. Calcular vouch score basado en datos de la cuenta
    const vouchScore = calculateVouchScore(googleData);

    // 9. Generar ZK proof
    const zkProof = await generateZKProof(webProof, walletAddress);

    return {
      verified: true,
      vouchScore,
      zkProof
    };

  } catch (error) {
    console.error('Google Web Proof verification error:', error);
    return {
      verified: false,
      vouchScore: 0,
      zkProof: '',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Verifica la firma del TLS Notary usando crypto nativo de Node.js
 */
const verifyNotarySignature = async (
  transcript: string,
  signature: string,
  publicKey: string
): Promise<boolean> => {
  try {
    // Convertir la firma y clave pública de formato base64
    const signatureBuffer = Buffer.from(signature, 'base64');
    const publicKeyPem = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
    
    // Verificar firma usando RSA-SHA256
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(transcript);
    
    const isValid = verifier.verify(publicKeyPem, signatureBuffer);
    return isValid;
  } catch (error) {
    console.error('Notary signature verification failed:', error);
    return false;
  }
};

/**
 * Calcula vouch score basado en datos de la cuenta Google
 */
const calculateVouchScore = (googleData: any): number => {
  let score = 50; // Base score

  // Cuenta verificada
  if (googleData.verified_email) score += 20;

  // Tiene foto de perfil
  if (googleData.picture) score += 10;

  // Cuenta antigua (si la API lo proporciona)
  if (googleData.created_time) {
    const accountAge = Date.now() - new Date(googleData.created_time).getTime();
    const yearsOld = accountAge / (1000 * 60 * 60 * 24 * 365);
    score += Math.min(yearsOld * 5, 20); // Máximo 20 puntos por antigüedad
  }

  return Math.min(score, 100);
};

/**
 * Genera ZK proof llamando a la API de vlayer
 */
const generateZKProof = async (
  webProof: any,
  walletAddress: string
): Promise<string> => {
  try {
    // Preparar datos para el prover
    const proofRequest = {
      method: 'v_call',
      params: [{
        to: process.env.PROVER_CONTRACT_ADDRESS,
        data: encodeProofData(webProof, walletAddress)
      }, {
        chain_id: process.env.CHAIN_ID || '11155420', // Optimism Sepolia
        gas_limit: process.env.GAS_LIMIT || '1000000'
      }]
    };

    // Llamar a la API de vlayer
    const response = await fetch(VLAYER_CONFIG.proverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VLAYER_CONFIG.apiToken}`
      },
      body: JSON.stringify(proofRequest)
    });

    if (!response.ok) {
      throw new Error(`Prover API error: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.result || !result.result.hash) {
      throw new Error('Invalid prover response');
    }

    // Esperar a que el proof esté listo
    const proof = await waitForProof(result.result.hash);
    
    return proof;
  } catch (error) {
    console.error('ZK proof generation failed:', error);
    throw new Error('Failed to generate ZK proof');
  }
};

/**
 * Codifica los datos del proof para enviar al prover contract
 */
const encodeProofData = (webProof: any, walletAddress: string): string => {
  // Aquí deberías usar ethers.js o web3.js para encodear correctamente
  // Por ahora, retornamos una representación simplificada
  const data = {
    webProof: JSON.stringify(webProof),
    walletAddress,
    timestamp: Date.now()
  };
  
  return '0x' + Buffer.from(JSON.stringify(data)).toString('hex');
};

/**
 * Espera a que el proof esté listo haciendo polling
 */
const waitForProof = async (
  hash: string, 
  maxRetries: number = 60, 
  intervalMs: number = 2000
): Promise<string> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(VLAYER_CONFIG.proverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${VLAYER_CONFIG.apiToken}`
        },
        body: JSON.stringify({
          method: 'v_getProofReceipt',
          params: { hash }
        })
      });

      const result = await response.json();

      if (result.result?.status === 'ready') {
        return result.result.receipt.data.proof;
      }

      if (result.result?.status === 'error') {
        throw new Error('Proof generation failed');
      }

      // Esperar antes del siguiente intento
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    } catch (error) {
      if (i === maxRetries - 1) throw error;
    }
  }

  throw new Error('Proof generation timeout');
};

/**
 * Almacena verificación en base de datos
 */
export const storeVerification = async (data: any): Promise<void> => {
  try {
    // TODO: Implementar almacenamiento en base de datos
    console.log('Storing verification:', data);
  } catch (error) {
    console.error('Failed to store verification:', error);
    throw error;
  }
};