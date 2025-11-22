import { Router, Request, Response } from 'express';
import { verifyTwitterFollowers, verifyGoogleVouch } from '../services/vlayerService';

const router = Router();

/**
 * POST /api/vlayer/verify-twitter
 * Verifica que usuario tiene +100 seguidores en Twitter usando ZK proofs
 */
router.post('/verify-twitter', async (req: Request, res: Response) => {
  try {
    const { walletAddress, twitterHandle } = req.body;

    if (!walletAddress || !twitterHandle) {
      return res.status(400).json({ 
        error: 'Wallet address and Twitter handle are required' 
      });
    }

    // Verificar con Vlayer (hardcodeado por ahora)
    const verification = await verifyTwitterFollowers(walletAddress, twitterHandle);

    res.json({
      verified: verification.verified,
      followerCount: verification.followerCount,
      proof: verification.zkProof,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error verifying Twitter:', error);
    res.status(500).json({ error: 'Failed to verify Twitter' });
  }
});

/**
 * POST /api/vlayer/verify-google
 * Verifica cuenta de Google usando Vouch y ZK proofs
 */
router.post('/verify-google', async (req: Request, res: Response) => {
  try {
    const { walletAddress, googleEmail } = req.body;

    if (!walletAddress || !googleEmail) {
      return res.status(400).json({ 
        error: 'Wallet address and Google email are required' 
      });
    }

    // Verificar con Vlayer y Vouch (hardcodeado por ahora)
    const verification = await verifyGoogleVouch(walletAddress, googleEmail);

    res.json({
      verified: verification.verified,
      vouchScore: verification.vouchScore,
      proof: verification.zkProof,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error verifying Google:', error);
    res.status(500).json({ error: 'Failed to verify Google' });
  }
});

/**
 * GET /api/vlayer/status/:address
 * Obtiene estado de todas las verificaciones de una wallet
 */
router.get('/status/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    // Por ahora retornamos datos mock
    const status = {
      walletAddress: address,
      verifications: {
        twitter: {
          verified: true,
          followerCount: 150,
          lastChecked: new Date().toISOString()
        },
        google: {
          verified: true,
          vouchScore: 85,
          lastChecked: new Date().toISOString()
        }
      }
    };

    res.json(status);
  } catch (error) {
    console.error('Error fetching verification status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

export default router;