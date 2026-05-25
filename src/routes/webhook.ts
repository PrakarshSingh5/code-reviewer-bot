import { Router, Request, Response } from 'express';
import { verifySignature } from '../utils/signature';
import { handlePullRequest, handleInstallation } from '../handlers/eventHandler';

const router = Router();

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers['x-hub-signature-256'] as string | undefined;
  const isValid = verifySignature(
    req.body as Buffer,
    signature,
    process.env.GITHUB_WEBHOOK_SECRET,
  );

  if (!isValid) {
    console.warn('[Webhook] Invalid signature — rejecting request');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  res.status(200).json({ received: true });

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse((req.body as Buffer).toString()) as Record<string, unknown>;
  } catch (err) {
    console.error('[Webhook] Failed to parse payload:', (err as Error).message);
    return;
  }

  const eventType = req.headers['x-github-event'] as string;
  console.log(`[Webhook] Received event: ${eventType} / action: ${payload['action']}`);

  try {
    if (eventType === 'pull_request') {
      await handlePullRequest(payload);
    } else if (eventType === 'installation') {
      await handleInstallation(payload);
    } else {
      console.log(`[Webhook] Ignoring unhandled event type: ${eventType}`);
    }
  } catch (err) {
    console.error(`[Webhook] Unhandled error processing event "${eventType}":`, err);
  }
});

export default router;
