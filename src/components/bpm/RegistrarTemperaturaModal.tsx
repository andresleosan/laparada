import React, { useEffect, useId, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Flame, Snowflake, Thermometer, X } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { Button } from '@/components/ui/Button';
import { createToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { useNegocio } from '@/context/NegocioContext';
import type {
  EquipoBpmConfig,
  FranjaRegistroBpm,
  RegistrarTemperaturaBpmInput,
} from '@/types/bpm';
import {
  ESTADO_CONFORMIDAD_TEMP_META,
  evaluarConformidadTemperatura,
  FRANJAS_BPM_META,
  FRANJAS_BPM_ORDEN,
  RANGOS_NORMATIVOS_BPM,
  sugerirFranjaBpm,
  validarTemperaturaFisica,
} from '@/utils/bpmUtils';

export interface RegistrarTemperaturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipos: EquipoBpmConfig[];
  equipoPreseleccionadoId?: string;
  onRegistrar: (
    input: RegistrarTemperaturaBpmInput
  ) => Promise<{ id: string; estadoConformidad: string }>;
  onSuccess?: () => void;
}

const ACCIONES_CORRECTIVAS_SUGERIDAS = [
  'Se verificó sello de puerta y se ajustó termostato',
  'Se trasladó proteína a equipo de respaldo',
  'Se realizó descongelamiento / limpieza de condensador',
  'Se reportó a mantenimiento técnico prioritario',
];

