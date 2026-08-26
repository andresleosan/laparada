import { createHmac, timingSafeEqual } from 'crypto';

function constantTimeHexEquals(expectedHex: string, providedHex: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(expectedHex) || !/^[a-f0-9]{64}$/i.test(providedHex)) {
    return false;
  }

  const expected = Buffer.from(expectedHex, 'hex');
  const provided = Buffer.from(providedHex, 'hex');
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export function verifyMetaSignature(input: {
  signatureHeader: string;
  rawBody: Buffer;
  appSecret: string;
}): boolean {
  const prefix = 'sha256=';
  const signatureHeader = input.signatureHeader.trim();
  const appSecret = input.appSecret.trim();

  if (!signatureHeader.startsWith(prefix) || !appSecret) return false;

  const provided = signatureHeader.slice(prefix.length);
  const expected = createHmac('sha256', appSecret).update(input.rawBody).digest('hex');
  return constantTimeHexEquals(expected, provided);
}
