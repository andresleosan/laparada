import React, { useEffect, useId, useMemo, useState } from 'react';
import { AlertTriangle, ShieldAlert, Wrench, X } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { Button } from '@/components/ui/Button';
import { createToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { useNegocio } from '@/context/NegocioContext';
import type { EstacionCocina } from '@/types/cocina';
import type {
  CategoriaEquipoMantenimiento,
  EquipoActivoMantenimiento,
  OrigenReporteFalla,
  ReporteFallaEquipo,
  ReportarFallaEquipoInput,
  SeveridadFallaEquipo,
} from '@/types/mantenimiento';
import { ESTACIONES_COCINA_META, ESTACIONES_COCINA_ORDEN } from '@/utils/estacionesCocinaUtils';
import {
  CATEGORIA_EQUIPO_META,
  CATEGORIA_EQUIPO_ORDEN,
  SEVERIDAD_FALLA_META,
} from '@/utils/mantenimientoUtils';

export interface ReportarFallaModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipos: EquipoActivoMantenimiento[];
  origenReporte: OrigenReporteFalla;
  equipoPreseleccionadoId?: string;
  onReportarFalla: (
    input: Omit<ReportarFallaEquipoInput, 'negocioId'>
  ) => Promise<ReporteFallaEquipo>;
}

const SEVERIDADES: SeveridadFallaEquipo[] = ['critica', 'alta', 'media', 'baja'];

