import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { useNegocio } from '@/context/NegocioContext';
import type {
  ChecklistTurnoBpm,
  EstadoItemChecklistBpm,
  GuardarChecklistBpmInput,
  ItemChecklistEjecutadoBpm,
  ItemPlantillaChecklistBpm,
  TipoChecklistBpm,
} from '@/types/bpm';
import {
  calcularMetricasChecklist,
  CATEGORIAS_CHECKLIST_BPM_META,
  crearItemsDesdePlantilla,
} from '@/utils/bpmUtils';
import { obtenerFechaIsoColombia } from '@/utils/lotesInventarioUtils';

export interface ChecklistTurnoPanelProps {
  plantillaApertura: ItemPlantillaChecklistBpm[];
  plantillaCierre: ItemPlantillaChecklistBpm[];
  checklistAperturaHoy: ChecklistTurnoBpm | null;
  checklistCierreHoy: ChecklistTurnoBpm | null;
  onGuardarChecklist: (input: GuardarChecklistBpmInput) => Promise<{
    id: string;
    estado: string;
    porcentajeCumplimiento: number;
  }>;
  compacto?: boolean;
  onSuccess?: () => void;
}

export function ChecklistTurnoPanel({
  plantillaApertura,
  plantillaCierre,
  checklistAperturaHoy,
  checklistCierreHoy,
  onGuardarChecklist,
  compacto = false,
  onSuccess,
}: ChecklistTurnoPanelProps) {
  let responsableDefault = 'Encargado Turno';
  let responsableRolDefault = 'admin';
  try {
    const authCtx = useAuth();
    responsableDefault =
      authCtx.user?.displayName || authCtx.user?.email || 'Encargado Turno';
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

  const [tipoActivo, setTipoActivo] = useState<TipoChecklistBpm>(() =>
    checklistAperturaHoy?.estado === 'completado' &&
    checklistCierreHoy?.estado !== 'completado'
      ? 'cierre'
      : 'apertura'
  );

  const checklistExistente =
    tipoActivo === 'apertura' ? checklistAperturaHoy : checklistCierreHoy;
  const plantillaActual =
    tipoActivo === 'apertura' ? plantillaApertura : plantillaCierre;

  const [items, setItems] = useState<ItemChecklistEjecutadoBpm[]>(() =>
    checklistExistente?.items?.length
      ? checklistExistente.items.map((i) => ({ ...i }))
      : crearItemsDesdePlantilla(plantillaActual)
  );
  const [observacionesGenerales, setObservacionesGenerales] = useState(
    checklistExistente?.observacionesGenerales || ''
  );
  const [responsableNombre, setResponsableNombre] = useState(
    checklistExistente?.responsableNombre || responsableDefault
  );
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    setItems(
      checklistExistente?.items?.length
        ? checklistExistente.items.map((i) => ({ ...i }))
        : crearItemsDesdePlantilla(plantillaActual)
    );
    setObservacionesGenerales(checklistExistente?.observacionesGenerales || '');
    setResponsableNombre(
      checklistExistente?.responsableNombre || responsableDefault
    );
  }, [tipoActivo, checklistExistente, plantillaActual, responsableDefault]);

  const metricas = useMemo(() => calcularMetricasChecklist(items, false), [items]);
  const fechaHoyIso = obtenerFechaIsoColombia();

  const handleSetEstadoItem = (itemId: string, estado: EstadoItemChecklistBpm) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, estado } : item))
    );
  };

  const handleSetObsItem = (itemId: string, observacion: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, observacion } : item))
    );
  };

  const handleMarcarTodoConforme = () => {
    setItems((prev) =>
      prev.map((item) => ({ ...item, estado: 'cumple', observacion: undefined }))
    );
  };

  const handlePersistir = async (finalizar: boolean) => {
    if (responsableNombre.trim().length < 2) {
      createToast('Ingresa el nombre del responsable del turno', 'error');
      return;
    }
    if (finalizar && metricas.itemsPendientes > 0) {
      createToast(
        `Completa los ${metricas.itemsPendientes} punto(s) pendientes antes de firmar`,
        'error'
      );
      return;
    }

    setGuardando(true);
    try {
      const res = await onGuardarChecklist({
        id: checklistExistente?.id,
        tipo: tipoActivo,
        fechaIso: fechaHoyIso,
        items,
        observacionesGenerales: observacionesGenerales.trim() || undefined,
        responsableNombre: responsableNombre.trim(),
        responsableRol: responsableRolDefault,
        finalizar,
      });

      createToast(
        finalizar
          ? `Checklist de ${tipoActivo} firmado (${res.porcentajeCumplimiento}%)`
          : `Avance guardado (${res.porcentajeCumplimiento}%)`,
        res.estado === 'con_hallazgos' ? 'error' : 'success'
      );
      onSuccess?.();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'No se pudo guardar el checklist BPM';
      createToast(msg, 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Selector Apertura / Cierre */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={tipoActivo === 'apertura'}
            onClick={() => setTipoActivo('apertura')}
            className={`min-h-[44px] rounded-xl border px-4 py-2 text-xs font-bold transition-colors ${
              tipoActivo === 'apertura'
                ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
            }`}
          >
            Checklist Apertura ({checklistAperturaHoy ? `${checklistAperturaHoy.porcentajeCumplimiento}%` : 'Pendiente'})
          </button>
          <button
            type="button"
            aria-pressed={tipoActivo === 'cierre'}
            onClick={() => setTipoActivo('cierre')}
            className={`min-h-[44px] rounded-xl border px-4 py-2 text-xs font-bold transition-colors ${
              tipoActivo === 'cierre'
                ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700'
            }`}
          >
            Checklist Cierre ({checklistCierreHoy ? `${checklistCierreHoy.porcentajeCumplimiento}%` : 'Pendiente'})
          </button>
        </div>

        <button
          type="button"
          onClick={handleMarcarTodoConforme}
          className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20"
        >
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          <span>Marcar todo Conforme</span>
        </button>
      </div>

      {/* Barra de progreso */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3.5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold text-white flex items-center gap-1.5">
            <ClipboardCheck className="h-4 w-4 text-gold-400" aria-hidden="true" />
            Progreso {tipoActivo === 'apertura' ? 'Apertura' : 'Cierre'} · {fechaHoyIso}
          </span>
          <div className="flex items-center gap-3 font-mono">
            <span className="text-emerald-400 font-bold">
              {metricas.itemsCumplidos} cumple
            </span>
            {metricas.itemsNoConformes > 0 && (
              <span className="text-red-400 font-bold">
                {metricas.itemsNoConformes} hallazgo(s)
              </span>
            )}
            <span className="text-gold-400 font-bold">
              {metricas.porcentajeCumplimiento}%
            </span>
          </div>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-800">
          <div
            className={`h-full rounded-full transition-all ${
              metricas.itemsNoConformes > 0
                ? 'bg-amber-400'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${metricas.porcentajeCumplimiento}%` }}
          />
        </div>
      </div>

      {/* Lista de puntos */}
      <div className={compacto ? 'space-y-2.5 max-h-[340px] overflow-y-auto pr-1' : 'space-y-3'}>
        {items.map((item, idx) => {
          const catMeta = CATEGORIAS_CHECKLIST_BPM_META[item.categoria];
          return (
            <div
              key={item.id}
              className={`rounded-xl border p-3.5 transition-colors ${
                item.estado === 'no_cumple'
                  ? 'border-red-500/50 bg-red-950/20'
                  : item.estado === 'cumple'
                  ? 'border-emerald-500/30 bg-emerald-950/10'
                  : 'border-neutral-800 bg-neutral-950/80'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-neutral-400">
                      #{idx + 1}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${catMeta.badgeClass}`}
                    >
                      {catMeta.label}
                    </span>
                    {item.critico && (
                      <span className="inline-flex items-center gap-1 rounded-md border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-300">
                        <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                        Crítico INVIMA
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white">{item.titulo}</p>
                  {!compacto && (
                    <p className="text-xs text-neutral-400">{item.descripcion}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    aria-pressed={item.estado === 'cumple'}
                    aria-label={`Marcar punto ${item.titulo} como Cumple`}
                    onClick={() => handleSetEstadoItem(item.id, 'cumple')}
                    className={`min-h-[44px] rounded-xl border px-3.5 text-xs font-bold transition-colors ${
                      item.estado === 'cumple'
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300'
                        : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-emerald-500/50'
                    }`}
                  >
                    Cumple
                  </button>
                  <button
                    type="button"
                    aria-pressed={item.estado === 'no_cumple'}
                    aria-label={`Marcar punto ${item.titulo} como No cumple`}
                    onClick={() => handleSetEstadoItem(item.id, 'no_cumple')}
                    className={`min-h-[44px] rounded-xl border px-3.5 text-xs font-bold transition-colors ${
                      item.estado === 'no_cumple'
                        ? 'border-red-500 bg-red-500/20 text-red-300'
                        : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-red-500/50'
                    }`}
                  >
                    No cumple
                  </button>
                  <button
                    type="button"
                    aria-pressed={item.estado === 'na'}
                    aria-label={`Marcar punto ${item.titulo} como No aplica`}
                    onClick={() => handleSetEstadoItem(item.id, 'na')}
                    className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold transition-colors ${
                      item.estado === 'na'
                        ? 'border-neutral-500 bg-neutral-700 text-white'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-600'
                    }`}
                  >
                    N/A
                  </button>
                </div>
              </div>

              {item.estado === 'no_cumple' && (
                <div className="mt-3 flex items-center gap-2">
                  <AlertTriangle
                    className="h-4 w-4 text-red-400 shrink-0"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={item.observacion || ''}
                    onChange={(e) => handleSetObsItem(item.id, e.target.value)}
                    placeholder="Describe el hallazgo o acción inmediata tomada..."
                    aria-label={`Detalle del hallazgo para ${item.titulo}`}
                    className="w-full min-h-[44px] rounded-xl border border-red-500/40 bg-neutral-900 px-3 text-xs text-white focus:border-gold-400 focus:outline-none"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Firma y observaciones finales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <div>
          <label
            htmlFor={`bpm-chk-resp-${tipoActivo}`}
            className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
          >
            Responsable del Turno
          </label>
          <input
            id={`bpm-chk-resp-${tipoActivo}`}
            type="text"
            value={responsableNombre}
            onChange={(e) => setResponsableNombre(e.target.value)}
            className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor={`bpm-chk-obs-${tipoActivo}`}
            className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
          >
            Observaciones Generales (Opcional)
          </label>
          <input
            id={`bpm-chk-obs-${tipoActivo}`}
            type="text"
            value={observacionesGenerales}
            onChange={(e) => setObservacionesGenerales(e.target.value)}
            placeholder="Novedades de higiene, inventario o equipos..."
            className="w-full min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2.5 pt-2 border-t border-neutral-800">
        <Button
          type="button"
          variant="secondary"
          disabled={guardando}
          loading={guardando}
          onClick={() => handlePersistir(false)}
          className="min-h-[44px]"
        >
          Guardar Avance
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={guardando || metricas.itemsPendientes > 0}
          loading={guardando}
          onClick={() => handlePersistir(true)}
          className="min-h-[44px] font-bold"
        >
          Firmar y Cerrar Checklist ({metricas.porcentajeCumplimiento}%)
        </Button>
      </div>
    </div>
  );
}
