import type { Auth } from 'firebase-admin/auth';
import { type Firestore } from 'firebase-admin/firestore';
export type StaffRole = 'admin' | 'cajero';
export interface CreateStaffUserInput {
    negocioId: string;
    nombre: string;
    email: string;
    password: string;
    rol: StaffRole;
}
export interface StaffActor {
    uid: string;
    email: string;
}
export interface CreatedStaffUser {
    uid: string;
    negocioId: string;
    nombre: string;
    email: string;
    rol: StaffRole;
    activo: true;
}
export type StaffUserErrorCode = 'invalid-argument' | 'unauthenticated' | 'permission-denied' | 'already-exists' | 'failed-precondition' | 'internal';
export declare class StaffUserError extends Error {
    readonly code: StaffUserErrorCode;
    constructor(code: StaffUserErrorCode, message: string);
}
export declare function parseCreateStaffUserInput(value: unknown): CreateStaffUserInput;
export declare function createStaffUserInFirebase(db: Firestore, auth: Auth, input: CreateStaffUserInput, actor: StaffActor): Promise<CreatedStaffUser>;
