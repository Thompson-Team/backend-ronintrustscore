import { Router, Request, Response } from 'express';
import { analyzeWithAI } from '../services/aiService';
import { storeQuestionnaireResponse } from '../services/storageService';

const router = Router();

interface QuestionnaireRequest {
  walletAddress: string;
  answers: Record<string, any>;
}

/**
 * POST /api/questionnaire/submit
 * Envía cuestionario y obtiene análisis de IA
 */
router.post('/submit', async (req: Request, res: Response) => {
  try {
    const { walletAddress, answers }: QuestionnaireRequest = req.body;

    if (!walletAddress || !answers) {
      return res.status(400).json({ 
        error: 'Wallet address and answers are required' 
      });
    }

    // Guardar respuestas
    await storeQuestionnaireResponse(walletAddress, answers);

    // Analizar con IA (hardcodeado por ahora)
    const aiAnalysis = await analyzeWithAI(answers);

    // Calcular score final
    const reputationScore = {
      score: aiAnalysis.overallScore,
      walletAddress,
      timestamp: new Date().toISOString(),
      breakdown: aiAnalysis.breakdown
    };

    res.json(reputationScore);
  } catch (error) {
    console.error('Error submitting questionnaire:', error);
    res.status(500).json({ error: 'Failed to process questionnaire' });
  }
});

export default router;