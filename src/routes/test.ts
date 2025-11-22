// src/routes/test.ts
import { Router, Request, Response } from 'express';
import { testRoninConnection, getNetworkInfo } from '../services/blockchainService';

const router = Router();
console.log('🟢 Test routes loaded');
router.get('/ronin-connection', async (req: Request, res: Response) => {
  try {
    const isConnected = await testRoninConnection();
    
    if (!isConnected) {
      return res.status(500).json({
        success: false,
        message: 'Failed to connect to Ronin'
      });
    }

    const networkInfo = await getNetworkInfo();

    res.json({
      success: true,
      message: 'Successfully connected to Ronin',
      network: {
        chainId: networkInfo.chainId.toString(),
        blockNumber: networkInfo.blockNumber,
        gasPrice: networkInfo.gasPrice.toString()
      }
    });
  } catch (error: any) {
    console.error('Error testing connection:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/test/config
 * Verifica la configuración (sin exponer claves privadas)
 */
router.get('/config', async (req: Request, res: Response) => {
  const hasPrivateKey = !!process.env.PRIVATE_KEY && process.env.PRIVATE_KEY !== '0x...';
  const hasContractAddress = !!process.env.PROVER_CONTRACT_ADDRESS && process.env.PROVER_CONTRACT_ADDRESS !== '0x...';
  const hasRpcUrl = !!process.env.RONIN_RPC_URL;

  res.json({
    configuration: {
      privateKey: hasPrivateKey ? '✅ Configured' : '❌ Missing',
      contractAddress: hasContractAddress ? '✅ Configured' : '⚠️  Not deployed yet',
      rpcUrl: hasRpcUrl ? '✅ Configured' : '❌ Missing',
      contractAddressValue: hasContractAddress ? process.env.PROVER_CONTRACT_ADDRESS : 'Not set',
      rpcUrlValue: process.env.RONIN_RPC_URL
    },
    ready: hasPrivateKey && hasRpcUrl,
    needsDeployment: !hasContractAddress
  });
});
router.post('/publish-score', async (req: Request, res: Response) => {
  try {
    const { walletAddress, score } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: 'Wallet address required' });
    }

    const testScore = score || 85;

    // Generar datos de prueba
    const { generateZKProof, verifyProofOffChain } = require('../services/vlayerServiceTest');
    const { publishToRonin } = require('../services/blockchainService');

    const proofData = {
      walletAddress,
      score: testScore,
      breakdown: {
        trustworthiness: 85,
        security: 80,
        experience: 90,
        behavior: 85
      },
      verifications: {},
      timestamp: new Date().toISOString()
    };

    console.log('🧪 Test: Generating ZK proof...');
    const { proof, publicInputs } = await generateZKProof(proofData);

    console.log('🧪 Test: Verifying proof...');
    const isValid = await verifyProofOffChain(proof, publicInputs);

    if (!isValid) {
      return res.status(400).json({ error: 'Proof verification failed' });
    }

    console.log('🧪 Test: Publishing to blockchain...');
    const txHash = await publishToRonin({
      walletAddress,
      score: testScore,
      proof,
      publicInputs
    });

    res.json({
      success: true,
      message: 'Score published successfully',
      data: {
        walletAddress,
        score: testScore,
        txHash,
        proof: proof.substring(0, 20) + '...',
        explorerUrl: `https://saigon-app.roninchain.com/tx/${txHash}`
      }
    });
  } catch (error: any) {
    console.error('Test publish error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/test/get-score/:address
 * Prueba obtener un score de blockchain
 */
router.get('/get-score/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { getScoreFromChain } = require('../services/blockchainService');

    console.log('🧪 Test: Fetching score from chain...');
    const score = await getScoreFromChain(address);

    if (!score) {
      return res.status(404).json({
        success: false,
        message: 'No score found for this address'
      });
    }

    res.json({
      success: true,
      data: score
    });
  } catch (error: any) {
    console.error('Test get score error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
// ============================================
// CHECKLIST PARA DEBUGGEAR
// ============================================

/*
1. Verificar configuración:
   GET http://localhost:3000/api/test/config

2. Probar conexión a Ronin:
   GET http://localhost:3000/api/test/ronin-connection

3. Si todo está OK, el problema es:
   - Falta deployar contratos
   - Dirección del contrato incorrecta
   - Private key sin fondos

4. Para deployar contratos:
   - Seguir la guía de deployment
   - Usar testnet primero (Saigon)
*/