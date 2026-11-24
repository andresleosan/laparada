import React, { useId, useMemo, useState } from 'react';
import { Link, useInRouterContext } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Droplets,
  Thermometer,
  X,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { Button } from '@/components/ui/Button';
import { createToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { useNegocio } from '@/context/NegocioContext';
import type {
  ColorAceiteBpm,
  ConfiguracionBpm,
  FranjaRegistroBpm,
  GuardarChecklistBpmInput,
  RegistrarAceiteBpmInput,
  RegistrarTemperaturaBpmInput,
  ResumenCumplimientoBpm,
  TipoEventoAceiteBpm,
} from '@/types/bpm';
import {
  COLOR_ACEITE_META,
  COLOR_ACEITE_ORDEN,
  ESTADO_ACEITE_META,
  ESTADO_CONFORMIDAD_TEMP_META,
  evaluarConformidadTemperatura,
  evaluarEstadoAceite,
  FRANJAS_BPM_META,
  FRANJAS_BPM_ORDEN,
  RANGOS_NORMATIVOS_BPM,
  sugerirFranjaBpm,
  TIPO_EVENTO_ACEITE_META,
  TIPO_EVENTO_ACEITE_ORDEN,
  validarTemperaturaFisica,
} from '@/utils/bpmUtils';
import { ChecklistTurnoPanel } from './ChecklistTurnoPanel';

type TabRapidoBpm = 'temperatura' | 'aceite' | 'checklist';

export interface RegistroRapidoBpmModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfiguracionBpm;
  resumen: ResumenCumplimientoBpm;
  onRegistrarTemperatura: (
    input: RegistrarTemperaturaBpmInput
  ) => Promise<{ id: string; estadoConformidad: string }>;
  onRegistrarAceite: (
    input: RegistrarAceiteBpmInput
  ) => Promise<{ id: string; estadoAceite: string }>;
  onGuardarChecklist: (
    input: GuardarChecklistBpmInput
  ) => Promise<{ id: string; estado: string; porcentajeCumplimiento: number }>;
}

