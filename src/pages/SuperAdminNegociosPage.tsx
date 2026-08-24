// src/pages/SuperAdminNegociosPage.tsx
import { useState, useEffect } from 'react';
import {
  Store,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { createToast } from '@/components/ui/Toast';
import { useNegocio } from '@/context/NegocioContext';
import {
  getTodosNegocios,
  aprobarNegocio,
  cambiarEstadoNegocio,
} from '@/services/negociosService';
import { Negocio } from '@/types/negocio';

export function SuperAdminNegociosPage() {
  const { esSuperAdmin } = useNegocio();
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabActiva, setTabActiva] = useState<'pendientes' | 'activos' | 'todos'>('pendientes');
  const [busqueda, setBusqueda] = useState('');
  const [procesandoId, setProcesandoId] = useState<string | null>(null);

  const cargarNegocios = async () => {
    setLoading(true);
    try {
      const data = await getTodosNegocios();
      setNegocios(data);
    } catch (error) {
      console.error('Error cargando negocios:', error);
      createToast('Error al cargar la lista de negocios', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarNegocios();
  }, []);

  const handleAprobar = async (negocio: Negocio) => {
    setProcesandoId(negocio.id);
    try {
      await aprobarNegocio(negocio.id);
      createToast(`✅ Negocio "${negocio.nombre}" aprobado exitosamente`, 'success');
      await cargarNegocios();
    } catch (error) {
      console.error('Error al aprobar:', error);
      createToast('Error al aprobar negocio', 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleRechazar = async (negocio: Negocio) => {
    const motivo = prompt('Ingresa el motivo del rechazo o suspensión (opcional):');
    if (motivo === null) return; // Canceló

    setProcesandoId(negocio.id);
    try {
      await cambiarEstadoNegocio(negocio.id, 'rechazado', motivo || undefined);
      createToast(`Solicitud de "${negocio.nombre}" rechazada`, 'info');
      await cargarNegocios();
    } catch (error) {
      console.error('Error al rechazar:', error);
      createToast('Error al procesar acción', 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  const handleSuspender = async (negocio: Negocio) => {
    if (!confirm(`¿Estás seguro de suspender el acceso a "${negocio.nombre}"?`)) return;

    setProcesandoId(negocio.id);
    try {
      await cambiarEstadoNegocio(negocio.id, 'suspendido');
      createToast(`Negocio "${negocio.nombre}" suspendido`, 'info');
      await cargarNegocios();
    } catch (error) {
      console.error('Error al suspender:', error);
      createToast('Error al suspender negocio', 'error');
    } finally {
      setProcesandoId(null);
    }
  };

  // Contadores
  const pendientes = negocios.filter((n) => n.estado === 'pendiente');
  const activos = negocios.filter((n) => n.estado === 'activo');

  // Filtrado
  const listaFiltrada = negocios.filter((n) => {
    if (tabActiva === 'pendientes' && n.estado !== 'pendiente') return false;
    if (tabActiva === 'activos' && n.estado !== 'activo') return false;

    if (busqueda.trim()) {
      const b = busqueda.toLowerCase();
      return (
        n.nombre.toLowerCase().includes(b) ||
        n.propietarioNombre.toLowerCase().includes(b) ||
        n.propietarioEmail.toLowerCase().includes(b) ||
        n.telefono.includes(b)
      );
    }
    return true;
  });

  if (!esSuperAdmin) {
    return (
      <div className="p-8 text-center text-neutral-400 space-y-3">
        <AlertTriangle size={48} className="mx-auto text-amber-400" />
        <h2 className="text-xl font-bold text-white">Acceso Restringido</h2>
        <p className="text-xs">
          Esta sección es exclusiva para el Super Administrador del sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-black border border-amber-500/30 flex items-center gap-1">
              <ShieldCheck size={14} /> SUPER ADMIN
            </span>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-white">
              Gestión de Negocios & Clientes
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Aprueba solicitudes de nuevos restaurantes y gestiona las cuentas de tu plataforma SaaS.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={cargarNegocios}
          disabled={loading}
          className="text-xs flex items-center gap-2"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Actualizar</span>
        </Button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-neutral-900 rounded-3xl border border-neutral-800 space-y-1">
          <span className="text-xs text-neutral-400 font-medium">Solicitudes Pendientes</span>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-display font-black text-amber-400">
              {pendientes.length}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
        </div>

        <div className="p-5 bg-neutral-900 rounded-3xl border border-neutral-800 space-y-1">
          <span className="text-xs text-neutral-400 font-medium">Negocios Activos</span>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-display font-black text-emerald-400">
              {activos.length}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 size={20} />
            </div>
          </div>
        </div>

        <div className="p-5 bg-neutral-900 rounded-3xl border border-neutral-800 space-y-1">
          <span className="text-xs text-neutral-400 font-medium">Total Registrados</span>
          <div className="flex items-center justify-between">
            <span className="text-3xl font-display font-black text-white">
              {negocios.length}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-neutral-800 text-neutral-300 flex items-center justify-center">
              <Store size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs & Buscador */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
        <div className="flex gap-2 p-1 bg-neutral-900 rounded-2xl border border-neutral-800 text-xs">
          <button
            onClick={() => setTabActiva('pendientes')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              tabActiva === 'pendientes'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>Pendientes</span>
            {pendientes.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-neutral-950 text-amber-400 text-[10px] font-black">
                {pendientes.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setTabActiva('activos')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              tabActiva === 'activos'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <span>Activos</span>
            <span className="px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-300 text-[10px]">
              {activos.length}
            </span>
          </button>

          <button
            onClick={() => setTabActiva('todos')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${
              tabActiva === 'todos'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            Todos ({negocios.length})
          </button>
        </div>

        <div className="relative max-w-xs">
          <Search size={16} className="absolute left-3 top-3 text-neutral-500" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar negocio o dueño..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Listado de Negocios */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-neutral-900/60 rounded-3xl animate-pulse border border-neutral-800" />
          ))}
        </div>
      ) : listaFiltrada.length === 0 ? (
        <div className="p-12 text-center text-neutral-400 bg-neutral-900 rounded-3xl border border-neutral-800 space-y-2">
          <Store size={36} className="mx-auto text-neutral-600 mb-2" />
          <p className="font-semibold text-white text-sm">
            {tabActiva === 'pendientes'
              ? 'No hay solicitudes pendientes en este momento'
              : 'No se encontraron negocios'}
          </p>
          <p className="text-xs text-neutral-500">
            Los nuevos registros aparecerán aquí automáticamente para tu aprobación.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listaFiltrada.map((negocio) => (
            <div
              key={negocio.id}
              className="p-5 bg-neutral-900 rounded-3xl border border-neutral-800 hover:border-neutral-700 transition-all space-y-4 shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center font-display font-black text-amber-400 text-lg">
                      {negocio.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-white flex items-center gap-2">
                        {negocio.nombre}
                        {negocio.id === 'laparada' && (
                          <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/40 px-1.5 py-0.2 rounded-md font-extrabold">
                            PRINCIPAL
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-neutral-400">
                        Propietario: <strong className="text-neutral-200">{negocio.propietarioNombre}</strong>
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
                      negocio.estado === 'activo'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : negocio.estado === 'pendiente'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
                        : 'bg-red-500/10 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {negocio.estado}
                  </span>
                </div>

                {/* Datos de contacto */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-300 bg-neutral-950/80 p-3 rounded-2xl border border-neutral-800">
                  <div className="flex items-center gap-2 truncate">
                    <Mail size={13} className="text-neutral-500 shrink-0" />
                    <span className="truncate">{negocio.propietarioEmail}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={13} className="text-emerald-400 shrink-0" />
                    <a
                      href={`https://wa.me/57${negocio.telefono.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:underline"
                    >
                      {negocio.telefono}
                    </a>
                  </div>
                  {negocio.ciudad && (
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <MapPin size={13} className="text-amber-400 shrink-0" />
                      <span>{negocio.ciudad} {negocio.direccion ? `• ${negocio.direccion}` : ''}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="pt-2 border-t border-neutral-800 flex items-center justify-end gap-2">
                {negocio.estado === 'pendiente' && (
                  <>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleRechazar(negocio)}
                      disabled={procesandoId === negocio.id}
                      className="text-xs"
                    >
                      Rechazar
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAprobar(negocio)}
                      disabled={procesandoId === negocio.id}
                      className="text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-neutral-950"
                    >
                      {procesandoId === negocio.id ? 'Aprobando...' : '✅ Aprobar Negocio'}
                    </Button>
                  </>
                )}

                {negocio.estado === 'activo' && negocio.id !== 'laparada' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSuspender(negocio)}
                    disabled={procesandoId === negocio.id}
                    className="text-xs text-neutral-400 hover:text-red-400"
                  >
                    Suspender acceso
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SuperAdminNegociosPage;
