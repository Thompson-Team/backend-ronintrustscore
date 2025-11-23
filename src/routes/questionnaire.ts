import { Router, Request, Response } from 'express';
import { analyzeWithAI } from '../services/aiService';
import { storeQuestionnaireResponse } from '../services/storageService';
import { generateAndVerifyProof } from '../services/vlayerWebProver';
import express from 'express';
const router = express.Router();

interface QuestionnaireRequest {
  walletAddress: string;
  answers: Record<string, any>;
}

/**
 * POST /api/questionnaire/submit
 * Flujo actualizado:
 * 1. Analizar con IA
 * 2. Generar y verificar proof localmente
 * 3. Retornar proof al frontend
 * 4. El usuario publica desde su wallet (frontend)
 */
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const { walletAddress, answers }: QuestionnaireRequest = req.body;

    if (!walletAddress || !answers) {
      return res.status(400).json({ 
        error: 'Wallet address and answers are required' 
      });
    }

    console.log('📋 Processing questionnaire for:', walletAddress);

    // 1️⃣ Guardar respuestas
    await storeQuestionnaireResponse(walletAddress, answers);

    // 2️⃣ Analizar con IA
    const aiAnalysis = await analyzeWithAI(answers, walletAddress);


    // 3️⃣ Preparar datos para ZK proof
    const proofData = {
      walletAddress,
      score: aiAnalysis.overallScore,
      breakdown: aiAnalysis.breakdown,
      verifications: answers.vlayer_verification || {},
      timestamp: new Date().toISOString()
    };

    // 4️⃣ Generar y verificar proof localmente
    const vlayerProof = await generateAndVerifyProof(proofData);

    // 5️⃣ Respuesta con proof para que el usuario lo publique
    const response = {
      success: true,
      score: aiAnalysis.overallScore,
      breakdown: aiAnalysis.breakdown,
      proof: {
        proof: vlayerProof.proof,
        publicInputs: vlayerProof.publicInputs,
        proofId: vlayerProof.proofId,
        verified: vlayerProof.verified,
        compressed: vlayerProof.compressed
      },
      message: 'Proof generated successfully. Please publish from your wallet.',
      nextStep: {
        action: 'PUBLISH_FROM_WALLET',
        description: 'Connect your wallet and sign the transaction to publish your score on-chain',
        contractAddress: process.env.PROVER_CONTRACT_ADDRESS || '0x38E457edc317809F135E47697666cFc074397e1B',
        network: 'Ronin Saigon Testnet'
      }
    };

    console.log('✅ Questionnaire processed successfully');
    console.log('   Proof ID:', vlayerProof.proofId);
    console.log('   Score:', aiAnalysis.overallScore);
    console.log('   ⚠️  User must publish from their wallet');

    res.json(response);
  } catch (error: any) {
    console.error('Error submitting questionnaire:', error);
    res.status(500).json({ 
      error: 'Failed to process questionnaire',
      details: error.message 
    });
  }
});
/**
 * GET /api/questionnaire/score/:address
 * Obtener score de un usuario desde blockchain
 */
router.get('/score/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    // Importar el servicio de blockchain
    const { getScoreFromBlockchain } = require('../services/blockchainService');
    
    const scoreData = await getScoreFromBlockchain(address);

    if (!scoreData) {
      return res.status(404).json({
        error: 'No score found for this address',
        address
      });
    }

    res.json({
      success: true,
      address,
      score: scoreData.score,
      timestamp: scoreData.timestamp,
      verified: scoreData.verified
    });
  } catch (error: any) {
    console.error('Error fetching score:', error);
    res.status(500).json({
      error: 'Failed to fetch score',
      details: error.message
    });
  }
});

/**
 * POST /api/questionnaire/verify-proof
 * Verificar un proof sin publicarlo
 */
router.post('/verify-proof', async (req: Request, res: Response) => {
  try {
    const { proof, publicInputs } = req.body;

    if (!proof || !publicInputs) {
      return res.status(400).json({
        error: 'Proof and publicInputs are required'
      });
    }

    const { verifyProofOffChain } = require('../services/blockchainService');
    const verification = await verifyProofOffChain(proof, publicInputs);

    res.json({
      success: verification.success,
      userAddress: verification.userAddress,
      score: verification.score,
      timestamp: verification.timestamp
    });
  } catch (error: any) {
    console.error('Error verifying proof:', error);
    res.status(500).json({
      error: 'Failed to verify proof',
      details: error.message
    });
  }
});


/**
 * GET /api/questionnaire/events/:address?
 * Obtener eventos de scores publicados
 */
router.get('/events/:address?', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { fromBlock } = req.query;

    const { getScoreEvents } = require('../services/blockchainService');
    const events = await getScoreEvents(
      address,
      fromBlock ? parseInt(fromBlock as string) : 0
    );

    res.json({
      success: true,
      count: events.length,
      events
    });
  } catch (error: any) {
    console.error('Error fetching events:', error);
    res.status(500).json({
      error: 'Failed to fetch events',
      details: error.message
    });
  }
});

export default router;