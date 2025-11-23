import { Router, Request, Response } from 'express';
import { publishToRonin } from '../services/blockchainService';

const router = Router();

/**
 * POST /api/blockchain/publish-score
 * Publica score en blockchain Ronin
 */
router.post('/publish-score', async (req: Request, res: Response) => {
  try {
    const scoreData = req.body;

    if (!scoreData.walletAddress || !scoreData.score) {
      return res.status(400).json({ 
        error: 'Invalid score data' 
      });
    }

    // Publicar en blockchain (hardcodeado por ahora)
    const txHash = await publishToRonin(scoreData);

    res.json({ 
      txHash,
      message: 'Score published successfully' 
    });
  } catch (error) {
    console.error('Error publishing score:', error);
    res.status(500).json({ error: 'Failed to publish score' });
  }
});

export default router;