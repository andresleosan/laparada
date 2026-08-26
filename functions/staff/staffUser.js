"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StaffUserError = void 0;
exports.parseCreateStaffUserInput = parseCreateStaffUserInput;
exports.createStaffUserInFirebase = createStaffUserInFirebase;
const firestore_1 = require("firebase-admin/firestore");
const auth_1 = require("../config/auth");
class StaffUserError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'StaffUserError';
    }
}
exports.StaffUserError = StaffUserError;
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function normalizeEmail(value) {
    if (typeof value !== 'string') {
        throw new StaffUserError('invalid-argument', 'El correo es obligatorio');
    }
    const email = value.trim().toLowerCase();
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new StaffUserError('invalid-argument', 'El correo no es válido');
    }
    return email;
}
function normalizeText(value, field, min, max) {
    if (typeof value !== 'string') {
        throw new StaffUserError('invalid-argument', `${field} es obligatorio`);
    }
    const normalized = value.trim().replace(/\s+/g, ' ');
    if (normalized.length < min || normalized.length > max) {
        throw new StaffUserError('invalid-argument', `${field} no tiene una longitud válida`);
    }
    return normalized;
}
function firebaseErrorCode(error) {
    if (typeof error !== 'object' || error === null || !('code' in error))
        return '';
    return String(error.code);
}
function parseCreateStaffUserInput(value) {
    if (!isRecord(value)) {
        throw new StaffUserError('invalid-argument', 'La solicitud no es válida');
    }
    const allowedKeys = ['email', 'negocioId', 'nombre', 'password', 'rol'];
    const receivedKeys = Object.keys(value).sort();
    if (receivedKeys.length !== allowedKeys.length
        || receivedKeys.some((key, index) => key !== allowedKeys[index])) {
        throw new StaffUserError('invalid-argument', 'La solicitud contiene campos no permitidos');
    }
    const negocioId = normalizeText(value.negocioId, 'El negocio', 1, 64);
    if (!/^[A-Za-z0-9_-]+$/.test(negocioId)) {
        throw new StaffUserError('invalid-argument', 'El negocio no es válido');
    }
    const nombre = normalizeText(value.nombre, 'El nombre', 2, 100);
    const email = normalizeEmail(value.email);
    if (typeof value.password !== 'string' || value.password.length < 10 || value.password.length > 128) {
        throw new StaffUserError('invalid-argument', 'La contraseña debe tener entre 10 y 128 caracteres');
    }
    if (!/[A-Za-z]/.test(value.password) || !/\d/.test(value.password)) {
        throw new StaffUserError('invalid-argument', 'La contraseña debe incluir letras y números');
    }
    if (value.rol !== 'admin' && value.rol !== 'cajero') {
        throw new StaffUserError('invalid-argument', 'El rol no está permitido');
    }
    return {
        negocioId,
        nombre,
        email,
        password: value.password,
        rol: value.rol,
    };
}
async function assertCanCreateStaff(db, actor, negocioId) {
    const actorEmail = normalizeEmail(actor.email);
    const isSuperAdmin = actorEmail === auth_1.SUPER_ADMIN_EMAIL.toLowerCase();
    if (!isSuperAdmin) {
        const profileSnapshot = await db.collection('usuarios_negocio').doc(actor.uid).get();
        const profile = profileSnapshot.data();
        if (!profileSnapshot.exists
            || profile?.uid !== actor.uid
            || typeof profile?.email !== 'string'
            || profile.email.trim().toLowerCase() !== actorEmail
            || profile?.activo !== true
            || profile?.rol !== 'admin'
            || profile?.negocioId !== negocioId) {
            throw new StaffUserError('permission-denied', 'No tienes permiso para crear personal');
        }
    }
    const businessSnapshot = await db.collection('negocios').doc(negocioId).get();
    if (!businessSnapshot.exists || businessSnapshot.data()?.estado !== 'activo') {
        throw new StaffUserError('failed-precondition', 'El negocio no está activo');
    }
}
async function createStaffUserInFirebase(db, auth, input, actor) {
    await assertCanCreateStaff(db, actor, input.negocioId);
    const existingProfile = await db.collection('usuarios_negocio')
        .where('email', '==', input.email)
        .limit(1)
        .get();
    if (!existingProfile.empty) {
        throw new StaffUserError('already-exists', 'Ya existe un usuario con ese correo');
    }
    try {
        await auth.getUserByEmail(input.email);
        throw new StaffUserError('already-exists', 'Ya existe un usuario con ese correo');
    }
    catch (error) {
        if (error instanceof StaffUserError)
            throw error;
        if (firebaseErrorCode(error) !== 'auth/user-not-found')
            throw error;
    }
    let createdUid;
    try {
        const createdUser = await auth.createUser({
            email: input.email,
            password: input.password,
            displayName: input.nombre,
            disabled: false,
            emailVerified: false,
        });
        createdUid = createdUser.uid;
    }
    catch (error) {
        if (firebaseErrorCode(error) === 'auth/email-already-exists') {
            throw new StaffUserError('already-exists', 'Ya existe un usuario con ese correo');
        }
        throw error;
    }
    const profile = {
        uid: createdUid,
        negocioId: input.negocioId,
        nombre: input.nombre,
        email: input.email,
        rol: input.rol,
        activo: true,
    };
    try {
        await db.runTransaction(async (transaction) => {
            const profileRef = db.collection('usuarios_negocio').doc(createdUid);
            const profileSnapshot = await transaction.get(profileRef);
            if (profileSnapshot.exists) {
                throw new StaffUserError('already-exists', 'El perfil del usuario ya existe');
            }
            transaction.create(profileRef, {
                ...profile,
                creadoEn: firestore_1.FieldValue.serverTimestamp(),
            });
        });
    }
    catch (error) {
        try {
            await auth.deleteUser(createdUid);
        }
        catch {
            throw new StaffUserError('internal', 'No fue posible completar el alta ni revertir la cuenta creada');
        }
        if (error instanceof StaffUserError)
            throw error;
        throw new StaffUserError('internal', 'No fue posible guardar el perfil del usuario');
    }
    return profile;
}
