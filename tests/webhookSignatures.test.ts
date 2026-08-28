import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyMetaSignature } from '../firebase-functions/src/security/webhookSignatures';

describe('firmas de webhooks', () => {
  describe('Meta/WhatsApp', () => {
    const appSecret = 'meta_app_secret';
    const rawBody = Buffer.from('{"object":"whatsapp_business_account"}', 'utf8');
    const digest = createHmac('sha256', appSecret).update(rawBody).digest('hex');

    it('acepta la firma del cuerpo crudo', () => {
      expect(
        verifyMetaSignature({
          signatureHeader: `sha256=${digest}`,
          rawBody,
          appSecret,
        })
      ).toBe(true);
    });

    it('rechaza un cuerpo manipulado', () => {
      expect(
        verifyMetaSignature({
          signatureHeader: `sha256=${digest}`,
          rawBody: Buffer.from('{"object":"other"}', 'utf8'),
          appSecret,
        })
      ).toBe(false);
    });

    it.each(['', digest, `sha1=${digest}`, 'sha256=not-hex']) (
      'rechaza una firma ausente o mal formada: %s',
      (signatureHeader) => {
        expect(verifyMetaSignature({ signatureHeader, rawBody, appSecret })).toBe(false);
      }
    );
  });
});
