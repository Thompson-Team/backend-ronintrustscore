import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import walletRoutes from './routes/wallet';
import questionnaireRoutes from './routes/questionnaire';
import blockchainRoutes from './routes/blockchain';
import vlayerRoutes from './routes/vlayer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/wallet', walletRoutes);
app.use('/api/questionnaire', questionnaireRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/vlayer', vlayerRoutes);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});