import React, { useEffect, useId, useMemo, useState } from 'react';
import { CheckCircle2, Receipt, Wrench, X } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { Button } from '@/components/ui/Button';
import { createToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { useNegocio } from '@/context/NegocioContext';
import type { MetodoPagoGasto, OrigenFondoGasto } from '@/types/gasto';
import type {
  EquipoActivoMantenimiento,
  EstadoOperativoEquipo,
  OrdenMantenimiento,
  RegistrarOrdenMantenimientoInput,
  ReporteFallaEquipo,
  TipoOrdenMantenimiento,
} from '@/types/mantenimiento';
import { formatCOP } from '@/utils/formatCOP';
import { obtenerFechaIsoColombia } from '@/utils/lotesInventarioUtils';
import {
  calcularProximaFechaMantenimiento,
  ESTADO_OPERATIVO_EQUIPO_META,
  TIPO_ORDEN_MANTENIMIENTO_META,
} from '@/utils/mantenimientoUtils';

export interface RegistrarOrdenMantenimientoModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipos: EquipoActivoMantenimiento[];
  equipoPreseleccionadoId?: string;
  fallaPreseleccionada?: ReporteFallaEquipo | null;
  onRegistrarOrden: (
    input: Omit<RegistrarOrdenMantenimientoInput, 'negocioId'>
  ) => Promise<OrdenMantenimiento>;
}

const TIPOS_ORDEN: TipoOrdenMantenimiento[] = [
  'preventivo',
  'correctivo',
  'recarga_extintor',
  'inspeccion_gas',
  'calibracion',
];

const ORIGENES_FONDO: Array<{ id: OrigenFondoGasto; label: string }> = [
  { id: 'caja_menor', label: 'Caja Menor' },
  { id: 'caja_turno', label: 'Caja del Turno' },
  { id: 'banco_transferencia', label: 'Banco / Transferencia' },
  { id: 'efectivo_externo', label: 'Efectivo Externo / Propietario' },
];

