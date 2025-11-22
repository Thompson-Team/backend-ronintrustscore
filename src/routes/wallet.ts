import { Router, Request, Response } from 'express';
import { verifySignature, isValidAddress } from '../services/walletService';
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

    // Validar formato de dirección
    if (!isValidAddress(address)) {
      return res.status(400).json({ 
        error: 'Invalid Ethereum address format' 
      });
    }

    // Verificar firma
    const isValid = await verifySignature(address, signature);

    if (!isValid) {
      return res.status(401).json({ 
        error: 'Invalid signature' 
      });
    }

    // Generar JWT token
    const token = generateToken(address);

    console.log('✅ Wallet connected:', address);

    res.json({ 
      token,
      message: 'Wallet connected successfully',
      address
    });
  } catch (error) {
    console.error('Error connecting wallet:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/wallet/verify
 * Verifica un token JWT
 */
router.get('/verify', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = require('../utils/jwt').verifyToken(token);

    res.json({ 
      valid: true,
      address: decoded.walletAddress 
    });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