export function RegistrarTemperaturaModal({
  isOpen,
  onClose,
  equipos,
  equipoPreseleccionadoId,
  onRegistrar,
  onSuccess,
}: RegistrarTemperaturaModalProps) {
  const generatedId = useId();
  const titleId = `registrar-temp-bpm-${generatedId.replace(/:/g, '')}-title`;

  let responsableDefault = 'Operador Turno';
  let responsableRolDefault = 'admin';
  try {
    const authCtx = useAuth();
    responsableDefault =
      authCtx.user?.displayName || authCtx.user?.email || 'Operador Turno';
  } catch {
    // Fallback seguro en pruebas sin AuthProvider
  }
  try {
    const negCtx = useNegocio();
    if (negCtx.usuarioNegocio?.nombre) {
      responsableDefault = negCtx.usuarioNegocio.nombre;
    }
    if (negCtx.usuarioNegocio?.rol) {
      responsableRolDefault = negCtx.usuarioNegocio.rol;
    }
  } catch {
    // Fallback seguro en pruebas sin NegocioProvider
  }

  const equiposActivos = useMemo(
    () => equipos.filter((e) => e.activo),
    [equipos]
  );

  const [equipoId, setEquipoId] = useState('');
  const [franja, setFranja] = useState<FranjaRegistroBpm>(() => sugerirFranjaBpm());
  const [temperaturaStr, setTemperaturaStr] = useState('');
  const [accionCorrectiva, setAccionCorrectiva] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [responsableNombre, setResponsableNombre] = useState(responsableDefault);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const seleccionado =
      equipoPreseleccionadoId &&
      equiposActivos.some((e) => e.id === equipoPreseleccionadoId)
        ? equipoPreseleccionadoId
        : equiposActivos[0]?.id || '';
    const equipoObj = equiposActivos.find((e) => e.id === seleccionado);
    setEquipoId(seleccionado);
    setFranja(sugerirFranjaBpm());
    if (equipoObj) {
      const puntoMedio =
        Math.round(((equipoObj.tempMinOptimaC + equipoObj.tempMaxOptimaC) / 2) * 10) /
        10;
      setTemperaturaStr(String(puntoMedio));
    } else {
      setTemperaturaStr('2.5');
    }
    setAccionCorrectiva('');
    setObservaciones('');
    setResponsableNombre(responsableDefault);
  }, [isOpen, equipoPreseleccionadoId, equiposActivos, responsableDefault]);

  const equipoSeleccionado = useMemo(
    () => equiposActivos.find((e) => e.id === equipoId) ?? equiposActivos[0],
    [equiposActivos, equipoId]
  );

  const evaluacionEnVivo = useMemo(() => {
    if (!equipoSeleccionado) return null;
    const num = Number(temperaturaStr);
    if (!temperaturaStr.trim() || !Number.isFinite(num)) return null;
    try {
      const tempValida = validarTemperaturaFisica(num);
      const estado = evaluarConformidadTemperatura(
        tempValida,
        equipoSeleccionado.tipo,
        {
          min: equipoSeleccionado.tempMinOptimaC,
          max: equipoSeleccionado.tempMaxOptimaC,
        }
      );
      return { tempValida, estado };
    } catch {
      return null;
    }
  }, [equipoSeleccionado, temperaturaStr]);

  if (!isOpen) return null;

  const normInfo = equipoSeleccionado
    ? RANGOS_NORMATIVOS_BPM[equipoSeleccionado.tipo]
    : RANGOS_NORMATIVOS_BPM.refrigeracion;

  const handleSeleccionarEquipo = (nuevoId: string) => {
    setEquipoId(nuevoId);
    const eq = equiposActivos.find((item) => item.id === nuevoId);
    if (eq) {
      const puntoMedio =
        Math.round(((eq.tempMinOptimaC + eq.tempMaxOptimaC) / 2) * 10) / 10;
      setTemperaturaStr(String(puntoMedio));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipoSeleccionado) {
      createToast('No hay equipos térmicos activos configurados', 'error');
      return;
    }

    const tempNum = Number(temperaturaStr);
    if (!temperaturaStr.trim() || !Number.isFinite(tempNum)) {
      createToast('Ingresa una lectura numérica válida en °C', 'error');
      return;
    }

    if (responsableNombre.trim().length < 2) {
      createToast('Ingresa el nombre del responsable de la toma', 'error');
      return;
    }

    if (
      evaluacionEnVivo?.estado === 'critico' &&
      accionCorrectiva.trim().length < 3
    ) {
      createToast(
        'Por normativa INVIMA, una lectura crítica exige acción correctiva inmediata',
        'error'
      );
      return;
    }

    setGuardando(true);
    try {
      const res = await onRegistrar({
        equipoId: equipoSeleccionado.id,
        equipoNombre: equipoSeleccionado.nombre,
        tipoEquipo: equipoSeleccionado.tipo,
        ubicacion: equipoSeleccionado.ubicacion,
        franja,
        temperaturaC: tempNum,
        tempMinOptimaC: equipoSeleccionado.tempMinOptimaC,
        tempMaxOptimaC: equipoSeleccionado.tempMaxOptimaC,
        accionCorrectiva: accionCorrectiva.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
        responsableNombre: responsableNombre.trim(),
        responsableRol: responsableRolDefault,
      });

      createToast(
        res.estadoConformidad === 'conforme'
          ? `Temperatura conforme registrada (${tempNum} °C)`
          : `Desviación térmica registrada (${tempNum} °C) con alerta en bitácora`,
        res.estadoConformidad === 'conforme' ? 'success' : 'error'
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'No se pudo guardar la lectura térmica';
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
      <div className="w-full max-w-xl max-h-[92dvh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 text-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/30 bg-gold-400/10 text-gold-400">
              <Thermometer className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-white">
                Registrar Temperatura BPM
              </h2>
              <p className="text-xs text-neutral-400">{normInfo.norma}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar modal de temperatura BPM"
            className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {/* Selector de equipo */}
          <div className="space-y-2">
            <label
              htmlFor="bpm-equipo-select"
              className="block text-xs font-bold uppercase tracking-wider text-neutral-300"
            >
              Equipo de Frío o Calor
            </label>
            <select
              id="bpm-equipo-select"
              value={equipoSeleccionado?.id || ''}
              onChange={(e) => handleSeleccionarEquipo(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
            >
              {equiposActivos.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.nombre} ({eq.tempMinOptimaC} °C a {eq.tempMaxOptimaC} °C)
                </option>
              ))}
            </select>

            {equipoSeleccionado && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-950/70 px-3 py-2 text-xs text-neutral-300">
                <span className="flex items-center gap-1.5">
                  {equipoSeleccionado.tipo === 'congelacion' ? (
                    <Snowflake className="h-3.5 w-3.5 text-cyan-400" aria-hidden="true" />
                  ) : equipoSeleccionado.tipo === 'caliente' ? (
                    <Flame className="h-3.5 w-3.5 text-orange-400" aria-hidden="true" />
                  ) : (
                    <Thermometer className="h-3.5 w-3.5 text-sky-400" aria-hidden="true" />
                  )}
                  <span>{equipoSeleccionado.ubicacion}</span>
                </span>
                <span className="font-mono font-semibold text-gold-400">
                  Rango óptimo: {equipoSeleccionado.tempMinOptimaC} °C a{' '}
                  {equipoSeleccionado.tempMaxOptimaC} °C
                </span>
              </div>
            )}
          </div>

          {/* Franja del turno */}
          <div className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
              Franja de Control
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FRANJAS_BPM_ORDEN.map((id) => {
                const meta = FRANJAS_BPM_META[id];
                const activo = franja === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => setFranja(id)}
                    className={`min-h-[44px] rounded-xl border px-3 py-2 text-left transition-colors ${
                      activo
                        ? 'border-gold-400 bg-gold-400/15 text-gold-300'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <span className="block text-xs font-bold">{meta.shortLabel}</span>
                    <span className="block text-[10px] text-neutral-400">
                      {meta.horarioSugerido}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Temperatura y presets */}
          <div className="space-y-2">
            <label
              htmlFor="bpm-temp-input"
              className="block text-xs font-bold uppercase tracking-wider text-neutral-300"
            >
              Lectura del Termómetro (°C)
            </label>
            <div className="flex items-center gap-3">
              <input
                id="bpm-temp-input"
                type="number"
                step="0.1"
                min="-60"
                max="250"
                value={temperaturaStr}
                onChange={(e) => setTemperaturaStr(e.target.value)}
                placeholder="Ej: 2.5"
                className="w-full min-h-[48px] rounded-xl border border-neutral-700 bg-neutral-950 px-4 font-display text-xl font-bold text-white focus:border-gold-400 focus:outline-none"
                required
              />
              <span className="shrink-0 rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-3 font-mono text-base font-bold text-gold-400">
                °C
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {normInfo.presetsC.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={Number(temperaturaStr) === preset}
                  onClick={() => setTemperaturaStr(String(preset))}
                  className={`min-h-[44px] rounded-xl border px-3 text-xs font-mono font-bold transition-colors ${
                    Number(temperaturaStr) === preset
                      ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                  }`}
                >
                  {preset} °C
                </button>
              ))}
            </div>
          </div>

          {/* Semáforo en vivo */}
          {evaluacionEnVivo && (
            <div
              className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs ${
                ESTADO_CONFORMIDAD_TEMP_META[evaluacionEnVivo.estado].badgeClass
              }`}
            >
              {evaluacionEnVivo.estado === 'conforme' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div>
                <p className="font-bold">
                  {ESTADO_CONFORMIDAD_TEMP_META[evaluacionEnVivo.estado].label}:{' '}
                  <span className="font-mono">{evaluacionEnVivo.tempValida} °C</span>
                </p>
                <p className="opacity-90 mt-0.5">
                  {evaluacionEnVivo.estado === 'conforme'
                    ? 'Dentro de parámetros óptimos de conservación INVIMA.'
                    : evaluacionEnVivo.estado === 'alerta'
                    ? 'Cercano al límite. Verifica cierre de empaques y documenta seguimiento.'
                    : 'Fuera de rango seguro. Registra inmediatamente la acción correctiva aplicada.'}
                </p>
              </div>
            </div>
          )}

          {/* Acción correctiva obligatoria en crítico, recomendada en alerta */}
          {evaluacionEnVivo && evaluacionEnVivo.estado !== 'conforme' && (
            <div className="space-y-2 rounded-xl border border-red-500/30 bg-red-950/20 p-3.5">
              <label
                htmlFor="bpm-accion-correctiva"
                className="block text-xs font-bold uppercase tracking-wider text-red-300"
              >
                Acción Correctiva{' '}
                {evaluacionEnVivo.estado === 'critico' ? '(Obligatoria)' : '(Recomendada)'}
              </label>
              <textarea
                id="bpm-accion-correctiva"
                rows={2}
                value={accionCorrectiva}
                onChange={(e) => setAccionCorrectiva(e.target.value)}
                placeholder="Ej: Se trasladaron proteínas a nevera auxiliar y se ajustó termostato..."
                className="w-full rounded-xl border border-red-500/40 bg-neutral-950 p-2.5 text-sm text-white focus:border-gold-400 focus:outline-none"
                required={evaluacionEnVivo.estado === 'critico'}
              />
              <div className="flex flex-wrap gap-1.5">
                {ACCIONES_CORRECTIVAS_SUGERIDAS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => setAccionCorrectiva(sug)}
                    className="min-h-[36px] rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1 text-[11px] text-neutral-300 hover:border-gold-400 hover:text-white"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="bpm-temp-responsable"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Responsable de Toma
              </label>
              <input
                id="bpm-temp-responsable"
                type="text"
                value={responsableNombre}
                onChange={(e) => setResponsableNombre(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                required
              />
            </div>
            <div>
              <label
                htmlFor="bpm-temp-obs"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Observaciones (Opcional)
              </label>
              <input
                id="bpm-temp-obs"
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej: Termómetro digital calibrado"
                className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2 border-t border-neutral-800">
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
              Guardar Lectura Térmica
            </Button>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
