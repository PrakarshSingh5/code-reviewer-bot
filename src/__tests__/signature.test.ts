import crypto from 'crypto';
import { verifySignature } from '../utils/signature';

function makeSignature(body: Buffer, secret: string): string {
  return `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
}

describe('verifySignature', () => {
  const secret = 'test-secret';
  const body = Buffer.from(JSON.stringify({ action: 'opened' }));

  it('returns true for a valid signature', () => {
    const sig = makeSignature(body, secret);
    expect(verifySignature(body, sig, secret)).toBe(true);
  });

  it('returns false for a tampered body', () => {
    const sig = makeSignature(body, secret);
    const tampered = Buffer.from('{"action":"closed"}');
    expect(verifySignature(tampered, sig, secret)).toBe(false);
  });

  it('returns false for a wrong secret', () => {
    const sig = makeSignature(body, 'wrong-secret');
    expect(verifySignature(body, sig, secret)).toBe(false);
  });

  it('returns false when signature is undefined', () => {
    expect(verifySignature(body, undefined, secret)).toBe(false);
  });

  it('returns false when secret is undefined', () => {
    const sig = makeSignature(body, secret);
    expect(verifySignature(body, sig, undefined)).toBe(false);
  });
});
