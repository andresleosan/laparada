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
exports.predecirTiempoEntrega = predecirTiempoEntrega;
exports.actualizarPrediccionRealtime = actualizarPrediccionRealtime;
const admin = __importStar(require("firebase-admin"));
/**
 * Obtiene datos históricos de entregas
 */
async function obtenerHistoricoEntregas(clienteId, domiciliarioId, horaActual) {
    const db = admin.firestore();
    const ahora = horaActual || new Date();
    try {
        // Entregas en los últimos 30 días
        const hace30Dias = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);
        // Entregas del cliente
        let tiemposCliente = [];
        if (clienteId) {
            const ventasCliente = await db
                .collection('ventas')
                .where('clienteId', '==', clienteId)
                .where('entregadoEn', '>=', admin.firestore.Timestamp.fromDate(hace30Dias))
                .limit(20)
                .get();
            tiemposCliente = ventasCliente.docs
                .map(doc => {
                const data = doc.data();
                if (data.creadoEn && data.entregadoEn) {
                    const inicio = data.creadoEn.toDate?.() || new Date(data.creadoEn);
                    const fin = data.entregadoEn.toDate?.() || new Date(data.entregadoEn);
                    return Math.floor((fin.getTime() - inicio.getTime()) / 60000); // minutos
                }
                return 0;
            })
                .filter(t => t > 0);
        }
        // Entregas del domiciliario
        let tiemposDomiciliario = [];
        if (domiciliarioId) {
            const ventasDomiciliario = await db
                .collection('ventas')
                .where('domiciliarioId', '==', domiciliarioId)
                .where('entregadoEn', '>=', admin.firestore.Timestamp.fromDate(hace30Dias))
                .limit(20)
                .get();
            tiemposDomiciliario = ventasDomiciliario.docs
                .map(doc => {
                const data = doc.data();
                if (data.creadoEn && data.entregadoEn) {
                    const inicio = data.creadoEn.toDate?.() || new Date(data.creadoEn);
                    const fin = data.entregadoEn.toDate?.() || new Date(data.entregadoEn);
                    return Math.floor((fin.getTime() - inicio.getTime()) / 60000);
                }
                return 0;
            })
                .filter(t => t > 0);
        }
        // Entregas en esta hora (promedio por hora del día)
        const horaActualNumber = ahora.getHours();
        const ventasHora = await db
            .collectionGroup('ventas')
            .where('entregadoEn', '>=', admin.firestore.Timestamp.fromDate(hace30Dias))
            .limit(100)
            .get();
        const tiemposHora = ventasHora.docs
            .map(doc => {
            const data = doc.data();
            const fecha = data.entregadoEn?.toDate?.() || new Date(data.entregadoEn);
            if (fecha.getHours() === horaActualNumber && data.creadoEn && data.entregadoEn) {
                const inicio = data.creadoEn.toDate?.() || new Date(data.creadoEn);
                const fin = data.entregadoEn.toDate?.() || new Date(data.entregadoEn);
                return Math.floor((fin.getTime() - inicio.getTime()) / 60000);
            }
            return 0;
        })
            .filter(t => t > 0);
        return {
            tiemposCliente,
            tiemposDomiciliario,
            tiemposHora,
        };
    }
    catch (error) {
        console.error('Error obteniendo histórico:', error);
        return {
            tiemposCliente: [],
            tiemposDomiciliario: [],
            tiemposHora: [],
        };
    }
}
/**
 * Calcula la congestión de tráfico por hora
 */
function evaluarTrafico(hora) {
    // 11-13 y 18-21 son horas pico (mayor tráfico)
    if ((hora >= 11 && hora <= 13) || (hora >= 18 && hora <= 21)) {
        return 'alto';
    }
    // 13-18 tráfico medio
    if (hora >= 13 && hora <= 18) {
        return 'medio';
    }
    // Madrugada bajo
    return 'bajo';
}
/**
 * Predice el tiempo de entrega
 * @param distancia - Distancia en km
 * @param clienteId - ID del cliente (opcional, para personalización)
 * @param domiciliarioId - ID del domiciliario asignado (opcional)
 * @param tiempoPreparacion - Tiempo de preparación en minutos
 * @returns Predicción de tiempo
 */
async function predecirTiempoEntrega(distancia, clienteId, domiciliarioId, tiempoPreparacion = 15) {
    const ahora = new Date();
    const historico = await obtenerHistoricoEntregas(clienteId, domiciliarioId, ahora);
    // Calcular promedios
    const promedioCliente = historico.tiemposCliente.length > 0
        ? Math.round(historico.tiemposCliente.reduce((a, b) => a + b, 0) /
            historico.tiemposCliente.length)
        : 30;
    const promedioDomiciliario = historico.tiemposDomiciliario.length > 0
        ? Math.round(historico.tiemposDomiciliario.reduce((a, b) => a + b, 0) /
            historico.tiemposDomiciliario.length)
        : 30;
    const promediaHora = historico.tiemposHora.length > 0
        ? Math.round(historico.tiemposHora.reduce((a, b) => a + b, 0) / historico.tiemposHora.length)
        : 30;
    // Evaluar tráfico
    const trafico = evaluarTrafico(ahora.getHours());
    // Cálculo base: velocidad ~3 km/min en ciudad
    let tiempoRuta = Math.ceil(distancia * 3); // km * 3 min/km
    // Ajustar por tráfico
    const factorTrafico = trafico === 'alto' ? 1.5 : trafico === 'medio' ? 1.2 : 1;
    tiempoRuta = Math.round(tiempoRuta * factorTrafico);
    // Tiempo total: preparación + ruta
    let estimado = tiempoPreparacion + tiempoRuta;
    // Ajustar por histórico del cliente (si existe)
    if (historico.tiemposCliente.length >= 5) {
        // Pesar 40% histórico, 60% predicción
        estimado = Math.round(estimado * 0.6 + promedioCliente * 0.4);
    }
    // Ajustar por domiciliario (si es más rápido/lento)
    if (historico.tiemposDomiciliario.length >= 10 && promedioDomiciliario < promedioCliente) {
        // El domiciliario es más rápido que el promedio
        estimado = Math.round(estimado * 0.95);
    }
    // Calcular confianza basada en datos históricos
    const cantidadDatos = Math.min(historico.tiemposCliente.length + historico.tiemposDomiciliario.length, 50);
    const confianza = Math.min(0.95, 0.5 + cantidadDatos * 0.01);
    return {
        estimatedMinutes: Math.max(estimado, 10), // Mínimo 10 minutos
        confidence: confianza,
        factors: {
            distancia,
            trafico,
            horario: trafico === 'alto' ? 'pico' : 'normal',
            domiciliarioDisponible: !!domiciliarioId,
            preparacion: tiempoPreparacion,
        },
        historico: {
            promedioCliente,
            promedioDomiciliario,
            promediaHora,
        },
    };
}
/**
 * Actualiza la predicción en tiempo real (tracking)
 */
async function actualizarPrediccionRealtime(ventaId, tiempoTranscurrido) {
    try {
        const db = admin.firestore();
        const ventaRef = db.collection('ventas').doc(ventaId);
        await ventaRef.update({
            tiempoTranscurrido,
            actualizadoEn: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    catch (error) {
        console.error('Error actualizando predicción:', error);
    }
}
