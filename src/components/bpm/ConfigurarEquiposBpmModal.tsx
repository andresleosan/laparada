import React, { useEffect, useId, useState } from 'react';
import { Plus, RefreshCw, Settings2, Trash2, X } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { Button } from '@/components/ui/Button';
import { createToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import type {
  ConfiguracionBpm,
  EquipoBpmConfig,
  FreidoraBpmConfig,
  TipoEquipoBpm,
} from '@/types/bpm';
import {
  EQUIPOS_BPM_DEFAULT,
  FREIDORAS_BPM_DEFAULT,
  RANGOS_NORMATIVOS_BPM,
} from '@/utils/bpmUtils';

export interface ConfigurarEquiposBpmModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfiguracionBpm;
  onGuardar: (
    input: Partial<Omit<ConfiguracionBpm, 'negocioId'>> & { actualizadoPor?: string }
  ) => Promise<void>;
}

export function ConfigurarEquiposBpmModal({
  isOpen,
  onClose,
  config,
  onGuardar,
}: ConfigurarEquiposBpmModalProps) {
  const generatedId = useId();
  const titleId = `config-equipos-bpm-${generatedId.replace(/:/g, '')}-title`;

  let responsableDefault = 'Administrador';
  try {
    const authCtx = useAuth();
    responsableDefault =
      authCtx.user?.displayName || authCtx.user?.email || 'Administrador';
  } catch {
    // Fallback seguro
  }

  const [equipos, setEquipos] = useState<EquipoBpmConfig[]>(config.equiposFrio);
  const [freidoras, setFreidoras] = useState<FreidoraBpmConfig[]>(config.freidoras);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setEquipos(config.equiposFrio.map((e) => ({ ...e })));
    setFreidoras(config.freidoras.map((f) => ({ ...f })));
  }, [isOpen, config]);

  if (!isOpen) return null;

  const handleAgregarEquipo = () => {
    setEquipos((prev) => [
      ...prev,
      {
        id: `eq-${Date.now()}`,
        nombre: `Nevera Auxiliar #${prev.length + 1}`,
        tipo: 'refrigeracion',
        ubicacion: 'Cocina',
        tempMinOptimaC: 0,
        tempMaxOptimaC: 4,
        activo: true,
      },
    ]);
  };

  const handleAgregarFreidora = () => {
    setFreidoras((prev) => [
      ...prev,
      {
        id: `fre-${Date.now()}`,
        nombre: `Freidora #${prev.length + 1}`,
        capacidadLitros: 15,
        cicloMaxDiasCambio: 3,
        activo: true,
      },
    ]);
  };

  const handleRestaurarDefaults = () => {
    setEquipos(EQUIPOS_BPM_DEFAULT.map((e) => ({ ...e })));
    setFreidoras(FREIDORAS_BPM_DEFAULT.map((f) => ({ ...f })));
    createToast('Valores normativos INVIMA cargados en la vista previa', 'info');
  };

  const handleTipoEquipoChange = (idx: number, tipo: TipoEquipoBpm) => {
    const norm = RANGOS_NORMATIVOS_BPM[tipo];
    setEquipos((prev) =>
      prev.map((eq, i) =>
        i === idx
          ? {
              ...eq,
              tipo,
              tempMinOptimaC: norm.minOptimoC,
              tempMaxOptimaC: norm.maxOptimoC,
            }
          : eq
      )
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await onGuardar({
        equiposFrio: equipos,
        freidoras,
        actualizadoPor: responsableDefault,
      });
      createToast('Equipos y freidoras BPM actualizados', 'success');
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'No se pudo guardar la configuración BPM';
      createToast(msg, 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      onBackdropClick={() => {
        if (!guardando) onClose();
      }}
      canClose={!guardando}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-3xl max-h-[92dvh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 text-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/30 bg-gold-400/10 text-gold-400">
              <Settings2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-white">
                Configurar Equipos Térmicos y Freidoras
              </h2>
              <p className="text-xs text-neutral-400">
                Parametriza rangos óptimos en °C y ciclos máximos de aceite
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar configuración de equipos BPM"
            className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-5">
          {/* Equipos de frío / calor */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gold-400">
                Equipos de Frío y Calor ({equipos.length})
              </h3>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAgregarEquipo}
                className="min-h-[44px] text-xs"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Agregar Equipo</span>
              </Button>
            </div>

            <div className="space-y-2.5">
              {equipos.map((eq, idx) => (
                <div
                  key={eq.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2.5 rounded-xl border border-neutral-800 bg-neutral-950/70 p-3"
                >
                  <div className="md:col-span-4">
                    <label className="mb-1 block text-[10px] font-bold uppercase text-neutral-400">
                      Nombre
                    </label>
                    <input
                      type="text"
                      value={eq.nombre}
                      onChange={(e) =>
                        setEquipos((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, nombre: e.target.value } : item
                          )
                        )
                      }
                      className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-xs text-white"
                      required
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-[10px] font-bold uppercase text-neutral-400">
                      Tipo
                    </label>
                    <select
                      value={eq.tipo}
                      onChange={(e) =>
                        handleTipoEquipoChange(idx, e.target.value as TipoEquipoBpm)
                      }
                      className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-900 px-2.5 text-xs text-white"
                    >
                      <option value="refrigeracion">Refrigeración</option>
                      <option value="congelacion">Congelación</option>
                      <option value="caliente">Caliente</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-[10px] font-bold uppercase text-neutral-400">
                      Mín / Máx °C
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.5"
                        value={eq.tempMinOptimaC}
                        onChange={(e) =>
                          setEquipos((prev) =>
                            prev.map((item, i) =>
                              i === idx
                                ? { ...item, tempMinOptimaC: Number(e.target.value) }
                                : item
                            )
                          )
                        }
                        aria-label={`Temperatura mínima óptima de ${eq.nombre}`}
                        className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-900 px-2 text-xs text-white"
                      />
                      <input
                        type="number"
                        step="0.5"
                        value={eq.tempMaxOptimaC}
                        onChange={(e) =>
                          setEquipos((prev) =>
                            prev.map((item, i) =>
                              i === idx
                                ? { ...item, tempMaxOptimaC: Number(e.target.value) }
                                : item
                            )
                          )
                        }
                        aria-label={`Temperatura máxima óptima de ${eq.nombre}`}
                        className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-900 px-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="md:col-span-3 flex items-end justify-between gap-2">
                    <div className="flex-1">
                      <label className="mb-1 block text-[10px] font-bold uppercase text-neutral-400">
                        Ubicación
                      </label>
                      <input
                        type="text"
                        value={eq.ubicacion}
                        onChange={(e) =>
                          setEquipos((prev) =>
                            prev.map((item, i) =>
                              i === idx ? { ...item, ubicacion: e.target.value } : item
                            )
                          )
                        }
                        className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-900 px-2.5 text-xs text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setEquipos((prev) => prev.filter((_, i) => i !== idx))
                      }
                      disabled={equipos.length <= 1}
                      aria-label={`Eliminar equipo ${eq.nombre}`}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-red-500/30 bg-red-950/30 text-red-400 hover:bg-red-900/40 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Freidoras */}
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400">
                Freidoras Monitoreadas ({freidoras.length})
              </h3>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAgregarFreidora}
                className="min-h-[44px] text-xs"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Agregar Freidora</span>
              </Button>
            </div>

            <div className="space-y-2.5">
              {freidoras.map((fr, idx) => (
                <div
                  key={fr.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2.5 rounded-xl border border-neutral-800 bg-neutral-950/70 p-3"
                >
                  <div className="md:col-span-6">
                    <label className="mb-1 block text-[10px] font-bold uppercase text-neutral-400">
                      Nombre de Freidora
                    </label>
                    <input
                      type="text"
                      value={fr.nombre}
                      onChange={(e) =>
                        setFreidoras((prev) =>
                          prev.map((item, i) =>
                            i === idx ? { ...item, nombre: e.target.value } : item
                          )
                        )
                      }
                      className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-xs text-white"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-[10px] font-bold uppercase text-neutral-400">
                      Litros (L)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="500"
                      value={fr.capacidadLitros}
                      onChange={(e) =>
                        setFreidoras((prev) =>
                          prev.map((item, i) =>
                            i === idx
                              ? { ...item, capacidadLitros: Number(e.target.value) }
                              : item
                          )
                        )
                      }
                      className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-xs text-white"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="mb-1 block text-[10px] font-bold uppercase text-neutral-400">
                      Ciclo Máx (Días)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={fr.cicloMaxDiasCambio}
                      onChange={(e) =>
                        setFreidoras((prev) =>
                          prev.map((item, i) =>
                            i === idx
                              ? { ...item, cicloMaxDiasCambio: Number(e.target.value) }
                              : item
                          )
                        )
                      }
                      className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-xs text-white"
                    />
                  </div>
                  <div className="md:col-span-1 flex items-end justify-end">
                    <button
                      type="button"
                      onClick={() =>
                        setFreidoras((prev) => prev.filter((_, i) => i !== idx))
                      }
                      aria-label={`Eliminar freidora ${fr.nombre}`}
                      className="grid h-11 w-11 place-items-center rounded-xl border border-red-500/30 bg-red-950/30 text-red-400 hover:bg-red-900/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleRestaurarDefaults}
              className="min-h-[44px] text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Restaurar Defaults INVIMA</span>
            </Button>

            <div className="flex items-center gap-2.5">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={guardando}
                className="min-h-[44px]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={guardando}
                disabled={guardando}
                className="min-h-[44px] font-bold"
              >
                Guardar Configuración BPM
              </Button>
            </div>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
