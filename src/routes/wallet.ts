import { Router, Request, Response } from 'express';
import { verifySignature } from '../services/walletService';
import { generateToken } from '../utils/jwt';

const router = Router();

/**
 * POST /api/wallet/connect
 * Conecta wallet y verifica firma
 */
router.post('/connect', async (req: Request, res: Response) => {
  try {
    const { address, signature } = req.body;

    if (!address || !signature) {
      return res.status(400).json({ 
        error: 'Address and signature are required' 
      });
    }

    // Verificar firma (hardcodeado por ahora)
    const isValid = await verifySignature(address, signature);

    if (!isValid) {
      return res.status(401).json({ 
        error: 'Invalid signature' 
      });
    }

    // Generar JWT token
    const token = generateToken(address);

    res.json({ 
      token,
      message: 'Wallet connected successfully' 
    });
  } catch (error) {
    console.error('Error connecting wallet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;