import { useCallback, useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Mail,
  MapPin,
  PauseCircle,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Store,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createToast } from '@/components/ui/Toast';
import { useNegocio } from '@/context/NegocioContext';
import {
  aprobarNegocio,
  cambiarEstadoNegocio,
  getTodosNegocios,
} from '@/services/negociosService';
import type { EstadoNegocio, Negocio } from '@/types/negocio';

export type FiltroNegocio = 'pendientes' | 'activos' | 'todos';

interface NegociosToolbarProps {
  filtro: FiltroNegocio;
  onFiltroChange: (filtro: FiltroNegocio) => void;
  busqueda: string;
  onBusquedaChange: (busqueda: string) => void;
  cantidades: Record<FiltroNegocio, number>;
}

interface NegocioAccountCardProps {
  negocio: Negocio;
  esActual: boolean;
  procesando: boolean;
  onAprobar: (negocio: Negocio) => void;
  onRechazar: (negocio: Negocio) => void;
  onSuspender: (negocio: Negocio) => void;
  onOperar: (negocio: Negocio) => void;
}

const FILTER_OPTIONS: Array<{ value: FiltroNegocio; label: string }> = [
  { value: 'pendientes', label: 'Pendientes' },
  { value: 'activos', label: 'Activos' },
  { value: 'todos', label: 'Todos' },
];

const STATUS_META: Record<
  EstadoNegocio,
  { label: string; icon: LucideIcon; className: string }
> = {
  pendiente: {
    label: 'Pendiente',
    icon: Clock3,
    className: 'border-[#d8b04c]/45 bg-[#fbf3d9] text-[#76590f]',
  },
  activo: {
    label: 'Activo',
    icon: CheckCircle2,
    className: 'border-[#168a5b]/30 bg-[#e7f4ed] text-[#116b46]',
  },
  suspendido: {
    label: 'Suspendido',
    icon: PauseCircle,
    className: 'border-[#c4631b]/30 bg-[#fff0e4] text-[#93440e]',
  },
  rechazado: {
    label: 'Rechazado',
    icon: XCircle,
    className: 'border-[#b42318]/25 bg-[#fce9e7] text-[#9f1f16]',
  },
};

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8a6d1d] focus-visible:ring-offset-2';

