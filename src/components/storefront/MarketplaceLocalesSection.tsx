// src/components/storefront/MarketplaceLocalesSection.tsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  MapPin,
  Search,
  ExternalLink,
  Phone,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { Negocio } from '@/types/negocio';

interface MarketplaceLocalesSectionProps {
  locales: Negocio[];
  cargando?: boolean;
}

export function MarketplaceLocalesSection({
  locales,
  cargando = false,
}: MarketplaceLocalesSectionProps) {
  const [busqueda, setBusqueda] = useState('');
  const [ciudadSeleccionada, setCiudadSeleccionada] = useState<string>('todas');

  // Extraer ciudades únicas disponibles
  const ciudades = useMemo(() => {
    const set = new Set<string>();
    locales.forEach((l) => {
      if (l.ciudad && l.ciudad.trim()) {
        set.add(l.ciudad.trim());
      }
    });
    return Array.from(set).sort();
  }, [locales]);

  // Filtrar locales por búsqueda y ciudad
  const localesFiltrados = useMemo(() => {
    const query = busqueda.toLowerCase().trim();
    return locales.filter((local) => {
      const matchTexto =
        !query ||
        local.nombre.toLowerCase().includes(query) ||
        (local.ciudad && local.ciudad.toLowerCase().includes(query)) ||
        (local.direccion && local.direccion.toLowerCase().includes(query));

      const matchCiudad =
        ciudadSeleccionada === 'todas' ||
        (local.ciudad && local.ciudad.trim().toLowerCase() === ciudadSeleccionada.toLowerCase());

      return matchTexto && matchCiudad;
    });
  }, [locales, busqueda, ciudadSeleccionada]);

  return (
    <section
      id="marketplace-locales"
      aria-label="Directorio de restaurantes y puestos aliados"
      className="border-t border-neutral-800 bg-neutral-950 py-16 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Encabezado */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold tracking-wider uppercase">
            <Store size={14} />
            Directorio Gastronómico
          </div>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-white">
            Locales y Puestos Aliados
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">
            Explora las cartas digitales y haz tu pedido en línea directamente con los mejores
            restaurantes, locales y puestos de comida vinculados a la red.
          </p>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-neutral-900/80 border border-neutral-800 p-3 sm:p-4 rounded-2xl">
          {/* Buscador */}
          <div className="relative w-full sm:max-w-md">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 pointer-events-none"
            />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar restaurante o puesto..."
              aria-label="Buscar en el directorio de locales"
              className="w-full min-h-11 bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-10 text-xs sm:text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-500"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => setBusqueda('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-lg text-neutral-400 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Filtros de ciudad */}
          {ciudades.length > 0 && (
            <div
              className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar py-1"
              role="group"
              aria-label="Filtrar por ciudad"
            >
              <button
                type="button"
                onClick={() => setCiudadSeleccionada('todas')}
                aria-pressed={ciudadSeleccionada === 'todas'}
                className={`min-h-11 px-3.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                  ciudadSeleccionada === 'todas'
                    ? 'bg-amber-500 text-neutral-950 shadow-md'
                    : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                Todas ({locales.length})
              </button>

              {ciudades.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setCiudadSeleccionada(c)}
                  aria-pressed={ciudadSeleccionada === c}
                  className={`min-h-11 px-3.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    ciudadSeleccionada === c
                      ? 'bg-amber-500 text-neutral-950 shadow-md'
                      : 'bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Listado de Tarjetas */}
        {cargando ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-56 rounded-3xl border border-neutral-800 bg-neutral-900/60 animate-pulse"
              />
            ))}
          </div>
        ) : localesFiltrados.length === 0 ? (
          <div className="text-center py-12 px-4 bg-neutral-900/50 rounded-3xl border border-neutral-800 space-y-3">
            <UtensilsCrossed size={36} className="mx-auto text-neutral-600 mb-2" />
            <p className="font-bold text-white text-base">No encontramos locales con ese criterio</p>
            <p className="text-xs text-neutral-400">
              Prueba buscando otro nombre o selecciona &quot;Todas&quot; las ciudades.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {localesFiltrados.map((local) => {
              const esInsignia = local.id === 'laparada';
              const targetUrl = esInsignia ? '/' : `/tienda/${local.slug || local.id}`;

              return (
                <div
                  key={local.id}
                  className="bg-neutral-900/90 rounded-3xl border border-neutral-800 hover:border-amber-500/50 p-5 shadow-xl transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
                >
                  <div>
                    {/* Header de la tarjeta */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        {local.logoUrl ? (
                          <img
                            src={local.logoUrl}
                            alt={local.nombre}
                            width="48"
                            height="48"
                            className="w-12 h-12 rounded-2xl object-cover border border-amber-500/30"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center text-amber-400 font-display font-black text-lg">
                            {local.nombre.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <h3 className="font-display font-black text-white text-lg group-hover:text-amber-400 transition-colors">
                            {local.nombre}
                          </h3>
                          {local.ciudad && (
                            <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
                              <MapPin size={12} className="text-amber-400 shrink-0" />
                              <span>{local.ciudad}</span>
                              {local.direccion && (
                                <span className="text-neutral-500 truncate max-w-[140px]">
                                  • {local.direccion}
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>

                      {esInsignia ? (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500 text-neutral-950 font-black text-[10px] tracking-wider uppercase shrink-0 shadow-sm">
                          INSIGNIA
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[10px] shrink-0 flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Activo
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-neutral-300 leading-relaxed line-clamp-2">
                      {local.direccion
                        ? `Visítanos en ${local.direccion} o pide tu domicilio con confirmación directa.`
                        : 'Disfruta de nuestros mejores platos preparados al instante.'}
                    </p>
                  </div>

                  {/* Acciones */}
                  <div className="mt-5 pt-3 border-t border-neutral-800 flex items-center justify-between gap-3">
                    {local.telefono && (
                      <span className="text-[11px] text-neutral-400 flex items-center gap-1 truncate">
                        <Phone size={12} className="text-emerald-400 shrink-0" />
                        <span className="truncate">{local.telefono}</span>
                      </span>
                    )}

                    <Link
                      to={targetUrl}
                      aria-label={`Ver menú y pedir en ${local.nombre}`}
                      className="inline-flex min-h-11 items-center gap-1.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-95"
                    >
                      <span>Ver Menú</span>
                      <ExternalLink size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