export function RegistroRapidoBpmModal({
  isOpen,
  onClose,
  config,
  resumen,
  onRegistrarTemperatura,
  onRegistrarAceite,
  onGuardarChecklist,
}: RegistroRapidoBpmModalProps) {
  const generatedId = useId();
  const titleId = `registro-rapido-bpm-${generatedId.replace(/:/g, '')}-title`;
  const hasRouter = useInRouterContext();

  let responsableDefault = 'Cocinero Turno';
  let responsableRolDefault = 'cocinero';
  try {
    const authCtx = useAuth();
    responsableDefault =
      authCtx.user?.displayName || authCtx.user?.email || 'Cocinero Turno';
  } catch {
    // Fallback seguro
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
    // Fallback seguro
  }

  const equiposActivos = useMemo(
    () => config.equiposFrio.filter((e) => e.activo),
    [config.equiposFrio]
  );
  const freidorasActivas = useMemo(
    () => config.freidoras.filter((f) => f.activo),
    [config.freidoras]
  );

  const [tab, setTab] = useState<TabRapidoBpm>('temperatura');

  // Estado rápido temperatura
  const [equipoId, setEquipoId] = useState(equiposActivos[0]?.id || '');
  const [franja, setFranja] = useState<FranjaRegistroBpm>(() => sugerirFranjaBpm());
  const [tempStr, setTempStr] = useState('2.5');
  const [accionCorrectiva, setAccionCorrectiva] = useState('');
  const [guardandoTemp, setGuardandoTemp] = useState(false);

  // Estado rápido aceite
  const [freidoraId, setFreidoraId] = useState(freidorasActivas[0]?.id || '');
  const [tipoEventoAceite, setTipoEventoAceite] =
    useState<TipoEventoAceiteBpm>('inspeccion_calidad');
  const [colorAceite, setColorAceite] = useState<ColorAceiteBpm>('dorado_aceptable');
  const [guardandoAceite, setGuardandoAceite] = useState(false);

  const equipoSel = useMemo(
    () => equiposActivos.find((e) => e.id === equipoId) ?? equiposActivos[0],
    [equiposActivos, equipoId]
  );

  const evalTemp = useMemo(() => {
    if (!equipoSel) return null;
    const n = Number(tempStr);
    if (!tempStr.trim() || !Number.isFinite(n)) return null;
    try {
      const val = validarTemperaturaFisica(n);
      const estado = evaluarConformidadTemperatura(val, equipoSel.tipo, {
        min: equipoSel.tempMinOptimaC,
        max: equipoSel.tempMaxOptimaC,
      });
      return { val, estado };
    } catch {
      return null;
    }
  }, [equipoSel, tempStr]);

  const freidoraSel = useMemo(
    () => freidorasActivas.find((f) => f.id === freidoraId) ?? freidorasActivas[0],
    [freidorasActivas, freidoraId]
  );

  if (!isOpen) return null;

  const normInfo = equipoSel
    ? RANGOS_NORMATIVOS_BPM[equipoSel.tipo]
    : RANGOS_NORMATIVOS_BPM.refrigeracion;

  const handleSubmitTemp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipoSel || !evalTemp) {
      createToast('Ingresa una temperatura válida', 'error');
      return;
    }
    if (evalTemp.estado === 'critico' && accionCorrectiva.trim().length < 3) {
      createToast('Registra la acción correctiva inmediata', 'error');
      return;
    }
    setGuardandoTemp(true);
    try {
      await onRegistrarTemperatura({
        equipoId: equipoSel.id,
        equipoNombre: equipoSel.nombre,
        tipoEquipo: equipoSel.tipo,
        ubicacion: equipoSel.ubicacion,
        franja,
        temperaturaC: evalTemp.val,
        tempMinOptimaC: equipoSel.tempMinOptimaC,
        tempMaxOptimaC: equipoSel.tempMaxOptimaC,
        accionCorrectiva: accionCorrectiva.trim() || undefined,
        responsableNombre: responsableDefault,
        responsableRol: responsableRolDefault,
      });
      createToast(`Lectura de ${equipoSel.nombre} guardada (${evalTemp.val} °C)`, 'success');
      setAccionCorrectiva('');
    } catch (err) {
      createToast(
        err instanceof Error ? err.message : 'Error guardando temperatura',
        'error'
      );
    } finally {
      setGuardandoTemp(false);
    }
  };

  const handleSubmitAceite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freidoraSel) {
      createToast('Selecciona una freidora', 'error');
      return;
    }
    setGuardandoAceite(true);
    try {
      const res = await onRegistrarAceite({
        freidoraId: freidoraSel.id,
        freidoraNombre: freidoraSel.nombre,
        tipoEvento: tipoEventoAceite,
        colorAceite,
        litrosCambiados:
          tipoEventoAceite === 'cambio_completo'
            ? freidoraSel.capacidadLitros
            : undefined,
        responsableNombre: responsableDefault,
        responsableRol: responsableRolDefault,
      });
      createToast(
        `Control de aceite guardado (${ESTADO_ACEITE_META[res.estadoAceite as keyof typeof ESTADO_ACEITE_META]?.shortLabel || res.estadoAceite})`,
        res.estadoAceite === 'cambiar_inmediato' ? 'error' : 'success'
      );
    } catch (err) {
      createToast(
        err instanceof Error ? err.message : 'Error guardando control de aceite',
        'error'
      );
    } finally {
      setGuardandoAceite(false);
    }
  };

  const veredictoAceite = evaluarEstadoAceite({
    tipoEvento: tipoEventoAceite,
    colorAceite,
  });

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      onBackdropClick={onClose}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 text-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/30 bg-gold-400/10 text-gold-400">
              <Thermometer className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-white">
                Bitácora Rápida BPM (Cocina)
              </h2>
              <p className="text-xs text-neutral-400">
                Cumplimiento hoy: {resumen.scoreCumplimientoPct}% ·{' '}
                {resumen.equiposConLecturaHoy}/{resumen.equiposActivosCount} equipos medidos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar bitácora rápida BPM"
            className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pestañas táctiles */}
        <div className="grid grid-cols-3 gap-2 border-b border-neutral-800 bg-neutral-950/60 p-3">
          <button
            type="button"
            aria-pressed={tab === 'temperatura'}
            onClick={() => setTab('temperatura')}
            className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border text-xs font-bold ${
              tab === 'temperatura'
                ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                : 'border-neutral-800 bg-neutral-900 text-neutral-300'
            }`}
          >
            <Thermometer className="h-4 w-4" aria-hidden="true" />
            <span>Frío / Calor</span>
          </button>
          <button
            type="button"
            aria-pressed={tab === 'aceite'}
            onClick={() => setTab('aceite')}
            className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border text-xs font-bold ${
              tab === 'aceite'
                ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                : 'border-neutral-800 bg-neutral-900 text-neutral-300'
            }`}
          >
            <Droplets className="h-4 w-4" aria-hidden="true" />
            <span>Aceite</span>
          </button>
          <button
            type="button"
            aria-pressed={tab === 'checklist'}
            onClick={() => setTab('checklist')}
            className={`flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border text-xs font-bold ${
              tab === 'checklist'
                ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                : 'border-neutral-800 bg-neutral-900 text-neutral-300'
            }`}
          >
            <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
            <span>Checklist</span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {tab === 'temperatura' && (
            <form onSubmit={handleSubmitTemp} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-neutral-300">
                    Equipo
                  </label>
                  <select
                    value={equipoSel?.id || ''}
                    onChange={(e) => {
                      setEquipoId(e.target.value);
                      const eq = equiposActivos.find((i) => i.id === e.target.value);
                      if (eq) {
                        const mid =
                          Math.round(
                            ((eq.tempMinOptimaC + eq.tempMaxOptimaC) / 2) * 10
                          ) / 10;
                        setTempStr(String(mid));
                      }
                    }}
                    className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white"
                  >
                    {equiposActivos.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-neutral-300">
                    Franja
                  </label>
                  <select
                    value={franja}
                    onChange={(e) => setFranja(e.target.value as FranjaRegistroBpm)}
                    className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white"
                  >
                    {FRANJAS_BPM_ORDEN.map((id) => (
                      <option key={id} value={id}>
                        {FRANJAS_BPM_META[id].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-neutral-300">
                  Temperatura (°C)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={tempStr}
                  onChange={(e) => setTempStr(e.target.value)}
                  className="w-full min-h-[48px] rounded-xl border border-neutral-700 bg-neutral-950 px-4 font-display text-xl font-bold text-white"
                />
                <div className="flex flex-wrap gap-2 mt-2">
                  {normInfo.presetsC.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      aria-pressed={Number(tempStr) === preset}
                      onClick={() => setTempStr(String(preset))}
                      className={`min-h-[44px] rounded-xl border px-3 text-xs font-mono font-bold ${
                        Number(tempStr) === preset
                          ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-300'
                      }`}
                    >
                      {preset} °C
                    </button>
                  ))}
                </div>
              </div>

              {evalTemp && (
                <div
                  className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs ${
                    ESTADO_CONFORMIDAD_TEMP_META[evalTemp.estado].badgeClass
                  }`}
                >
                  {evalTemp.estado === 'conforme' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>
                    {ESTADO_CONFORMIDAD_TEMP_META[evalTemp.estado].label} (
                    {evalTemp.val} °C)
                  </span>
                </div>
              )}

              {evalTemp && evalTemp.estado !== 'conforme' && (
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-red-300">
                    Acción Correctiva{' '}
                    {evalTemp.estado === 'critico' ? '(Obligatoria)' : '(Opcional)'}
                  </label>
                  <input
                    type="text"
                    value={accionCorrectiva}
                    onChange={(e) => setAccionCorrectiva(e.target.value)}
                    placeholder="Ej: Ajuste de puerta y traslado de proteína..."
                    className="w-full min-h-[44px] rounded-xl border border-red-500/40 bg-neutral-950 px-3 text-sm text-white"
                    required={evalTemp.estado === 'critico'}
                  />
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  loading={guardandoTemp}
                  disabled={guardandoTemp}
                  className="min-h-[44px] font-bold"
                >
                  Registrar Temperatura
                </Button>
              </div>
            </form>
          )}

          {tab === 'aceite' && (
            <form onSubmit={handleSubmitAceite} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-neutral-300">
                  Freidora
                </label>
                <select
                  value={freidoraSel?.id || ''}
                  onChange={(e) => setFreidoraId(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white"
                >
                  {freidorasActivas.map((fr) => (
                    <option key={fr.id} value={fr.id}>
                      {fr.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {TIPO_EVENTO_ACEITE_ORDEN.map((id) => (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={tipoEventoAceite === id}
                    onClick={() => setTipoEventoAceite(id)}
                    className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold ${
                      tipoEventoAceite === id
                        ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-300'
                    }`}
                  >
                    {TIPO_EVENTO_ACEITE_META[id].shortLabel}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COLOR_ACEITE_ORDEN.map((id) => {
                  const meta = COLOR_ACEITE_META[id];
                  return (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={colorAceite === id}
                      onClick={() => setColorAceite(id)}
                      className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-2.5 text-xs font-bold ${
                        colorAceite === id
                          ? 'border-gold-400 bg-gold-400/15 text-white'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-300'
                      }`}
                    >
                      <span
                        className={`h-3.5 w-3.5 rounded-full border ${meta.swatchClass}`}
                        aria-hidden="true"
                      />
                      <span>{meta.shortLabel}</span>
                    </button>
                  );
                })}
              </div>

              <div
                className={`rounded-xl border px-3.5 py-2.5 text-xs font-bold ${
                  ESTADO_ACEITE_META[veredictoAceite].badgeClass
                }`}
              >
                Veredicto: {ESTADO_ACEITE_META[veredictoAceite].label}
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  loading={guardandoAceite}
                  disabled={guardandoAceite}
                  className="min-h-[44px] font-bold"
                >
                  Guardar Control de Aceite
                </Button>
              </div>
            </form>
          )}

          {tab === 'checklist' && (
            <ChecklistTurnoPanel
              plantillaApertura={config.plantillaApertura}
              plantillaCierre={config.plantillaCierre}
              checklistAperturaHoy={resumen.checklistAperturaHoy}
              checklistCierreHoy={resumen.checklistCierreHoy}
              onGuardarChecklist={onGuardarChecklist}
              compacto={true}
            />
          )}

          {hasRouter && (
            <div className="flex justify-between items-center pt-3 border-t border-neutral-800 text-xs">
              <span className="text-neutral-400">
                ¿Necesitas historial completo o exportar carpeta CSV INVIMA?
              </span>
              <Link
                to="/bpm"
                onClick={onClose}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-gold-400/40 bg-gold-400/10 px-3 font-bold text-gold-300 hover:bg-gold-400/20"
              >
                <span>Ir a /bpm</span>
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </StorefrontDialog>
  );
}
