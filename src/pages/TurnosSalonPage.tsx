import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Bell,
  Clock,
  Flame,
  Maximize2,
  Minimize2,
  PackageCheck,
  UtensilsCrossed,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useNegocio } from '@/context/NegocioContext';
import { onDomiciliosActivosChange } from '@/services/domiciliosService';
import type { Domicilio } from '@/types';
import {
  anunciarTurnoVoz,
  filtrarTurnosLlamador,
  playTurnoLlamadorChime,
} from '@/utils/kioscoTurnosUtils';

const STORAGE_CHIME_KEY = 'laparada_turnos_chime';
const STORAGE_VOICE_KEY = 'laparada_turnos_voice';

export interface TurnosSalonPageProps {
  initialDomicilios?: Domicilio[];
}

export function TurnosSalonPage({ initialDomicilios }: TurnosSalonPageProps = {}) {
  const { negocioActual } = useNegocio();
  const tenantId = negocioActual.id;

  const [domicilios, setDomicilios] = useState<Domicilio[]>(initialDomicilios || []);
  const [loading, setLoading] = useState(!initialDomicilios);
  const [horaActual, setHoraActual] = useState(new Date());

  // Preferencias de audio y voz
  const [chimeHabilitado, setChimeHabilitado] = useState<boolean>(() => {
    try {
      const s = localStorage.getItem(STORAGE_CHIME_KEY);
      return s !== null ? s === 'true' : true;
    } catch {
      return true;
    }
  });

  const [vozHabilitada, setVozHabilitada] = useState<boolean>(() => {
    try {
      const s = localStorage.getItem(STORAGE_VOICE_KEY);
      return s !== null ? s === 'true' : true;
    } catch {
      return true;
    }
  });

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Registro de IDs que ya han sido anunciados para no repetir sonido
  const anunciadosRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  // Reloj digital en tiempo real (cada 1s)
  useEffect(() => {
    const timer = setInterval(() => {
      setHoraActual(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Suscripción reactiva en tiempo real a los pedidos activos
  useEffect(() => {
    setLoading(true);
    const unsub = onDomiciliosActivosChange(tenantId, (data) => {
      setDomicilios(data);
      setLoading(false);
    });
    return () => unsub();
  }, [tenantId]);

  // Filtrar pedidos en preparación y listos
  const { preparando, listos } = filtrarTurnosLlamador(domicilios, horaActual.getTime());

  // Efecto para detectar cuando un turno entra a "listo" y sonar la campana / voz
  useEffect(() => {
    if (initialLoadRef.current) {
      // En la primera carga, registrar los actuales para no hacer avalancha de campanas
      listos.forEach((t) => anunciadosRef.current.add(t.id));
      initialLoadRef.current = false;
      return;
    }

    const nuevosListos = listos.filter((t) => !anunciadosRef.current.has(t.id));
    if (nuevosListos.length > 0) {
      nuevosListos.forEach((t) => {
        anunciadosRef.current.add(t.id);
        if (chimeHabilitado) {
          playTurnoLlamadorChime();
        }
        if (vozHabilitada) {
          setTimeout(() => {
            anunciarTurnoVoz(t.numeroTurno, t.clienteNombre);
          }, 800);
        }
      });
    }
  }, [listos, chimeHabilitado, vozHabilitada]);

  const toggleChime = useCallback(() => {
    setChimeHabilitado((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_CHIME_KEY, String(next));
      } catch (err) {
        void err;
      }
      if (next) playTurnoLlamadorChime();
      return next;
    });
  }, []);

  const toggleVoz = useCallback(() => {
    setVozHabilitada((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_VOICE_KEY, String(next));
      } catch (err) {
        void err;
      }
      return next;
    });
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch((err) => {
        void err;
      });
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch((err) => {
        void err;
      });
    }
  };

  const horaStr = horaActual.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const fechaStr = horaActual.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 p-4 sm:p-6 lg:p-8 text-white select-none">
      {/* Encabezado TV: Logo, Título, Reloj Gigante y Controles */}
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-5">
        <div className="flex items-center gap-4">
          {negocioActual.logoUrl ? (
            <img
              src={negocioActual.logoUrl}
              alt={negocioActual.nombre}
              className="h-16 w-16 rounded-2xl object-cover border-2 border-gold-400/50 shadow-xl"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-900 border border-gold-400/40 text-gold-400 font-display font-black text-2xl shadow-xl">
              <UtensilsCrossed className="h-8 w-8" />
            </div>
          )}
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-gold-400">
              Llamador de Salón en Vivo
            </span>
            <h1 className="font-display text-3xl sm:text-4xl font-black text-white leading-tight">
              {negocioActual.nombre || 'La Parada'}
            </h1>
          </div>
        </div>

        {/* Reloj Digital en Vivo y Fecha */}
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 font-mono text-3xl sm:text-4xl font-black text-gold-400 tracking-wider">
              <Clock className="h-7 w-7 text-neutral-400" />
              <span>{horaStr}</span>
            </div>
            <span className="text-xs font-bold capitalize text-neutral-400">
              {fechaStr}
            </span>
          </div>

          {/* Controles de Sonido, Voz y Pantalla Completa */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleChime}
              className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all ${
                chimeHabilitado
                  ? 'border-gold-400/40 bg-gold-400/10 text-gold-400'
                  : 'border-neutral-800 bg-neutral-900 text-neutral-500'
              }`}
              title={chimeHabilitado ? 'Campana activada' : 'Campana silenciada'}
              aria-label={chimeHabilitado ? 'Campana activada' : 'Campana silenciada'}
            >
              <Bell className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={toggleVoz}
              className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all ${
                vozHabilitada
                  ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-400'
                  : 'border-neutral-800 bg-neutral-900 text-neutral-500'
              }`}
              title={vozHabilitada ? 'Locución por voz activada' : 'Locución por voz desactivada'}
              aria-label={vozHabilitada ? 'Locución por voz activada' : 'Locución por voz desactivada'}
            >
              {vozHabilitada ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </button>

            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Activar pantalla completa'}
            >
              {isFullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Estado de carga inicial */}
      {loading && domicilios.length === 0 && (
        <div className="flex flex-1 items-center justify-center p-12 text-center text-neutral-400" role="status">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin h-10 w-10 border-4 border-gold-400 border-t-transparent rounded-full" />
            <p className="text-sm font-bold">Conectando con la cola de pedidos en vivo...</p>
          </div>
        </div>
      )}

      {/* Columnas Principales del Llamador: Preparando vs Listo */}
      <main className="mt-6 grid flex-1 grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Columna Izquierda: EN PREPARACIÓN */}
        <section className="flex flex-col rounded-3xl border-2 border-neutral-800 bg-neutral-900/40 p-6 shadow-2xl">
          <header className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Flame className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-black uppercase text-amber-400 tracking-wide">
                  En Preparación
                </h2>
                <span className="text-xs font-bold text-neutral-400">
                  Cocinando con dedicación artesanal
                </span>
              </div>
            </div>
            <span className="font-mono text-lg font-black text-neutral-300 rounded-xl bg-neutral-900 border border-neutral-800 px-3.5 py-1">
              {preparando.length}
            </span>
          </header>

          {/* Tarjetas de Turnos en Preparación */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 flex-1 content-start overflow-y-auto pr-1 no-scrollbar">
            {preparando.length === 0 ? (
              <div className="col-span-full flex h-48 flex-col items-center justify-center text-center text-neutral-500 font-bold">
                <p>No hay pedidos en preparación en este momento</p>
              </div>
            ) : (
              preparando.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col items-center justify-center rounded-2xl border border-neutral-800 bg-neutral-950/90 p-4 shadow-lg text-center transition-all"
                >
                  <span className="font-display text-3xl font-black text-amber-400 tracking-tight">
                    {t.numeroTurno}
                  </span>
                  <span className="text-xs font-bold text-neutral-300 mt-1 truncate max-w-full">
                    {t.clienteNombre}
                  </span>
                  {t.mesaNumero ? (
                    <span className="text-[10px] font-bold text-neutral-500">
                      Mesa {t.mesaNumero}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-neutral-500">
                      {t.tipoServicio === 'para_llevar' ? 'Para Llevar' : 'Salón'}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Columna Derecha: LISTO PARA ENTREGAR */}
        <section className="flex flex-col rounded-3xl border-2 border-emerald-500/50 bg-emerald-950/15 p-6 shadow-2xl">
          <header className="flex items-center justify-between border-b border-emerald-500/30 pb-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
                <PackageCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-black uppercase text-emerald-400 tracking-wide animate-pulse">
                  ¡Listo para Entregar!
                </h2>
                <span className="text-xs font-bold text-emerald-300/80">
                  Pasa al mostrador con tu ticket
                </span>
              </div>
            </div>
            <span className="font-mono text-lg font-black text-emerald-300 rounded-xl bg-emerald-950 border border-emerald-500/40 px-3.5 py-1">
              {listos.length}
            </span>
          </header>

          {/* Tarjetas Gigantes de Turnos Listos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 content-start overflow-y-auto pr-1 no-scrollbar">
            {listos.length === 0 ? (
              <div className="col-span-full flex h-48 flex-col items-center justify-center text-center text-neutral-500 font-bold">
                <p>Todos los pedidos listos han sido entregados</p>
              </div>
            ) : (
              listos.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col items-center justify-center rounded-3xl border-2 border-emerald-500/60 bg-emerald-900/30 p-5 shadow-2xl text-center ring-2 ring-emerald-500/20 animate-pulse"
                >
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-300">
                    RECLAMAR
                  </span>
                  <span className="font-display text-5xl font-black text-white tracking-tight my-1">
                    {t.numeroTurno}
                  </span>
                  <span className="text-sm font-black text-emerald-200 truncate max-w-full">
                    {t.clienteNombre}
                  </span>
                  <span className="mt-1 text-xs font-bold text-emerald-300/70">
                    {t.mesaNumero ? `Mesa ${t.mesaNumero}` : t.tipoServicio === 'para_llevar' ? 'Para Llevar' : 'Salón'}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Pie de pantalla */}
      <footer className="mt-6 flex flex-wrap items-center justify-between text-xs text-neutral-500 border-t border-neutral-900 pt-3">
        <p>Por favor mantente atento a tu número de turno cuando aparezca en verde</p>
        <p>La Parada POS · Sistema de Turnos en Salón</p>
      </footer>
    </div>
  );
}
