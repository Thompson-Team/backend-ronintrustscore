import { Router, Request, Response } from 'express';
import { publishToRonin, getScoreFromChain } from '../services/blockchainService';

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

/**
 * GET /api/blockchain/score/:address
 * Obtiene score de una wallet desde blockchain
 */
router.get('/score/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    const score = await getScoreFromChain(address);

    if (!score) {
      return res.status(404).json({ 
        error: 'No score found for this address' 
      });
    }

    res.json(score);
  } catch (error) {
    console.error('Error fetching score:', error);
    res.status(500).json({ error: 'Failed to fetch score' });
  }
});

export default router;