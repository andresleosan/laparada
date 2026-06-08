import * as functions from 'firebase-functions/v2/scheduler';
interface CampaniaMarketing {
    nombre: string;
    tipo: 'email' | 'whatsapp' | 'sms' | 'push';
    segmentos: string[];
    mensaje: string;
    titulo?: string;
    enlace?: string;
    descuento?: number;
    codigoDescuento?: string;
    estado: 'programada' | 'activa' | 'completada' | 'cancelada';
    fechaInicio: Date;
    fechaFin?: Date;
    resultados: {
        enviados: number;
        abiertos: number;
        clicks: number;
        conversiones: number;
    };
}
/**
 * Servicio de Automatización de Marketing
 * - Triggers basados en comportamiento
 * - Campañas personalizadas por segmento
 * - Re-engagement automático
 * - Email/WhatsApp campaigns
 */
export declare class MarketingAutomationService {
    private db;
    /**
     * Crear campaña de marketing
     */
    crearCampania(campania: CampaniaMarketing): Promise<string>;
    /**
     * Campaña de re-engagement para clientes en riesgo
     */
    crearCampanaReEngagement(clientesEnRiesgo: string[]): Promise<string>;
    /**
     * Campaña de bienvenida para nuevos clientes
     */
    crearCampanaBienvenida(clientesNuevos: string[]): Promise<string>;
    /**
     * Campaña VIP - Ofertas exclusivas
     */
    crearCampanaVIP(clientesVIP: string[]): Promise<string>;
    /**
     * Campaña de referidos
     */
    crearCampanaReferidos(clientesActivos: string[]): Promise<string>;
    /**
     * Trigger: Después de X días sin compra
     */
    verificarTriggerInactividad(): Promise<void>;
    /**
     * Trigger: Después de compra (upsell/cross-sell)
     */
    crearTriggerUpsell(ventaId: string): Promise<void>;
    /**
     * Trigger: Encuesta post-compra
     */
    crearTriggerEncuesta(ventaId: string): Promise<void>;
    /**
     * Enviar campaña a grupo de clientes
     */
    private enviarCampania;
    /**
     * Obtener clientes sin compras en X días
     */
    private obtenerClientesSinCompras;
    /**
     * Enviar sugerencia de combo
     */
    private enviarSugerenciaCombo;
    /**
     * Enviar producto nuevo
     */
    private enviarProductoNuevo;
    /**
     * Obtener rendimiento de campañas
     */
    obtenerRendimientoCampanas(dias?: number): Promise<{
        campana: string;
        tipo: string;
        enviados: number;
        tasaApertura: number;
        tasaClick: number;
        tasaConversion: number;
        roi: number;
    }[]>;
    /**
     * Programar campaña automática de cumpleaños (ejemplo)
     */
    crearCampanaCumpleanos(): Promise<void>;
}
export declare const marketingAutomationService: MarketingAutomationService;
/**
 * Función programada para ejecutar marketing automation diariamente
 */
export declare const ejecutarMarketingAutomation: functions.ScheduleFunction;
export {};
