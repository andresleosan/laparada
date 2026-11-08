// src/hooks/usePromociones.ts
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNegocio } from '@/context/NegocioContext';
import type {
  CanalPromocion,
  CrearPromocionInput,
  KpisPromociones,
  Promocion,
  ResultadoEvaluacionPromocion,
} from '@/types/promocion';
import type { ItemVenta } from '@/types';
import {
  actualizarPromocion,
  crearPromocion,
  eliminarPromocion,
  onPromocionesChange,
  registrarUsoCupon,
  toggleActivarPromocion,
} from '@/services/promocionesService';
import {
  calcularKpisPromociones,
  estaPromocionVigente,
  evaluarPromocionesParaCarrito,
  exportarPromocionesCsv,
  validarCodigoCupon,
} from '@/utils/promocionesUtils';
import { createToast } from '@/components/ui/Toast';

export type TabPromociones = 'todas' | 'happy_hour' | 'dos_por_uno' | 'categoria' | 'cupones';

export function usePromociones() {
  const { negocioActual } = useNegocio();
  const negocioId = negocioActual?.id || '';
  const negocioNombre = negocioActual?.nombre || 'La Parada';
  const negocioSlug = negocioActual?.slug || 'laparada';

  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reloj interno para reactividad temporal (actualiza cada 30 segundos)
  const [reloj, setReloj] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setReloj(new Date());
    }, 30_000);
    return () => clearInterval(timer);
  }, []);

  // Filtros
  const [tab, setTab] = useState<TabPromociones>('todas');
  const [canalFiltro, setCanalFiltro] = useState<CanalPromocion>('todos');
  const [busqueda, setBusqueda] = useState('');

  // Suscripción en tiempo real
  useEffect(() => {
    if (!negocioId) {
      setPromociones([]);
      setCargando(false);
      return;
    }

    setCargando(true);
    setError(null);

    const unsubscribe = onPromocionesChange(negocioId, (items) => {
      setPromociones(items);
      setCargando(false);
    });

    return () => {
      unsubscribe();
    };
  }, [negocioId]);

  // Promociones vigentes en este instante
  const promocionesVigentes = useMemo(() => {
    return promociones.filter((p) => estaPromocionVigente(p, reloj));
  }, [promociones, reloj]);

  // Happy Hours en vivo ahora
  const happyHoursEnVivo = useMemo(() => {
    return promociones.filter((p) => p.tipo === 'happy_hour' && estaPromocionVigente(p, reloj));
  }, [promociones, reloj]);

  // KPIs
  const kpis: KpisPromociones = useMemo(() => {
    return calcularKpisPromociones(promociones, reloj);
  }, [promociones, reloj]);

  // Promociones filtradas para la vista
  const promocionesFiltradas = useMemo(() => {
    return promociones.filter((p) => {
      // Filtro de pestaña
      if (tab === 'happy_hour' && p.tipo !== 'happy_hour') return false;
      if (tab === 'dos_por_uno' && p.tipo !== 'dos_por_uno') return false;
      if (tab === 'categoria' && p.tipo !== 'descuento_categoria') return false;
      if (tab === 'cupones' && p.tipo !== 'cupon_descuento') return false;

      // Filtro de canal
      if (
        canalFiltro !== 'todos' &&
        p.canales &&
        !p.canales.includes('todos') &&
        !p.canales.includes(canalFiltro)
      ) {
        return false;
      }

      // Filtro de búsqueda
      if (busqueda.trim()) {
        const query = busqueda.trim().toLowerCase();
        const coincideNombre = p.nombre.toLowerCase().includes(query);
        const coincideDesc = p.descripcion?.toLowerCase().includes(query) ?? false;
        const coincideCupon = p.codigoCupon?.toLowerCase().includes(query) ?? false;
        if (!coincideNombre && !coincideDesc && !coincideCupon) {
          return false;
        }
      }

      return true;
    });
  }, [promociones, tab, canalFiltro, busqueda]);

  // Acciones
  const crearPromocionAction = useCallback(
    async (input: Omit<CrearPromocionInput, 'negocioId'>) => {
      if (!negocioId) {
        createToast('No se encontró el negocio activo', 'error');
        return;
      }
      try {
        await crearPromocion({ ...input, negocioId });
        createToast('¡Promoción guardada con éxito!', 'success');
      } catch (err) {
        console.error('Error al crear promoción:', err);
        const msg = err instanceof Error ? err.message : 'Error al guardar la promoción';
        createToast(msg, 'error');
        throw err;
      }
    },
    [negocioId]
  );

  const actualizarPromocionAction = useCallback(
    async (promocionId: string, datos: Partial<Promocion>) => {
      if (!negocioId) return;
      try {
        await actualizarPromocion(negocioId, promocionId, datos);
        createToast('Promoción actualizada con éxito', 'success');
      } catch (err) {
        console.error('Error al actualizar promoción:', err);
        const msg = err instanceof Error ? err.message : 'Error al actualizar la promoción';
        createToast(msg, 'error');
        throw err;
      }
    },
    [negocioId]
  );

  const toggleActivarAction = useCallback(
    async (promocionId: string, activo: boolean) => {
      if (!negocioId) return;
      try {
        await toggleActivarPromocion(negocioId, promocionId, activo);
        createToast(activo ? 'Promoción activada' : 'Promoción desactivada', 'info');
      } catch (err) {
        console.error('Error al cambiar estado de promoción:', err);
        createToast('Error al modificar estado', 'error');
      }
    },
    [negocioId]
  );

  const eliminarPromocionAction = useCallback(
    async (promocionId: string) => {
      if (!negocioId) return;
      try {
        await eliminarPromocion(negocioId, promocionId);
        createToast('Promoción eliminada correctamente', 'success');
      } catch (err) {
        console.error('Error al eliminar promoción:', err);
        createToast('Error al eliminar', 'error');
      }
    },
    [negocioId]
  );

  const registrarUsoCuponAction = useCallback(
    async (promocionId: string) => {
      if (!negocioId) return;
      try {
        await registrarUsoCupon(negocioId, promocionId);
      } catch (err) {
        console.error('Error al registrar uso de cupón:', err);
      }
    },
    [negocioId]
  );

  const evaluarCarrito = useCallback(
    (
      items: ItemVenta[],
      subtotal?: number,
      canal: CanalPromocion = 'todos',
      codigoCupon?: string,
      categoriaMap?: Record<string, string>
    ): ResultadoEvaluacionPromocion[] => {
      return evaluarPromocionesParaCarrito({
        promociones,
        items,
        subtotal,
        canal,
        codigoCupon,
        ahora: reloj,
        categoriaPorProductoMap: categoriaMap,
      });
    },
    [promociones, reloj]
  );

  const validarCupon = useCallback(
    (codigo: string, subtotal: number, canal: CanalPromocion = 'todos') => {
      return validarCodigoCupon(promociones, codigo, subtotal, canal, reloj);
    },
    [promociones, reloj]
  );

  const descargarCsv = useCallback(() => {
    if (promociones.length === 0) {
      createToast('No hay promociones para exportar', 'info');
      return;
    }
    const csvData = exportarPromocionesCsv(promociones);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Promociones_${negocioSlug}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    createToast('Catálogo de promociones exportado a Excel (CSV)', 'success');
  }, [promociones, negocioSlug]);

  return {
    promociones,
    promocionesFiltradas,
    promocionesVigentes,
    happyHoursEnVivo,
    kpis,
    cargando,
    error,
    reloj,
    tab,
    setTab,
    canalFiltro,
    setCanalFiltro,
    busqueda,
    setBusqueda,
    negocioNombre,
    negocioSlug,
    crearPromocionAction,
    actualizarPromocionAction,
    toggleActivarAction,
    eliminarPromocionAction,
    registrarUsoCuponAction,
    evaluarCarrito,
    validarCupon,
    descargarCsv,
  };
}