export function RegistrarOrdenMantenimientoModal({
  isOpen,
  onClose,
  equipos,
  equipoPreseleccionadoId,
  fallaPreseleccionada,
  onRegistrarOrden,
}: RegistrarOrdenMantenimientoModalProps) {
  const generatedId = useId();
  const titleId = `orden-mantenimiento-${generatedId.replace(/:/g, '')}-title`;

  let responsableDefault = 'Administrador';
  let responsableRolDefault = 'admin';
  try {
    const authCtx = useAuth();
    responsableDefault =
      authCtx.user?.displayName || authCtx.user?.email || 'Administrador';
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
    () => equipos.filter((e) => e.activo !== false),
    [equipos]
  );

  const [equipoId, setEquipoId] = useState('');
  const [tipo, setTipo] = useState<TipoOrdenMantenimiento>('preventivo');
  const [descripcionTrabajo, setDescripcionTrabajo] = useState('');
  const [fechaIso, setFechaIso] = useState(() => obtenerFechaIsoColombia());
  const [tecnicoNombre, setTecnicoNombre] = useState('');
  const [proveedorTecnico, setProveedorTecnico] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [costoStr, setCostoStr] = useState('0');
  const [conciliarEnGastos, setConciliarEnGastos] = useState(true);
  const [origenFondoGasto, setOrigenFondoGasto] =
    useState<OrigenFondoGasto>('caja_menor');
  const [metodoPagoGasto, setMetodoPagoGasto] =
    useState<MetodoPagoGasto>('efectivo');
  const [proximaFechaSugeridaIso, setProximaFechaSugeridaIso] = useState('');
  const [estadoEquipoResultante, setEstadoEquipoResultante] =
    useState<EstadoOperativoEquipo>('operativo');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const preId =
      fallaPreseleccionada?.equipoId || equipoPreseleccionadoId || equiposActivos[0]?.id || '';
    const eq = equiposActivos.find((item) => item.id === preId) ?? equiposActivos[0];
    const hoy = obtenerFechaIsoColombia();

    setEquipoId(eq?.id || '');
    setFechaIso(hoy);
    setTecnicoNombre(eq?.proveedorTecnico || '');
    setProveedorTecnico(eq?.proveedorTecnico || '');
    setNumeroFactura('');
    setCostoStr('0');
    setConciliarEnGastos(true);
    setOrigenFondoGasto('caja_menor');
    setMetodoPagoGasto('efectivo');
    setEstadoEquipoResultante('operativo');
    setNotas('');

    if (fallaPreseleccionada) {
      setTipo('correctivo');
      setDescripcionTrabajo(`Reparación de falla: ${fallaPreseleccionada.descripcion}`);
    } else if (eq?.categoria === 'extintor') {
      setTipo('recarga_extintor');
      setDescripcionTrabajo('Recarga anual y verificación de presión/manómetro');
    } else if (eq?.categoria === 'red_gas') {
      setTipo('inspeccion_gas');
      setDescripcionTrabajo('Prueba de hermeticidad, regulador y válvula de corte');
    } else {
      setTipo('preventivo');
      setDescripcionTrabajo('');
    }

    if (eq) {
      setProximaFechaSugeridaIso(
        calcularProximaFechaMantenimiento(hoy, eq.frecuenciaPreventivoDias)
      );
    } else {
      setProximaFechaSugeridaIso('');
    }
  }, [isOpen, equipoPreseleccionadoId, fallaPreseleccionada, equiposActivos]);

  const equipoSeleccionado = useMemo(
    () => equiposActivos.find((e) => e.id === equipoId) ?? equiposActivos[0],
    [equiposActivos, equipoId]
  );

  if (!isOpen) return null;

  const costoNumerico = Math.max(0, Math.round(Number(costoStr) || 0));

  const handleSeleccionarEquipo = (nuevoId: string) => {
    setEquipoId(nuevoId);
    const eq = equiposActivos.find((e) => e.id === nuevoId);
    if (eq) {
      setTecnicoNombre((prev) => prev || eq.proveedorTecnico || '');
      setProveedorTecnico(eq.proveedorTecnico || '');
      setProximaFechaSugeridaIso(
        calcularProximaFechaMantenimiento(fechaIso, eq.frecuenciaPreventivoDias)
      );
      if (eq.categoria === 'extintor') setTipo('recarga_extintor');
      else if (eq.categoria === 'red_gas') setTipo('inspeccion_gas');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipoSeleccionado) {
      createToast('Selecciona un activo de la hoja de vida primero', 'error');
      return;
    }
    if (descripcionTrabajo.trim().length < 3) {
      createToast('Describe el trabajo ejecutado', 'error');
      return;
    }
    if (tecnicoNombre.trim().length < 2) {
      createToast('Indica el técnico o empresa que realizó el trabajo', 'error');
      return;
    }

    try {
      setGuardando(true);
      await onRegistrarOrden({
        equipoId: equipoSeleccionado.id,
        tipo,
        descripcionTrabajo: descripcionTrabajo.trim(),
        fechaIso,
        tecnicoNombre: tecnicoNombre.trim(),
        ...(proveedorTecnico.trim() ? { proveedorTecnico: proveedorTecnico.trim() } : {}),
        ...(numeroFactura.trim() ? { numeroFactura: numeroFactura.trim() } : {}),
        costoCOP: costoNumerico,
        conciliarEnGastos: conciliarEnGastos && costoNumerico > 0,
        origenFondoGasto,
        metodoPagoGasto,
        ...(proximaFechaSugeridaIso ? { proximaFechaSugeridaIso } : {}),
        ...(fallaPreseleccionada ? { fallaRelacionadaId: fallaPreseleccionada.id } : {}),
        estadoEquipoResultante,
        responsableNombre: responsableDefault,
        responsableRol: responsableRolDefault,
        ...(notas.trim() ? { notas: notas.trim() } : {}),
      });

      createToast(
        conciliarEnGastos && costoNumerico > 0
          ? `Orden registrada y conciliada en Gastos (${formatCOP(costoNumerico)})`
          : 'Orden de mantenimiento registrada',
        'success'
      );
      onClose();
    } catch (err) {
      createToast(
        err instanceof Error ? err.message : 'No se pudo registrar la orden',
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
      <div className="w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 text-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
              <Wrench className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-white">
                Registrar Orden de Mantenimiento
              </h2>
              <p className="text-xs text-neutral-400">
                Actualiza hoja de vida y concilia automáticamente en /gastos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar modal de orden de mantenimiento"
            className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          {fallaPreseleccionada && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 px-3.5 py-2.5 text-xs text-amber-200">
              <strong>Resolviendo falla KDS:</strong> {fallaPreseleccionada.descripcion}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="ord-equipo"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Equipo / Activo *
              </label>
              <select
                id="ord-equipo"
                value={equipoSeleccionado?.id || ''}
                onChange={(e) => handleSeleccionarEquipo(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              >
                {equiposActivos.length === 0 && (
                  <option value="">Sin activos registrados</option>
                )}
                {equiposActivos.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.codigoActivo} · {eq.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="ord-tipo"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Tipo de intervención
              </label>
              <select
                id="ord-tipo"
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoOrdenMantenimiento)}
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              >
                {TIPOS_ORDEN.map((t) => (
                  <option key={t} value={t}>
                    {TIPO_ORDEN_MANTENIMIENTO_META[t].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label
              htmlFor="ord-descripcion"
              className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
            >
              Trabajo / Inspección realizada *
            </label>
            <textarea
              id="ord-descripcion"
              required
              rows={2}
              value={descripcionTrabajo}
              onChange={(e) => setDescripcionTrabajo(e.target.value)}
              placeholder="Ej: Limpieza de condensador, cambio de empaque y recarga de refrigerante"
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-sm text-white focus:border-gold-400 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor="ord-fecha"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Fecha ejecución *
              </label>
              <input
                id="ord-fecha"
                type="date"
                required
                value={fechaIso}
                onChange={(e) => setFechaIso(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="ord-proxima"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Próximo vencimiento
              </label>
              <input
                id="ord-proxima"
                type="date"
                value={proximaFechaSugeridaIso}
                onChange={(e) => setProximaFechaSugeridaIso(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="ord-estado-resultante"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Estado resultante
              </label>
              <select
                id="ord-estado-resultante"
                value={estadoEquipoResultante}
                onChange={(e) =>
                  setEstadoEquipoResultante(e.target.value as EstadoOperativoEquipo)
                }
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              >
                {(['operativo', 'en_mantenimiento', 'con_falla', 'fuera_servicio'] as EstadoOperativoEquipo[]).map(
                  (est) => (
                    <option key={est} value={est}>
                      {ESTADO_OPERATIVO_EQUIPO_META[est].label}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor="ord-tecnico"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Técnico / Empresa *
              </label>
              <input
                id="ord-tecnico"
                type="text"
                required
                value={tecnicoNombre}
                onChange={(e) => setTecnicoNombre(e.target.value)}
                placeholder="Ej: Carlos Pérez / TecniFrío"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="ord-factura"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                No. Factura / Recibo
              </label>
              <input
                id="ord-factura"
                type="text"
                value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value)}
                placeholder="Ej: FV-1024"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="ord-costo"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Costo Total (COP)
              </label>
              <input
                id="ord-costo"
                type="number"
                min={0}
                step={500}
                value={costoStr}
                onChange={(e) => setCostoStr(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 font-mono text-sm font-bold text-gold-300 focus:border-gold-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Conciliación automática offline con /gastos */}
          <div className="space-y-3 rounded-xl border border-gold-400/30 bg-gold-400/5 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-gold-400" aria-hidden="true" />
                <span className="text-xs font-bold uppercase tracking-wider text-gold-300">
                  Conciliación Automática en Gastos (/gastos)
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={conciliarEnGastos}
                onClick={() => setConciliarEnGastos((v) => !v)}
                className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold transition-colors ${
                  conciliarEnGastos
                    ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-300'
                    : 'border-neutral-700 bg-neutral-800 text-neutral-400'
                }`}
              >
                {conciliarEnGastos ? 'Sí, registrar egreso en /gastos' : 'No conciliar gasto'}
              </button>
            </div>

            {conciliarEnGastos && costoNumerico > 0 && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="ord-origen-fondo"
                    className="mb-1 block text-xs font-semibold text-neutral-300"
                  >
                    Origen del fondo (offline)
                  </label>
                  <select
                    id="ord-origen-fondo"
                    value={origenFondoGasto}
                    onChange={(e) =>
                      setOrigenFondoGasto(e.target.value as OrigenFondoGasto)
                    }
                    className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                  >
                    {ORIGENES_FONDO.map((of) => (
                      <option key={of.id} value={of.id}>
                        {of.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="mb-1 block text-xs font-semibold text-neutral-300">
                    Método de pago offline
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {(['efectivo', 'transferencia'] as MetodoPagoGasto[]).map((mp) => (
                      <button
                        key={mp}
                        type="button"
                        aria-pressed={metodoPagoGasto === mp}
                        onClick={() => setMetodoPagoGasto(mp)}
                        className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold capitalize transition-colors ${
                          metodoPagoGasto === mp
                            ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                            : 'border-neutral-700 bg-neutral-950 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {mp}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
              disabled={guardando || !equipoSeleccionado}
              className="min-h-[44px]"
            >
              <CheckCircle2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Guardar Orden
            </Button>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
