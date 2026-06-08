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
exports.rfmAnalysisService = exports.RFMAnalysisService = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
/**
 * Servicio de Análisis RFM y Segmentación
 * - RFM (Recency, Frequency, Monetary)
 * - Segmentación de clientes automática
 * - Identificación de clientes en riesgo
 * - Dashboard de cohortes
 */
class RFMAnalysisService {
    constructor() {
        this.db = admin.firestore();
    }
    /**
     * Calcular score RFM para un cliente
     */
    async calcularRFMCliente(clienteId) {
        const ventasSnapshot = await this.db
            .collection('ventas')
            .where('clienteId', '==', clienteId)
            .orderBy('createdAt', 'desc')
            .get();
        if (ventasSnapshot.empty) {
            return {
                clienteId,
                nombreCliente: await this.obtenerNombreCliente(clienteId),
                recency: 999, // Nunca ha comprado
                frequency: 0,
                monetary: 0,
                r_score: 1,
                f_score: 1,
                m_score: 1,
                rfm_score: 1,
                segmento: 'Inactivo',
                estado: 'Nuevo cliente',
            };
        }
        // Calcular Recency
        const ultimaCompra = ventasSnapshot.docs[0].data().createdAt;
        const ahora = new Date();
        const recency = Math.floor((ahora.getTime() - ultimaCompra.toDate().getTime()) / (1000 * 60 * 60 * 24));
        // Calcular Frequency
        const frequency = ventasSnapshot.size;
        // Calcular Monetary
        let monetary = 0;
        ventasSnapshot.docs.forEach(doc => {
            monetary += doc.data().monto || 0;
        });
        // Calcular scores (1-5, donde 5 es mejor)
        const r_score = this.calcularScoreRecency(recency);
        const f_score = this.calcularScoreFrequency(frequency);
        const m_score = this.calcularScoreMonetary(monetary);
        const rfm_score = Math.round((r_score + f_score + m_score) / 3 * 100) / 100;
        const segmento = this.determinarSegmento(r_score, f_score, m_score);
        // Determinar estado
        let estado = 'Activo';
        if (recency > 90)
            estado = 'En riesgo';
        if (recency > 180)
            estado = 'Inactivo';
        if (frequency === 1)
            estado = 'Primer comprador';
        return {
            clienteId,
            nombreCliente: await this.obtenerNombreCliente(clienteId),
            recency,
            frequency,
            monetary: Math.round(monetary),
            r_score,
            f_score,
            m_score,
            rfm_score,
            segmento,
            estado,
        };
    }
    /**
     * Calcular RFM para todos los clientes
     */
    async calcularRFMGlobal() {
        const clientesSnapshot = await this.db.collection('clientes').get();
        const rfmScores = [];
        for (const doc of clientesSnapshot.docs) {
            const rfmScore = await this.calcularRFMCliente(doc.id);
            rfmScores.push(rfmScore);
        }
        // Guardar en Firestore
        await this.guardarRFMGlobal(rfmScores);
        return rfmScores;
    }
    /**
     * Determinar segmento basado en RFM
     */
    determinarSegmento(r_score, f_score, m_score) {
        // VIP: scores altos en todas dimensiones
        if (r_score >= 4 && f_score >= 4 && m_score >= 4) {
            return 'VIP';
        }
        // Leal: frecuencia y monetario altos
        if (f_score >= 4 && m_score >= 4) {
            return 'Leal';
        }
        // Promisorio: recency bueno, frecuencia media
        if (r_score >= 4 && f_score >= 3) {
            return 'Promisorio';
        }
        // Regular: scores medios
        if (r_score >= 3 && f_score >= 2) {
            return 'Regular';
        }
        // Riesgo: recency bajo o frequency baja
        if (r_score <= 2 || f_score <= 2) {
            return 'Riesgo';
        }
        return 'Regular';
    }
    /**
     * Calcular score de Recency (0-5)
     */
    calcularScoreRecency(dias) {
        if (dias <= 7)
            return 5;
        if (dias <= 30)
            return 4;
        if (dias <= 90)
            return 3;
        if (dias <= 180)
            return 2;
        return 1;
    }
    /**
     * Calcular score de Frequency (0-5)
     */
    calcularScoreFrequency(frequency) {
        if (frequency >= 20)
            return 5;
        if (frequency >= 10)
            return 4;
        if (frequency >= 5)
            return 3;
        if (frequency >= 2)
            return 2;
        return 1;
    }
    /**
     * Calcular score de Monetary (0-5)
     */
    calcularScoreMonetary(monetary) {
        if (monetary >= 500000)
            return 5;
        if (monetary >= 250000)
            return 4;
        if (monetary >= 100000)
            return 3;
        if (monetary >= 50000)
            return 2;
        return 1;
    }
    /**
     * Obtener segmentación de clientes
     */
    async obtenerSegmentacion() {
        const rfmScores = await this.calcularRFMGlobal();
        const segmentacion = new Map();
        const segmentos = [
            'VIP',
            'Leal',
            'Promisorio',
            'Regular',
            'Riesgo',
            'Inactivo',
        ];
        for (const seg of segmentos) {
            segmentacion.set(seg, {
                segmento: seg,
                descripcion: this.obtenerDescripcionSegmento(seg),
                cantidad: 0,
                montoPromedio: 0,
                comprasPromedio: 0,
                acciones: this.obtenerAccionesSegmento(seg),
            });
        }
        // Agrupar clientes
        rfmScores.forEach(rfm => {
            const seg = segmentacion.get(rfm.segmento);
            seg.cantidad += 1;
            seg.montoPromedio += rfm.monetary;
            seg.comprasPromedio += rfm.frequency;
        });
        // Calcular promedios
        const resultado = [];
        segmentacion.forEach(seg => {
            if (seg.cantidad > 0) {
                seg.montoPromedio = Math.round(seg.montoPromedio / seg.cantidad);
                seg.comprasPromedio = Math.round((seg.comprasPromedio / seg.cantidad) * 100) / 100;
            }
            resultado.push(seg);
        });
        return resultado.filter(s => s.cantidad > 0);
    }
    /**
     * Obtener clientes en riesgo de deserción
     */
    async obtenerClientesEnRiesgo() {
        const rfmScores = await this.calcularRFMGlobal();
        return rfmScores.filter(r => r.estado === 'En riesgo' || r.estado === 'Inactivo');
    }
    /**
     * Obtener clientes VIP
     */
    async obtenerClientesVIP() {
        const rfmScores = await this.calcularRFMGlobal();
        return rfmScores
            .filter(r => r.segmento === 'VIP' || r.segmento === 'Leal')
            .sort((a, b) => b.rfm_score - a.rfm_score);
    }
    /**
     * Obtener nuevos clientes (primer comprador)
     */
    async obtenerNuevosClientes() {
        const rfmScores = await this.calcularRFMGlobal();
        return rfmScores.filter(r => r.estado === 'Primer comprador');
    }
    /**
     * Guardar análisis RFM global
     */
    async guardarRFMGlobal(rfmScores) {
        const batch = this.db.batch();
        rfmScores.forEach(rfm => {
            const docRef = this.db.collection('rfm_analysis').doc(rfm.clienteId);
            batch.set(docRef, {
                ...rfm,
                actualizadoEn: firestore_1.Timestamp.now(),
            });
        });
        await batch.commit();
    }
    /**
     * Descripción de segmento
     */
    obtenerDescripcionSegmento(segmento) {
        const descripciones = {
            VIP: 'Clientes más valiosos, muy activos y con alto gasto',
            Leal: 'Clientes frecuentes con buen historial de compras',
            Promisorio: 'Clientes con potencial de convertirse en leales',
            Regular: 'Clientes con actividad moderada',
            Riesgo: 'Clientes con baja actividad reciente',
            Inactivo: 'Clientes sin compras recientes',
        };
        return descripciones[segmento] || 'Segmento desconocido';
    }
    /**
     * Acciones recomendadas por segmento
     */
    obtenerAccionesSegmento(segmento) {
        const acciones = {
            VIP: [
                '👑 Ofrecimiento de programas de fidelización exclusivos',
                '🎁 Descuentos y promociones especiales',
                '📞 Contacto personal periódico',
                '🏆 Acceso anticipado a nuevos productos',
            ],
            Leal: [
                '💝 Recompensas por puntos de fidelización',
                '🎯 Ofertas personalizadas',
                '📢 Invitación a eventos especiales',
                '💰 Descuentos por compra frecuente',
            ],
            Promisorio: [
                '🚀 Incentivos para aumentar frecuencia',
                '📧 Campañas de engagement',
                '🎁 Ofertas especiales limitadas',
                '⭐ Programa de referidos',
            ],
            Regular: [
                '📧 Emails de recordación de marca',
                '🎯 Ofertas estacionales',
                '💡 Sugerencias de productos',
                '📱 Notificaciones de nuevos productos',
            ],
            Riesgo: [
                '🔔 Campaña de re-engagement urgente',
                '💬 Encuesta de satisfacción',
                '🎁 Cupón de descuento de retorno',
                '📞 Contacto directo de seguimiento',
            ],
            Inactivo: [
                '⚠️ Campaña de reactivación agresiva',
                '💥 Descuento importante para retorno',
                '🎉 Evento especial de regreso',
                '📧 Email de última oportunidad',
            ],
        };
        return acciones[segmento] || [];
    }
    /**
     * Obtener nombre del cliente
     */
    async obtenerNombreCliente(clienteId) {
        try {
            const doc = await this.db.collection('clientes').doc(clienteId).get();
            return doc.exists ? doc.data().nombre || 'Cliente' : 'Cliente';
        }
        catch {
            return 'Cliente';
        }
    }
    /**
     * Obtener análisis de cohortes (clientes por mes de primera compra)
     */
    async obtenerAnalisisCohortes() {
        const ventasSnapshot = await this.db
            .collection('ventas')
            .orderBy('createdAt', 'desc')
            .get();
        const cohortes = new Map();
        ventasSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const fecha = data.createdAt.toDate();
            const mesStr = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
            if (!cohortes.has(mesStr)) {
                cohortes.set(mesStr, {
                    mes: mesStr,
                    clientes: new Set(),
                    ingresos: 0,
                });
            }
            const cohorte = cohortes.get(mesStr);
            cohorte.clientes.add(data.clienteId);
            cohorte.ingresos += data.monto || 0;
        });
        return Array.from(cohortes.values())
            .map(c => ({
            mes: c.mes,
            clientesNuevos: c.clientes.size,
            retension: Math.round((c.clientes.size / (c.clientes.size + 1)) * 100),
            ingresoTotal: Math.round(c.ingresos),
        }))
            .reverse();
    }
}
exports.RFMAnalysisService = RFMAnalysisService;
exports.rfmAnalysisService = new RFMAnalysisService();
