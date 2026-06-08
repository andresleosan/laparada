"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.crearUsuarioPrueba = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions"));
/**
 * Cloud Function para crear usuario de prueba
 * Endpoint: POST https://crearUsuarioPrueba-tdwq3uhjga-uc.a.run.app
 * Solo para desarrollo
 */
exports.crearUsuarioPrueba = functions
    .https
    .onRequest(async (req, res) => {
    // Permitir solo POST
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Método no permitido' });
        return;
    }
    try {
        const auth = admin.auth();
        const usuarioTest = {
            email: 'admin@laparada.test',
            password: 'Admin123456',
            displayName: 'Administrador La Parada',
        };
        // Intentar obtener usuario existente
        let usuario;
        try {
            usuario = await auth.getUserByEmail(usuarioTest.email);
            res.json({
                estado: 'ya_existe',
                mensaje: 'Usuario ya existe',
                email: usuario.email,
                uid: usuario.uid,
            });
            return;
        }
        catch (err) {
            // Usuario no existe, continuamos creándolo
        }
        // Crear usuario
        usuario = await auth.createUser({
            email: usuarioTest.email,
            password: usuarioTest.password,
            displayName: usuarioTest.displayName,
            emailVerified: true,
        });
        res.json({
            estado: 'creado',
            mensaje: '✅ Usuario creado exitosamente',
            email: usuarioTest.email,
            password: usuarioTest.password,
            displayName: usuarioTest.displayName,
            uid: usuario.uid,
            urls: {
                local: 'http://localhost:5173',
                produccion: 'https://la-parada-ecb37.web.app',
            },
        });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Error desconocido',
        });
    }
});
