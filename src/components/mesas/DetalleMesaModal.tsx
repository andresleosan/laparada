import { useState, useId, useMemo, useEffect, useRef } from 'react';
import {
  Check,
  Divide,
  Flame,
  Minus,
  Plus,
  Receipt,
  Search,
  Trash2,
  User,
  Users,
  Utensils,
  X,
} from 'lucide-react';
import type { CuentaMesa, Mesa, RondaComanda } from '@/types/mesa';
import type { Combo, ItemVenta, MetodoPago, Producto } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import { getBadgeEstadoMesa } from '@/utils/mesasUtils';
import { DividirCuentaModal } from './DividirCuentaModal';
import { PrecuentaModal } from './PrecuentaModal';

export interface DetalleMesaModalProps {
  isOpen: boolean;
  mesa: Mesa | null;
  cuenta: CuentaMesa | null;
  cargandoCuenta?: boolean;
  productos: Producto[];
  combos: Combo[];
  negocioNombre?: string;
  onClose: () => void;
  onAgregarRonda: (
    cuentaId: string,
    params: { items: ItemVenta[]; notas?: string; enviarAKDS?: boolean }
  ) => Promise<RondaComanda>;
  onPrecerrar: (mesaId: string, cuentaId: string) => Promise<void>;
  onCobrar: (params: {
    mesaId: string;
    cuentaId: string;
    metodoPago: MetodoPago;
    montoRecibido?: number;
    clienteNombre?: string;
    clienteTelefono?: string;
  }) => Promise<void>;
  onCancelarCuenta: (mesaId: string, cuentaId: string, motivo?: string) => Promise<void>;
}

