export interface RemoveProductBackgroundInput {
    imageBase64: string;
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
}
export interface RemoveProductBackgroundOutput {
    imageBase64: string;
    mimeType: 'image/png';
}
export declare class ImageProcessingError extends Error {
    readonly code: 'invalid-argument' | 'permission-denied' | 'resource-exhausted' | 'unavailable' | 'failed-precondition';
    constructor(code: 'invalid-argument' | 'permission-denied' | 'resource-exhausted' | 'unavailable' | 'failed-precondition', message: string);
}
export declare function canActorProcessProductImage(uid: string, email: string, profile: unknown): boolean;
export declare function parseRemoveProductBackgroundInput(value: unknown): RemoveProductBackgroundInput;
export declare function mapRemoveBgFailure(status?: number): ImageProcessingError;
export declare const removerFondoProducto: import("firebase-functions/https").CallableFunction<any, Promise<RemoveProductBackgroundOutput>, unknown>;
