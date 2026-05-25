import express, { Application, Request, Response } from 'express';
import webhookRouter from './routes/webhook';

const app: Application = express();

// Parse raw body for HMAC signature verification — MUST come before json()
app.use('/webhook', express.raw({ type: 'application/json' }));

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Mount webhook handler
app.use('/webhook', webhookRouter);

// 404 fallback
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