export function DetalleMesaModal({
  isOpen,
  mesa,
  cuenta,
  cargandoCuenta = false,
  productos,
  combos,
  negocioNombre = 'La Parada',
  onClose,
  onAgregarRonda,
  onPrecerrar,
  onCobrar,
  onCancelarCuenta,
}: DetalleMesaModalProps) {
  const generatedId = useId();
  const titleId = `modal-detalle-mesa-${generatedId.replace(/:/g, '')}-title`;
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Pestaña activa: 'resumen' | 'agregar_ronda' | 'cobro'
  const [tab, setTab] = useState<'resumen' | 'agregar_ronda' | 'cobro'>('resumen');

  // Estado para armar una nueva ronda
  const [itemsNuevaRonda, setItemsNuevaRonda] = useState<ItemVenta[]>([]);
  const [notasNuevaRonda, setNotasNuevaRonda] = useState('');
  const [enviarAKDS, setEnviarAKDS] = useState(true);
  const [busquedaMenu, setBusquedaMenu] = useState('');
  const [despachandoRonda, setDespachandoRonda] = useState(false);

  // Modales secundarios
  const [modalDividirOpen, setModalDividirOpen] = useState(false);
  const [modalPrecuentaOpen, setModalPrecuentaOpen] = useState(false);

  // Datos para cobro
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [montoRecibido, setMontoRecibido] = useState<string>('');
  const [cobrando, setCobrando] = useState(false);

  if (!isOpen || !mesa) return null;

  const badge = getBadgeEstadoMesa(mesa.estado);
  const totalCuenta = cuenta?.total || mesa.totalActual || 0;

  // Catálogo filtrado para armar la ronda
  const menuFiltrado = useMemo(() => {
    const q = busquedaMenu.trim().toLowerCase();
    const prods = productos
      .filter((p) => p.disponible)
      .filter((p) => !q || p.nombre.toLowerCase().includes(q) || (p.categoria && p.categoria.toLowerCase().includes(q)))
      .map((p) => ({
        tipo: 'producto' as const,
        id: p.id,
        nombre: p.nombre,
        precio: p.precio,
        categoria: p.categoria,
      }));

    const cmbs = combos
      .filter((c) => c.disponible)
      .filter((c) => !q || c.nombre.toLowerCase().includes(q) || (c.categoria && c.categoria.toLowerCase().includes(q)))
      .map((c) => ({
        tipo: 'combo' as const,
        id: c.id,
        nombre: c.nombre,
        precio: c.precioEspecial,
        categoria: c.categoria || 'Combos',
      }));

    return [...prods, ...cmbs];
  }, [productos, combos, busquedaMenu]);

  // Manipular ítems de la nueva ronda
  const handleIncrementarItemRonda = (tipo: 'producto' | 'combo', id: string, nombre: string, precio: number) => {
    setItemsNuevaRonda((prev) => {
      const idx = prev.findIndex((it) => it.tipo === tipo && it.referenciaId === id);
      if (idx >= 0) {
        const copy = [...prev];
        const nuevoCant = copy[idx].cantidad + 1;
        copy[idx] = {
          ...copy[idx],
          cantidad: nuevoCant,
          subtotal: nuevoCant * copy[idx].precioUnitario,
        };
        return copy;
      }
      return [
        ...prev,
        {
          tipo,
          referenciaId: id,
          nombre,
          cantidad: 1,
          precioUnitario: precio,
          subtotal: precio,
        },
      ];
    });
  };

  const handleDecrementarItemRonda = (tipo: 'producto' | 'combo', id: string) => {
    setItemsNuevaRonda((prev) => {
      const idx = prev.findIndex((it) => it.tipo === tipo && it.referenciaId === id);
      if (idx < 0) return prev;
      if (prev[idx].cantidad <= 1) {
        return prev.filter((_, i) => i !== idx);
      }
      const copy = [...prev];
      const nuevoCant = copy[idx].cantidad - 1;
      copy[idx] = {
        ...copy[idx],
        cantidad: nuevoCant,
        subtotal: nuevoCant * copy[idx].precioUnitario,
      };
      return copy;
    });
  };

  const totalNuevaRonda = itemsNuevaRonda.reduce((sum, it) => sum + it.subtotal, 0);

  const handleEnviarRonda = async () => {
    if (!cuenta?.id || itemsNuevaRonda.length === 0 || despachandoRonda) return;
    setDespachandoRonda(true);
    try {
      await onAgregarRonda(cuenta.id, {
        items: itemsNuevaRonda,
        notas: notasNuevaRonda,
        enviarAKDS,
      });
      setItemsNuevaRonda([]);
      setNotasNuevaRonda('');
      setTab('resumen');
    } finally {
      setDespachandoRonda(false);
    }
  };

  const handleConfirmarCobro = async () => {
    if (!cuenta?.id || cobrando) return;
    setCobrando(true);
    try {
      const recibidoNum = montoRecibido ? parseInt(montoRecibido, 10) : undefined;
      await onCobrar({
        mesaId: mesa.id,
        cuentaId: cuenta.id,
        metodoPago,
        montoRecibido: recibidoNum,
        clienteNombre: cuenta.clienteNombre,
        clienteTelefono: cuenta.clienteTelefono,
      });
      onClose();
    } finally {
      setCobrando(false);
    }
  };

  const cambioCalculado = (() => {
    const recibido = parseInt(montoRecibido, 10);
    if (Number.isFinite(recibido) && recibido >= totalCuenta) {
      return recibido - totalCuenta;
    }
    return 0;
  })();

  return (
    <>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-2 sm:p-4 backdrop-blur-sm"
      >
        <div
          ref={modalRef}
          className="relative flex flex-col max-h-[92vh] w-full max-w-2xl rounded-3xl border border-neutral-800 bg-neutral-950 p-4 sm:p-6 shadow-2xl overflow-hidden"
        >
          {/* Cabecera */}
          <div className="flex items-start justify-between border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Utensils className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 id={titleId} className="font-display text-xl sm:text-2xl font-black text-white">
                    {mesa.nombre}
                  </h2>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${badge.colorClass}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${badge.dotClass}`} />
                    {badge.label}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 mt-0.5">
                  <span>{mesa.zona}</span>
                  {Boolean(mesa.comensales) && (
                    <span className="flex items-center gap-1 text-amber-400 font-semibold">
                      <Users className="h-3 w-3" />
                      {mesa.comensales} personas
                    </span>
                  )}
                  {Boolean(mesa.mesero) && (
                    <span className="flex items-center gap-1 text-neutral-300">
                      <User className="h-3 w-3 text-neutral-400" />
                      {mesa.mesero}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar modal"
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Selector de Pestañas */}
          <nav className="flex items-center gap-2 border-b border-neutral-800 py-2.5">
            <button
              type="button"
              onClick={() => setTab('resumen')}
              aria-pressed={tab === 'resumen'}
              className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold transition-all ${
                tab === 'resumen'
                  ? 'bg-amber-400 text-neutral-950 font-black shadow-md'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white'
              }`}
            >
              Consolidado & Rondas
            </button>
            <button
              type="button"
              onClick={() => setTab('agregar_ronda')}
              aria-pressed={tab === 'agregar_ronda'}
              className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold transition-all ${
                tab === 'agregar_ronda'
                  ? 'bg-amber-400 text-neutral-950 font-black shadow-md'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white'
              }`}
            >
              + Agregar Ronda ({itemsNuevaRonda.length})
            </button>
            <button
              type="button"
              onClick={() => setTab('cobro')}
              aria-pressed={tab === 'cobro'}
              className={`flex-1 min-h-[44px] rounded-xl text-xs font-bold transition-all ${
                tab === 'cobro'
                  ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-neutral-950 font-black shadow-md'
                  : 'bg-neutral-900 text-neutral-400 hover:text-white'
              }`}
            >
              💵 Cobrar Mesa
            </button>
          </nav>

          {/* Contenido según pestaña */}
          <div className="flex-1 overflow-y-auto py-3 space-y-4">
            {cargandoCuenta ? (
              <div className="py-12 text-center text-neutral-400 text-sm">
                Cargando cuenta de la mesa...
              </div>
            ) : tab === 'resumen' ? (
              <>
                {/* Banner de Total Acumulado */}
                <div className="flex items-center justify-between rounded-2xl border-2 border-amber-500/40 bg-amber-950/20 p-4">
                  <div>
                    <span className="text-xs uppercase font-black tracking-wider text-amber-300/90 block">
                      Total Acumulado en Salón:
                    </span>
                    <span className="font-display text-3xl font-black text-amber-400">
                      {formatCOP(totalCuenta)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModalDividirOpen(true)}
                      className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-bold text-white border border-neutral-700 hover:bg-neutral-800 active:scale-95 transition-all"
                    >
                      <Divide className="h-4 w-4 text-amber-400" />
                      Dividir
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (cuenta?.id) {
                          onPrecerrar(mesa.id, cuenta.id);
                        }
                        setModalPrecuentaOpen(true);
                      }}
                      className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-neutral-900 px-3 py-2 text-xs font-bold text-white border border-neutral-700 hover:bg-neutral-800 active:scale-95 transition-all"
                    >
                      <Receipt className="h-4 w-4 text-gold-400" />
                      Pre-Cuenta
                    </button>
                  </div>
                </div>

                {/* Lista de Ítems Consolidados */}
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                    Consumo General ({cuenta?.items?.length || 0} productos)
                  </h3>
                  {cuenta?.items && cuenta.items.length > 0 ? (
                    <ul className="divide-y divide-neutral-800 text-sm">
                      {cuenta.items.map((it) => (
                        <li key={`${it.tipo}_${it.referenciaId}`} className="py-2 flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="font-mono text-xs font-black text-amber-400 bg-amber-950/40 rounded px-1.5 py-0.5">
                              {it.cantidad}x
                            </span>
                            <span className="font-medium text-white truncate">{it.nombre}</span>
                          </div>
                          <span className="font-mono text-xs font-bold text-neutral-300 shrink-0">
                            {formatCOP(it.subtotal)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="py-6 text-center text-xs text-neutral-500">
                      Aún no hay consumos registrados en esta mesa. Toca <strong>+ Agregar Ronda</strong> para comenzar.
                    </div>
                  )}
                </div>

                {/* Historial de Rondas Despachadas */}
                {Boolean(cuenta?.rondas && cuenta.rondas.length > 0) && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Rondas Despachadas ({cuenta?.rondas?.length || 0})
                    </h3>
                    {cuenta?.rondas?.map((ronda) => (
                      <div
                        key={ronda.id}
                        className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-3 text-xs"
                      >
                        <div className="flex items-center justify-between border-b border-neutral-800 pb-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">Ronda #{ronda.numero}</span>
                            {ronda.enviadoCocina && (
                              <span className="inline-flex items-center gap-1 rounded bg-orange-950/60 border border-orange-500/40 text-[10px] font-bold text-orange-400 px-1.5 py-0.5">
                                <Flame className="h-3 w-3" />
                                Enviada a Cocina (KDS)
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-bold text-amber-400">
                            {formatCOP(ronda.total)}
                          </span>
                        </div>
                        <ul className="space-y-1 text-neutral-300">
                          {ronda.items.map((it, i) => (
                            <li key={i} className="flex justify-between">
                              <span>
                                {it.cantidad}x {it.nombre}
                              </span>
                              <span className="font-mono text-neutral-400">{formatCOP(it.subtotal)}</span>
                            </li>
                          ))}
                        </ul>
                        {Boolean(ronda.notas) && (
                          <div className="mt-2 text-[11px] text-amber-300/80 italic">
                            Nota: {ronda.notas}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : tab === 'agregar_ronda' ? (
              <>
                {/* Armador de Ronda */}
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-neutral-500" />
                    <input
                      type="text"
                      value={busquedaMenu}
                      onChange={(e) => setBusquedaMenu(e.target.value)}
                      placeholder="Buscar producto o combo del menú..."
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 pl-9 pr-3 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  {/* Lista rápida del catálogo */}
                  <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-xl border border-neutral-800 p-2 bg-neutral-900/50">
                    {menuFiltrado.slice(0, 20).map((it) => (
                      <div
                        key={`${it.tipo}_${it.id}`}
                        className="flex items-center justify-between rounded-lg p-2 hover:bg-neutral-800/80 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-white truncate">{it.nombre}</p>
                          <p className="text-[11px] font-mono text-amber-400">{formatCOP(it.precio)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleIncrementarItemRonda(it.tipo, it.id, it.nombre, it.precio)}
                          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-amber-400 text-neutral-950 font-bold hover:brightness-110 active:scale-95"
                          aria-label={`Agregar ${it.nombre} a la ronda`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Resumen de ítems agregados a esta ronda */}
                  <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
                      Ítems en esta nueva ronda ({itemsNuevaRonda.length})
                    </h4>
                    {itemsNuevaRonda.length === 0 ? (
                      <p className="text-xs text-neutral-500 text-center py-4">
                        Selecciona productos arriba para armar la ronda
                      </p>
                    ) : (
                      <ul className="space-y-2 text-xs">
                        {itemsNuevaRonda.map((it) => (
                          <li key={`${it.tipo}_${it.referenciaId}`} className="flex items-center justify-between">
                            <span className="text-white font-medium truncate pr-2">{it.nombre}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-amber-400">{formatCOP(it.subtotal)}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDecrementarItemRonda(it.tipo, it.referenciaId)}
                                  className="h-7 w-7 rounded bg-neutral-800 text-neutral-300 flex items-center justify-center hover:bg-neutral-700"
                                  aria-label="Restar 1"
                                >
                                  <Minus className="h-3 w-3" />
                                </button>
                                <span className="font-mono font-bold px-1 text-white">{it.cantidad}</span>
                                <button
                                  type="button"
                                  onClick={() => handleIncrementarItemRonda(it.tipo, it.referenciaId, it.nombre, it.precioUnitario)}
                                  className="h-7 w-7 rounded bg-neutral-800 text-neutral-300 flex items-center justify-center hover:bg-neutral-700"
                                  aria-label="Sumar 1"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Opciones de despacho */}
                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-white select-none">
                      <input
                        type="checkbox"
                        checked={enviarAKDS}
                        onChange={(e) => setEnviarAKDS(e.target.checked)}
                        className="h-4 w-4 rounded border-neutral-700 bg-neutral-900 text-amber-400 focus:ring-amber-400"
                      />
                      <span className="flex items-center gap-1.5">
                        <Flame className="h-4 w-4 text-orange-500" />
                        Despachar inmediatamente a Pantalla de Cocina (KDS)
                      </span>
                    </label>

                    <input
                      type="text"
                      value={notasNuevaRonda}
                      onChange={(e) => setNotasNuevaRonda(e.target.value)}
                      placeholder="Instrucciones para cocina (ej. sin cebolla, salsas aparte)..."
                      className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 px-3 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-neutral-800">
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase font-black block">Total Ronda:</span>
                      <span className="font-display text-xl font-black text-amber-400">{formatCOP(totalNuevaRonda)}</span>
                    </div>

                    <button
                      type="button"
                      disabled={itemsNuevaRonda.length === 0 || despachandoRonda}
                      onClick={handleEnviarRonda}
                      className="flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-2.5 text-xs font-black text-neutral-950 shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {despachandoRonda ? 'Despachando...' : 'Confirmar y Enviar Ronda'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Cobro y Liberación de Mesa */}
                <div className="space-y-4">
                  <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-950/20 p-4 text-center">
                    <span className="text-xs uppercase font-black tracking-wider text-amber-300 block">
                      Total a Cobrar:
                    </span>
                    <span className="font-display text-4xl font-black text-amber-400 tracking-tight my-1 block">
                      {formatCOP(totalCuenta)}
                    </span>
                    <p className="text-xs text-neutral-400">
                      Mesa: {mesa.nombre} · {cuenta?.items?.length || 0} ítems consumidos
                    </p>
                  </div>

                  {/* Método de Pago */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                      Método de Pago Offline
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setMetodoPago('efectivo')}
                        aria-pressed={metodoPago === 'efectivo'}
                        className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border text-sm font-bold transition-all ${
                          metodoPago === 'efectivo'
                            ? 'border-amber-400 bg-amber-400 text-neutral-950 shadow-md font-black'
                            : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                        }`}
                      >
                        💵 Efectivo
                      </button>

                      <button
                        type="button"
                        onClick={() => setMetodoPago('transferencia')}
                        aria-pressed={metodoPago === 'transferencia'}
                        className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border text-sm font-bold transition-all ${
                          metodoPago === 'transferencia'
                            ? 'border-amber-400 bg-amber-400 text-neutral-950 shadow-md font-black'
                            : 'border-neutral-800 bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                        }`}
                      >
                        📱 Transferencia
                      </button>
                    </div>
                  </div>

                  {/* Cálculo de Efectivo y Vueltas */}
                  {metodoPago === 'efectivo' && (
                    <div className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
                      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300">
                        Monto recibido del cliente
                      </label>
                      <input
                        type="number"
                        value={montoRecibido}
                        onChange={(e) => setMontoRecibido(e.target.value)}
                        placeholder={`Ej. ${formatCOP(totalCuenta)}`}
                        className="w-full rounded-xl border border-neutral-800 bg-neutral-950 py-2.5 px-3 text-lg font-mono font-bold text-white focus:border-amber-400 focus:outline-none"
                      />

                      {Boolean(montoRecibido) && (
                        <div className="flex items-center justify-between pt-2 border-t border-neutral-800 text-sm">
                          <span className="text-neutral-400 font-medium">Cambio / Vueltas:</span>
                          <span className="font-display text-2xl font-black text-emerald-400">
                            {formatCOP(cambioCalculado)}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={cobrando || (metodoPago === 'efectivo' && Boolean(montoRecibido) && parseInt(montoRecibido, 10) < totalCuenta)}
                      onClick={handleConfirmarCobro}
                      className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-sm font-black text-white shadow-xl hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
                    >
                      <Check className="h-5 w-5" />
                      {cobrando ? 'Procesando cobro...' : 'Confirmar Cobro, Emitir Ticket y Liberar Mesa'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Barra Inferior */}
          <div className="border-t border-neutral-800 pt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                if (cuenta?.id && confirm('¿Estás seguro de cancelar esta cuenta y liberar la mesa?')) {
                  onCancelarCuenta(mesa.id, cuenta.id, 'Cancelado por el operador');
                  onClose();
                }
              }}
              className="text-xs font-semibold text-red-400 hover:text-red-300 flex items-center gap-1 p-2 rounded-lg hover:bg-red-950/30 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Cancelar Cuenta
            </button>

            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors"
            >
              Cerrar Vista
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Dividir Cuenta */}
      <DividirCuentaModal
        isOpen={modalDividirOpen}
        mesaNombre={mesa.nombre}
        totalCuenta={totalCuenta}
        comensalesIniciales={mesa.comensales || 2}
        onClose={() => setModalDividirOpen(false)}
      />

      {/* Modal de Precuenta */}
      <PrecuentaModal
        isOpen={modalPrecuentaOpen}
        cuenta={cuenta}
        negocioNombre={negocioNombre}
        onClose={() => setModalPrecuentaOpen(false)}
        onProcederCobro={() => setTab('cobro')}
      />
    </>
  );
}
