import { CalendarClock, Flame, Sparkles } from 'lucide-react';
import {
  DIAS_SEMANA_META,
  ETIQUETAS_ESPECIAL_SUGERIDAS,
  sanitizarControl86,
  sanitizarEspecialDelDia,
  UMBRAL_ALERTA_PORCIONES_DEFAULT,
} from '@/utils/control86Utils';
import type { Control86Item, DiaSemanaEspecial, EspecialDelDiaConfig } from '@/types';

interface EspecialDelDiaEditorProps {
  control86: Control86Item;
  onChangeControl86: (next: Control86Item) => void;
  especialDelDia: EspecialDelDiaConfig;
  onChangeEspecialDelDia: (next: EspecialDelDiaConfig) => void;
  mostrarSoloEspecial?: boolean;
  disabled?: boolean;
}

export function EspecialDelDiaEditor({
  control86,
  onChangeControl86,
  especialDelDia,
  onChangeEspecialDelDia,
  mostrarSoloEspecial = false,
  disabled = false,
}: EspecialDelDiaEditorProps) {
  const toggleDia = (dia: DiaSemanaEspecial) => {
    const actuales = especialDelDia.diasSemana || [];
    const existe = actuales.includes(dia);
    const siguientes = existe
      ? actuales.filter((d) => d !== dia)
      : [...actuales, dia].sort((a, b) => a - b);

    onChangeEspecialDelDia(
      sanitizarEspecialDelDia({
        ...especialDelDia,
        diasSemana: siguientes,
      })
    );
  };

  return (
    <div className="space-y-4">
      {!mostrarSoloEspecial && (
        <div className="space-y-3 rounded-2xl border border-orange-500/25 bg-neutral-900/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-400" aria-hidden="true" />
              <div>
                <p className="text-xs font-bold text-white">
                  Contador de Porciones (Control 86)
                </p>
                <p className="text-[11px] text-neutral-400">
                  Descuenta en cada pedido y pasa a 86 automáticamente al llegar a 0.
                </p>
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={control86.contadorActivo}
              aria-label="Activar contador regresivo de porciones"
              disabled={disabled}
              onClick={() =>
                onChangeControl86(
                  sanitizarControl86({
                    ...control86,
                    contadorActivo: !control86.contadorActivo,
                    porcionesDisponibles: !control86.contadorActivo
                      ? control86.porcionesDisponibles ?? 20
                      : null,
                    agotado86: !control86.contadorActivo ? false : control86.agotado86,
                  })
                )
              }
              className={`min-h-[44px] rounded-xl border px-3.5 text-xs font-black transition-colors ${
                control86.contadorActivo
                  ? 'border-orange-400/60 bg-orange-500/20 text-orange-200'
                  : 'border-neutral-700 bg-neutral-950 text-neutral-400 hover:text-white'
              }`}
            >
              {control86.contadorActivo ? 'Contador ACTIVO' : 'Sin límite'}
            </button>
          </div>

          {control86.contadorActivo && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 pt-1">
              <div>
                <label
                  htmlFor="control86-porciones-input"
                  className="mb-1 block text-[11px] font-semibold text-neutral-300"
                >
                  Porciones disponibles ahora
                </label>
                <input
                  id="control86-porciones-input"
                  type="number"
                  min={0}
                  max={10000}
                  disabled={disabled}
                  value={control86.porcionesDisponibles ?? 0}
                  onChange={(e) =>
                    onChangeControl86(
                      sanitizarControl86({
                        ...control86,
                        contadorActivo: true,
                        porcionesDisponibles: Number(e.target.value || 0),
                      })
                    )
                  }
                  className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm font-mono font-bold text-white focus:border-orange-400 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="control86-umbral-input"
                  className="mb-1 block text-[11px] font-semibold text-neutral-300"
                >
                  Alertar &quot;Últimas porciones&quot; desde
                </label>
                <input
                  id="control86-umbral-input"
                  type="number"
                  min={0}
                  max={1000}
                  disabled={disabled}
                  value={control86.umbralAlertaPorciones ?? UMBRAL_ALERTA_PORCIONES_DEFAULT}
                  onChange={(e) =>
                    onChangeControl86(
                      sanitizarControl86({
                        ...control86,
                        umbralAlertaPorciones: Number(e.target.value || 0),
                      })
                    )
                  }
                  className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm font-mono font-bold text-white focus:border-orange-400 focus:outline-none"
                />
              </div>

              <label className="sm:col-span-2 flex cursor-pointer items-center gap-2 text-xs text-neutral-300">
                <input
                  type="checkbox"
                  disabled={disabled}
                  checked={control86.auto86AlLlegarACero !== false}
                  onChange={(e) =>
                    onChangeControl86(
                      sanitizarControl86({
                        ...control86,
                        auto86AlLlegarACero: e.target.checked,
                      })
                    )
                  }
                  className="h-4 w-4 rounded border-neutral-600 bg-neutral-950 text-orange-500 accent-orange-500"
                />
                <span>Marcar automáticamente en 86 y pausar en tienda/POS al llegar a 0</span>
              </label>
            </div>
          )}
        </div>
      )}

      {/* Bloque Especial del Día */}
      <div className="space-y-3 rounded-2xl border border-gold-400/25 bg-neutral-900/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold-400" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-white">
                Programación de Especial del Día
              </p>
              <p className="text-[11px] text-neutral-400">
                Destaca este plato por días, fecha puntual o franja horaria.
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={especialDelDia.activo}
            aria-label="Activar programación de Especial del Día"
            disabled={disabled}
            onClick={() =>
              onChangeEspecialDelDia(
                sanitizarEspecialDelDia({
                  ...especialDelDia,
                  activo: !especialDelDia.activo,
                })
              )
            }
            className={`min-h-[44px] rounded-xl border px-3.5 text-xs font-black transition-colors ${
              especialDelDia.activo
                ? 'border-gold-400/60 bg-gold-400/20 text-gold-300'
                : 'border-neutral-700 bg-neutral-950 text-neutral-400 hover:text-white'
            }`}
          >
            {especialDelDia.activo ? 'Especial ACTIVO' : 'Inactivo'}
          </button>
        </div>

        {especialDelDia.activo && (
          <div className="space-y-3 pt-1">
            {/* Etiqueta sugerida */}
            <div>
              <label
                htmlFor="especial-etiqueta-input"
                className="mb-1.5 block text-[11px] font-semibold text-neutral-300"
              >
                Etiqueta comercial visible
              </label>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {ETIQUETAS_ESPECIAL_SUGERIDAS.map((tag) => {
                  const activa = (especialDelDia.etiqueta || 'Especial del Día') === tag;
                  return (
                    <button
                      key={tag}
                      type="button"
                      disabled={disabled}
                      aria-pressed={activa}
                      onClick={() =>
                        onChangeEspecialDelDia(
                          sanitizarEspecialDelDia({
                            ...especialDelDia,
                            etiqueta: tag,
                          })
                        )
                      }
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold transition-colors ${
                        activa
                          ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                          : 'border-neutral-700 bg-neutral-950 text-neutral-400 hover:text-white'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
              <input
                id="especial-etiqueta-input"
                type="text"
                maxLength={40}
                disabled={disabled}
                value={especialDelDia.etiqueta || ''}
                onChange={(e) =>
                  onChangeEspecialDelDia({
                    ...especialDelDia,
                    etiqueta: e.target.value,
                  })
                }
                placeholder="Ej: Especial del Día"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs text-white focus:border-gold-400 focus:outline-none"
              />
            </div>

            {/* Días de la semana */}
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-neutral-300">
                <CalendarClock className="h-3.5 w-3.5 text-gold-400" aria-hidden="true" />
                <span>Días activos (si no eliges ninguno aplica todos los días)</span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {DIAS_SEMANA_META.map((d) => {
                  const selected = especialDelDia.diasSemana.includes(d.dia);
                  return (
                    <button
                      key={d.dia}
                      type="button"
                      disabled={disabled}
                      aria-pressed={selected}
                      aria-label={`Activar especial el día ${d.nombre}`}
                      onClick={() => toggleDia(d.dia)}
                      className={`min-h-[44px] min-w-[44px] rounded-xl border px-3 text-xs font-bold transition-colors ${
                        selected
                          ? 'border-gold-400 bg-gold-400 text-neutral-950'
                          : 'border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-neutral-500'
                      }`}
                    >
                      {d.corto}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fecha específica y horarios */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="especial-fecha-input"
                  className="mb-1 block text-[11px] font-semibold text-neutral-300"
                >
                  Fecha puntual (opcional)
                </label>
                <input
                  id="especial-fecha-input"
                  type="date"
                  disabled={disabled}
                  value={especialDelDia.fechaEspecifica || ''}
                  onChange={(e) =>
                    onChangeEspecialDelDia(
                      sanitizarEspecialDelDia({
                        ...especialDelDia,
                        fechaEspecifica: e.target.value || undefined,
                      })
                    )
                  }
                  className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs text-white focus:border-gold-400 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="especial-hora-inicio"
                  className="mb-1 block text-[11px] font-semibold text-neutral-300"
                >
                  Hora inicio (opcional)
                </label>
                <input
                  id="especial-hora-inicio"
                  type="time"
                  disabled={disabled}
                  value={especialDelDia.horaInicio || ''}
                  onChange={(e) =>
                    onChangeEspecialDelDia(
                      sanitizarEspecialDelDia({
                        ...especialDelDia,
                        horaInicio: e.target.value || undefined,
                      })
                    )
                  }
                  className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs text-white focus:border-gold-400 focus:outline-none"
                />
              </div>

              <div>
                <label
                  htmlFor="especial-hora-fin"
                  className="mb-1 block text-[11px] font-semibold text-neutral-300"
                >
                  Hora fin (opcional)
                </label>
                <input
                  id="especial-hora-fin"
                  type="time"
                  disabled={disabled}
                  value={especialDelDia.horaFin || ''}
                  onChange={(e) =>
                    onChangeEspecialDelDia(
                      sanitizarEspecialDelDia({
                        ...especialDelDia,
                        horaFin: e.target.value || undefined,
                      })
                    )
                  }
                  className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs text-white focus:border-gold-400 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="especial-mensaje-input"
                className="mb-1 block text-[11px] font-semibold text-neutral-300"
              >
                Mensaje promocional corto (opcional)
              </label>
              <input
                id="especial-mensaje-input"
                type="text"
                maxLength={160}
                disabled={disabled}
                value={especialDelDia.mensajeSugerido || ''}
                onChange={(e) =>
                  onChangeEspecialDelDia({
                    ...especialDelDia,
                    mensajeSugerido: e.target.value,
                  })
                }
                placeholder="Ej: Recién salido de cocina hasta agotar existencias"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs text-white focus:border-gold-400 focus:outline-none"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-300">
              <input
                type="checkbox"
                disabled={disabled}
                checked={Boolean(especialDelDia.soloEnHorarioProgramado)}
                onChange={(e) =>
                  onChangeEspecialDelDia(
                    sanitizarEspecialDelDia({
                      ...especialDelDia,
                      soloEnHorarioProgramado: e.target.checked,
                    })
                  )
                }
                className="h-4 w-4 rounded border-neutral-600 bg-neutral-950 text-gold-400 accent-amber-500"
              />
              <span>
                Vender este plato exclusivamente dentro de los días/horas programados
              </span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
