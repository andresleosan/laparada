import { useCallback, useMemo, useState } from 'react';
import { useProductos } from '@/hooks/useProductos';
import { useNegocio } from '@/context/NegocioContext';
import { useHoraActual } from '@/hooks/useHoraActual';
import {
  activar86Item,
  ajustarPorcionesItem86,
  guardarEspecialDelDiaItem,
  reactivarItem86,
  restablecerTodosLos86,
} from '@/services/control86Service';
import {
  calcularResumenTablero86,
  construirItemsTablero86,
} from '@/utils/control86Utils';
import { createToast } from '@/components/ui/Toast';
import type {
  EspecialDelDiaConfig,
  ItemCatalogo86,
  Motivo86,
  TipoItemCatalogo86,
} from '@/types';

export function useControl86() {
  const { negocioActual, usuarioNegocio, esSuperAdmin } = useNegocio();
  const { productos, combos, loading, error, refresh } = useProductos();
  const ahora = useHoraActual();
  const [actionLoadingKey, setActionLoadingKey] = useState<string | null>(null);

  const tenantId = negocioActual.id;
  const responsableNombre =
    usuarioNegocio?.nombre || usuarioNegocio?.email || 'Operador';
  const responsableRol = usuarioNegocio?.rol || (esSuperAdmin ? 'admin' : 'cajero');
  const puedeConfigurarEspeciales =
    esSuperAdmin || usuarioNegocio?.rol === 'admin';

  const items = useMemo(
    () => construirItemsTablero86(productos, combos, ahora),
    [productos, combos, ahora]
  );

  const resumen = useMemo(
    () => calcularResumenTablero86(productos, combos, ahora),
    [productos, combos, ahora]
  );

  const itemsEn86 = useMemo(
    () => items.filter((item) => item.evaluacion.agotado86),
    [items]
  );

  const itemsUltimasPorciones = useMemo(
    () => items.filter((item) => item.evaluacion.estado === 'ultimas_porciones'),
    [items]
  );

  const especialesVigentes = useMemo(
    () =>
      items.filter(
        (item) =>
          item.evaluacion.especial.esEspecialVigente &&
          !item.evaluacion.agotado86 &&
          item.evaluacion.disponibleBase
      ),
    [items]
  );

  const marcar86 = useCallback(
    async (
      item: Pick<ItemCatalogo86, 'id' | 'tipo' | 'nombre'>,
      motivo?: Motivo86,
      nota?: string
    ) => {
      const key = `${item.tipo}:${item.id}`;
      setActionLoadingKey(key);
      try {
        await activar86Item(tenantId, item.tipo, item.id, {
          motivo,
          nota,
          responsableNombre,
          responsableRol,
        });
        createToast(`🚫 "${item.nombre}" marcado en 86 (Agotado en vivo)`, 'info', 3000);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'No se pudo marcar en 86';
        createToast(msg, 'error');
        throw err;
      } finally {
        setActionLoadingKey(null);
      }
    },
    [tenantId, responsableNombre, responsableRol]
  );

  const reactivar86 = useCallback(
    async (
      item: Pick<ItemCatalogo86, 'id' | 'tipo' | 'nombre'>,
      porcionesIniciales?: number | null
    ) => {
      const key = `${item.tipo}:${item.id}`;
      setActionLoadingKey(key);
      try {
        await reactivarItem86(tenantId, item.tipo, item.id, {
          porcionesIniciales,
          activarContador: typeof porcionesIniciales === 'number' && porcionesIniciales > 0,
          responsableNombre,
        });
        createToast(`✅ "${item.nombre}" reactivado en todos los canales`, 'success', 2500);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'No se pudo reactivar el plato';
        createToast(msg, 'error');
        throw err;
      } finally {
        setActionLoadingKey(null);
      }
    },
    [tenantId, responsableNombre]
  );

  const ajustarPorciones = useCallback(
    async (
      item: Pick<ItemCatalogo86, 'id' | 'tipo' | 'nombre' | 'control86'>,
      porciones: number | null,
      opcionesExtra?: { umbralAlertaPorciones?: number; auto86AlLlegarACero?: boolean }
    ) => {
      const key = `${item.tipo}:${item.id}`;
      setActionLoadingKey(key);
      try {
        const contadorActivo = porciones !== null;
        await ajustarPorcionesItem86(tenantId, item.tipo, item.id, {
          contadorActivo,
          porcionesDisponibles: porciones,
          umbralAlertaPorciones:
            opcionesExtra?.umbralAlertaPorciones ?? item.control86?.umbralAlertaPorciones,
          auto86AlLlegarACero:
            opcionesExtra?.auto86AlLlegarACero ?? item.control86?.auto86AlLlegarACero,
          responsableNombre,
        });
        createToast(
          contadorActivo
            ? `🔢 "${item.nombre}": ${porciones} porciones disponibles`
            : `♾️ "${item.nombre}": sin límite de porciones`,
          'success',
          2200
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'No se pudo ajustar el contador';
        createToast(msg, 'error');
        throw err;
      } finally {
        setActionLoadingKey(null);
      }
    },
    [tenantId, responsableNombre]
  );

  const ajustarPorcionesDelta = useCallback(
    async (item: ItemCatalogo86, delta: number) => {
      const base = item.evaluacion.contadorActivo
        ? item.evaluacion.porcionesDisponibles ?? 0
        : 0;
      const siguiente = Math.max(0, base + delta);
      await ajustarPorciones(item, siguiente);
    },
    [ajustarPorciones]
  );

  const guardarEspecial = useCallback(
    async (
      tipo: TipoItemCatalogo86,
      itemId: string,
      nombre: string,
      config: EspecialDelDiaConfig | null
    ) => {
      const key = `${tipo}:${itemId}`;
      setActionLoadingKey(key);
      try {
        await guardarEspecialDelDiaItem(tenantId, tipo, itemId, config);
        createToast(
          config?.activo
            ? `⭐ "${nombre}" programado como ${config.etiqueta || 'Especial del Día'}`
            : `Programación de especial retirada de "${nombre}"`,
          'success',
          3000
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error guardando Especial del Día';
        createToast(msg, 'error');
        throw err;
      } finally {
        setActionLoadingKey(null);
      }
    },
    [tenantId]
  );

  const restablecerTurno86 = useCallback(async () => {
    if (itemsEn86.length === 0) return;
    setActionLoadingKey('__batch_reset__');
    try {
      const total = await restablecerTodosLos86(tenantId, itemsEn86, responsableNombre);
      createToast(`✅ Se reactivaron ${total} platos para el nuevo turno`, 'success', 3000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No se pudo restablecer la pizarra 86';
      createToast(msg, 'error');
      throw err;
    } finally {
      setActionLoadingKey(null);
    }
  }, [tenantId, itemsEn86, responsableNombre]);

  return {
    productos,
    combos,
    items,
    resumen,
    itemsEn86,
    itemsUltimasPorciones,
    especialesVigentes,
    ahora,
    loading,
    error,
    refresh,
    actionLoadingKey,
    puedeConfigurarEspeciales,
    marcar86,
    reactivar86,
    ajustarPorciones,
    ajustarPorcionesDelta,
    guardarEspecial,
    restablecerTurno86,
  };
}