export function ReportarFallaModal({
  isOpen,
  onClose,
  equipos,
  origenReporte,
  equipoPreseleccionadoId,
  onReportarFalla,
}: ReportarFallaModalProps) {
  const generatedId = useId();
  const titleId = `reportar-falla-${generatedId.replace(/:/g, '')}-title`;

  let reportadoDefault = origenReporte === 'cocina_kds' ? 'Cocinero Turno' : 'Operador';
  let reportadoRolDefault = origenReporte === 'cocina_kds' ? 'cocinero' : 'admin';
  try {
    const authCtx = useAuth();
    reportadoDefault =
      authCtx.user?.displayName || authCtx.user?.email || reportadoDefault;
  } catch {
    // Fallback seguro
  }
  try {
    const negCtx = useNegocio();
    if (negCtx.usuarioNegocio?.nombre) {
      reportadoDefault = negCtx.usuarioNegocio.nombre;
    }
    if (negCtx.usuarioNegocio?.rol) {
      reportadoRolDefault = negCtx.usuarioNegocio.rol;
    }
  } catch {
    // Fallback seguro
  }

  const equiposActivos = useMemo(
    () => equipos.filter((e) => e.activo !== false),
    [equipos]
  );

  const [equipoId, setEquipoId] = useState<string>('');
  const [equipoNombreLibre, setEquipoNombreLibre] = useState('');
  const [categoriaEquipo, setCategoriaEquipo] =
    useState<CategoriaEquipoMantenimiento>('coccion');
  const [estacionCocina, setEstacionCocina] = useState<EstacionCocina>('fritura');
  const [severidad, setSeveridad] = useState<SeveridadFallaEquipo>('alta');
  const [detieneOperacion, setDetieneOperacion] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [reportadoPor, setReportadoPor] = useState(reportadoDefault);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const pre = equipoPreseleccionadoId
      ? equiposActivos.find((e) => e.id === equipoPreseleccionadoId)
      : equiposActivos[0];
    setEquipoId(pre?.id || 'otro_manual');
    setEquipoNombreLibre(pre ? pre.nombre : '');
    setCategoriaEquipo(pre?.categoria || 'coccion');
    setEstacionCocina('fritura');
    setSeveridad('alta');
    setDetieneOperacion(false);
    setDescripcion('');
    setReportadoPor(reportadoDefault);
  }, [isOpen, equipoPreseleccionadoId, equiposActivos, reportadoDefault]);

  if (!isOpen) return null;

  const esModoManual = !equipoId || equipoId === 'otro_manual';
  const equipoSeleccionado = esModoManual
    ? undefined
    : equiposActivos.find((e) => e.id === equipoId);

  const handleSeleccionEquipo = (nuevoId: string) => {
    setEquipoId(nuevoId);
    const eq = equiposActivos.find((e) => e.id === nuevoId);
    if (eq) {
      setEquipoNombreLibre(eq.nombre);
      setCategoriaEquipo(eq.categoria);
    } else {
      setEquipoNombreLibre('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombreFinal = equipoSeleccionado?.nombre || equipoNombreLibre.trim();
    if (!nombreFinal) {
      createToast('Indica el equipo afectado', 'error');
      return;
    }
    if (descripcion.trim().length < 3) {
      createToast('Describe la falla observada en cocina', 'error');
      return;
    }

    try {
      setGuardando(true);
      await onReportarFalla({
        ...(equipoSeleccionado ? { equipoId: equipoSeleccionado.id } : {}),
        equipoNombre: nombreFinal,
        categoriaEquipo: equipoSeleccionado?.categoria || categoriaEquipo,
        estacionCocina,
        severidad,
        detieneOperacion,
        descripcion: descripcion.trim(),
        origenReporte,
        reportadoPor: reportadoPor.trim() || reportadoDefault,
        reportadoRol: reportadoRolDefault,
      });

      createToast(
        detieneOperacion
          ? `Falla crítica reportada: ${nombreFinal} (equipo fuera de servicio)`
          : `Falla reportada para ${nombreFinal}`,
        'success'
      );
      onClose();
    } catch (err) {
      createToast(
        err instanceof Error ? err.message : 'No se pudo reportar la falla',
        'error'
      );
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
      <div className="w-full max-w-xl max-h-[92dvh] overflow-y-auto rounded-2xl border border-red-500/30 bg-neutral-900 text-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/40 bg-red-500/15 text-red-400">
              <Wrench className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-white">
                Reportar Falla de Equipo
              </h2>
              <p className="text-xs text-neutral-400">
                Alerta inmediata a administración y bloqueo preventivo si detiene cocina
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar modal de reporte de falla"
            className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div>
            <label
              htmlFor="falla-equipo-select"
              className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
            >
              Equipo afectado
            </label>
            <select
              id="falla-equipo-select"
              value={equipoId}
              onChange={(e) => handleSeleccionEquipo(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
            >
              {equiposActivos.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.codigoActivo} · {eq.nombre} ({eq.ubicacion})
                </option>
              ))}
              <option value="otro_manual">+ Otro equipo / No listado</option>
            </select>
          </div>

          {esModoManual && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="falla-equipo-libre"
                  className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
                >
                  Nombre del equipo *
                </label>
                <input
                  id="falla-equipo-libre"
                  type="text"
                  required
                  value={equipoNombreLibre}
                  onChange={(e) => setEquipoNombreLibre(e.target.value)}
                  placeholder="Ej: Licuadora industrial barra"
                  className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                />
              </div>
              <div>
                <label
                  htmlFor="falla-categoria"
                  className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
                >
                  Categoría
                </label>
                <select
                  id="falla-categoria"
                  value={categoriaEquipo}
                  onChange={(e) =>
                    setCategoriaEquipo(e.target.value as CategoriaEquipoMantenimiento)
                  }
                  className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                >
                  {CATEGORIA_EQUIPO_ORDEN.map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORIA_EQUIPO_META[cat].label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="falla-estacion"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Estación de cocina
              </label>
              <select
                id="falla-estacion"
                value={estacionCocina}
                onChange={(e) => setEstacionCocina(e.target.value as EstacionCocina)}
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              >
                {ESTACIONES_COCINA_ORDEN.map((est) => (
                  <option key={est} value={est}>
                    {ESTACIONES_COCINA_META[est].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="falla-reporta"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Reportado por *
              </label>
              <input
                id="falla-reporta"
                type="text"
                required
                value={reportadoPor}
                onChange={(e) => setReportadoPor(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-neutral-300">
              Severidad de la falla
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SEVERIDADES.map((sev) => (
                <button
                  key={sev}
                  type="button"
                  aria-pressed={severidad === sev}
                  onClick={() => setSeveridad(sev)}
                  className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold transition-colors ${
                    severidad === sev
                      ? SEVERIDAD_FALLA_META[sev].badgeClass
                      : 'border-neutral-700 bg-neutral-950 text-neutral-400 hover:text-white'
                  }`}
                >
                  {SEVERIDAD_FALLA_META[sev].label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={detieneOperacion}
            onClick={() => setDetieneOperacion((v) => !v)}
            className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left text-xs font-bold transition-colors ${
              detieneOperacion
                ? 'border-red-500/60 bg-red-500/20 text-red-200'
                : 'border-neutral-700 bg-neutral-950 text-neutral-300'
            }`}
          >
            <span className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-red-400" aria-hidden="true" />
              <span>¿Detiene operación / Riesgo de gas, fuego o cadena de frío?</span>
            </span>
            <span className="shrink-0 rounded-lg bg-black/30 px-2 py-0.5">
              {detieneOperacion ? 'SÍ (Fuera de servicio)' : 'No'}
            </span>
          </button>

          <div>
            <label
              htmlFor="falla-descripcion"
              className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
            >
              Descripción de la falla *
            </label>
            <textarea
              id="falla-descripcion"
              required
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: No enciende quemador piloto, fuga en manguera, ruido fuerte en compresor..."
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-sm text-white focus:border-gold-400 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-800 pt-4">
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
              className="min-h-[44px] bg-red-500 text-white hover:bg-red-400"
            >
              <AlertTriangle className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Enviar Reporte de Falla
            </Button>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
