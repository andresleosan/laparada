import { useEffect, useMemo, useState } from 'react';
import {
  Clock,
  CheckCircle2,
  PauseCircle,
  Lock,
  Copy,
  Loader2,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { createToast } from '@/components/ui/Toast';
import { actualizarDatosNegocio } from '@/services/negociosService';
import type {
  ConfiguracionHorariosNegocio,
  DiaSemanaHorario,
  EstadoOperativoManual,
} from '@/types/negocio';
import {
  crearConfigHorariosDefault,
  DIAS_SEMANA_LABELS,
  DIAS_SEMANA_ORDEN,
  evaluarDisponibilidadNegocio,
  sanitizarConfigHorarios,
  validarHorarioDia,
} from '@/utils/horariosUtils';

interface HorariosDisponibilidadCardProps {
  negocioId: string;
  configInicial?: ConfiguracionHorariosNegocio | null;
  onGuardado?: () => Promise<void> | void;
}

const DURACIONES_PAUSA_MIN = [15, 30, 45, 60] as const;

export function HorariosDisponibilidadCard({
  negocioId,
  configInicial,
  onGuardado,
}: HorariosDisponibilidadCardProps) {
  const [config, setConfig] = useState<ConfiguracionHorariosNegocio>(() => {
    return sanitizarConfigHorarios(configInicial) ?? crearConfigHorariosDefault();
  });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setConfig(sanitizarConfigHorarios(configInicial) ?? crearConfigHorariosDefault());
  }, [configInicial]);

  const disponibilidadPreview = useMemo(
    () => evaluarDisponibilidadNegocio(config),
    [config]
  );

  const erroresDias = useMemo(() => {
    const errores: Partial<Record<DiaSemanaHorario, string>> = {};
    for (const dia of DIAS_SEMANA_ORDEN) {
      const h = config.dias[dia];
      if (h.activo) {
        const err = validarHorarioDia(h.apertura, h.cierre);
        if (err) errores[dia] = err;
      }
    }
    return errores;
  }, [config.dias]);

  const tieneErrores = Object.keys(erroresDias).length > 0;

  const handleCambiarEstadoManual = (estadoManual: EstadoOperativoManual) => {
    setConfig((prev) => ({
      ...prev,
      estadoManual,
      pausaHastaMs:
        estadoManual === 'pausa_cocina'
          ? prev.pausaHastaMs && prev.pausaHastaMs > Date.now()
            ? prev.pausaHastaMs
            : Date.now() + 30 * 60_000
          : null,
    }));
  };

  const handleSeleccionarDuracionPausa = (minutos: number) => {
    setConfig((prev) => ({
      ...prev,
      estadoManual: 'pausa_cocina',
      pausaHastaMs: Date.now() + minutos * 60_000,
    }));
  };

  const handleToggleDia = (dia: DiaSemanaHorario) => {
    setConfig((prev) => ({
      ...prev,
      dias: {
        ...prev.dias,
        [dia]: {
          ...prev.dias[dia],
          activo: !prev.dias[dia].activo,
        },
      },
    }));
  };

  const handleChangeHora = (
    dia: DiaSemanaHorario,
    campo: 'apertura' | 'cierre',
    valor: string
  ) => {
    setConfig((prev) => ({
      ...prev,
      dias: {
        ...prev.dias,
        [dia]: {
          ...prev.dias[dia],
          [campo]: valor,
        },
      },
    }));
  };

  const handleCopiarLunesATodos = () => {
    const lunes = config.dias.lunes;
    setConfig((prev) => {
      const nextDias = { ...prev.dias };
      for (const dia of DIAS_SEMANA_ORDEN) {
        nextDias[dia] = { ...lunes };
      }
      return { ...prev, dias: nextDias };
    });
    createToast('Horario del lunes copiado a toda la semana', 'info');
  };

  const handleGuardar = async () => {
    if (tieneErrores) {
      createToast('Corrige los horarios inválidos antes de guardar', 'error');
      return;
    }

    setGuardando(true);
    try {
      await actualizarDatosNegocio(negocioId, { configHorarios: config });
      createToast('Horarios y disponibilidad operativa guardados', 'success');
      await onGuardado?.();
    } catch (error) {
      console.error('Error guardando horarios:', error);
      createToast('No se pudieron guardar los horarios del negocio', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const badgeStyle =
    disponibilidadPreview.estado === 'abierto'
      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
      : disponibilidadPreview.estado === 'pausa_cocina'
        ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
        : 'bg-red-500/15 text-red-300 border-red-500/40';

  return (
    <Card className="p-6 space-y-6 bg-neutral-900 border-neutral-800">
      {/* Cabecera y vista previa en vivo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <h3 className="text-lg font-display font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            Horarios de Atención y Disponibilidad Operativa
          </h3>
          <p className="text-xs text-neutral-400 mt-1">
            Controla en tiempo real cuándo el Storefront Web, Kiosco y WhatsApp Bot aceptan pedidos nuevos (zona Colombia).
          </p>
        </div>

        <div
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold ${badgeStyle}`}
          data-testid="preview-disponibilidad-badge"
        >
          {disponibilidadPreview.estado === 'abierto' && <CheckCircle2 className="w-4 h-4" />}
          {disponibilidadPreview.estado === 'pausa_cocina' && <PauseCircle className="w-4 h-4" />}
          {disponibilidadPreview.estado === 'cerrado' && <Lock className="w-4 h-4" />}
          <span>{disponibilidadPreview.motivo}</span>
        </div>
      </div>

      {/* Control Rápido de Estado Operativo */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Modo Operativo Actual
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            aria-pressed={config.estadoManual === 'automatico'}
            onClick={() => handleCambiarEstadoManual('automatico')}
            className={`min-h-[44px] px-4 py-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
              config.estadoManual === 'automatico'
                ? 'bg-amber-500/15 border-amber-400 text-amber-300'
                : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
            }`}
          >
            <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold">Automático</p>
              <p className="text-[11px] opacity-80">Según horario del día</p>
            </div>
          </button>

          <button
            type="button"
            aria-pressed={config.estadoManual === 'abierto_forzado'}
            onClick={() => handleCambiarEstadoManual('abierto_forzado')}
            className={`min-h-[44px] px-4 py-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
              config.estadoManual === 'abierto_forzado'
                ? 'bg-emerald-500/15 border-emerald-400 text-emerald-300'
                : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold">Abierto Forzado</p>
              <p className="text-[11px] opacity-80">Recibir pedidos ahora</p>
            </div>
          </button>

          <button
            type="button"
            aria-pressed={config.estadoManual === 'pausa_cocina'}
            onClick={() => handleCambiarEstadoManual('pausa_cocina')}
            className={`min-h-[44px] px-4 py-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
              config.estadoManual === 'pausa_cocina'
                ? 'bg-orange-500/15 border-orange-400 text-orange-300'
                : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
            }`}
          >
            <PauseCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold">Pausa en Cocina</p>
              <p className="text-[11px] opacity-80">Freno temporal por demanda</p>
            </div>
          </button>

          <button
            type="button"
            aria-pressed={config.estadoManual === 'cerrado_manual'}
            onClick={() => handleCambiarEstadoManual('cerrado_manual')}
            className={`min-h-[44px] px-4 py-3 rounded-xl border text-left transition flex items-start gap-2.5 ${
              config.estadoManual === 'cerrado_manual'
                ? 'bg-red-500/15 border-red-400 text-red-300'
                : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
            }`}
          >
            <Lock className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-bold">Cerrado Manual</p>
              <p className="text-[11px] opacity-80">Bloquear pedidos hoy</p>
            </div>
          </button>
        </div>

        {/* Opciones adicionales para Pausa de Cocina o Cierre Manual */}
        {(config.estadoManual === 'pausa_cocina' || config.estadoManual === 'cerrado_manual') && (
          <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
            {config.estadoManual === 'pausa_cocina' && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-neutral-300">
                  Duración estimada de la pausa en cocina:
                </p>
                <div className="flex flex-wrap gap-2">
                  {DURACIONES_PAUSA_MIN.map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => handleSeleccionarDuracionPausa(min)}
                      className="min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold bg-neutral-900 border border-neutral-700 text-amber-300 hover:border-amber-400 transition"
                    >
                      +{min} min
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        pausaHastaMs: null,
                      }))
                    }
                    className={`min-h-[44px] px-3.5 py-2 rounded-lg text-xs font-semibold border transition ${
                      config.pausaHastaMs === null
                        ? 'bg-orange-500/20 border-orange-400 text-orange-300'
                        : 'bg-neutral-900 border-neutral-700 text-neutral-300 hover:border-neutral-500'
                    }`}
                  >
                    Hasta reanudar manualmente
                  </button>
                </div>
              </div>
            )}

            <Input
              label="Mensaje visible para el cliente (opcional)"
              placeholder={
                config.estadoManual === 'pausa_cocina'
                  ? 'Ej: Alta demanda en cocina, volvemos en 20 minutos'
                  : 'Ej: Cerrado por mantenimiento / festivo'
              }
              value={config.motivoCierreOPausa || ''}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, motivoCierreOPausa: e.target.value }))
              }
              maxLength={140}
            />
          </div>
        )}
      </div>

      {/* Grilla Semanal de Horarios */}
      <div className="space-y-3 pt-2 border-t border-neutral-800">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Horario Semanal por Día
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopiarLunesATodos}
            className="min-h-[44px] text-amber-400 hover:text-amber-300"
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Copiar Lunes a toda la semana
          </Button>
        </div>

        <div className="space-y-2.5">
          {DIAS_SEMANA_ORDEN.map((dia) => {
            const h = config.dias[dia];
            const cruzaMedianoche = h.activo && h.cierre < h.apertura;
            const errorDia = erroresDias[dia];

            return (
              <div
                key={dia}
                className={`p-3 rounded-xl border transition ${
                  h.activo
                    ? 'bg-neutral-950 border-neutral-800'
                    : 'bg-neutral-950/50 border-neutral-900 opacity-70'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-[140px]">
                    <button
                      type="button"
                      aria-pressed={h.activo}
                      aria-label={`Activar o desactivar horario de ${DIAS_SEMANA_LABELS[dia]}`}
                      onClick={() => handleToggleDia(dia)}
                      className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                        h.activo
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-neutral-900 border-neutral-700 text-neutral-400'
                      }`}
                    >
                      {h.activo ? 'Abierto' : 'Cerrado'}
                    </button>
                    <span className="text-sm font-semibold text-white">
                      {DIAS_SEMANA_LABELS[dia]}
                    </span>
                  </div>

                  {h.activo && (
                    <div className="flex flex-wrap items-center gap-2.5">
                      <label className="flex items-center gap-1.5 text-xs text-neutral-400">
                        <span>Abre</span>
                        <input
                          type="time"
                          value={h.apertura}
                          onChange={(e) => handleChangeHora(dia, 'apertura', e.target.value)}
                          aria-label={`Hora de apertura ${DIAS_SEMANA_LABELS[dia]}`}
                          className="min-h-[44px] px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-sm focus:outline-none focus:border-amber-400"
                        />
                      </label>

                      <span className="text-neutral-500 text-xs">a</span>

                      <label className="flex items-center gap-1.5 text-xs text-neutral-400">
                        <span>Cierra</span>
                        <input
                          type="time"
                          value={h.cierre}
                          onChange={(e) => handleChangeHora(dia, 'cierre', e.target.value)}
                          aria-label={`Hora de cierre ${DIAS_SEMANA_LABELS[dia]}`}
                          className="min-h-[44px] px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-700 text-white text-sm focus:outline-none focus:border-amber-400"
                        />
                      </label>

                      {cruzaMedianoche && (
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          +1 día (trasnoche)
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {errorDia && (
                  <p className="text-xs text-red-400 mt-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    {errorDia}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <Button
          type="button"
          onClick={handleGuardar}
          disabled={guardando || tieneErrores}
          className="min-h-[44px] bg-amber-500 hover:bg-amber-600 text-black font-bold px-6"
        >
          {guardando && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Guardar Horarios y Disponibilidad
        </Button>
      </div>
    </Card>
  );
}
