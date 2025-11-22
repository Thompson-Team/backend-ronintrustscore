import { Router, Request, Response } from 'express';
import { analyzeWithAI } from '../services/aiService';
import { storeQuestionnaireResponse } from '../services/storageService';
import { generateZKProof, verifyProofOffChain } from '../services/vlayerServiceTest';
import { publishToRonin } from '../services/blockchainService';

const router = Router();

interface QuestionnaireRequest {
  walletAddress: string;
  answers: Record<string, any>;
}

/**
 * POST /api/questionnaire/submit
 * Flujo completo: Analizar -> Generar Proof -> Verificar -> Publicar on-chain
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
    const aiAnalysis = await analyzeWithAI(answers);

    // 3️⃣ Preparar datos para ZK proof
    const proofData = {
      walletAddress,
      score: aiAnalysis.overallScore,
      breakdown: aiAnalysis.breakdown,
      verifications: answers.vlayer_verification || {},
      timestamp: new Date().toISOString()
    };

    // 4️⃣ Generar ZK proof con Vlayer
    const { proof, publicInputs, proofId } = await generateZKProof(proofData);

    // 5️⃣ Verificar proof off-chain
    const isValidProof = await verifyProofOffChain(proof, publicInputs);

    if (!isValidProof) {
      return res.status(400).json({ 
        error: 'Proof verification failed' 
      });
    }

    // 6️⃣ Publicar en blockchain Ronin
    const txHash = await publishToRonin({
      walletAddress,
      score: aiAnalysis.overallScore,
      proof,
      publicInputs
    });

    // 7️⃣ Respuesta final
    const reputationScore = {
      score: aiAnalysis.overallScore,
      walletAddress,
      timestamp: proofData.timestamp,
      breakdown: aiAnalysis.breakdown,
      proof: {
        proofId,
        verified: true,
        txHash
      }
    };

    console.log('✅ Questionnaire processed successfully');

    res.json(reputationScore);
  } catch (error) {
    console.error('Error submitting questionnaire:', error);
    res.status(500).json({ error: 'Failed to process questionnaire' });
  }
});

export default router;