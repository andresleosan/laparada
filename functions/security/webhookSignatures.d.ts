export declare function verifyMetaSignature(input: {
    signatureHeader: string;
    rawBody: Buffer;
    appSecret: string;
}): boolean;
