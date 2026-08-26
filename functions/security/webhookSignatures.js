"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyMetaSignature = verifyMetaSignature;
const crypto_1 = require("crypto");
function constantTimeHexEquals(expectedHex, providedHex) {
    if (!/^[a-f0-9]{64}$/i.test(expectedHex) || !/^[a-f0-9]{64}$/i.test(providedHex)) {
        return false;
    }
    const expected = Buffer.from(expectedHex, 'hex');
    const provided = Buffer.from(providedHex, 'hex');
    return expected.length === provided.length && (0, crypto_1.timingSafeEqual)(expected, provided);
}
function verifyMetaSignature(input) {
    const prefix = 'sha256=';
    const signatureHeader = input.signatureHeader.trim();
    const appSecret = input.appSecret.trim();
    if (!signatureHeader.startsWith(prefix) || !appSecret)
        return false;
    const provided = signatureHeader.slice(prefix.length);
    const expected = (0, crypto_1.createHmac)('sha256', appSecret).update(input.rawBody).digest('hex');
    return constantTimeHexEquals(expected, provided);
}
