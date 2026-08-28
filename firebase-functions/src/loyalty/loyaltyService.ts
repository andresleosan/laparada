import * as admin from 'firebase-admin';

/**
 * Tier de cliente (Bronze, Silver, Gold, Platinum)
 */
export type ClientTier = 'bronce' | 'plata' | 'oro' | 'platino';

/**
 * Información del programa de lealtad
 */
export interface LoyaltyProfile {
  clienteId: string;
  puntos: number;
  tier: ClientTier;
  totalGastado: number; // $ total histórico
  ordenes: number; // cantidad de órdenes
  puntosTotalesGanados: number;
  puntosCanjeados: number;
  ultimaCompra?: Date;
  creadoEn: Date;
  actualizadoEn: Date;
}

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
 * Redención de puntos
 */
export interface PointRedemption {
  id: string;
  clienteId: string;
  puntos: number;
  descuento: number; // $ del descuento
  codigo: string; // código de cupón
  valido: boolean;
  utilizadoEn?: Date;
  expiradoEn: Date;
}

/**
 * Obtiene o crea un perfil de lealtad
 */
export async function obtenerPerfil(clienteId: string): Promise<LoyaltyProfile> {
  try {
    const db = admin.firestore();
    const docRef = db.collection('loyalty_profiles').doc(clienteId);
    const doc = await docRef.get();

    if (doc.exists) {
      return doc.data() as LoyaltyProfile;
    }

    // Crear nuevo perfil
    const nuevoPerfil: LoyaltyProfile = {
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
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    throw error;
  }
}

/**
 * Determina el tier basado en gasto total
 */
function determinarTier(totalGastado: number): ClientTier {
  if (totalGastado >= TIER_CONFIG.platino.minGasto) return 'platino';
  if (totalGastado >= TIER_CONFIG.oro.minGasto) return 'oro';
  if (totalGastado >= TIER_CONFIG.plata.minGasto) return 'plata';
  return 'bronce';
}

/**
 * Añade puntos por compra
 */
export async function anadirPuntosCompra(
  clienteId: string,
  montoCompra: number
): Promise<number> {
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
  } catch (error) {
    console.error('Error añadiendo puntos:', error);
    throw error;
  }
}

/**
 * Genera código de canje de puntos
 */
export async function generarCodigosCanje(
  clienteId: string,
  cantidadPuntos: number
): Promise<PointRedemption> {
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
    const redención: PointRedemption = {
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
  } catch (error) {
    console.error('Error generando código:', error);
    throw error;
  }
}

/**
 * Valida y utiliza un código de descuento
 */
export async function validarCodigoDescuento(codigo: string): Promise<{ valido: boolean; descuento?: number }> {
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

    const redención = query.docs[0].data() as PointRedemption;

    // Verificar expiración
    const ahora = new Date();
    if (ahora > redención.expiradoEn) {
      await db.collection('point_redemptions').doc(query.docs[0].id).update({ valido: false });
      return { valido: false };
    }

    return { valido: true, descuento: redención.descuento };
  } catch (error) {
    console.error('Error validando código:', error);
    return { valido: false };
  }
}

/**
 * Aplica descuento automático según tier del cliente
 */
export async function aplicarDescuentoTier(clienteId: string, montoOriginal: number): Promise<number> {
  try {
    const perfil = await obtenerPerfil(clienteId);
    const descuento = TIER_CONFIG[perfil.tier].descuento;
    const montoDescuento = Math.round(montoOriginal * descuento);
    return montoOriginal - montoDescuento;
  } catch (error) {
    console.error('Error aplicando descuento:', error);
    return montoOriginal;
  }
}

/**
 * Obtiene beneficios del cliente según su tier
 */
export function obtenerBeneficios(tier: ClientTier): string[] {
  return TIER_CONFIG[tier].beneficios;
}

/**
 * Calcula puntos faltantes para siguiente tier
 */
export async function puntosFaltantesProximoTier(clienteId: string): Promise<{
  gastoActual: number;
  gastoProximo: number;
  faltaGastar: number;
  tierActual: ClientTier;
  tierProximo: ClientTier;
}> {
  const perfil = await obtenerPerfil(clienteId);
  const tiers: ClientTier[] = ['bronce', 'plata', 'oro', 'platino'];
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
