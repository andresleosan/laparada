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
exports.obtenerPerfil = obtenerPerfil;
exports.anadirPuntosCompra = anadirPuntosCompra;
exports.generarCodigosCanje = generarCodigosCanje;
exports.validarCodigoDescuento = validarCodigoDescuento;
exports.aplicarDescuentoTier = aplicarDescuentoTier;
exports.obtenerBeneficios = obtenerBeneficios;
exports.puntosFaltantesProximoTier = puntosFaltantesProximoTier;
const admin = __importStar(require("firebase-admin"));
/**
 * Configuración de tiers
 */
const TIER_CONFIG = {
    bronce: {
        minGasto: 0,
        maxGasto: 100000,
        puntosMultiplier: 1,
        descuento: 0,
        beneficios: ['Puntos por cada compra', 'Acceso a ofertas básicas'],
    },
    plata: {
        minGasto: 100000,
        maxGasto: 250000,
        puntosMultiplier: 1.5,
        descuento: 0.05,
        beneficios: ['50% más puntos', '5% de descuento', 'Envío gratis en pedidos >$20k'],
    },
    oro: {
        minGasto: 250000,
        maxGasto: 500000,
        puntosMultiplier: 2,
        descuento: 0.1,
        beneficios: ['100% más puntos', '10% de descuento', 'Envío gratis siempre', 'Soporte prioritario'],
    },
    platino: {
        minGasto: 500000,
        maxGasto: Infinity,
        puntosMultiplier: 3,
        descuento: 0.15,
        beneficios: ['200% más puntos', '15% de descuento', 'Acceso exclusivo a productos', 'Atención VIP'],
    },
};
/**
 * Obtiene o crea un perfil de lealtad
 */
async function obtenerPerfil(clienteId) {
    try {
        const db = admin.firestore();
        const docRef = db.collection('loyalty_profiles').doc(clienteId);
        const doc = await docRef.get();
        if (doc.exists) {
            return doc.data();
        }
        // Crear nuevo perfil
        const nuevoPerfil = {
            clienteId,
            puntos: 0,
            tier: 'bronce',
            totalGastado: 0,
            ordenes: 0,
            puntosTotalesGanados: 0,
            puntosCanjeados: 0,
            creadoEn: new Date(),
            actualizadoEn: new Date(),
        };
        await docRef.set(nuevoPerfil);
        return nuevoPerfil;
    }
    catch (error) {
        console.error('Error obteniendo perfil:', error);
        throw error;
    }
}
/**
 * Determina el tier basado en gasto total
 */
function determinarTier(totalGastado) {
    if (totalGastado >= TIER_CONFIG.platino.minGasto)
        return 'platino';
    if (totalGastado >= TIER_CONFIG.oro.minGasto)
        return 'oro';
    if (totalGastado >= TIER_CONFIG.plata.minGasto)
        return 'plata';
    return 'bronce';
}
/**
 * Añade puntos por compra
 */
async function anadirPuntosCompra(clienteId, montoCompra) {
    try {
        const db = admin.firestore();
        const perfil = await obtenerPerfil(clienteId);
        // Calcular puntos: 1 punto por cada $1000
        const puntosBase = Math.floor(montoCompra / 1000);
        // Aplicar multiplicador según tier
        const multiplier = TIER_CONFIG[perfil.tier].puntosMultiplier;
        const puntos = Math.round(puntosBase * multiplier);
        // Actualizar perfil
        const nuevoTier = determinarTier(perfil.totalGastado + montoCompra);
        const nuevosPuntos = perfil.puntos + puntos;
        await db.collection('loyalty_profiles').doc(clienteId).update({
            puntos: nuevosPuntos,
            tier: nuevoTier,
            totalGastado: admin.firestore.FieldValue.increment(montoCompra),
            ordenes: admin.firestore.FieldValue.increment(1),
            puntosTotalesGanados: admin.firestore.FieldValue.increment(puntos),
            ultimaCompra: admin.firestore.FieldValue.serverTimestamp(),
            actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`Cliente ${clienteId}: +${puntos} puntos (tier: ${perfil.tier} -> ${nuevoTier})`);
        return puntos;
    }
    catch (error) {
        console.error('Error añadiendo puntos:', error);
        throw error;
    }
}
/**
 * Genera código de canje de puntos
 */
async function generarCodigosCanje(clienteId, cantidadPuntos) {
    try {
        const db = admin.firestore();
        // Validar puntos disponibles
        const perfil = await obtenerPerfil(clienteId);
        if (perfil.puntos < cantidadPuntos) {
            throw new Error('Puntos insuficientes');
        }
        // Calcular descuento: 1 punto = $100
        const descuento = Math.floor(cantidadPuntos * 100);
        // Generar código único
        const codigo = `LP-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
        // Crear documento de redención
        const redención = {
            id: db.collection('point_redemptions').doc().id,
            clienteId,
            puntos: cantidadPuntos,
            descuento,
            codigo,
            valido: true,
            expiradoEn: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 días
        };
        await db.collection('point_redemptions').doc(redención.id).set(redención);
        // Deducir puntos
        await db.collection('loyalty_profiles').doc(clienteId).update({
            puntos: admin.firestore.FieldValue.increment(-cantidadPuntos),
            puntosCanjeados: admin.firestore.FieldValue.increment(cantidadPuntos),
        });
        console.log(`Código generado: ${codigo} por $${descuento}`);
        return redención;
    }
    catch (error) {
        console.error('Error generando código:', error);
        throw error;
    }
}
/**
 * Valida y utiliza un código de descuento
 */
async function validarCodigoDescuento(codigo) {
    try {
        const db = admin.firestore();
        // Buscar código
        const query = await db
            .collection('point_redemptions')
            .where('codigo', '==', codigo)
            .where('valido', '==', true)
            .limit(1)
            .get();
        if (query.empty) {
            return { valido: false };
        }
        const redención = query.docs[0].data();
        // Verificar expiración
        const ahora = new Date();
        if (ahora > redención.expiradoEn) {
            await db.collection('point_redemptions').doc(query.docs[0].id).update({ valido: false });
            return { valido: false };
        }
        return { valido: true, descuento: redención.descuento };
    }
    catch (error) {
        console.error('Error validando código:', error);
        return { valido: false };
    }
}
/**
 * Aplica descuento automático según tier del cliente
 */
async function aplicarDescuentoTier(clienteId, montoOriginal) {
    try {
        const perfil = await obtenerPerfil(clienteId);
        const descuento = TIER_CONFIG[perfil.tier].descuento;
        const montoDescuento = Math.round(montoOriginal * descuento);
        return montoOriginal - montoDescuento;
    }
    catch (error) {
        console.error('Error aplicando descuento:', error);
        return montoOriginal;
    }
}
/**
 * Obtiene beneficios del cliente según su tier
 */
function obtenerBeneficios(tier) {
    return TIER_CONFIG[tier].beneficios;
}
/**
 * Calcula puntos faltantes para siguiente tier
 */
async function puntosFaltantesProximoTier(clienteId) {
    const perfil = await obtenerPerfil(clienteId);
    const tiers = ['bronce', 'plata', 'oro', 'platino'];
    const indexActual = tiers.indexOf(perfil.tier);
    const tierProximo = tiers[Math.min(indexActual + 1, 3)];
    const gastoProximo = TIER_CONFIG[tierProximo].minGasto;
    const faltaGastar = Math.max(0, gastoProximo - perfil.totalGastado);
    return {
        gastoActual: perfil.totalGastado,
        gastoProximo,
        faltaGastar,
        tierActual: perfil.tier,
        tierProximo,
    };
}
