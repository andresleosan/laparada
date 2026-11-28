import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNegocio } from '@/context/NegocioContext';
import { useProductos } from '@/hooks/useProductos';
import { useCategorias } from '@/hooks/useCategorias';
import { KioscoWelcomeScreen } from '@/components/kiosco/KioscoWelcomeScreen';
import { KioscoHeader } from '@/components/kiosco/KioscoHeader';
import { KioscoCategoriasBar } from '@/components/kiosco/KioscoCategoriasBar';
import { KioscoProductCard } from '@/components/kiosco/KioscoProductCard';
import { PersonalizarItemModal } from '@/components/kiosco/PersonalizarItemModal';
import { KioscoCartDrawer } from '@/components/kiosco/KioscoCartDrawer';
import { KioscoTicketTurnoModal } from '@/components/kiosco/KioscoTicketTurnoModal';
import { KioscoPinModal } from '@/components/kiosco/KioscoPinModal';
import { ArmaTuComboModal } from '@/components/pos/ArmaTuComboModal';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { FiltroDieteticoBar } from '@/components/dieta/FiltroDieteticoBar';
import { EspecialesDelDiaBanner } from '@/components/control86';
import { useHoraActual } from '@/hooks/useHoraActual';
import {
  evaluarDisponibilidadItem86,
  ordenarConEspecialesPrimero,
  validarLimitePorcionesCarrito,
} from '@/utils/control86Utils';
import { crearPedidoKiosco } from '@/services/kioscoService';
import { createToast } from '@/components/ui/Toast';
import type {
  Combo,
  FiltroDietetico,
  ItemKioscoCustomizado,
  ItemVenta,
  MetodoPago,
  Producto,
  TipoServicioKiosco,
} from '@/types';
import { calcularTotalKiosco } from '@/utils/kioscoTurnosUtils';
import { evaluarDisponibilidadNegocio } from '@/utils/horariosUtils';
import {
  FILTRO_DIETETICO_VACIO,
  construirLookupPerfilDietetico,
  contarFiltrosDieteticosActivos,
  filtrarPorPerfilDietetico,
} from '@/utils/alergenosUtils';
import {
  esComboPersonalizable,
  getComboPersonalizableDefault,
} from '@/utils/combosPersonalizablesUtils';

type KioscoStep = 'welcome' | 'catalog';

interface TurnoConfirmadoState {
  numeroTurno: string;
  clienteNombre: string;
  clienteTelefono?: string;
  tipoServicio: TipoServicioKiosco;
  mesaNumero?: string;
  items: ItemKioscoCustomizado[];
  total: number;
  metodoPago: MetodoPago;
}

