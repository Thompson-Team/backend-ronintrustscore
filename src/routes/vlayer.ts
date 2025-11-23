import { Router, Request, Response } from 'express';
import { 
  verifyTwitterWebProof, 
  verifyGoogleWebProof,
  storeVerification 
} from '../services/vlayerService';

const router = Router();

/**
 * POST /api/vlayer/verify-twitter
 * Verifica Web Proof de Twitter generado por el cliente
 */
router.post('/verify-twitter', async (req: Request, res: Response) => {
  try {
    const { walletAddress, webProof, twitterHandle } = req.body;

    if (!walletAddress || !webProof || !twitterHandle) {
      return res.status(400).json({ 
        error: 'Wallet address, Twitter handle and webProof are required' 
      });
    }

    // Verificar el Web Proof generado por el cliente
    const verification = await verifyTwitterWebProof(
      walletAddress, 
      webProof,
      twitterHandle
    );

    if (!verification.verified) {
      return res.status(403).json({
        error: 'Web Proof verification failed',
        details: verification.error
      });
    }

    // Guardar verificación en la base de datos
    await storeVerification({
      walletAddress,
      type: 'twitter',
      handle: twitterHandle,
      followerCount: verification.followerCount,
      zkProof: verification.zkProof,
      timestamp: new Date()
    });

    res.json({
      verified: true,
      followerCount: verification.followerCount,
      proof: verification.zkProof,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error verifying Twitter Web Proof:', error);
    res.status(500).json({ 
      error: 'Failed to verify Twitter Web Proof',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/vlayer/verify-google
 * Verifica Web Proof de Google generado por el cliente
 */
router.post('/verify-google', async (req: Request, res: Response) => {
  try {
    const { walletAddress, webProof, googleEmail } = req.body;

    if (!walletAddress || !webProof || !googleEmail) {
      return res.status(400).json({ 
        error: 'Wallet address, Google email and webProof are required' 
      });
    }

    // Verificar el Web Proof generado por el cliente
    const verification = await verifyGoogleWebProof(
      walletAddress,
      webProof,
      googleEmail
    );

    if (!verification.verified) {
      return res.status(403).json({
        error: 'Web Proof verification failed',
        details: verification.error
      });
    }

    // Guardar verificación en la base de datos
    await storeVerification({
      walletAddress,
      type: 'google',
      email: googleEmail,
      vouchScore: verification.vouchScore,
      zkProof: verification.zkProof,
      timestamp: new Date()
    });

    res.json({
      verified: true,
      vouchScore: verification.vouchScore,
      proof: verification.zkProof,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error verifying Google Web Proof:', error);
    res.status(500).json({ 
      error: 'Failed to verify Google Web Proof',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/vlayer/status/:address
 * Obtiene estado de verificaciones desde la base de datos
 */
router.get('/status/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    // TODO: Obtener desde base de datos real
    // const verifications = await getVerifications(address);

    const status = {
      walletAddress: address,
      verifications: {
        twitter: null,
        google: null
      }
    };

    res.json(status);
  } catch (error) {
    console.error('Error fetching verification status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

export default router;