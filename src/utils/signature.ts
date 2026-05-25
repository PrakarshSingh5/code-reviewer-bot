import crypto from 'crypto';

export function verifySignature(
  rawBody: Buffer,
  signature: string | undefined,
  secret: string | undefined,
): boolean {
  if (!signature || !secret) return false;

  const expected = `sha256=${crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')}`;

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
