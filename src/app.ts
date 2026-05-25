import express, { Application, Request, Response } from 'express';
import webhookRouter from './routes/webhook';

const app: Application = express();

app.use('/webhook', express.raw({ type: 'application/json' }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.use('/webhook', webhookRouter);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
