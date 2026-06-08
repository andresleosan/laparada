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
exports.demandForecastingService = exports.DemandForecastingService = void 0;
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("firebase-admin/firestore");
/**
 * Servicio de Pronóstico de Demanda
 * - Análisis de series temporales (últimos 90 días)
 * - Pronóstico por hora, día y semana
 * - Recomendaciones de producción automática
 */
class DemandForecastingService {
    constructor() {
        this.db = admin.firestore();
    }
    /**
     * Obtener datos históricos de ventas (últimos 90 días)
     */
    async obtenerDatosHistoricos(dias = 90) {
        const ahora = new Date();
        const hace90Dias = new Date(ahora.getTime() - dias * 24 * 60 * 60 * 1000);
        const ventasSnapshot = await this.db
            .collection('ventas')
            .where('createdAt', '>=', firestore_1.Timestamp.fromDate(hace90Dias))
            .get();
        const ventasPorHora = new Map();
        const ventasPorDia = new Map();
        for (let i = 0; i < 24; i++) {
            ventasPorHora.set(i, 0);
        }
        ventasSnapshot.docs.forEach(doc => {
            const data = doc.data();
            const fecha = data.createdAt.toDate();
            const hora = fecha.getHours();
            const dia = fecha.toLocaleDateString('es-CO');
            // Contar por hora
            ventasPorHora.set(hora, (ventasPorHora.get(hora) || 0) + 1);
            // Contar por día
            ventasPorDia.set(dia, (ventasPorDia.get(dia) || 0) + 1);
        });
        const totalVentas = ventasSnapshot.size;
        const promedioHora = totalVentas / 24;
        const promedioDia = totalVentas / dias;
        // Calcular desviación estándar
        const valoresHora = Array.from(ventasPorHora.values());
        const desviacionEstándar = Math.sqrt(valoresHora.reduce((sum, val) => sum + Math.pow(val - promedioHora, 2), 0) /
            valoresHora.length) || 0;
        return {
            ventasPorHora,
            ventasPorDia,
            promedioHora,
            promedioDia,
            desviacionEstándar,
        };
    }
    /**
     * Pronosticar demanda para la próxima hora
     */
    async pronosticarProximaHora() {
        const datosHistoricos = await this.obtenerDatosHistoricos();
        const ahora = new Date();
        const proximaHora = (ahora.getHours() + 1) % 24;
        const hoyDia = ahora.toLocaleDateString('es-CO');
        // Obtener demanda histórica de esa hora
        const demandaHora = datosHistoricos.ventasPorHora.get(proximaHora) || datosHistoricos.promedioHora;
        // Factores de predicción
        const demandaHoyHasta = Array.from(datosHistoricos.ventasPorDia.values()).filter((_, i) => new Date().getDate() - i === new Date().getDate());
        const factorHistorial = demandaHora / datosHistoricos.promedioHora;
        const factorTendencia = demandaHoyHasta.length > 0 ? demandaHoyHasta[0] / datosHistoricos.promedioDia : 1;
        const factorEstacionalidad = this.calcularFactorEstacionalidad(proximaHora);
        // Calcular demanda pronosticada
        const demandaPronosticada = Math.round(datosHistoricos.promedioHora * factorHistorial * 0.5 +
            datosHistoricos.promedioHora * factorTendencia * 0.3 +
            datosHistoricos.promedioHora * factorEstacionalidad * 0.2);
        // Calcular confianza (0-1)
        const confianza = Math.min(0.95, 0.5 +
            (1 - datosHistoricos.desviacionEstándar / (datosHistoricos.promedioHora + 1)) *
                0.45);
        // Recomendaciones
        const recomendaciones = [];
        if (demandaPronosticada > datosHistoricos.promedioHora * 1.5) {
            recomendaciones.push('📈 ALTA DEMANDA - Aumentar producción');
            recomendaciones.push('👥 Considerar domiciliarios adicionales');
        }
        else if (demandaPronosticada < datosHistoricos.promedioHora * 0.5) {
            recomendaciones.push('📉 BAJA DEMANDA - Reducir costos operacionales');
            recomendaciones.push('💰 Considerar promociones');
        }
        if (this.esHoraPico(proximaHora)) {
            recomendaciones.push('⏰ Horario PICO - Preparar materiales adicionales');
        }
        return {
            hour: proximaHora,
            dia: hoyDia,
            demandaPronosticada,
            confianza,
            factores: {
                historial: factorHistorial,
                tendencia: factorTendencia,
                estacionalidad: factorEstacionalidad,
                eventos: [],
            },
            recomendaciones,
        };
    }
    /**
     * Pronosticar demanda para todos los días de la próxima semana
     */
    async pronosticarSemana() {
        const pronosticos = [];
        const datosHistoricos = await this.obtenerDatosHistoricos();
        for (let día = 0; día < 7; día++) {
            const fecha = new Date();
            fecha.setDate(fecha.getDate() + día);
            const diaStr = fecha.toLocaleDateString('es-CO');
            const promedioDiario = Math.round(datosHistoricos.promedioDia);
            // Factor por día de la semana (fines de semana tienen más demanda)
            const diaSemana = fecha.getDay();
            const factorDiaSemana = diaSemana === 0 || diaSemana === 6 ? 1.3 : 1.0;
            const demandaPronosticada = Math.round(promedioDiario * factorDiaSemana);
            pronosticos.push({
                hour: 0,
                dia: diaStr,
                demandaPronosticada,
                confianza: 0.75,
                factores: {
                    historial: 1.0,
                    tendencia: 0.9,
                    estacionalidad: factorDiaSemana,
                    eventos: [],
                },
                recomendaciones: [],
            });
        }
        return pronosticos;
    }
    /**
     * Guardar pronóstico en Firestore para tracking
     */
    async guardarPronostico(pronostico) {
        const docRef = await this.db.collection('demand_forecasts').add({
            ...pronostico,
            createdAt: firestore_1.Timestamp.now(),
            actualizado: false,
            demandaReal: 0,
        });
        return docRef.id;
    }
    /**
     * Obtener precisión del modelo (comparar pronóstico vs real)
     */
    async calcularPrecision(dias = 30) {
        const pronósticos = await this.db
            .collection('demand_forecasts')
            .where('createdAt', '>=', firestore_1.Timestamp.fromDate(new Date(Date.now() - dias * 24 * 60 * 60 * 1000)))
            .where('actualizado', '==', true)
            .get();
        if (pronósticos.empty)
            return 0;
        let erroresAbsolutos = 0;
        let total = 0;
        pronósticos.docs.forEach(doc => {
            const data = doc.data();
            const error = Math.abs(data.demandaPronosticada - data.demandaReal);
            erroresAbsolutos += error;
            total++;
        });
        const mape = (erroresAbsolutos / total / 10) * 100; // Ajustar según escala
        return Math.max(0, 100 - mape);
    }
    /**
     * Generar recomendación de producción para el próximo turno
     */
    async generarRecomendacionProduccion() {
        const pronostico = await this.pronosticarProximaHora();
        const demanda = pronostico.demandaPronosticada;
        return {
            produccionRecomendada: Math.round(demanda * 1.1), // 10% buffer
            combosRecomendados: Math.round(demanda * 0.3), // 30% del total
            personalRequerido: Math.ceil(demanda / 5), // 1 persona cada 5 órdenes
            costoPredispuesto: Math.round(demanda * 15000), // $15k promedio por orden
        };
    }
    /**
     * Calcular factor de estacionalidad por hora
     */
    calcularFactorEstacionalidad(hora) {
        // Horas pico: 11-13 (almuerzo), 18-21 (cena)
        if ((hora >= 11 && hora <= 13) || (hora >= 18 && hora <= 21)) {
            return 1.5;
        }
        // Horas normales
        if (hora >= 8 && hora <= 23) {
            return 1.0;
        }
        // Horas bajas
        return 0.2;
    }
    /**
     * Verificar si es hora pico
     */
    esHoraPico(hora) {
        return (hora >= 11 && hora <= 13) || (hora >= 18 && hora <= 21);
    }
    /**
     * Obtener análisis de tendencia (últimos 7 días)
     */
    async obtenerTendencia() {
        const datosHistoricos = await this.obtenerDatosHistoricos(7);
        const ventasPorDia = Array.from(datosHistoricos.ventasPorDia.entries()).sort();
        return ventasPorDia.map((entry, index) => {
            let tendencia = 'estable';
            if (index > 0) {
                const anterior = ventasPorDia[index - 1][1];
                const actual = entry[1];
                if (actual > anterior * 1.1)
                    tendencia = 'mejorando';
                else if (actual < anterior * 0.9)
                    tendencia = 'empeorando';
            }
            return {
                dia: entry[0],
                demanda: entry[1],
                tendencia,
            };
        });
    }
}
exports.DemandForecastingService = DemandForecastingService;
exports.demandForecastingService = new DemandForecastingService();