export function KioscoPage() {
  const navigate = useNavigate();
  const { negocioActual } = useNegocio();
  const tenantId = negocioActual.id;

  const { productos, combos, loading: loadingProductos } = useProductos();
  const { categorias } = useCategorias();
  const ahoraKiosco = useHoraActual();
  const disponibilidadNegocio = useMemo(
    () => evaluarDisponibilidadNegocio(negocioActual?.configHorarios),
    [negocioActual?.configHorarios]
  );

  // Estados principales
  const [step, setStep] = useState<KioscoStep>('welcome');
  const [modalidad, setModalidad] = useState<TipoServicioKiosco>('salon');
  const [categoriaActiva, setCategoriaActiva] = useState<string>('todos');
  const [filtroDietetico, setFiltroDietetico] = useState<FiltroDietetico>(FILTRO_DIETETICO_VACIO);
  const [cartItems, setCartItems] = useState<ItemKioscoCustomizado[]>([]);

  // Modales
  const [itemPersonalizando, setItemPersonalizando] = useState<{
    item: Producto | Combo;
    isCombo: boolean;
  } | null>(null);
  const [comboPersonalizando, setComboPersonalizando] = useState<Combo | null>(null);
  const [comboEditando, setComboEditando] = useState<{
    index: number;
    item: ItemKioscoCustomizado;
  } | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketConfirmado, setTicketConfirmado] = useState<TurnoConfirmadoState | null>(null);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);

  // Inactividad (60s sin interacción activa)
  const [inactivityPrompt, setInactivityPrompt] = useState(false);
  const [inactivityTimerSeconds, setInactivityTimerSeconds] = useState(15);
  const lastInteractionRef = useRef<number>(Date.now());

  // Pantalla completa
  const [isFullscreen, setIsFullscreen] = useState(false);

  const resetKiosco = useCallback(() => {
    setCartItems([]);
    setFiltroDietetico(FILTRO_DIETETICO_VACIO);
    setItemPersonalizando(null);
    setComboPersonalizando(null);
    setComboEditando(null);
    setIsCartOpen(false);
    setTicketConfirmado(null);
    setInactivityPrompt(false);
    setStep('welcome');
  }, []);

  // Manejo de eventos de actividad del usuario para reiniciar el temporizador de inactividad
  const registrarActividad = useCallback(() => {
    lastInteractionRef.current = Date.now();
    if (inactivityPrompt) {
      setInactivityPrompt(false);
      setInactivityTimerSeconds(15);
    }
  }, [inactivityPrompt]);

  useEffect(() => {
    const handleUserAction = () => registrarActividad();
    window.addEventListener('pointerdown', handleUserAction);
    window.addEventListener('keydown', handleUserAction);
    return () => {
      window.removeEventListener('pointerdown', handleUserAction);
      window.removeEventListener('keydown', handleUserAction);
    };
  }, [registrarActividad]);

  // Chequeo de inactividad cada segundo (solo activo cuando no está en pantalla de bienvenida)
  useEffect(() => {
    if (step === 'welcome' || ticketConfirmado !== null) return;

    const interval = setInterval(() => {
      const transcurrido = Date.now() - lastInteractionRef.current;
      if (transcurrido > 60_000 && !inactivityPrompt) {
        setInactivityPrompt(true);
        setInactivityTimerSeconds(15);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [step, ticketConfirmado, inactivityPrompt]);

  // Cuenta regresiva del aviso de inactividad
  useEffect(() => {
    if (!inactivityPrompt) return;
    if (inactivityTimerSeconds <= 0) {
      resetKiosco();
      return;
    }
    const timer = setInterval(() => {
      setInactivityTimerSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [inactivityPrompt, inactivityTimerSeconds, resetKiosco]);

  // Alternar pantalla completa
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const handleSelectModalidad = (tipo: TipoServicioKiosco) => {
    setModalidad(tipo);
    setStep('catalog');
    lastInteractionRef.current = Date.now();
  };

  const handleToggleModalidad = () => {
    setModalidad((prev) => (prev === 'salon' ? 'para_llevar' : 'salon'));
    lastInteractionRef.current = Date.now();
  };

  // Carrito: agregar o actualizar
  const handleSelectCatalogItem = (item: Producto | Combo, isCombo: boolean) => {
    lastInteractionRef.current = Date.now();
    const cantidadEnCarrito = cartItems
      .filter((it) => it.tipo === (isCombo ? 'combo' : 'producto') && it.referenciaId === item.id)
      .reduce((acc, it) => acc + it.cantidad, 0);
    const check86 = validarLimitePorcionesCarrito(
      item,
      cantidadEnCarrito,
      1,
      ahoraKiosco
    );
    if (!check86.permitido) {
      createToast(check86.motivo || `"${item.nombre}" no disponible`, 'error', 3000);
      return;
    }
    if (isCombo && esComboPersonalizable(item as Combo)) {
      setComboEditando(null);
      setComboPersonalizando(item as Combo);
      return;
    }
    setItemPersonalizando({ item, isCombo });
  };

  const handleConfirmarPersonalizacion = (customItem: ItemKioscoCustomizado) => {
    const refCatalogo =
      customItem.tipo === 'combo'
        ? combos.find((c) => c.id === customItem.referenciaId)
        : productos.find((p) => p.id === customItem.referenciaId);
    if (refCatalogo) {
      const cantidadEnCarrito = cartItems
        .filter((it) => it.tipo === customItem.tipo && it.referenciaId === customItem.referenciaId)
        .reduce((acc, it) => acc + it.cantidad, 0);
      const check86 = validarLimitePorcionesCarrito(
        refCatalogo,
        cantidadEnCarrito,
        customItem.cantidad,
        ahoraKiosco
      );
      if (!check86.permitido) {
        createToast(check86.motivo || 'Sin porciones suficientes', 'error', 3000);
        return;
      }
    }
    setCartItems((prev) => [...prev, customItem]);
    setItemPersonalizando(null);
    lastInteractionRef.current = Date.now();
    createToast(`✓ Agregado: ${customItem.nombre}`, 'success', 2000);
  };

  const handleConfirmarComboPersonalizado = (itemPersonalizado: ItemVenta) => {
    const customItem: ItemKioscoCustomizado = {
      ...itemPersonalizado,
      modificadores: itemPersonalizado.modificadores,
      notas: itemPersonalizado.notas,
    };

    if (comboEditando) {
      setCartItems((prev) =>
        prev.map((it, idx) => (idx === comboEditando.index ? customItem : it))
      );
      createToast(`✓ Combo actualizado: ${customItem.nombre}`, 'success', 2000);
    } else {
      setCartItems((prev) => [...prev, customItem]);
      createToast(`✓ Agregado: ${customItem.nombre}`, 'success', 2000);
    }

    setComboPersonalizando(null);
    setComboEditando(null);
    lastInteractionRef.current = Date.now();
  };

  const handleEditComboEnCarrito = (index: number, item: ItemKioscoCustomizado) => {
    const comboEncontrado = combosDisponibles.find((c) => c.id === item.referenciaId);
    if (!comboEncontrado) return;
    setIsCartOpen(false);
    setComboEditando({ index, item });
    setComboPersonalizando(comboEncontrado);
    lastInteractionRef.current = Date.now();
  };

  const handleUpdateCantidad = (index: number, delta: number) => {
    const targetItem = cartItems[index];
    if (targetItem && delta > 0) {
      const refCatalogo =
        targetItem.tipo === 'combo'
          ? combos.find((c) => c.id === targetItem.referenciaId)
          : productos.find((p) => p.id === targetItem.referenciaId);
      if (refCatalogo) {
        const cantidadActual = cartItems
          .filter(
            (it) => it.tipo === targetItem.tipo && it.referenciaId === targetItem.referenciaId
          )
          .reduce((acc, it) => acc + it.cantidad, 0);
        const check86 = validarLimitePorcionesCarrito(
          refCatalogo,
          cantidadActual,
          delta,
          ahoraKiosco
        );
        if (!check86.permitido) {
          createToast(check86.motivo || 'Sin porciones disponibles', 'error', 2800);
          return;
        }
      }
    }
    setCartItems((prev) => {
      const copy = [...prev];
      const target = copy[index];
      if (!target) return prev;
      const nextQty = target.cantidad + delta;
      if (nextQty <= 0) {
        return copy.filter((_, i) => i !== index);
      }
      target.cantidad = nextQty;
      target.subtotal = target.cantidad * target.precioUnitario;
      return copy;
    });
    lastInteractionRef.current = Date.now();
  };

  const handleRemoveItem = (index: number) => {
    setCartItems((prev) => prev.filter((_, i) => i !== index));
    lastInteractionRef.current = Date.now();
  };

  // Envío final del pedido
  const handleConfirmarPedido = async (datos: {
    clienteNombre: string;
    clienteTelefono?: string;
    mesaNumero?: string;
    metodoPago: MetodoPago;
    notas?: string;
  }) => {
    if (cartItems.length === 0) return;
    if (!disponibilidadNegocio.disponible) {
      createToast(disponibilidadNegocio.motivo, 'error', 5000);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await crearPedidoKiosco(tenantId, {
        negocioId: tenantId,
        clienteNombre: datos.clienteNombre,
        clienteTelefono: datos.clienteTelefono,
        tipoServicio: modalidad,
        mesaNumero: datos.mesaNumero,
        items: cartItems,
        metodoPago: datos.metodoPago,
        notas: datos.notas,
      });

      setIsCartOpen(false);
      setTicketConfirmado({
        numeroTurno: res.numeroTurno,
        clienteNombre: datos.clienteNombre,
        clienteTelefono: datos.clienteTelefono,
        tipoServicio: modalidad,
        mesaNumero: datos.mesaNumero,
        items: cartItems,
        total: res.total,
        metodoPago: datos.metodoPago,
      });
      setCartItems([]);
    } catch (err) {
      console.error('Error registrando pedido de kiosco:', err);
      createToast(
        err instanceof Error ? err.message : 'No fue posible registrar tu pedido',
        'error',
        4000
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const combosDisponibles = useMemo(() => {
    const activos = combos.filter((c) => {
      const ev = evaluarDisponibilidadItem86(c, ahoraKiosco);
      return (ev.disponibleBase || ev.agotado86) && ev.estado !== 'fuera_horario_especial';
    });
    const esInsignia = tenantId === 'laparada' || tenantId === 'la-parada';
    if (esInsignia && !activos.some((c) => esComboPersonalizable(c))) {
      return [...activos, getComboPersonalizableDefault(tenantId)];
    }
    return activos;
  }, [combos, tenantId, ahoraKiosco]);

  const perfilDieteticoLookup = useMemo(
    () => construirLookupPerfilDietetico(productos, combosDisponibles),
    [productos, combosDisponibles]
  );

  // Filtrado de productos por categoría, perfil dietético y Control 86 / Especiales
  const productosFiltrados = useMemo(() => {
    const porCat = productos.filter((p) => {
      const ev = evaluarDisponibilidadItem86(p, ahoraKiosco);
      if ((!ev.disponibleBase && !ev.agotado86) || ev.estado === 'fuera_horario_especial') {
        return false;
      }
      if (categoriaActiva === 'todos') return true;
      return p.categoria === categoriaActiva;
    });
    return ordenarConEspecialesPrimero(
      filtrarPorPerfilDietetico(porCat, perfilDieteticoLookup, filtroDietetico),
      ahoraKiosco
    );
  }, [productos, categoriaActiva, perfilDieteticoLookup, filtroDietetico, ahoraKiosco]);

  const combosFiltrados = useMemo(() => {
    const porCat = combosDisponibles.filter((c) => {
      if (categoriaActiva === 'todos') return true;
      return c.categoria === categoriaActiva;
    });
    return ordenarConEspecialesPrimero(
      filtrarPorPerfilDietetico(porCat, perfilDieteticoLookup, filtroDietetico),
      ahoraKiosco
    );
  }, [combosDisponibles, categoriaActiva, perfilDieteticoLookup, filtroDietetico, ahoraKiosco]);

  const hayFiltrosDieteticos = contarFiltrosDieteticosActivos(filtroDietetico) > 0;

  const totalItemsEnCatalogo = productosFiltrados.length + combosFiltrados.length;
  const totalCantidadCart = cartItems.reduce((acc, it) => acc + it.cantidad, 0);
  const totalCartCOP = calcularTotalKiosco(cartItems);

  if (step === 'welcome') {
    return (
      <KioscoWelcomeScreen
        negocioNombre={negocioActual.nombre}
        negocioLogo={negocioActual.logoUrl || undefined}
        onSelectModalidad={handleSelectModalidad}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-white select-none">
      {/* Cabecera del Kiosco */}
      <KioscoHeader
        negocioNombre={negocioActual.nombre}
        negocioLogo={negocioActual.logoUrl || undefined}
        modalidad={modalidad}
        onToggleModalidad={handleToggleModalidad}
        cantidadItems={totalCantidadCart}
        totalCOP={totalCartCOP}
        onOpenCart={() => setIsCartOpen(true)}
        onReset={resetKiosco}
        onOpenPinModal={() => setIsPinModalOpen(true)}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      {!disponibilidadNegocio.disponible && (
        <div
          role="status"
          data-testid="kiosco-banner-disponibilidad"
          className={`border-b px-4 py-3 text-center text-sm font-semibold ${
            disponibilidadNegocio.estado === 'pausa_cocina'
              ? 'bg-orange-500/15 border-orange-500/30 text-orange-200'
              : 'bg-red-500/15 border-red-500/30 text-red-200'
          }`}
        >
          {disponibilidadNegocio.motivo}
        </div>
      )}

      {/* Barra de Categorías */}
      <KioscoCategoriasBar
        categorias={categorias}
        categoriaActiva={categoriaActiva}
        onSelectCategoria={(catId) => {
          setCategoriaActiva(catId);
          lastInteractionRef.current = Date.now();
        }}
        totalProductos={productos.filter((p) => p.disponible).length + combosDisponibles.length}
      />

      {/* Cuadrícula de Productos */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-5">
        <EspecialesDelDiaBanner
          productos={productos}
          combos={combosDisponibles}
          ahora={ahoraKiosco}
          onSeleccionarItem={(tipo, item) =>
            handleSelectCatalogItem(item, tipo === 'combo')
          }
        />
        <FiltroDieteticoBar
          grande
          className="mb-5"
          filtro={filtroDietetico}
          onChange={(nuevoFiltro) => {
            setFiltroDietetico(nuevoFiltro);
            lastInteractionRef.current = Date.now();
          }}
          totalVisibles={totalItemsEnCatalogo}
        />
        {loadingProductos ? (
          <div className="flex h-64 items-center justify-center" role="status">
            <div className="animate-spin h-10 w-10 border-4 border-gold-400 border-t-transparent rounded-full" />
            <span className="sr-only">Cargando menú...</span>
          </div>
        ) : totalItemsEnCatalogo === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-3xl border border-neutral-800 bg-neutral-900/50">
            <p className="font-display text-lg font-black text-white">
              {hayFiltrosDieteticos
                ? 'No hay platos que cumplan tus filtros'
                : 'No hay productos disponibles en esta categoría'}
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {hayFiltrosDieteticos && (
                <button
                  type="button"
                  onClick={() => {
                    setFiltroDietetico(FILTRO_DIETETICO_VACIO);
                    lastInteractionRef.current = Date.now();
                  }}
                  className="rounded-2xl border border-amber-400/50 bg-amber-500/20 px-5 py-2.5 text-xs font-black text-amber-200 hover:bg-amber-500/30 min-h-[44px]"
                >
                  Limpiar filtros de dieta
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setCategoriaActiva('todos');
                  setFiltroDietetico(FILTRO_DIETETICO_VACIO);
                  lastInteractionRef.current = Date.now();
                }}
                className="rounded-2xl bg-gold-400 px-5 py-2.5 text-xs font-black text-black hover:bg-gold-500 min-h-[44px]"
              >
                Ver Todo el Menú
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {combosFiltrados.map((combo) => (
              <KioscoProductCard
                key={combo.id}
                item={combo}
                isCombo={true}
                perfil={perfilDieteticoLookup.get(combo.id)}
                evaluacion86={evaluarDisponibilidadItem86(combo, ahoraKiosco)}
                onSelect={handleSelectCatalogItem}
              />
            ))}
            {productosFiltrados.map((producto) => (
              <KioscoProductCard
                key={producto.id}
                item={producto}
                isCombo={false}
                perfil={perfilDieteticoLookup.get(producto.id)}
                evaluacion86={evaluarDisponibilidadItem86(producto, ahoraKiosco)}
                onSelect={handleSelectCatalogItem}
              />
            ))}
          </div>
        )}
      </main>

      {/* Modal de Personalización */}
      {itemPersonalizando && (
        <PersonalizarItemModal
          item={itemPersonalizando.item}
          isCombo={itemPersonalizando.isCombo}
          onClose={() => setItemPersonalizando(null)}
          onConfirm={handleConfirmarPersonalizacion}
        />
      )}

      {/* Modal de Combo Personalizable ("Arma tu Combo") */}
      <ArmaTuComboModal
        combo={comboPersonalizando}
        isOpen={Boolean(comboPersonalizando)}
        productos={productos}
        initialItem={comboEditando?.item || null}
        modoStorefront={true}
        onClose={() => {
          setComboPersonalizando(null);
          setComboEditando(null);
        }}
        onConfirm={handleConfirmarComboPersonalizado}
      />

      {/* Carrito Lateral / Modal */}
      {isCartOpen && (
        <KioscoCartDrawer
          items={cartItems}
          modalidad={modalidad}
          onClose={() => setIsCartOpen(false)}
          onUpdateCantidad={handleUpdateCantidad}
          onRemoveItem={handleRemoveItem}
          onEditComboItem={handleEditComboEnCarrito}
          onConfirmarPedido={handleConfirmarPedido}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Ticket de Turno Emitido */}
      {ticketConfirmado && (
        <KioscoTicketTurnoModal
          numeroTurno={ticketConfirmado.numeroTurno}
          clienteNombre={ticketConfirmado.clienteNombre}
          clienteTelefono={ticketConfirmado.clienteTelefono}
          tipoServicio={ticketConfirmado.tipoServicio}
          mesaNumero={ticketConfirmado.mesaNumero}
          items={ticketConfirmado.items}
          total={ticketConfirmado.total}
          metodoPago={ticketConfirmado.metodoPago}
          negocioNombre={negocioActual.nombre}
          onFinalizar={resetKiosco}
        />
      )}

      {/* Modal de Salida PIN Personal */}
      {isPinModalOpen && (
        <KioscoPinModal
          onClose={() => setIsPinModalOpen(false)}
          onSuccess={() => {
            setIsPinModalOpen(false);
            navigate('/pos');
          }}
        />
      )}

      {/* Alerta de Inactividad Preventiva */}
      {inactivityPrompt && (
        <StorefrontDialog
          labelledBy="modal-inactividad-titulo"
          onClose={() => registrarActividad()}
          className="w-full max-w-sm rounded-3xl border-2 border-amber-500 bg-neutral-900 p-6 text-white text-center shadow-2xl"
        >
          <span className="text-4xl block mb-2">⏳</span>
          <h2 id="modal-inactividad-titulo" className="font-display text-xl font-black text-white">
            ¿Sigues ahí?
          </h2>
          <p className="mt-2 text-xs text-neutral-300">
            Tu pedido se reiniciará en{' '}
            <strong className="text-amber-400 font-bold">{inactivityTimerSeconds} segundos</strong>{' '}
            para dar paso al siguiente cliente.
          </p>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={resetKiosco}
              className="flex-1 rounded-xl border border-neutral-700 bg-neutral-800 py-3 text-xs font-black text-neutral-300 hover:bg-neutral-700 min-h-[44px]"
            >
              Cancelar Pedido
            </button>
            <button
              type="button"
              onClick={registrarActividad}
              className="flex-1 rounded-xl bg-gold-400 py-3 text-xs font-black text-black hover:bg-gold-500 min-h-[44px]"
            >
              Continuar
            </button>
          </div>
        </StorefrontDialog>
      )}
    </div>
  );
}
