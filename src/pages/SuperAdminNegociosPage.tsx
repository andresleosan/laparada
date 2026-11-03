// src/pages/SuperAdminNegociosPage.tsx
import { useCallback, useEffect, useId, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  PauseCircle,
  Phone,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  XCircle,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createToast } from '@/components/ui/Toast';
import { useNegocio } from '@/context/NegocioContext';
import {
  aprobarNegocio,
  cambiarEstadoNegocio,
  getTodosNegocios,
  renovarSuscripcionNegocio,
} from '@/services/negociosService';
import {
  EstadoNegocio,
  Negocio,
  PLANES_SAAS,
  TipoPlanSaaS,
} from '@/types/negocio';
import { formatCOP } from '@/utils/formatCOP';

export type FiltroNegocio = 'pendientes' | 'activos' | 'suspendidos' | 'todos';

interface NegocioCardProps {
  negocio: Negocio;
  esActual: boolean;
  procesando: boolean;
  onAprobar: (negocio: Negocio, planId?: TipoPlanSaaS) => void;
  onRechazar: (negocio: Negocio) => void;
  onCambiarEstado: (negocio: Negocio, estado: EstadoNegocio) => void;
  onRenovar: (negocio: Negocio, planId: TipoPlanSaaS) => void;
  onOperar: (negocio: Negocio) => void;
}

const FILTER_OPTIONS: Array<{ value: FiltroNegocio; label: string }> = [
  { value: 'pendientes', label: 'Pendientes' },
  { value: 'activos', label: 'Activos' },
  { value: 'suspendidos', label: 'Suspendidos' },
  { value: 'todos', label: 'Todos' },
];

function getVigenciaInfo(negocio: Negocio) {
  if (negocio.id === 'laparada' || negocio.plan === 'enterprise') {
    return { texto: 'Permanente (Insignia)', diasRestantes: 999, estado: 'permanente' as const };
  }

  if (!negocio.suscripcionVenceEn) {
    return { texto: 'Sin fecha de vencimiento', diasRestantes: 0, estado: 'sin_fecha' as const };
  }

  const venceEnMs =
    typeof negocio.suscripcionVenceEn.toMillis === 'function'
      ? negocio.suscripcionVenceEn.toMillis()
      : 'seconds' in negocio.suscripcionVenceEn
        ? (negocio.suscripcionVenceEn as { seconds: number }).seconds * 1000
        : 0;

  const ahora = Date.now();
  const diffMs = venceEnMs - ahora;
  const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (dias < 0) {
    return { texto: `Vencido hace ${Math.abs(dias)} día(s)`, diasRestantes: dias, estado: 'vencido' as const };
  }
  if (dias === 0) {
    return { texto: 'Vence hoy', diasRestantes: 0, estado: 'hoy' as const };
  }
  return { texto: `Vence en ${dias} día(s)`, diasRestantes: dias, estado: dias <= 3 ? ('por_vencer' as const) : ('activo' as const) };
}

