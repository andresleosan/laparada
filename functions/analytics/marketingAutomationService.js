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
exports.ejecutarMarketingAutomation = exports.marketingAutomationService = exports.MarketingAutomationService = void 0;
const admin = __importStar(require("firebase-admin"));
const functions = __importStar(require("firebase-functions/v2/scheduler"));
const firestore_1 = require("firebase-admin/firestore");
/**
 * Servicio de Automatización de Marketing
 * - Triggers basados en comportamiento
 * - Campañas personalizadas por segmento
 * - Re-engagement automático
 * - Email/WhatsApp campaigns
 */
class MarketingAutomationService {
    constructor() {
        this.db = admin.firestore();
    }
    /**
     * Crear campaña de marketing
     */
    async crearCampania(campania) {
        const docRef = await this.db.collection('marketing_campaigns').add({
            ...campania,
            fechaInicio: firestore_1.Timestamp.fromDate(campania.fechaInicio),
            fechaFin: campania.fechaFin ? firestore_1.Timestamp.fromDate(campania.fechaFin) : null,
            createdAt: firestore_1.Timestamp.now(),
            resultados: {
                enviados: 0,
                abiertos: 0,
                clicks: 0,
                conversiones: 0,
            },
        });
        return docRef.id;
    }
    /**
     * Campaña de re-engagement para clientes en riesgo
     */
    async crearCampanaReEngagement(clientesEnRiesgo) {
        const campania = {
            nombre: 'Re-engagement - Clientes en Riesgo',
            tipo: 'whatsapp',
            segmentos: ['Riesgo'],
            mensaje: `¡Hola! 👋 Te echamos de menos... 💙 

Hace tiempo no nos visitabas. Para traerte de vuelta, te ofrecemos un descuento ESPECIAL:

🎁 20% de descuento en tu próxima orden
📱 Válido solo hoy (código: REGRESO20)

¿Qué esperas? ¡Vuelve y disfruta de nuestros deliciosos productos! 🍕🍔`,
            codigoDescuento: 'REGRESO20',
            descuento: 20,
            estado: 'programada',
            fechaInicio: new Date(),
            resultados: {
                enviados: 0,
                abiertos: 0,
                clicks: 0,
                conversiones: 0,
            },
        };
        const campaniaId = await this.crearCampania(campania);
        // Enviar a todos los clientes en riesgo
        await this.enviarCampania(campaniaId, clientesEnRiesgo);
        return campaniaId;
    }
    /**
     * Campaña de bienvenida para nuevos clientes
     */
    async crearCampanaBienvenida(clientesNuevos) {
        const campania = {
            nombre: 'Bienvenida - Nuevos Clientes',
            tipo: 'whatsapp',
            segmentos: ['Promisorio'],
            mensaje: `¡Bienvenido a La Parada! 🎉

Nos alegra que hayas hecho tu primer pedido. 
Para celebrar, tenemos un regalo para ti:

🎁 15% de descuento en tu próxima orden
📱 Válido durante los próximos 7 días
💳 Código: BIENVENIDA15

¿Listo para tu próxima experiencia culinaria? ¡Que disfrutes! 😋`,
            codigoDescuento: 'BIENVENIDA15',
            descuento: 15,
            estado: 'programada',
            fechaInicio: new Date(),
            resultados: {
                enviados: 0,
                abiertos: 0,
                clicks: 0,
                conversiones: 0,
            },
        };
        const campaniaId = await this.crearCampania(campania);
        await this.enviarCampania(campaniaId, clientesNuevos);
        return campaniaId;
    }
    /**
     * Campaña VIP - Ofertas exclusivas
     */
    async crearCampanaVIP(clientesVIP) {
        const campania = {
            nombre: 'Oferta Exclusiva VIP',
            tipo: 'email',
            segmentos: ['VIP'],
            titulo: '✨ Oferta Exclusiva para ti, VIP ✨',
            mensaje: `Estimado cliente VIP,

Como miembro premium de nuestra familia, te invitamos a disfrutar de:

👑 25% de descuento en toda tu próxima orden
🎁 Envío GRATIS sin monto mínimo
⭐ Acceso exclusivo a nuevos productos
🎉 Doble puntos de fidelización

Esta oferta es SOLO para ti.
Válida hasta fin de mes.

Código: VIP25PRO`,
            codigoDescuento: 'VIP25PRO',
            descuento: 25,
            estado: 'programada',
            fechaInicio: new Date(),
            resultados: {
                enviados: 0,
                abiertos: 0,
                clicks: 0,
                conversiones: 0,
            },
        };
        const campaniaId = await this.crearCampania(campania);
        await this.enviarCampania(campaniaId, clientesVIP);
        return campaniaId;
    }
    /**
     * Campaña de referidos
     */
    async crearCampanaReferidos(clientesActivos) {
        const campania = {
            nombre: 'Programa de Referidos',
            tipo: 'whatsapp',
            segmentos: ['Leal', 'VIP'],
            mensaje: `¡Gana dinero compartiendo La Parada! 💰

Invita a tus amigos y ambos reciben beneficios:

🤝 Tu amigo: 10% de descuento en su primer pedido
💸 Tú: $10,000 de crédito por cada referido confirmado

¡Sin límite de referidos!
Comparte tu código personal: REFERIDOS{USER_ID}

¡Cuéntales lo delicioso que es! 😋`,
            estado: 'programada',
            fechaInicio: new Date(),
            resultados: {
                enviados: 0,
                abiertos: 0,
                clicks: 0,
                conversiones: 0,
            },
        };
        const campaniaId = await this.crearCampania(campania);
        await this.enviarCampania(campaniaId, clientesActivos);
        return campaniaId;
    }
    /**
     * Trigger: Después de X días sin compra
     */
    async verificarTriggerInactividad() {
        const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const hace14Dias = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        // Clientes sin compras en 7 días
        const clientesSin7Dias = await this.obtenerClientesSinCompras(7);
        if (clientesSin7Dias.length > 0) {
            await this.crearCampanaReEngagement(clientesSin7Dias);
        }
    }
    /**
     * Trigger: Después de compra (upsell/cross-sell)
     */
    async crearTriggerUpsell(ventaId) {
        const ventaDoc = await this.db.collection('ventas').doc(ventaId).get();
        if (!ventaDoc.exists)
            return;
        const venta = ventaDoc.data();
        const clienteId = venta.clienteId;
        const monto = venta.monto || 0;
        // Si compró bajo monto, sugerir combo
        if (monto < 50000) {
            await this.enviarSugerenciaCombo(clienteId);
        }
        // Si es cliente leal, ofrecer producto nuevo
        const rfmDoc = await this.db.collection('rfm_analysis').doc(clienteId).get();
        if (rfmDoc.exists && rfmDoc.data().segmento === 'Leal') {
            await this.enviarProductoNuevo(clienteId);
        }
    }
    /**
     * Trigger: Encuesta post-compra
     */
    async crearTriggerEncuesta(ventaId) {
        await this.db.collection('surveys').add({
            ventaId,
            tipo: 'satisfaccion',
            createdAt: firestore_1.Timestamp.now(),
            respondido: false,
            expiradoEn: firestore_1.Timestamp.fromDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)),
        });
    }
    /**
     * Enviar campaña a grupo de clientes
     */
    async enviarCampania(campaniaId, clientesIds) {
        const batch = this.db.batch();
        clientesIds.forEach(clienteId => {
            const docRef = this.db
                .collection('marketing_campaigns')
                .doc(campaniaId)
                .collection('envios')
                .doc(clienteId);
            batch.set(docRef, {
                clienteId,
                estado: 'enviado',
                enviado: true,
                abierto: false,
                click: false,
                conversion: false,
                createdAt: firestore_1.Timestamp.now(),
            });
        });
        await batch.commit();
        // Actualizar contador de enviados
        await this.db.collection('marketing_campaigns').doc(campaniaId).update({
            'resultados.enviados': clientesIds.length,
        });
    }
    /**
     * Obtener clientes sin compras en X días
     */
    async obtenerClientesSinCompras(dias) {
        const ventasSnapshot = await this.db
            .collection('ventas')
            .where('createdAt', '>=', firestore_1.Timestamp.fromDate(new Date(Date.now() - dias * 24 * 60 * 60 * 1000)))
            .get();
        const clientesConCompras = new Set();
        ventasSnapshot.docs.forEach(doc => {
            clientesConCompras.add(doc.data().clienteId);
        });
        // Obtener todos los clientes
        const todosClientes = await this.db.collection('clientes').get();
        return todosClientes.docs
            .map(doc => doc.id)
            .filter(clienteId => !clientesConCompras.has(clienteId));
    }
    /**
     * Enviar sugerencia de combo
     */
    async enviarSugerenciaCombo(clienteId) {
        // Lógica para enviar mensaje con sugerencia de combo
    }
    /**
     * Enviar producto nuevo
     */
    async enviarProductoNuevo(clienteId) {
        // Lógica para enviar mensaje con nuevo producto
    }
    /**
     * Obtener rendimiento de campañas
     */
    async obtenerRendimientoCampanas(dias = 30) {
        const campaniasSnapshot = await this.db
            .collection('marketing_campaigns')
            .where('createdAt', '>=', firestore_1.Timestamp.fromDate(new Date(Date.now() - dias * 24 * 60 * 60 * 1000)))
            .get();
        const resultados = [];
        for (const doc of campaniasSnapshot.docs) {
            const campania = doc.data();
            const enviados = campania.resultados.enviados || 0;
            const abiertos = campania.resultados.abiertos || 0;
            const clicks = campania.resultados.clicks || 0;
            const conversiones = campania.resultados.conversiones || 0;
            const tasaApertura = enviados > 0 ? (abiertos / enviados) * 100 : 0;
            const tasaClick = enviados > 0 ? (clicks / enviados) * 100 : 0;
            const tasaConversion = enviados > 0 ? (conversiones / enviados) * 100 : 0;
            // ROI: estimar basado en conversiones y descuento
            const descuento = campania.descuento || 0;
            const ingresoPorConversion = (conversiones * 50000) * (1 - descuento / 100);
            const costoEnvio = enviados * 100; // $100 por envío
            const roi = costoEnvio > 0 ? (ingresoPorConversion / costoEnvio) * 100 : 0;
            resultados.push({
                campana: campania.nombre,
                tipo: campania.tipo,
                enviados,
                tasaApertura: Math.round(tasaApertura * 100) / 100,
                tasaClick: Math.round(tasaClick * 100) / 100,
                tasaConversion: Math.round(tasaConversion * 100) / 100,
                roi: Math.round(roi),
            });
        }
        return resultados;
    }
    /**
     * Programar campaña automática de cumpleaños (ejemplo)
     */
    async crearCampanaCumpleanos() {
        // Obtener clientes con cumpleaños hoy
        const ahora = new Date();
        const mesActual = ahora.getMonth() + 1;
        const diaActual = ahora.getDate();
        // Buscar clientes en caché (por simplificidad)
        const clientesSnapshot = await this.db.collection('clientes').get();
        const clientesCumpleaños = [];
        clientesSnapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.fechaNacimiento) {
                const fecha = data.fechaNacimiento.toDate ? data.fechaNacimiento.toDate() : new Date(data.fechaNacimiento);
                if (fecha.getMonth() + 1 === mesActual && fecha.getDate() === diaActual) {
                    clientesCumpleaños.push(doc.id);
                }
            }
        });
        if (clientesCumpleaños.length > 0) {
            const campania = {
                nombre: 'Feliz Cumpleaños',
                tipo: 'whatsapp',
                segmentos: ['Regular', 'Leal', 'VIP'],
                mensaje: `¡FELIZ CUMPLEAÑOS! 🎉🎂

Queremos celebrar tu día especial con una sorpresa:

🎁 ¡30% de descuento en tu próxima orden!
📱 Código: CUMPLE30
⏰ Válido solo hoy

¡Que lo disfrutes! 🎊`,
                codigoDescuento: 'CUMPLE30',
                descuento: 30,
                estado: 'programada',
                fechaInicio: new Date(),
                resultados: {
                    enviados: 0,
                    abiertos: 0,
                    clicks: 0,
                    conversiones: 0,
                },
            };
            const campaniaId = await this.crearCampania(campania);
            await this.enviarCampania(campaniaId, clientesCumpleaños);
        }
    }
}
exports.MarketingAutomationService = MarketingAutomationService;
exports.marketingAutomationService = new MarketingAutomationService();
/**
 * Función programada para ejecutar marketing automation diariamente
 */
exports.ejecutarMarketingAutomation = functions.onSchedule('0 8 * * *', // Cada día a las 8 AM
async () => {
    const service = new MarketingAutomationService();
    // Verificar triggers de inactividad
    await service.verificarTriggerInactividad();
    // Crear campaña de cumpleaños
    await service.crearCampanaCumpleanos();
    console.log('✅ Marketing automation ejecutado exitosamente');
});
