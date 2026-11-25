import { useId } from 'react';
import {
  Calendar,
  FileText,
  Phone,
  ShieldAlert,
  Wrench,
  X,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { Button } from '@/components/ui/Button';
import type {
  EquipoMantenimientoEvaluado,
  OrdenMantenimiento,
  ReporteFallaEquipo,
} from '@/types/mantenimiento';
import { formatCOP } from '@/utils/formatCOP';
import {
  CATEGORIA_EQUIPO_META,
  ESTADO_FALLA_META,
  ESTADO_OPERATIVO_EQUIPO_META,
  SEMAFORO_MANTENIMIENTO_META,
  TIPO_AGENTE_EXTINTOR_META,
  TIPO_ORDEN_MANTENIMIENTO_META,
} from '@/utils/mantenimientoUtils';

export interface HojaVidaEquipoModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: EquipoMantenimientoEvaluado | null;
  ordenes: OrdenMantenimiento[];
  fallas: ReporteFallaEquipo[];
  esAdmin: boolean;
  onEditar: () => void;
  onRegistrarOrden: () => void;
}

export function HojaVidaEquipoModal({
  isOpen,
  onClose,
  item,
  ordenes,
  fallas,
  esAdmin,
  onEditar,
  onRegistrarOrden,
}: HojaVidaEquipoModalProps) {
  const generatedId = useId();
  const titleId = `hoja-vida-equipo-${generatedId.replace(/:/g, '')}-title`;

  if (!isOpen || !item) return null;

  const { equipo } = item;
  const ordenesEquipo = ordenes.filter((o) => o.equipoId === equipo.id);
  const fallasEquipo = fallas.filter(
    (f) =>
      f.equipoId === equipo.id ||
      f.equipoNombre.trim().toLowerCase() === equipo.nombre.trim().toLowerCase()
  );

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      onBackdropClick={onClose}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-3xl max-h-[92dvh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 text-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-gold-400/30 bg-gold-400/10 px-2 py-0.5 font-mono text-xs font-bold text-gold-300">
                {equipo.codigoActivo}
              </span>
              <span
                className={`rounded-lg border px-2 py-0.5 text-xs font-bold ${
                  ESTADO_OPERATIVO_EQUIPO_META[equipo.estadoOperativo].badgeClass
                }`}
              >
                {ESTADO_OPERATIVO_EQUIPO_META[equipo.estadoOperativo].label}
              </span>
              <span
                className={`rounded-lg border px-2 py-0.5 text-xs font-bold ${
                  SEMAFORO_MANTENIMIENTO_META[item.semaforo].badgeClass
                }`}
              >
                {SEMAFORO_MANTENIMIENTO_META[item.semaforo].label}
              </span>
            </div>
            <h2 id={titleId} className="mt-1 truncate font-display text-xl font-bold text-white">
              {equipo.nombre}
            </h2>
            <p className="text-xs text-neutral-400">
              {CATEGORIA_EQUIPO_META[equipo.categoria].label} · {equipo.ubicacion}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar hoja de vida"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5">
          {/* Ficha técnica */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
              <p className="text-[11px] font-bold uppercase text-neutral-400">Costo Acumulado</p>
              <p className="mt-1 font-display text-lg font-bold text-gold-300">
                {formatCOP(equipo.costoAcumuladoCOP)}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
              <p className="text-[11px] font-bold uppercase text-neutral-400">Intervenciones</p>
              <p className="mt-1 font-display text-lg font-bold text-white">
                {equipo.totalIntervenciones}
              </p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
              <p className="text-[11px] font-bold uppercase text-neutral-400">Frecuencia</p>
              <p className="mt-1 text-sm font-bold text-white">
                Cada {equipo.frecuenciaPreventivoDias} días
              </p>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
              <p className="text-[11px] font-bold uppercase text-neutral-400">Próximo Control</p>
              <p className="mt-1 font-mono text-sm font-bold text-white">
                {item.fechaVencimientoCriticaIso || 'Sin fecha'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-xl border border-neutral-800 bg-neutral-950/70 p-4 text-xs sm:grid-cols-2">
            <div>
              <span className="text-neutral-400">Marca / Modelo:</span>{' '}
              <strong className="text-white">
                {[equipo.marca, equipo.modelo].filter(Boolean).join(' · ') || 'No especificado'}
              </strong>
            </div>
            <div>
              <span className="text-neutral-400">Serie:</span>{' '}
              <strong className="font-mono text-white">{equipo.numeroSerie || 'N/A'}</strong>
            </div>
            <div>
              <span className="text-neutral-400">Compra / Garantía:</span>{' '}
              <strong className="text-white">
                {equipo.fechaCompraIso || 'N/A'} / {equipo.garantiaHastaIso || 'N/A'}
              </strong>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-neutral-400">Técnico:</span>{' '}
              <strong className="text-white">{equipo.proveedorTecnico || 'Sin asignar'}</strong>
              {equipo.telefonoTecnico && (
                <a
                  href={`tel:${equipo.telefonoTecnico.replace(/[^+\d]/g, '')}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/25"
                >
                  <Phone className="h-3 w-3" aria-hidden="true" />
                  {equipo.telefonoTecnico}
                </a>
              )}
            </div>
            {equipo.categoria === 'extintor' && (
              <div className="sm:col-span-2 rounded-lg border border-red-500/30 bg-red-950/20 p-2.5 text-red-200">
                <ShieldAlert className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                <strong>Extintor:</strong>{' '}
                {equipo.tipoAgenteExtintor
                  ? TIPO_AGENTE_EXTINTOR_META[equipo.tipoAgenteExtintor].label
                  : 'Tipo K'}{' '}
                {equipo.capacidadExtintor ? `(${equipo.capacidadExtintor})` : ''} · Recarga vence:{' '}
                <span className="font-mono">{equipo.fechaRecargaVenceIso || 'Sin fecha'}</span> ·
                Hidrostática:{' '}
                <span className="font-mono">
                  {equipo.fechaPruebaHidrostaticaIso || 'Sin fecha'}
                </span>
              </div>
            )}
            {equipo.categoria === 'red_gas' && (
              <div className="sm:col-span-2 rounded-lg border border-amber-500/30 bg-amber-950/20 p-2.5 text-amber-200">
                <Calendar className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
                <strong>Certificado Gas:</strong>{' '}
                <span className="font-mono">{equipo.certificadoGasVenceIso || 'Sin fecha'}</span>{' '}
                {equipo.empresaCertificadora ? `· ${equipo.empresaCertificadora}` : ''}
              </div>
            )}
            {equipo.notas && (
              <div className="sm:col-span-2 text-neutral-300">
                <span className="text-neutral-400">Notas:</span> {equipo.notas}
              </div>
            )}
          </div>

          {/* Historial de órdenes */}
          <div className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <FileText className="h-4 w-4 text-gold-400" aria-hidden="true" />
              Historial de Intervenciones ({ordenesEquipo.length})
            </h3>
            {ordenesEquipo.length === 0 ? (
              <p className="rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-400">
                Aún no se registran órdenes de mantenimiento para este activo.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {ordenesEquipo.map((ord) => (
                  <div
                    key={ord.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-neutral-400">{ord.fechaIso}</span>
                        <span
                          className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                            TIPO_ORDEN_MANTENIMIENTO_META[ord.tipo].badgeClass
                          }`}
                        >
                          {TIPO_ORDEN_MANTENIMIENTO_META[ord.tipo].label}
                        </span>
                        {ord.conciliadoConGasto && (
                          <span className="rounded-md border border-emerald-500/30 bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                            Conciliado /gastos
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-neutral-200">{ord.descripcionTrabajo}</p>
                      <p className="text-[11px] text-neutral-400">
                        Técnico: {ord.tecnicoNombre}
                        {ord.numeroFactura ? ` · Fact: ${ord.numeroFactura}` : ''}
                      </p>
                    </div>
                    <span className="font-mono text-sm font-bold text-gold-300">
                      {formatCOP(ord.costoCOP)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fallas vinculadas */}
          {fallasEquipo.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white">
                Fallas Reportadas ({fallasEquipo.length})
              </h3>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {fallasEquipo.map((fal) => (
                  <div
                    key={fal.id}
                    className="rounded-xl border border-neutral-800 bg-neutral-950 p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-neutral-400">{fal.fechaIso}</span>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${
                          ESTADO_FALLA_META[fal.estado].badgeClass
                        }`}
                      >
                        {ESTADO_FALLA_META[fal.estado].label}
                      </span>
                    </div>
                    <p className="mt-1 text-neutral-200">{fal.descripcion}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-800 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="min-h-[44px]"
            >
              Cerrar
            </Button>
            {esAdmin && (
              <>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onEditar}
                  className="min-h-[44px]"
                >
                  Editar Ficha
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={onRegistrarOrden}
                  className="min-h-[44px]"
                >
                  <Wrench className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Registrar Orden
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </StorefrontDialog>
  );
}
