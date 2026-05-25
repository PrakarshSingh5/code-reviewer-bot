import crypto from 'crypto';

/**
 * Verify the HMAC-SHA256 webhook signature from GitHub.
 * Implements requirement WH-01.
 *
 * @param rawBody   - Raw request body Buffer (must NOT be parsed JSON)
 * @param signature - Value of X-Hub-Signature-256 header (e.g. "sha256=abc123")
 * @param secret    - GITHUB_WEBHOOK_SECRET env var
 */
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

  // Constant-time comparison prevents timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    // Buffers have different lengths — signatures can't match
    return false;
  }
}
