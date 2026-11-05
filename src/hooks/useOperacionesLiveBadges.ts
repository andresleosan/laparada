import { useEffect, useState } from 'react';
import { useNegocio } from '@/context/NegocioContext';
import { onMesasChange } from '@/services/mesasService';
import { onDomiciliosActivosChange } from '@/services/domiciliosService';

export interface OperacionesLiveBadges {
  cocina: number;
  mesas: number;
  domicilios: number;
}

export const INITIAL_LIVE_BADGES: OperacionesLiveBadges = {
  cocina: 0,
  mesas: 0,
  domicilios: 0,
};

/**
 * Hook reactivo y defensivo que escucha los contadores operativos
 * para alimentar los badges en vivo del menú lateral (Toast POS Rail)
 * y barra de navegación móvil.
 */
export function useOperacionesLiveBadges(): OperacionesLiveBadges {
  const { negocioActual } = useNegocio();
  const [counts, setCounts] = useState<OperacionesLiveBadges>(INITIAL_LIVE_BADGES);

  useEffect(() => {
    const tenantId = negocioActual?.id;
    if (!tenantId) {
      setCounts(INITIAL_LIVE_BADGES);
      return;
    }

    let unsubMesas: (() => void) | undefined;
    let unsubDomicilios: (() => void) | undefined;

    try {
      unsubMesas = onMesasChange(
        tenantId,
        (mesas) => {
          // Contamos mesas ocupadas o con comanda/cuenta abierta
          const mesasAbiertas = mesas.filter(
            (m) => m.estado === 'ocupada' || m.estado === 'por_cobrar' || Boolean(m.cuentaActivaId)
          ).length;

          setCounts((prev) => (prev.mesas === mesasAbiertas ? prev : { ...prev, mesas: mesasAbiertas }));
        },
        (error) => {
          console.warn('[useOperacionesLiveBadges] Error en listener de mesas:', error);
        }
      );
    } catch (e) {
      console.warn('[useOperacionesLiveBadges] Fallo al iniciar listener de mesas:', e);
    }

    try {
      unsubDomicilios = onDomiciliosActivosChange(
        tenantId,
        (domicilios) => {
          // Cocina: pedidos en espera de preparación o preparándose
          const comandasCocina = domicilios.filter(
            (d) => d.estado === 'pendiente' || d.estado === 'en_preparacion'
          ).length;

          // Domicilios activos en preparación o en camino
          const enviosActivos = domicilios.filter(
            (d) => d.estado === 'pendiente' || d.estado === 'en_preparacion' || d.estado === 'en_camino'
          ).length;

          setCounts((prev) => {
            if (prev.cocina === comandasCocina && prev.domicilios === enviosActivos) {
              return prev;
            }
            return {
              ...prev,
              cocina: comandasCocina,
              domicilios: enviosActivos,
            };
          });
        },
        (error) => {
          console.warn('[useOperacionesLiveBadges] Error en listener de domicilios:', error);
        }
      );
    } catch (e) {
      console.warn('[useOperacionesLiveBadges] Fallo al iniciar listener de domicilios:', e);
    }

    return () => {
      if (unsubMesas) unsubMesas();
      if (unsubDomicilios) unsubDomicilios();
    };
  }, [negocioActual?.id]);

  return counts;
}

