import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Mesa } from '@/types/mesa';
import type { RegistrarTurnoEsperaInput, TurnoEspera } from '@/types/espera';
import {
  actualizarEstadoTurnoEspera,
  marcarTurnoNotificado,
  notificarTurnoWhatsApp,
  onListaEsperaHoyChange,
  registrarTurnoEspera,
  sentarTurnoEnMesa,
} from '@/services/esperaService';
import { estimarTiempoEsperaMinutos } from '@/utils/esperaUtils';
import { createToast } from '@/components/ui/Toast';

export interface UseListaEsperaResult {
  turnosHoy: TurnoEspera[];
  turnosActivos: TurnoEspera[];
  turnosSentados: TurnoEspera[];
  turnosCerrados: TurnoEspera[];
  loading: boolean;
  error: string | null;
  tiempoEstimadoBase: number;
  estimarParaGrupo: (personas: number, zonaPreferida?: string) => number;
  registrarWalkIn: (input: RegistrarTurnoEsperaInput) => Promise<TurnoEspera>;
  notificarWhatsApp: (
    turno: TurnoEspera,
    negocioNombre: string,
    mesaSugerida?: Pick<Mesa, 'id' | 'numero' | 'nombre'>
  ) => Promise<{ mensaje: string; enviadoPorSistema: boolean }>;
  marcarNotificado: (turnoId: string) => Promise<void>;
  sentarEnMesa: (params: {
    turnoId: string;
    mesaId: string;
    mesero?: string;
    meseroId?: string;
    meseroNombre?: string;
  }) => Promise<{ cuentaMesaId: string; mesaNumero: number; mesaNombre: string }>;
  cancelarTurno: (turnoId: string) => Promise<void>;
  marcarNoShow: (turnoId: string) => Promise<void>;
}

export function useListaEspera(negocioId: string, mesas: Mesa[] = []): UseListaEsperaResult {
  const [turnosHoy, setTurnosHoy] = useState<TurnoEspera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!negocioId) {
      setTurnosHoy([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = onListaEsperaHoyChange(
      negocioId,
      (lista) => {
        setTurnosHoy(lista);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message || 'Error al cargar lista de espera');
        setLoading(false);
      }
    );

    return () => unsub();
  }, [negocioId]);

  const turnosActivos = useMemo(
    () => turnosHoy.filter((t) => t.estado === 'esperando' || t.estado === 'notificado'),
    [turnosHoy]
  );

  const turnosSentados = useMemo(
    () => turnosHoy.filter((t) => t.estado === 'sentado'),
    [turnosHoy]
  );

  const turnosCerrados = useMemo(
    () =>
      turnosHoy.filter(
        (t) => t.estado === 'sentado' || t.estado === 'cancelado' || t.estado === 'no_show'
      ),
    [turnosHoy]
  );

  const estimarParaGrupo = useCallback(
    (personas: number, zonaPreferida?: string) =>
      estimarTiempoEsperaMinutos({
        mesas,
        turnosActivos,
        personas,
        zonaPreferida,
      }),
    [mesas, turnosActivos]
  );

  const tiempoEstimadoBase = useMemo(
    () => estimarParaGrupo(2, 'Cualquiera'),
    [estimarParaGrupo]
  );

  const registrarWalkIn = useCallback(
    async (input: RegistrarTurnoEsperaInput): Promise<TurnoEspera> => {
      const tiempoCalculado =
        typeof input.tiempoEstimadoMin === 'number'
          ? input.tiempoEstimadoMin
          : estimarParaGrupo(input.personas, input.zonaPreferida);

      const creado = await registrarTurnoEspera(negocioId, {
        ...input,
        tiempoEstimadoMin: tiempoCalculado,
      });
      createToast(
        `Turno ${creado.codigoTurno} registrado para ${creado.clienteNombre}`,
        'success'
      );
      return creado;
    },
    [negocioId, estimarParaGrupo]
  );

  const notificarWhatsApp = useCallback(
    async (
      turno: TurnoEspera,
      negocioNombre: string,
      mesaSugerida?: Pick<Mesa, 'id' | 'numero' | 'nombre'>
    ) => {
      const res = await notificarTurnoWhatsApp(negocioId, turno, negocioNombre, mesaSugerida);
      createToast(`Aviso de mesa lista enviado a ${turno.clienteNombre}`, 'success');
      return res;
    },
    [negocioId]
  );

  const marcarNotificado = useCallback(
    async (turnoId: string) => {
      await marcarTurnoNotificado(negocioId, turnoId);
      createToast('Comensal marcado como llamado', 'info');
    },
    [negocioId]
  );

  const sentarEnMesa = useCallback(
    async (params: {
      turnoId: string;
      mesaId: string;
      mesero?: string;
      meseroId?: string;
      meseroNombre?: string;
    }) => {
      const res = await sentarTurnoEnMesa(negocioId, params);
      createToast(`Grupo sentado en ${res.mesaNombre}`, 'success');
      return res;
    },
    [negocioId]
  );

  const cancelarTurno = useCallback(
    async (turnoId: string) => {
      await actualizarEstadoTurnoEspera(negocioId, turnoId, 'cancelado');
      createToast('Turno cancelado', 'info');
    },
    [negocioId]
  );

  const marcarNoShow = useCallback(
    async (turnoId: string) => {
      await actualizarEstadoTurnoEspera(negocioId, turnoId, 'no_show');
      createToast('Turno marcado como no se presentó', 'info');
    },
    [negocioId]
  );

  return {
    turnosHoy,
    turnosActivos,
    turnosSentados,
    turnosCerrados,
    loading,
    error,
    tiempoEstimadoBase,
    estimarParaGrupo,
    registrarWalkIn,
    notificarWhatsApp,
    marcarNotificado,
    sentarEnMesa,
    cancelarTurno,
    marcarNoShow,
  };
}