function NegocioCard({
  negocio,
  esActual,
  procesando,
  onAprobar,
  onRechazar,
  onCambiarEstado,
  onRenovar,
  onOperar,
}: NegocioCardProps) {
  const [planSeleccionadoAprobacion, setPlanSeleccionadoAprobacion] = useState<TipoPlanSaaS>(
    negocio.planId && PLANES_SAAS[negocio.planId] ? negocio.planId : 'prueba_3d'
  );

  const planConfig = negocio.planId && PLANES_SAAS[negocio.planId]
    ? PLANES_SAAS[negocio.planId]
    : negocio.plan && PLANES_SAAS[negocio.plan as TipoPlanSaaS]
      ? PLANES_SAAS[negocio.plan as TipoPlanSaaS]
      : PLANES_SAAS.prueba_3d;

  const vigencia = getVigenciaInfo(negocio);
  const usadas = negocio.respuestasIAUsadas || 0;
  const cuota = negocio.cuotaRespuestasIA || planConfig.cuotaRespuestasIA || 300;
  const pctUso = Math.min(100, Math.round((usadas / cuota) * 100));

  const statusBadge = {
    activo: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    pendiente: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    suspendido: 'border-orange-500/40 bg-orange-500/10 text-orange-400',
    rechazado: 'border-red-500/40 bg-red-500/10 text-red-400',
  }[negocio.estado || 'activo'];

  return (
    <article className={`rounded-2xl border bg-neutral-900/90 p-5 shadow-xl transition-all flex flex-col justify-between ${
      esActual ? 'border-amber-500 shadow-amber-500/10 ring-1 ring-amber-500/30' : 'border-neutral-800 hover:border-neutral-700'
    }`}>
      <div className="space-y-4">
        {/* Cabecera del Negocio */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-lg font-black text-white truncate">
                {negocio.nombre}
              </h3>
              {esActual && (
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-full">
                  Operando ahora
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 flex items-center gap-1.5 mt-0.5">
              <span>slug:</span>
              <code className="text-amber-400 font-mono text-[11px] bg-neutral-950 px-1.5 py-0.5 rounded">
                /{negocio.slug || negocio.id}
              </code>
            </p>
          </div>

          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${statusBadge}`}>
            {negocio.estado || 'activo'}
          </span>
        </div>

        {/* Datos de Contacto y Ubicación */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-300 bg-neutral-950/60 p-3 rounded-xl border border-neutral-800/80">
          <div className="flex items-center gap-2 truncate">
            <Store className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
            <span className="truncate">{negocio.propietarioNombre || 'Sin contacto'}</span>
          </div>

          <div className="flex items-center gap-2 truncate">
            <Phone className="h-3.5 w-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
            <a
              href={`https://wa.me/57${negocio.telefono.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="hover:underline text-emerald-400 font-mono"
            >
              {negocio.telefono}
            </a>
          </div>

          <div className="flex items-center gap-2 truncate">
            <Mail className="h-3.5 w-3.5 text-sky-400 shrink-0" aria-hidden="true" />
            <span className="truncate">{negocio.propietarioEmail}</span>
          </div>

          <div className="flex items-center gap-2 truncate">
            <MapPin className="h-3.5 w-3.5 text-red-400 shrink-0" aria-hidden="true" />
            <span className="truncate">{negocio.ciudad ? `${negocio.ciudad} ${negocio.direccion ? `· ${negocio.direccion}` : ''}` : 'Cúcuta'}</span>
          </div>
        </div>

        {/* Métricas de Plan, Suscripción y Cuota de IA */}
        <div className="p-3.5 rounded-xl bg-neutral-950/90 border border-neutral-800 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Plan Activo</span>
              <p className="font-bold text-amber-400 text-sm mt-0.5">
                {planConfig.nombre} · {formatCOP(planConfig.precioCOP)}
              </p>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">Vigencia</span>
              <p className={`font-semibold text-xs mt-0.5 ${
                vigencia.estado === 'vencido' ? 'text-red-400' :
                vigencia.estado === 'por_vencer' || vigencia.estado === 'hoy' ? 'text-amber-400' :
                'text-emerald-400'
              }`}>
                {vigencia.texto}
              </p>
            </div>
          </div>

          {/* Barra de Consumo de IA */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-neutral-400 flex items-center gap-1 font-semibold">
                <Sparkles className="h-3 w-3 text-gold-400" />
                Cuota Sarin IA consumida
              </span>
              <span className="font-mono text-white font-bold">
                {usadas.toLocaleString('es-CO')} / {cuota.toLocaleString('es-CO')} ({pctUso}%)
              </span>
            </div>
            <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  pctUso >= 90 ? 'bg-red-500' : pctUso >= 70 ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ width: `${pctUso}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Acciones de Operación y Renovación */}
      <div className="mt-5 pt-3.5 border-t border-neutral-800 space-y-3">
        {negocio.estado === 'pendiente' ? (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <label htmlFor={`plan-aprobacion-${negocio.id}`} className="text-xs text-neutral-400 font-semibold shrink-0">
                Plan a otorgar:
              </label>
              <select
                id={`plan-aprobacion-${negocio.id}`}
                value={planSeleccionadoAprobacion}
                onChange={(e) => setPlanSeleccionadoAprobacion(e.target.value as TipoPlanSaaS)}
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
              >
                <option value="prueba_3d">Prueba 3 días ($ 5.000 COP · 300 IA)</option>
                <option value="semanal_7d">Semanal 7 días ($ 19.900 COP · 700 IA)</option>
                <option value="quincenal_15d">Quincenal 15 días ($ 34.900 COP · 1.500 IA)</option>
                <option value="mensual_30d">Mensual 30 días ($ 59.900 COP · 3.000 IA)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => onAprobar(negocio, planSeleccionadoAprobacion)}
                disabled={procesando}
                className="w-full text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950 min-h-[44px]"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Aprobar y Activar
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => onRechazar(negocio)}
                disabled={procesando}
                className="w-full text-xs text-red-400 hover:text-red-300 border-red-500/30 min-h-[44px]"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                Rechazar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Botones de Renovación Rápida con 1 Clic */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mb-1.5">
                Renovación rápida con 1 clic:
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => onRenovar(negocio, 'prueba_3d')}
                  disabled={procesando}
                  className="rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 py-1.5 px-1 text-[11px] font-bold text-neutral-200 transition-colors disabled:opacity-50 min-h-[44px] flex flex-col items-center justify-center"
                  title="Extender 3 días y sumar 300 respuestas de IA"
                >
                  <span className="text-amber-400">+3d</span>
                  <span className="text-[9px] text-neutral-400 font-normal">300 IA</span>
                </button>

                <button
                  type="button"
                  onClick={() => onRenovar(negocio, 'semanal_7d')}
                  disabled={procesando}
                  className="rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 py-1.5 px-1 text-[11px] font-bold text-neutral-200 transition-colors disabled:opacity-50 min-h-[44px] flex flex-col items-center justify-center"
                  title="Extender 7 días y sumar 700 respuestas de IA"
                >
                  <span className="text-amber-400">+7d</span>
                  <span className="text-[9px] text-neutral-400 font-normal">700 IA</span>
                </button>

                <button
                  type="button"
                  onClick={() => onRenovar(negocio, 'quincenal_15d')}
                  disabled={procesando}
                  className="rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 py-1.5 px-1 text-[11px] font-bold text-neutral-200 transition-colors disabled:opacity-50 min-h-[44px] flex flex-col items-center justify-center"
                  title="Extender 15 días y sumar 1.500 respuestas de IA"
                >
                  <span className="text-amber-400">+15d</span>
                  <span className="text-[9px] text-neutral-400 font-normal">1.5k IA</span>
                </button>

                <button
                  type="button"
                  onClick={() => onRenovar(negocio, 'mensual_30d')}
                  disabled={procesando}
                  className="rounded-lg bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 py-1.5 px-1 text-[11px] font-bold text-neutral-200 transition-colors disabled:opacity-50 min-h-[44px] flex flex-col items-center justify-center"
                  title="Extender 30 días y sumar 3.000 respuestas de IA"
                >
                  <span className="text-amber-400">+30d</span>
                  <span className="text-[9px] text-neutral-400 font-normal">3k IA</span>
                </button>
              </div>
            </div>

            {/* Acciones de Operación y Estado */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="primary"
                size="sm"
                onClick={() => onOperar(negocio)}
                disabled={procesando}
                className="flex-1 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-neutral-950 min-h-[44px]"
              >
                <Zap className="h-4 w-4 mr-1.5" />
                Operar este Local
              </Button>

              {negocio.id !== 'laparada' && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    onCambiarEstado(
                      negocio,
                      negocio.estado === 'suspendido' ? 'activo' : 'suspendido'
                    )
                  }
                  disabled={procesando}
                  className={`text-xs min-h-[44px] px-3 ${
                    negocio.estado === 'suspendido'
                      ? 'text-emerald-400 hover:text-emerald-300 border-emerald-500/30'
                      : 'text-orange-400 hover:text-orange-300 border-orange-500/30'
                  }`}
                  title={negocio.estado === 'suspendido' ? 'Reactivar local' : 'Suspender local'}
                >
                  {negocio.estado === 'suspendido' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <PauseCircle className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}

export function SuperAdminNegociosPage() {
  const navigate = useNavigate();
  const { esSuperAdmin, negocioActual, seleccionarNegocioOperativo } = useNegocio();
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<FiltroNegocio>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const searchInputId = useId();

  const cargarNegocios = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const list = await getTodosNegocios();
      setNegocios(list);
    } catch (err: unknown) {
      console.error('Error cargando negocios:', err);
      const msg = err instanceof Error ? err.message : 'No se pudo conectar con Firestore';
      setLoadError(msg);
      createToast('Error al cargar la lista de locales', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!esSuperAdmin) {
      navigate('/admin', { replace: true });
      return;
    }
    void cargarNegocios();
  }, [esSuperAdmin, navigate, cargarNegocios]);

  // Acciones Administrativas
  const handleAprobar = async (negocio: Negocio, planId: TipoPlanSaaS = 'prueba_3d') => {
    setProcesandoId(negocio.id);
    try {
      await aprobarNegocio(negocio.id, planId);
      createToast(
        `¡Local ${negocio.nombre} aprobado en plan ${PLANES_SAAS[planId].nombre}! Correo enviado a ${negocio.propietarioEmail}`,
        'success'
      );
      await cargarNegocios();
    } catch (err) {
      console.error('Error aprobando negocio:', err);
      createToast('Error al aprobar el negocio', 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleRechazar = async (negocio: Negocio) => {
    setProcesandoId(negocio.id);
    try {
      await cambiarEstadoNegocio(negocio.id, 'rechazado', 'Solicitud rechazada por administración');
      createToast(`Solicitud de ${negocio.nombre} rechazada`, 'info');
      await cargarNegocios();
    } catch (err) {
      console.error('Error rechazando negocio:', err);
      createToast('Error al rechazar solicitud', 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleCambiarEstado = async (negocio: Negocio, nuevoEstado: EstadoNegocio) => {
    setProcesandoId(negocio.id);
    try {
      await cambiarEstadoNegocio(negocio.id, nuevoEstado);
      createToast(`Estado de ${negocio.nombre} actualizado a "${nuevoEstado}"`, 'success');
      await cargarNegocios();
    } catch (err) {
      console.error('Error cambiando estado:', err);
      createToast('Error al cambiar el estado del negocio', 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleRenovar = async (negocio: Negocio, planId: TipoPlanSaaS) => {
    setProcesandoId(negocio.id);
    try {
      await renovarSuscripcionNegocio(negocio.id, planId);
      const conf = PLANES_SAAS[planId];
      createToast(
        `¡Suscripción de ${negocio.nombre} renovada (+${conf.dias}d / +${conf.cuotaRespuestasIA} IA)! Correo enviado a ${negocio.propietarioEmail}`,
        'success'
      );
      await cargarNegocios();
    } catch (err) {
      console.error('Error renovando suscripción:', err);
      createToast('Error al renovar suscripción', 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleOperar = (negocio: Negocio) => {
    seleccionarNegocioOperativo(negocio);
    createToast(`Operando ahora en: ${negocio.nombre}`, 'info');
    navigate('/admin');
  };

  // Filtrado y Métricas
  const pendientes = negocios.filter((n) => n.estado === 'pendiente');
  const activos = negocios.filter((n) => n.estado === 'activo' || !n.estado);
  const suspendidos = negocios.filter((n) => n.estado === 'suspendido' || n.estado === 'rechazado');

  const totalRespuestasIAUsadas = negocios.reduce((acc, curr) => acc + (curr.respuestasIAUsadas || 0), 0);
  const porVencerOCaducados = negocios.filter((n) => {
    const vig = getVigenciaInfo(n);
    return vig.estado === 'por_vencer' || vig.estado === 'vencido' || vig.estado === 'hoy';
  }).length;

  const listaFiltrada = negocios.filter((negocio) => {
    // Filtro por Tab
    if (filtro === 'pendientes' && negocio.estado !== 'pendiente') return false;
    if (filtro === 'activos' && negocio.estado !== 'activo' && negocio.estado !== undefined) return false;
    if (filtro === 'suspendidos' && negocio.estado !== 'suspendido' && negocio.estado !== 'rechazado') return false;

    // Filtro por Búsqueda
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase().trim();
      const matchNombre = (negocio.nombre || '').toLowerCase().includes(q);
      const matchPropietario = (negocio.propietarioNombre || '').toLowerCase().includes(q);
      const matchEmail = (negocio.propietarioEmail || '').toLowerCase().includes(q);
      const matchTelefono = (negocio.telefono || '').toLowerCase().includes(q);
      const matchSlug = (negocio.slug || '').toLowerCase().includes(q);
      return matchNombre || matchPropietario || matchEmail || matchTelefono || matchSlug;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Encabezado Principal */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-black text-white">
                Centro de Control SuperAdmin
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
                Planes comerciales SaaS, cuotas de Sarin IA y solicitudes de locales
              </p>
            </div>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => void cargarNegocios()}
          disabled={loading}
          className="flex items-center gap-2 self-start sm:self-auto min-h-[44px] text-xs"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          <span>{loading ? 'Actualizando...' : 'Recargar'}</span>
        </Button>
      </div>

      {/* 4 KPIs de Plataforma SaaS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-2">
          <span className="text-[10px] sm:text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
            Locales Activos
          </span>
          <div className="flex items-baseline justify-between">
            <span className="font-display text-2xl sm:text-3xl font-black text-emerald-400">
              {activos.length}
            </span>
            <Building2 className="h-5 w-5 text-emerald-500/40" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-2">
          <span className="text-[10px] sm:text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
            Solicitudes Pendientes
          </span>
          <div className="flex items-baseline justify-between">
            <span className="font-display text-2xl sm:text-3xl font-black text-amber-400">
              {pendientes.length}
            </span>
            <Clock3 className="h-5 w-5 text-amber-500/40" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-2">
          <span className="text-[10px] sm:text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
            Por Vencer o Vencidos
          </span>
          <div className="flex items-baseline justify-between">
            <span className="font-display text-2xl sm:text-3xl font-black text-orange-400">
              {porVencerOCaducados}
            </span>
            <Calendar className="h-5 w-5 text-orange-500/40" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 space-y-2">
          <span className="text-[10px] sm:text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
            Respuestas IA Consumidas
          </span>
          <div className="flex items-baseline justify-between">
            <span className="font-display text-2xl sm:text-3xl font-black text-gold-400">
              {totalRespuestasIAUsadas.toLocaleString('es-CO')}
            </span>
            <Sparkles className="h-5 w-5 text-gold-500/40" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="grid gap-4 rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.72fr)] lg:items-end">
        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            Filtrar solicitudes y locales
          </p>
          <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-neutral-950 p-1 border border-neutral-800">
            {FILTER_OPTIONS.map((opt) => {
              const active = filtro === opt.value;
              const count = {
                pendientes: pendientes.length,
                activos: activos.length,
                suspendidos: suspendidos.length,
                todos: negocios.length,
              }[opt.value];

              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFiltro(opt.value)}
                  aria-pressed={active}
                  className={`min-h-[44px] rounded-lg px-2 text-xs font-bold transition-all flex flex-col items-center justify-center ${
                    active
                      ? 'bg-amber-500 text-neutral-950 shadow-md'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className={`text-[10px] px-1.5 rounded-full mt-0.5 ${active ? 'bg-neutral-950/20 text-neutral-950 font-bold' : 'text-neutral-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label htmlFor={searchInputId} className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-neutral-400">
            Buscar por nombre, propietario o teléfono
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
            <input
              id={searchInputId}
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Ej: El Punto, Carlos, 300..."
              className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 py-2 pl-10 pr-4 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
        </div>
      </div>

      {/* Listado de Negocios */}
      {loadError && !loading ? (
        <div className="rounded-2xl border border-red-500/30 bg-neutral-900/90 p-8 text-center space-y-3">
          <AlertTriangle className="h-10 w-10 text-red-400 mx-auto" />
          <h2 className="text-lg font-bold text-white">No pudimos conectar con la base de datos de locales</h2>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">{loadError}</p>
          <Button variant="secondary" onClick={() => void cargarNegocios()} className="min-h-[44px]">
            Reintentar
          </Button>
        </div>
      ) : loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900/60" />
          ))}
        </div>
      ) : listaFiltrada.length === 0 ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-10 text-center space-y-3">
          <Store className="h-10 w-10 text-neutral-600 mx-auto" />
          <h2 className="text-base font-bold text-white">
            {busqueda.trim() ? 'No encontramos ningún local que coincida' : 'No hay locales en este estado'}
          </h2>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            {busqueda.trim()
              ? 'Intenta con otro término o limpia el buscador.'
              : 'Cuando los establecimientos soliciten acceso aparecerán en esta sección.'}
          </p>
          {busqueda.trim() && (
            <Button variant="secondary" size="sm" onClick={() => setBusqueda('')} className="min-h-[44px]">
              Limpiar búsqueda
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {listaFiltrada.map((negocio) => (
            <NegocioCard
              key={negocio.id}
              negocio={negocio}
              esActual={negocioActual.id === negocio.id}
              procesando={procesandoId === negocio.id}
              onAprobar={handleAprobar}
              onRechazar={handleRechazar}
              onCambiarEstado={handleCambiarEstado}
              onRenovar={handleRenovar}
              onOperar={handleOperar}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default SuperAdminNegociosPage;