export function NegociosToolbar({
  filtro,
  onFiltroChange,
  busqueda,
  onBusquedaChange,
  cantidades,
}: NegociosToolbarProps) {
  const generatedId = useId().replace(/:/g, '');
  const searchId = `buscar-negocios-${generatedId}`;
  const helpId = `${searchId}-ayuda`;

  return (
    <div className="grid gap-4 rounded-2xl border border-[#ded8cc] bg-[#fffdf8] p-3 shadow-[0_12px_30px_rgba(55,47,31,0.05)] lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)] lg:items-end lg:p-4">
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#6f695f]">
          Estado de la cuenta
        </p>
        <div
          className="grid grid-cols-3 gap-1 rounded-xl bg-[#ece8de] p-1"
          role="group"
          aria-label="Filtrar negocios por estado"
        >
          {FILTER_OPTIONS.map((option) => {
            const active = filtro === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onFiltroChange(option.value)}
                aria-pressed={active}
                className={`min-h-11 min-w-0 rounded-lg px-1.5 text-[11px] font-bold transition-colors sm:px-3 sm:text-xs ${focusRing} ${
                  active
                    ? 'bg-[#201f1b] text-[#fffdf8] shadow-sm'
                    : 'text-[#625d54] hover:bg-[#fffdf8] hover:text-[#201f1b]'
                }`}
              >
                <span className="block truncate">{option.label}</span>
                <span
                  className={`mt-0.5 inline-flex min-w-5 justify-center rounded-full px-1.5 text-[10px] ${
                    active ? 'bg-white/15 text-[#fffdf8]' : 'bg-[#d9d3c7] text-[#4f4b43]'
                  }`}
                >
                  {cantidades[option.value]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-w-0">
        <label htmlFor={searchId} className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#6f695f]">
          Buscar negocios
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#756f63]" aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            value={busqueda}
            onChange={(event) => onBusquedaChange(event.target.value)}
            placeholder="Nombre, propietario o contacto"
            aria-describedby={helpId}
            className={`min-h-11 w-full rounded-xl border border-[#d9d3c7] bg-white py-2 pl-10 pr-11 text-sm text-[#201f1b] placeholder:text-[#756f63] hover:border-[#b8b0a2] ${focusRing}`}
          />
          {busqueda && (
            <button
              type="button"
              onClick={() => onBusquedaChange('')}
              aria-label="Limpiar búsqueda"
              className={`absolute right-0 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-lg text-[#625d54] transition-colors hover:bg-[#ece8de] hover:text-[#201f1b] ${focusRing}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
        <p id={helpId} className="mt-1.5 text-[11px] text-[#6f695f]">
          Busca por negocio, propietario, correo o teléfono.
        </p>
      </div>
    </div>
  );
}

export function NegocioAccountCard({
  negocio,
  esActual,
  procesando,
  onAprobar,
  onRechazar,
  onSuspender,
  onOperar,
}: NegocioAccountCardProps) {
  const generatedId = useId().replace(/:/g, '');
  const headingId = `negocio-${generatedId}`;
  const status = STATUS_META[negocio.estado];
  const StatusIcon = status.icon;
  const telefonoDigitos = negocio.telefono.replace(/\D/g, '');
  const telefonoWhatsApp = telefonoDigitos.startsWith('57')
    ? telefonoDigitos
    : `57${telefonoDigitos}`;

  return (
    <article
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col rounded-2xl border border-[#ded8cc] bg-[#fffdf8] p-4 shadow-[0_12px_30px_rgba(55,47,31,0.05)] transition-colors hover:border-[#c7bfae] sm:p-5"
    >
      <div className="flex flex-col gap-3 min-[380px]:flex-row min-[380px]:items-start min-[380px]:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#ded8cc] bg-[#f0ede4] font-display text-base font-black text-[#76590f]" aria-hidden="true">
            {negocio.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <h3 id={headingId} className="min-w-0 break-words font-display text-base font-black leading-tight text-[#201f1b] sm:text-lg">
                {negocio.nombre}
              </h3>
              {negocio.id === 'laparada' && (
                <span className="rounded-md border border-[#c9a84c]/45 bg-[#f7efd8] px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.1em] text-[#76590f]">
                  Principal
                </span>
              )}
            </div>
            <p className="mt-1 break-words text-xs text-[#625d54]">
              <span className="sr-only">Propietario: </span>
              {negocio.propietarioNombre}
            </p>
            {negocio.plan && (
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#756f63]">
                Plan {negocio.plan}
              </p>
            )}
          </div>
        </div>

        <span className={`inline-flex min-h-8 w-fit shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[10px] font-black uppercase tracking-[0.09em] ${status.className}`}>
          <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {status.label}
        </span>
      </div>

      <address className="mt-4 grid min-w-0 gap-2 rounded-xl border border-[#e5e0d6] bg-[#f7f4ed] p-3 text-xs not-italic text-[#4f4b43]">
        <a
          href={`mailto:${negocio.propietarioEmail}`}
          className={`flex min-h-11 min-w-0 items-center gap-2 rounded-md hover:text-[#76590f] ${focusRing}`}
        >
          <Mail className="h-4 w-4 shrink-0 text-[#756f63]" aria-hidden="true" />
          <span className="min-w-0 break-all">{negocio.propietarioEmail}</span>
        </a>
        <a
          href={`https://wa.me/${telefonoWhatsApp}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Abrir WhatsApp de ${negocio.nombre} en una pestaña nueva`}
          className={`flex min-h-11 min-w-0 items-center gap-2 rounded-md text-[#116b46] hover:underline ${focusRing}`}
        >
          <Phone className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">{negocio.telefono}</span>
          <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
        </a>
        {(negocio.ciudad || negocio.direccion) && (
          <div className="flex min-w-0 items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#76590f]" aria-hidden="true" />
            <span className="min-w-0 break-words">
              {[negocio.ciudad, negocio.direccion].filter(Boolean).join(' · ')}
            </span>
          </div>
        )}
      </address>

      {negocio.notasAdmin && (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-[#e2c766]/50 bg-[#fbf3d9] p-3 text-xs text-[#62500f]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">{negocio.notasAdmin}</span>
        </p>
      )}

      <div
        className="mt-auto grid min-w-0 grid-cols-1 gap-2 border-t border-[#e5e0d6] pt-4 min-[380px]:grid-cols-2"
        aria-busy={procesando}
      >
        {procesando && (
          <p
            className="col-span-full flex items-center gap-2 text-xs font-bold text-[#625d54]"
            role="status"
          >
            <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Procesando acción…
          </p>
        )}

        {negocio.estado === 'pendiente' && (
          <>
            <Button
              variant="danger"
              size="sm"
              fullWidth
              onClick={() => onRechazar(negocio)}
              disabled={procesando}
              aria-label={`Rechazar solicitud de ${negocio.nombre}`}
              className={`${focusRing} min-h-11`}
            >
              <XCircle className="h-4 w-4" aria-hidden="true" />
              Rechazar
            </Button>
            <Button
              variant="primary"
              size="sm"
              fullWidth
              onClick={() => onAprobar(negocio)}
              disabled={procesando}
              aria-label={`Aprobar ${negocio.nombre}`}
              className={`${focusRing} min-h-11 bg-[#c9a84c] text-[#171713] hover:bg-[#b9973f]`}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Aprobar
            </Button>
          </>
        )}

        {negocio.estado === 'activo' && (
          <>
            {esActual ? (
              <div className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#168a5b]/30 bg-[#e7f4ed] px-3 text-xs font-bold text-[#116b46] ${negocio.id === 'laparada' ? 'min-[380px]:col-span-2' : ''}`}>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Operando ahora
              </div>
            ) : (
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={() => onOperar(negocio)}
                disabled={procesando}
                aria-label={`Operar ${negocio.nombre}`}
                className={`${focusRing} min-h-11 ${negocio.id === 'laparada' ? 'min-[380px]:col-span-2' : ''}`}
              >
                <Store className="h-4 w-4" aria-hidden="true" />
                Operar negocio
              </Button>
            )}

            {negocio.id !== 'laparada' && (
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => onSuspender(negocio)}
                disabled={procesando}
                aria-label={`Suspender acceso de ${negocio.nombre}`}
                className={`${focusRing} min-h-11 border border-[#b42318]/25 !text-[#9f1f16] hover:!bg-[#fce9e7]`}
              >
                <PauseCircle className="h-4 w-4" aria-hidden="true" />
                Suspender acceso
              </Button>
            )}
          </>
        )}

        {(negocio.estado === 'suspendido' || negocio.estado === 'rechazado') && (
          <p className="col-span-full py-1 text-xs text-[#6f695f]">
            Esta cuenta no tiene acciones operativas disponibles.
          </p>
        )}
      </div>
    </article>
  );
}

export function SuperAdminNegociosPage() {
  const { esSuperAdmin, negocioActual, cambiarNegocioActivo } = useNegocio();
  const navigate = useNavigate();
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tabActiva, setTabActiva] = useState<FiltroNegocio>('pendientes');
  const [busqueda, setBusqueda] = useState('');
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const cargarNegocios = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getTodosNegocios();
      setNegocios(data);
    } catch (error) {
      console.error('Error cargando negocios:', error);
      setLoadError('No fue posible consultar los negocios de la plataforma.');
      createToast('Error al cargar la lista de negocios', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargarNegocios();
  }, [cargarNegocios]);

  const handleAprobar = async (negocio: Negocio) => {
    setProcesandoId(negocio.id);
    try {
      await aprobarNegocio(negocio.id);
      createToast(`Negocio "${negocio.nombre}" aprobado`, 'success');
      await cargarNegocios();
    } catch (error) {
      console.error('Error al aprobar:', error);
      createToast('Error al aprobar negocio', 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleRechazar = async (negocio: Negocio) => {
    const motivo = window.prompt(`Motivo del rechazo de "${negocio.nombre}" (opcional):`);
    if (motivo === null) return;

    setProcesandoId(negocio.id);
    try {
      await cambiarEstadoNegocio(negocio.id, 'rechazado', motivo.trim() || undefined);
      createToast(`Solicitud de "${negocio.nombre}" rechazada`, 'info');
      await cargarNegocios();
    } catch (error) {
      console.error('Error al rechazar:', error);
      createToast('Error al rechazar la solicitud', 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleSuspender = async (negocio: Negocio) => {
    if (!window.confirm(`¿Suspender el acceso de "${negocio.nombre}"?`)) return;

    setProcesandoId(negocio.id);
    try {
      await cambiarEstadoNegocio(negocio.id, 'suspendido');
      createToast(`Acceso de "${negocio.nombre}" suspendido`, 'info');
      await cargarNegocios();
    } catch (error) {
      console.error('Error al suspender:', error);
      createToast('Error al suspender el acceso', 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleOperarNegocio = (negocio: Negocio) => {
    cambiarNegocioActivo(negocio);
    createToast(`Ahora operas ${negocio.nombre}`, 'success');
    navigate('/admin');
  };

  const pendientes = negocios.filter((negocio) => negocio.estado === 'pendiente');
  const activos = negocios.filter((negocio) => negocio.estado === 'activo');
  const consulta = busqueda.trim().toLocaleLowerCase('es-CO');
  const listaFiltrada = negocios.filter((negocio) => {
    if (tabActiva === 'pendientes' && negocio.estado !== 'pendiente') return false;
    if (tabActiva === 'activos' && negocio.estado !== 'activo') return false;
    if (!consulta) return true;

    return [
      negocio.nombre,
      negocio.propietarioNombre,
      negocio.propietarioEmail,
      negocio.telefono,
    ].some((value) => value.toLocaleLowerCase('es-CO').includes(consulta));
  });

  if (!esSuperAdmin) {
    return (
      <section
        role="alert"
        className="mx-auto mt-8 max-w-lg rounded-2xl border border-[#e2c766]/55 bg-[#fffdf8] p-6 text-center shadow-sm sm:p-8"
      >
        <ShieldAlert className="mx-auto h-10 w-10 text-[#9f1f16]" aria-hidden="true" />
        <h1 className="mt-3 font-display text-xl font-black text-[#201f1b]">Acceso restringido</h1>
        <p className="mt-2 text-sm text-[#625d54]">
          Esta sección está disponible únicamente para superadministradores.
        </p>
      </section>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-3 pb-28 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10">
      <header className="overflow-hidden rounded-2xl border border-[#d7cfbf] bg-[#fffdf8] shadow-[0_14px_38px_rgba(55,47,31,0.06)]">
        <div className="h-1 bg-[#c9a84c]" aria-hidden="true" />
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#c9a84c]/45 bg-[#f7efd8] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.13em] text-[#76590f]">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Control de plataforma
              </span>
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#ded8cc] bg-[#f4f1e8] px-2.5 py-1 text-[10px] font-bold text-[#625d54]">
                <Store className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">Operando: {negocioActual.nombre}</span>
              </span>
            </div>
            <h1 className="font-display text-2xl font-black tracking-tight text-[#201f1b] sm:text-3xl">
              Negocios de la plataforma
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#625d54]">
              Revisa solicitudes, habilita operaciones y cambia de negocio sin perder el contexto.
            </p>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => void cargarNegocios()}
            disabled={loading}
            aria-label={loading ? 'Actualizando negocios' : 'Actualizar negocios'}
            className={`min-h-11 w-full shrink-0 border border-[#d9d3c7] bg-[#f0ede4] text-xs text-[#201f1b] hover:bg-[#e3ded2] sm:w-auto ${focusRing}`}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            {loading ? 'Actualizando' : 'Actualizar'}
          </Button>
        </div>
      </header>

      <section aria-label="Resumen de negocios" className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'Pendientes', value: pendientes.length, icon: Clock3, tone: 'text-[#76590f] bg-[#fbf3d9]' },
          { label: 'Activos', value: activos.length, icon: CheckCircle2, tone: 'text-[#116b46] bg-[#e7f4ed]' },
          { label: 'Registrados', value: negocios.length, icon: Store, tone: 'text-[#4f4b43] bg-[#ece8de]' },
        ].map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.label} className="min-w-0 rounded-2xl border border-[#ded8cc] bg-[#fffdf8] p-3 shadow-[0_8px_20px_rgba(55,47,31,0.04)] sm:p-4">
              <div className="flex min-w-0 items-start justify-between gap-1.5">
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-bold uppercase tracking-[0.08em] text-[#6f695f] sm:text-xs">
                    {metric.label}
                  </p>
                  <p className="mt-1 font-display text-2xl font-black leading-none text-[#201f1b] sm:text-3xl">
                    {metric.value}
                  </p>
                </div>
                <span className={`hidden h-8 w-8 shrink-0 place-items-center rounded-lg min-[360px]:grid sm:h-9 sm:w-9 ${metric.tone}`} aria-hidden="true">
                  <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                </span>
              </div>
            </div>
          );
        })}
      </section>

      <NegociosToolbar
        filtro={tabActiva}
        onFiltroChange={setTabActiva}
        busqueda={busqueda}
        onBusquedaChange={setBusqueda}
        cantidades={{
          pendientes: pendientes.length,
          activos: activos.length,
          todos: negocios.length,
        }}
      />

      <section aria-labelledby="negocios-list-title" aria-busy={loading}>
        <div className="mb-3 flex flex-col gap-1 min-[380px]:flex-row min-[380px]:items-end min-[380px]:justify-between">
          <div>
            <h2 id="negocios-list-title" className="font-display text-lg font-black text-[#201f1b] sm:text-xl">
              Solicitudes y cuentas
            </h2>
            <p className="text-xs text-[#6f695f]">Acciones disponibles según el estado de cada negocio.</p>
          </div>
          {!loading && !loadError && (
            <p className="text-xs font-bold text-[#625d54]" role="status" aria-live="polite">
              {listaFiltrada.length} {listaFiltrada.length === 1 ? 'resultado' : 'resultados'}
            </p>
          )}
        </div>

        {loadError && !loading ? (
          <div role="alert" className="rounded-2xl border border-[#b42318]/25 bg-[#fffdf8] p-6 text-center sm:p-8">
            <AlertTriangle className="mx-auto h-9 w-9 text-[#9f1f16]" aria-hidden="true" />
            <h3 className="mt-3 font-display text-lg font-black text-[#201f1b]">No pudimos cargar los negocios</h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-[#625d54]">{loadError}</p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void cargarNegocios()}
              className={`mx-auto mt-4 border border-[#d9d3c7] bg-[#f0ede4] text-[#201f1b] hover:bg-[#e3ded2] ${focusRing}`}
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Reintentar
            </Button>
          </div>
        ) : loading ? (
          <div className="grid gap-3 lg:grid-cols-2" role="status" aria-label="Cargando negocios">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-64 animate-pulse rounded-2xl border border-[#ded8cc] bg-[#fffdf8]" />
            ))}
          </div>
        ) : listaFiltrada.length === 0 ? (
          <div className="rounded-2xl border border-[#ded8cc] bg-[#fffdf8] p-7 text-center sm:p-10">
            <Store className="mx-auto h-9 w-9 text-[#8a8479]" aria-hidden="true" />
            <h3 className="mt-3 font-display text-base font-black text-[#201f1b]">
              {busqueda.trim()
                ? 'No encontramos coincidencias'
                : tabActiva === 'pendientes'
                  ? 'No hay solicitudes pendientes'
                  : 'No hay negocios en este estado'}
            </h3>
            <p className="mx-auto mt-1 max-w-md text-sm text-[#625d54]">
              {busqueda.trim()
                ? 'Prueba con otro nombre, propietario, correo o teléfono.'
                : 'Cuando haya nuevos registros aparecerán aquí para su revisión.'}
            </p>
            {busqueda.trim() && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setBusqueda('')}
                className={`mx-auto mt-4 border border-[#d9d3c7] bg-[#f0ede4] text-[#201f1b] hover:bg-[#e3ded2] ${focusRing}`}
              >
                Limpiar búsqueda
              </Button>
            )}
          </div>
        ) : (
          <div className="grid min-w-0 gap-3 lg:grid-cols-2 lg:gap-4">
            {listaFiltrada.map((negocio) => (
              <NegocioAccountCard
                key={negocio.id}
                negocio={negocio}
                esActual={negocioActual.id === negocio.id}
                procesando={procesandoId === negocio.id}
                onAprobar={handleAprobar}
                onRechazar={handleRechazar}
                onSuspender={handleSuspender}
                onOperar={handleOperarNegocio}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default SuperAdminNegociosPage;
