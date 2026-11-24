import React, { useEffect, useId, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Droplets, Flame, X } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { Button } from '@/components/ui/Button';
import { createToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { useNegocio } from '@/context/NegocioContext';
import type {
  ColorAceiteBpm,
  DisposicionAceiteUsado,
  FreidoraBpmConfig,
  RegistrarAceiteBpmInput,
  TipoEventoAceiteBpm,
} from '@/types/bpm';
import {
  COLOR_ACEITE_META,
  COLOR_ACEITE_ORDEN,
  ESTADO_ACEITE_META,
  evaluarEstadoAceite,
  TIPO_EVENTO_ACEITE_META,
  TIPO_EVENTO_ACEITE_ORDEN,
} from '@/utils/bpmUtils';

export interface RegistrarAceiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  freidoras: FreidoraBpmConfig[];
  freidoraPreseleccionadaId?: string;
  onRegistrar: (
    input: RegistrarAceiteBpmInput
  ) => Promise<{ id: string; estadoAceite: string }>;
  onSuccess?: () => void;
}

export function RegistrarAceiteModal({
  isOpen,
  onClose,
  freidoras,
  freidoraPreseleccionadaId,
  onRegistrar,
  onSuccess,
}: RegistrarAceiteModalProps) {
  const generatedId = useId();
  const titleId = `registrar-aceite-bpm-${generatedId.replace(/:/g, '')}-title`;

  let responsableDefault = 'Cocinero / Encargado';
  let responsableRolDefault = 'cocinero';
  try {
    const authCtx = useAuth();
    responsableDefault =
      authCtx.user?.displayName || authCtx.user?.email || 'Cocinero / Encargado';
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

  const freidorasActivas = useMemo(
    () => freidoras.filter((f) => f.activo),
    [freidoras]
  );

  const [freidoraId, setFreidoraId] = useState('');
  const [tipoEvento, setTipoEvento] = useState<TipoEventoAceiteBpm>('inspeccion_calidad');
  const [colorAceite, setColorAceite] = useState<ColorAceiteBpm>('dorado_aceptable');
  const [espumaExcesiva, setEspumaExcesiva] = useState(false);
  const [olorRancio, setOlorRancio] = useState(false);
  const [humoBajoPunto, setHumoBajoPunto] = useState(false);
  const [litrosStr, setLitrosStr] = useState('');
  const [loteAceiteNuevo, setLoteAceiteNuevo] = useState('');
  const [disposicionUsado, setDisposicionUsado] =
    useState<DisposicionAceiteUsado>('no_aplica');
  const [gestorResiduosNombre, setGestorResiduosNombre] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [responsableNombre, setResponsableNombre] = useState(responsableDefault);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const sel =
      freidoraPreseleccionadaId &&
      freidorasActivas.some((f) => f.id === freidoraPreseleccionadaId)
        ? freidoraPreseleccionadaId
        : freidorasActivas[0]?.id || '';
    const freObj = freidorasActivas.find((f) => f.id === sel);
    setFreidoraId(sel);
    setTipoEvento('inspeccion_calidad');
    setColorAceite('dorado_aceptable');
    setEspumaExcesiva(false);
    setOlorRancio(false);
    setHumoBajoPunto(false);
    setLitrosStr(freObj ? String(freObj.capacidadLitros) : '');
    setLoteAceiteNuevo('');
    setDisposicionUsado('no_aplica');
    setGestorResiduosNombre('');
    setObservaciones('');
    setResponsableNombre(responsableDefault);
  }, [isOpen, freidoraPreseleccionadaId, freidorasActivas, responsableDefault]);

  const freidoraSeleccionada = useMemo(
    () => freidorasActivas.find((f) => f.id === freidoraId) ?? freidorasActivas[0],
    [freidorasActivas, freidoraId]
  );

  const veredictoEnVivo = evaluarEstadoAceite({
    tipoEvento,
    colorAceite,
    espumaExcesiva,
    olorRancio,
    humoBajoPunto,
  });

  if (!isOpen) return null;

  const handleCambioTipoEvento = (nuevoTipo: TipoEventoAceiteBpm) => {
    setTipoEvento(nuevoTipo);
    if (nuevoTipo === 'cambio_completo') {
      setColorAceite('claro_optimo');
      setEspumaExcesiva(false);
      setOlorRancio(false);
      setHumoBajoPunto(false);
      setDisposicionUsado('bidon_almacenado');
      if (freidoraSeleccionada) {
        setLitrosStr(String(freidoraSeleccionada.capacidadLitros));
      }
    } else if (nuevoTipo !== 'reposicion') {
      setDisposicionUsado('no_aplica');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!freidoraSeleccionada) {
      createToast('No hay freidoras activas configuradas', 'error');
      return;
    }
    if (responsableNombre.trim().length < 2) {
      createToast('Ingresa el nombre del responsable', 'error');
      return;
    }

    let litrosCambiados: number | undefined;
    if (tipoEvento === 'cambio_completo' || tipoEvento === 'reposicion') {
      const val = Number(litrosStr);
      if (litrosStr.trim() && (!Number.isFinite(val) || val < 0 || val > 500)) {
        createToast('Cantidad de litros inválida (0 a 500 L)', 'error');
        return;
      }
      if (litrosStr.trim()) {
        litrosCambiados = val;
      }
    }

    setGuardando(true);
    try {
      const res = await onRegistrar({
        freidoraId: freidoraSeleccionada.id,
        freidoraNombre: freidoraSeleccionada.nombre,
        tipoEvento,
        colorAceite,
        espumaExcesiva,
        olorRancio,
        humoBajoPunto,
        litrosCambiados,
        loteAceiteNuevo: loteAceiteNuevo.trim() || undefined,
        disposicionUsado,
        gestorResiduosNombre: gestorResiduosNombre.trim() || undefined,
        observaciones: observaciones.trim() || undefined,
        responsableNombre: responsableNombre.trim(),
        responsableRol: responsableRolDefault,
      });

      createToast(
        res.estadoAceite === 'optimo'
          ? 'Control de aceite registrado correctamente'
          : `Control guardado (${ESTADO_ACEITE_META[res.estadoAceite as keyof typeof ESTADO_ACEITE_META]?.label || res.estadoAceite})`,
        res.estadoAceite === 'cambiar_inmediato' ? 'error' : 'success'
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Error registrando control de aceite';
      createToast(msg, 'error');
    } finally {
      setGuardando(false);
    }
  };

  const veredictoMeta = ESTADO_ACEITE_META[veredictoEnVivo];

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
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Droplets className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-white">
                Control de Aceite de Freidoras
              </h2>
              <p className="text-xs text-neutral-400">
                Calidad sensorial, cambios de cuba y disposición de aceite usado
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar modal de aceite BPM"
            className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label
              htmlFor="bpm-freidora-select"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-300"
            >
              Freidora en Cocina
            </label>
            <select
              id="bpm-freidora-select"
              value={freidoraSeleccionada?.id || ''}
              onChange={(e) => {
                setFreidoraId(e.target.value);
                const fr = freidorasActivas.find((f) => f.id === e.target.value);
                if (fr && tipoEvento === 'cambio_completo') {
                  setLitrosStr(String(fr.capacidadLitros));
                }
              }}
              className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
            >
              {freidorasActivas.map((fr) => (
                <option key={fr.id} value={fr.id}>
                  {fr.nombre} ({fr.capacidadLitros} L · cambio cada {fr.cicloMaxDiasCambio}d)
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de evento */}
          <div className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
              Tipo de Acción
            </span>
            <div className="grid grid-cols-2 gap-2">
              {TIPO_EVENTO_ACEITE_ORDEN.map((id) => {
                const meta = TIPO_EVENTO_ACEITE_META[id];
                const activo = tipoEvento === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => handleCambioTipoEvento(id)}
                    className={`min-h-[48px] rounded-xl border px-3 py-2 text-left transition-colors ${
                      activo
                        ? 'border-gold-400 bg-gold-400/15 text-gold-300'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <span className="block text-xs font-bold">{meta.label}</span>
                    <span className="block text-[10px] text-neutral-400 line-clamp-1">
                      {meta.descripcion}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color visual del aceite */}
          <div className="space-y-2">
            <span className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
              Color Visual del Aceite
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {COLOR_ACEITE_ORDEN.map((id) => {
                const meta = COLOR_ACEITE_META[id];
                const activo = colorAceite === id;
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => setColorAceite(id)}
                    className={`min-h-[56px] rounded-xl border p-2.5 text-left transition-colors ${
                      activo
                        ? 'border-gold-400 bg-gold-400/15 text-white'
                        : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-4 w-4 rounded-full border shrink-0 ${meta.swatchClass}`}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-bold">{meta.shortLabel}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Banderas sensoriales (aplica principalmente a inspección/filtrado) */}
          {tipoEvento !== 'cambio_completo' && (
            <div className="space-y-2">
              <span className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                Señales Sensoriales Detectadas
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  aria-pressed={espumaExcesiva}
                  onClick={() => setEspumaExcesiva((v) => !v)}
                  className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                    espumaExcesiva
                      ? 'border-amber-500 bg-amber-500/20 text-amber-200'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-300'
                  }`}
                >
                  {espumaExcesiva ? '✓ Espuma Excesiva' : 'Espuma Excesiva'}
                </button>
                <button
                  type="button"
                  aria-pressed={olorRancio}
                  onClick={() => setOlorRancio((v) => !v)}
                  className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                    olorRancio
                      ? 'border-red-500 bg-red-500/20 text-red-200'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-300'
                  }`}
                >
                  {olorRancio ? '✓ Olor Rancio / Ácido' : 'Olor Rancio'}
                </button>
                <button
                  type="button"
                  aria-pressed={humoBajoPunto}
                  onClick={() => setHumoBajoPunto((v) => !v)}
                  className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                    humoBajoPunto
                      ? 'border-red-500 bg-red-500/20 text-red-200'
                      : 'border-neutral-800 bg-neutral-950 text-neutral-300'
                  }`}
                >
                  {humoBajoPunto ? '✓ Humo a Baja Temp.' : 'Humo Excesivo'}
                </button>
              </div>
            </div>
          )}

          {/* Veredicto en vivo */}
          <div
            className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-xs ${veredictoMeta.badgeClass}`}
          >
            {veredictoEnVivo === 'optimo' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : veredictoEnVivo === 'filtrar_pronto' ? (
              <Flame className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>
              Veredicto sanitario: <strong>{veredictoMeta.label}</strong>
            </span>
          </div>

          {(tipoEvento === 'cambio_completo' || tipoEvento === 'reposicion') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-neutral-800 bg-neutral-950/70 p-3.5">
              <div>
                <label
                  htmlFor="bpm-aceite-litros"
                  className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
                >
                  Litros Cargados (L)
                </label>
                <input
                  id="bpm-aceite-litros"
                  type="number"
                  step="0.5"
                  min="0"
                  max="500"
                  value={litrosStr}
                  onChange={(e) => setLitrosStr(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="bpm-aceite-lote"
                  className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
                >
                  Lote Aceite Nuevo (Opcional)
                </label>
                <input
                  id="bpm-aceite-lote"
                  type="text"
                  value={loteAceiteNuevo}
                  onChange={(e) => setLoteAceiteNuevo(e.target.value)}
                  placeholder="Ej: LOT-AC-202611"
                  className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                />
              </div>

              {tipoEvento === 'cambio_completo' && (
                <>
                  <div>
                    <label
                      htmlFor="bpm-aceite-disposicion"
                      className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
                    >
                      Disposición Aceite Usado
                    </label>
                    <select
                      id="bpm-aceite-disposicion"
                      value={disposicionUsado}
                      onChange={(e) =>
                        setDisposicionUsado(e.target.value as DisposicionAceiteUsado)
                      }
                      className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                    >
                      <option value="bidon_almacenado">
                        Almacenado en bidón sellado (ACU)
                      </option>
                      <option value="gestor_autorizado">
                        Entregado a gestor ambiental autorizado
                      </option>
                      <option value="no_aplica">No aplica</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="bpm-aceite-gestor"
                      className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
                    >
                      Gestor Ambiental / Acta (Opcional)
                    </label>
                    <input
                      id="bpm-aceite-gestor"
                      type="text"
                      value={gestorResiduosNombre}
                      onChange={(e) => setGestorResiduosNombre(e.target.value)}
                      placeholder="Ej: Bioaceites Norte · Acta 045"
                      className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-900 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="bpm-aceite-responsable"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Responsable
              </label>
              <input
                id="bpm-aceite-responsable"
                type="text"
                value={responsableNombre}
                onChange={(e) => setResponsableNombre(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                required
              />
            </div>
            <div>
              <label
                htmlFor="bpm-aceite-obs"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Observaciones
              </label>
              <input
                id="bpm-aceite-obs"
                type="text"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Ej: Cuba lavada con desengrasante grado alimentario"
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
              Guardar Control de Aceite
            </Button>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
