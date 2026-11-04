// src/components/pos/ClienteSelectorPOS.tsx
import { useState, useRef, useEffect, useId } from 'react';
import { Search, UserCheck, X, Sparkles, Phone, MapPin, History } from 'lucide-react';
import type { Cliente, ItemVenta } from '@/types';
import { esClienteFrecuente, formatearTelefonoVisual } from '@/utils/clienteUtils';
import { formatCOP } from '@/utils/formatCOP';

interface ClienteSelectorPOSProps {
  clientes: Cliente[];
  clienteSeleccionado: Cliente | null;
  onSeleccionarCliente: (cliente: Cliente | null) => void;
  onCargarLoDeSiempre: (items: ItemVenta[]) => void;
  disabled?: boolean;
}

export function ClienteSelectorPOS({
  clientes,
  clienteSeleccionado,
  onSeleccionarCliente,
  onCargarLoDeSiempre,
  disabled = false,
}: ClienteSelectorPOSProps) {
  const [busqueda, setBusqueda] = useState('');
  const [desplegado, setDesplegado] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const generatedId = useId();
  const inputId = `cliente-search-${generatedId.replace(/:/g, '')}`;

  // Filtrado reactivo en memoria sobre la lista de clientes del local activo
  const resultados = busqueda.trim().length >= 2
    ? clientes.filter((c) => {
        const query = busqueda.trim().toLowerCase();
        const coincideNombre = c.nombre.toLowerCase().includes(query);
        const coincideTelefono = c.telefono.includes(query.replace(/\D/g, '')) || c.telefono.includes(query);
        const coincideBarrio = c.barrio ? c.barrio.toLowerCase().includes(query) : false;
        return coincideNombre || coincideTelefono || coincideBarrio;
      }).slice(0, 5)
    : [];

  // Cierra el menú desplegable si se hace clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setDesplegado(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSeleccionar = (cliente: Cliente) => {
    onSeleccionarCliente(cliente);
    setBusqueda('');
    setDesplegado(false);
  };

  const handleLimpiar = () => {
    onSeleccionarCliente(null);
    setBusqueda('');
    setDesplegado(false);
  };

  return (
    <div ref={containerRef} className="space-y-2">
      {clienteSeleccionado ? (
        // Tarjeta de cliente seleccionado con acceso a "Lo de siempre"
        <div className="rounded-xl border border-gold-400/40 bg-neutral-900/90 p-3 shadow-md">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gold-400/20 text-gold-400">
                <UserCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="truncate text-sm font-bold text-white">
                    {clienteSeleccionado.nombre}
                  </p>
                  {esClienteFrecuente(clienteSeleccionado) && (
                    <span className="rounded-full bg-gold-400/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-gold-400 border border-gold-400/30">
                      VIP ({clienteSeleccionado.totalPedidos} pedidos)
                    </span>
                  )}
                </div>
                <p className="flex items-center gap-1 text-xs text-neutral-400 mt-0.5">
                  <Phone className="h-3 w-3" aria-hidden="true" />
                  {formatearTelefonoVisual(clienteSeleccionado.telefono)}
                  {clienteSeleccionado.barrio && (
                    <span className="text-neutral-500">· {clienteSeleccionado.barrio}</span>
                  )}
                </p>
                {clienteSeleccionado.direcciones.length > 0 && (
                  <p className="flex items-center gap-1 text-[11px] text-neutral-400 mt-0.5 truncate">
                    <MapPin className="h-3 w-3 shrink-0 text-neutral-500" aria-hidden="true" />
                    <span className="truncate">{clienteSeleccionado.direcciones[0]}</span>
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleLimpiar}
              disabled={disabled}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
              aria-label="Desvincular cliente del pedido"
              title="Desvincular cliente"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Botón de 1 toque: "Lo de siempre" */}
          {clienteSeleccionado.loDeSiempre && clienteSeleccionado.loDeSiempre.items.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-neutral-800">
              <div className="flex items-center justify-between text-xs text-neutral-400 mb-1.5">
                <span className="flex items-center gap-1 font-medium text-gold-400">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Lo de siempre ({formatCOP(clienteSeleccionado.loDeSiempre.total)})
                </span>
                <span className="text-[10px] text-neutral-500">
                  {clienteSeleccionado.loDeSiempre.items.reduce((s, it) => s + it.cantidad, 0)} ítems
                </span>
              </div>
              <p className="text-xs text-neutral-300 truncate mb-2">
                {clienteSeleccionado.loDeSiempre.items
                  .map((it) => `${it.cantidad}x ${it.nombre}`)
                  .join(', ')}
              </p>
              <button
                type="button"
                onClick={() => onCargarLoDeSiempre(clienteSeleccionado.loDeSiempre!.items)}
                disabled={disabled}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-lg bg-gold-400/20 hover:bg-gold-400/30 text-gold-400 border border-gold-400/40 px-3 py-2 text-xs font-bold transition-all shadow-sm active:scale-[0.98]"
              >
                <History className="h-4 w-4" aria-hidden="true" />
                Cargar lo de siempre al ticket
              </button>
            </div>
          )}
        </div>
      ) : (
        // Barra de búsqueda rápida por teléfono o nombre
        <div className="relative">
          <label htmlFor={inputId} className="block text-xs font-medium text-neutral-300 mb-1">
            Cliente frecuente (opcional)
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" aria-hidden="true" />
            <input
              id={inputId}
              type="text"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value);
                setDesplegado(true);
              }}
              onFocus={() => setDesplegado(true)}
              placeholder="Buscar por teléfono o nombre..."
              disabled={disabled}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 pl-9 pr-9 text-xs text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
              autoComplete="off"
            />
            {busqueda && (
              <button
                type="button"
                onClick={() => {
                  setBusqueda('');
                  setDesplegado(false);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center text-neutral-400 hover:text-white"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>

          {/* Menú de resultados de búsqueda */}
          {desplegado && busqueda.trim().length >= 2 && (
            <div className="absolute z-30 mt-1 w-full rounded-xl border border-neutral-800 bg-neutral-900 py-1 shadow-2xl">
              {resultados.length > 0 ? (
                resultados.map((cliente) => (
                  <button
                    key={cliente.id}
                    type="button"
                    onClick={() => handleSeleccionar(cliente)}
                    className="w-full text-left px-3 py-2 hover:bg-neutral-800 transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{cliente.nombre}</p>
                      <p className="text-[11px] text-neutral-400">
                        {formatearTelefonoVisual(cliente.telefono)}
                        {cliente.barrio && ` · ${cliente.barrio}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-bold text-gold-400 block">
                        {cliente.totalPedidos} {cliente.totalPedidos === 1 ? 'pedido' : 'pedidos'}
                      </span>
                      {cliente.loDeSiempre && (
                        <span className="text-[9px] text-neutral-400">Tiene favorito</span>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-3 text-center text-xs text-neutral-400">
                  No se encontró cliente con "{busqueda}". Se guardará automáticamente al registrar la venta.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
