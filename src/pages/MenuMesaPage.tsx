import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  UtensilsCrossed,
  Search,
  ShoppingCart,
  Plus,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { getNegocioPorSlug } from '@/services/negociosService';
import { getProductos, getCombos, onProductosChange, onCombosChange } from '@/services/productosService';
import { getMesaPorNumero, onMesaChange, onCuentaMesaChange } from '@/services/mesasService';
import {
  enviarLlamadoMesero,
  solicitarPrecuentaDesdeMesa,
  enviarAutopedidoMesa,
} from '@/services/menuMesaService';
import type {
  Negocio,
  Producto,
  Combo,
  Mesa,
  CuentaMesa,
  FiltroDietetico,
  ItemVenta,
  MetodoPago,
} from '@/types';
import type { MotivoLlamadoMesero } from '@/types/menuMesa';
import { formatCOP } from '@/utils/formatCOP';
import { createToast } from '@/components/ui/Toast';
import { getGourmetImage } from '@/utils/productImages';
import {
  FILTRO_DIETETICO_VACIO,
  construirLookupPerfilDietetico,
  contarFiltrosDieteticosActivos,
  filtrarPorPerfilDietetico,
} from '@/utils/alergenosUtils';
import { BadgesDieteticos } from '@/components/dieta/BadgesDieteticos';
import { FiltroDieteticoBar } from '@/components/dieta/FiltroDieteticoBar';
import {
  Badge86Estado,
  BadgeEspecialDelDia,
  EspecialesDelDiaBanner,
} from '@/components/control86';
import {
  evaluarDisponibilidadItem86,
  ordenarConEspecialesPrimero,
  validarLimitePorcionesCarrito,
} from '@/utils/control86Utils';
import { useHoraActual } from '@/hooks/useHoraActual';
import { MesaHeader } from '@/components/mesa/MesaHeader';
import { LlamarMeseroModal } from '@/components/mesa/LlamarMeseroModal';
import { PrecuentaMesaModal } from '@/components/mesa/PrecuentaMesaModal';
import { MesaCuentaEnVivoSheet } from '@/components/mesa/MesaCuentaEnVivoSheet';
import { AutopedidoDrawer } from '@/components/mesa/AutopedidoDrawer';
import { ArmaTuComboModal } from '@/components/pos/ArmaTuComboModal';
import {
  esComboPersonalizable,
  formatearResumenCortoEleccionesCombo,
  getComboPersonalizableDefault,
} from '@/utils/combosPersonalizablesUtils';
import { mesasDefaultIniciales } from '@/utils/mesasUtils';

export function MenuMesaPage() {
  const { slug, numeroMesa } = useParams<{ slug: string; numeroMesa: string }>();

  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [mesa, setMesa] = useState<Mesa | null>(null);
  const [mesaEsFallback, setMesaEsFallback] = useState(false);
  const [cuenta, setCuenta] = useState<CuentaMesa | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ahoraMesa = useHoraActual();

  // Filtros de Menú
  const [categoriaActiva, setCategoriaActiva] = useState<string>('todos');
  const [filtroDietetico, setFiltroDietetico] = useState<FiltroDietetico>(FILTRO_DIETETICO_VACIO);
  const [busqueda, setBusqueda] = useState<string>('');

  // Carrito local de autopedido en mesa
  const [itemsAutopedido, setItemsAutopedido] = useState<ItemVenta[]>([]);

  // Estados de Modales
  const [modalLlamarOpen, setModalLlamarOpen] = useState(false);
  const [modalPrecuentaOpen, setModalPrecuentaOpen] = useState(false);
  const [sheetCuentaEnVivoOpen, setSheetCuentaEnVivoOpen] = useState(false);
  const [drawerAutopedidoOpen, setDrawerAutopedidoOpen] = useState(false);
  const [comboPersonalizando, setComboPersonalizando] = useState<Combo | null>(null);
  const [comboItemEditando, setComboItemEditando] = useState<ItemVenta | null>(null);

  // Carga inicial de datos de Negocio, Mesa y Catálogo
  const cargarDatos = useCallback(async () => {
    if (!slug) return;
    setCargando(true);
    setError(null);

    try {
      // 1. Resolver Negocio por Slug
      const neg = await getNegocioPorSlug(slug);
      if (!neg) {
        setError(`El restaurante "${slug}" no fue encontrado o no está activo.`);
        setCargando(false);
        return;
      }
      setNegocio(neg);

      // 2. Resolver Mesa por Número
      const numMesa = Math.max(1, Math.floor(Number(numeroMesa) || 1));
      const esInsignia = neg.id === 'laparada' || neg.id === 'la-parada';
      let m: Mesa | null = null;
      try {
        m = await getMesaPorNumero(neg.id, numMesa);
      } catch (mesaErr) {
        if (!esInsignia) throw mesaErr;
      }

      let usandoFallback = false;
      if (!m && esInsignia) {
        const fallback = mesasDefaultIniciales(neg.id).find((item) => item.numero === numMesa);
        if (fallback) {
          m = { ...fallback, id: `mesa-${neg.id}-${numMesa}` };
          usandoFallback = true;
        }
      }

      if (!m) {
        setMesaEsFallback(false);
        setError(`La Mesa ${numMesa} no está registrada en ${neg.nombre}.`);
        setCargando(false);
        return;
      }
      setMesaEsFallback(usandoFallback);
      setMesa(m);

      // 3. Cargar Productos y Combos
      const [prods, cmbs] = await Promise.all([
        getProductos(neg.id),
        getCombos(neg.id),
      ]);
      setProductos(prods.filter((p) => p.disponible !== false || p.control86?.agotado86));
      const combosActivos = cmbs.filter((c) => c.disponible !== false || c.control86?.agotado86);
      if (esInsignia && !combosActivos.some((c) => esComboPersonalizable(c))) {
        combosActivos.push(getComboPersonalizableDefault(neg.id));
      }
      setCombos(combosActivos);
    } catch (err) {
      console.error('Error al inicializar menú en mesa:', err);
      setError('Ocurrió un error al cargar la información de la mesa.');
    } finally {
      setCargando(false);
    }
  }, [slug, numeroMesa]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Suscripción reactiva a cambios de la Mesa (estado, mesero, total)
  useEffect(() => {
    if (!negocio || !mesa?.id || mesaEsFallback) return;
    const unsub = onMesaChange(negocio.id, mesa.id, (mesaActualizada) => {
      if (mesaActualizada) {
        setMesa(mesaActualizada);
      }
    });
    return () => unsub();
  }, [negocio, mesa?.id, mesaEsFallback]);

  // Suscripción en tiempo real a cambios de Control 86 y Especiales del Día en el catálogo
  useEffect(() => {
    if (!negocio) return;
    const esInsignia = negocio.id === 'laparada' || negocio.id === 'la-parada';

    const unsubProds = onProductosChange(negocio.id, (rawProds) => {
      setProductos(rawProds.filter((p) => p.disponible !== false || p.control86?.agotado86));
    });
    const unsubCombs = onCombosChange(negocio.id, (rawCombs) => {
      const visibles = rawCombs.filter((c) => c.disponible !== false || c.control86?.agotado86);
      if (esInsignia && !visibles.some((c) => esComboPersonalizable(c))) {
        visibles.push(getComboPersonalizableDefault(negocio.id));
      }
      setCombos(visibles);
    });

    return () => {
      unsubProds();
      unsubCombs();
    };
  }, [negocio]);

  // Suscripción reactiva a cambios de la Cuenta de la mesa
  useEffect(() => {
    if (!negocio || !mesa?.cuentaActivaId) {
      setCuenta(null);
      return;
    }
    const unsub = onCuentaMesaChange(negocio.id, mesa.cuentaActivaId, (cuentaActualizada) => {
      setCuenta(cuentaActualizada);
    });
    return () => unsub();
  }, [negocio, mesa?.cuentaActivaId]);

  // Lista de categorías únicas
  const categorias = useMemo(() => {
    const set = new Set<string>();
    productos.forEach((p) => {
      if (p.categoria) set.add(p.categoria);
    });
    return ['todos', ...(combos.length > 0 ? ['Combos'] : []), ...Array.from(set)];
  }, [productos, combos]);

  const perfilDieteticoLookup = useMemo(
    () => construirLookupPerfilDietetico(productos, combos),
    [productos, combos]
  );

  // Filtrado de catálogo
  const catalogoFiltrado = useMemo(() => {
    const q = busqueda.trim().toLowerCase();

    const prods = productos.filter((p) => {
      const ev = evaluarDisponibilidadItem86(p, ahoraMesa);
      if (ev.estado === 'fuera_horario_especial') return false;
      const matchCat = categoriaActiva === 'todos' || p.categoria === categoriaActiva;
      const matchQuery =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });

    const cmbs = (categoriaActiva === 'todos' || categoriaActiva === 'Combos')
      ? combos.filter((c) => {
          const ev = evaluarDisponibilidadItem86(c, ahoraMesa);
          if (ev.estado === 'fuera_horario_especial') return false;
          return (
            !q ||
            c.nombre.toLowerCase().includes(q) ||
            (c.descripcion && c.descripcion.toLowerCase().includes(q))
          );
        })
      : [];

    return {
      productos: ordenarConEspecialesPrimero(
        filtrarPorPerfilDietetico(prods, perfilDieteticoLookup, filtroDietetico),
        ahoraMesa
      ),
      combos: ordenarConEspecialesPrimero(
        filtrarPorPerfilDietetico(cmbs, perfilDieteticoLookup, filtroDietetico),
        ahoraMesa
      ),
    };
  }, [productos, combos, categoriaActiva, busqueda, perfilDieteticoLookup, filtroDietetico, ahoraMesa]);

  // Acciones sobre el carrito de Autopedido
  const handleAgregarProducto = (p: Producto) => {
    const actual = itemsAutopedido.find((it) => it.referenciaId === p.id)?.cantidad ?? 0;
    const check86 = validarLimitePorcionesCarrito(p, actual, 1, ahoraMesa);
    if (!check86.permitido) {
      createToast(check86.motivo || `"${p.nombre}" no disponible`, 'error');
      return;
    }
    setItemsAutopedido((prev) => {
      const idx = prev.findIndex((it) => it.referenciaId === p.id);
      if (idx >= 0) {
        const copy = [...prev];
        const nuevaCant = copy[idx].cantidad + 1;
        copy[idx] = {
          ...copy[idx],
          cantidad: nuevaCant,
          subtotal: nuevaCant * copy[idx].precioUnitario,
        };
        return copy;
      }
      const nuevo: ItemVenta = {
        tipo: 'producto',
        referenciaId: p.id,
        nombre: p.nombre,
        precioUnitario: p.precio,
        cantidad: 1,
        subtotal: p.precio,
      };
      return [...prev, nuevo];
    });
    createToast(`"${p.nombre}" agregado al pedido`, 'info');
  };

  const abrirPersonalizadorComboMesa = (combo: Combo, itemExistente?: ItemVenta) => {
    setComboItemEditando(itemExistente || null);
    setComboPersonalizando(combo);
  };

  const handleConfirmarComboMesa = (itemPersonalizado: ItemVenta) => {
    setItemsAutopedido((prev) => {
      const idx = prev.findIndex(
        (it) => it.tipo === 'combo' && it.referenciaId === itemPersonalizado.referenciaId
      );
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = itemPersonalizado;
        return copy;
      }
      return [...prev, itemPersonalizado];
    });
    createToast(`Combo "${itemPersonalizado.nombre}" agregado al pedido`, 'info');
    setComboPersonalizando(null);
    setComboItemEditando(null);
  };

  const handleAgregarCombo = (c: Combo) => {
    const actual = itemsAutopedido.find((it) => it.referenciaId === c.id)?.cantidad ?? 0;
    const check86 = validarLimitePorcionesCarrito(c, actual, 1, ahoraMesa);
    if (!check86.permitido) {
      createToast(check86.motivo || `"${c.nombre}" no disponible`, 'error');
      return;
    }
    if (esComboPersonalizable(c)) {
      const existente = itemsAutopedido.find(
        (it) => it.tipo === 'combo' && it.referenciaId === c.id
      );
      abrirPersonalizadorComboMesa(c, existente);
      return;
    }

    setItemsAutopedido((prev) => {
      const idx = prev.findIndex((it) => it.referenciaId === c.id);
      const precio = c.precioEspecial;
      if (idx >= 0) {
        const copy = [...prev];
        const nuevaCant = copy[idx].cantidad + 1;
        copy[idx] = {
          ...copy[idx],
          cantidad: nuevaCant,
          subtotal: nuevaCant * copy[idx].precioUnitario,
        };
        return copy;
      }
      const nuevo: ItemVenta = {
        tipo: 'combo',
        referenciaId: c.id,
        nombre: `Combo: ${c.nombre}`,
        precioUnitario: precio,
        cantidad: 1,
        subtotal: precio,
      };
      return [...prev, nuevo];
    });
    createToast(`Combo "${c.nombre}" agregado al pedido`, 'info');
  };

  const handleIncrement = (itemId: string) => {
    const itemRef =
      productos.find((p) => p.id === itemId) || combos.find((c) => c.id === itemId);
    if (itemRef) {
      const actual = itemsAutopedido.find((it) => it.referenciaId === itemId)?.cantidad ?? 0;
      const check86 = validarLimitePorcionesCarrito(itemRef, actual, 1, ahoraMesa);
      if (!check86.permitido) {
        createToast(check86.motivo || 'Sin porciones disponibles', 'error');
        return;
      }
    }
    setItemsAutopedido((prev) =>
      prev.map((it) => {
        if (it.referenciaId !== itemId) return it;
        const cant = it.cantidad + 1;
        return { ...it, cantidad: cant, subtotal: cant * it.precioUnitario };
      })
    );
  };

  const handleDecrement = (itemId: string) => {
    setItemsAutopedido((prev) =>
      prev
        .map((it) => {
          if (it.referenciaId !== itemId) return it;
          const cant = it.cantidad - 1;
          return { ...it, cantidad: cant, subtotal: cant * it.precioUnitario };
        })
        .filter((it) => it.cantidad > 0)
    );
  };

  const handleRemove = (itemId: string) => {
    setItemsAutopedido((prev) => prev.filter((it) => it.referenciaId !== itemId));
  };

  const handleUpdateNotas = (itemId: string, notas: string) => {
    setItemsAutopedido((prev) =>
      prev.map((it) =>
        it.referenciaId === itemId ? { ...it, notas } : it
      )
    );
  };

  // Handlers para las acciones del comensal
  const handleLlamarMeseroSubmit = async (params: {
    motivo: MotivoLlamadoMesero;
    notas?: string;
    clienteNombre?: string;
  }) => {
    if (!negocio || !mesa) return;
    await enviarLlamadoMesero({
      negocioId: negocio.id,
      mesaId: mesa.id,
      mesaNumero: mesa.numero,
      mesaNombre: mesa.nombre,
      motivo: params.motivo,
      notas: params.notas,
      clienteNombre: params.clienteNombre,
    });
    createToast('Llamado enviado al mesero', 'success');
  };

  const handleSolicitarPrecuentaSubmit = async (params: {
    metodoPagoPreferido: MetodoPago;
    necesitaFactura?: boolean;
    datosFactura?: { nit: string; razonSocial: string };
    notas?: string;
    clienteNombre?: string;
  }) => {
    if (!negocio || !mesa || !cuenta) return;
    await solicitarPrecuentaDesdeMesa({
      negocioId: negocio.id,
      mesaId: mesa.id,
      mesaNumero: mesa.numero,
      mesaNombre: mesa.nombre,
      cuentaId: cuenta.id,
      metodoPagoPreferido: params.metodoPagoPreferido,
      necesitaFactura: params.necesitaFactura,
      datosFactura: params.datosFactura,
      notas: params.notas,
      clienteNombre: params.clienteNombre,
    });
    createToast('Solicitud de cuenta enviada', 'success');
  };

  const handleEnviarAutopedido = async (params: {
    clienteNombre?: string;
    notas?: string;
  }) => {
    if (!negocio || !mesa) return;
    await enviarAutopedidoMesa({
      negocioId: negocio.id,
      mesaId: mesa.id,
      mesaNumero: mesa.numero,
      mesaNombre: mesa.nombre,
      cuentaId: mesa.cuentaActivaId,
      items: itemsAutopedido,
      clienteNombre: params.clienteNombre,
      notas: params.notas,
    });
    setItemsAutopedido([]);
    createToast('¡Tu pedido fue enviado a la cocina!', 'success');
  };

  const cantidadTotalAutopedido = itemsAutopedido.reduce(
    (acc, it) => acc + (Number(it.cantidad) || 0),
    0
  );
  const totalRondaAutopedido = itemsAutopedido.reduce(
    (acc, it) => acc + (Number(it.precioUnitario) || 0) * (Number(it.cantidad) || 1),
    0
  );

  if (cargando) {
    return (
      <div className="min-h-screen bg-base-dark flex flex-col items-center justify-center p-4">
        <div className="animate-spin h-10 w-10 border-4 border-amber-400 border-t-transparent rounded-full mb-3" />
        <p className="text-sm font-medium text-neutral-300">Cargando menú de tu mesa...</p>
      </div>
    );
  }

  if (error || !negocio || !mesa) {
    return (
      <div className="min-h-screen bg-base-dark flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl border border-red-500/30 bg-neutral-900/90 p-6 text-center space-y-4 shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-black text-white font-display">
            Mesa no disponible
          </h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            {error || 'No fue posible conectar con el restaurante o la mesa indicada.'}
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={cargarDatos}
              className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-neutral-800 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Reintentar Conexión
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-dark text-neutral-100 flex flex-col pb-24">
      {/* Cabecera Interactiva de Mesa */}
      <MesaHeader
        negocioNombre={negocio.nombre}
        negocioLogo={negocio.logoUrl || undefined}
        mesa={mesa}
        cuenta={cuenta}
        onAbrirLlamarMesero={() => setModalLlamarOpen(true)}
        onAbrirPrecuenta={() => setModalPrecuentaOpen(true)}
        onAbrirCuentaEnVivo={() => setSheetCuentaEnVivoOpen(true)}
      />

      <main className="mx-auto max-w-5xl w-full px-4 sm:px-6 pt-4 space-y-5 flex-1">
        {/* Barra de Búsqueda de Platos */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-neutral-500" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar hamburguesas, entradas, bebidas..."
            className="w-full min-h-[44px] rounded-2xl border border-neutral-800 bg-neutral-900/90 py-2.5 pl-10 pr-4 text-xs text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none shadow-md"
          />
        </div>

        {/* Pestañas de Categorías con scroll horizontal */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categorias.map((cat) => {
            const activo = categoriaActiva === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoriaActiva(cat)}
                aria-pressed={activo}
                className={`min-h-[44px] whitespace-nowrap rounded-xl px-4 py-2 text-xs font-bold transition-all shrink-0 ${
                  activo
                    ? 'bg-amber-400 text-neutral-950 font-black shadow-lg scale-100'
                    : 'border border-neutral-800 bg-neutral-900/80 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                {cat === 'todos' ? 'Toda la Carta' : cat}
              </button>
            );
          })}
        </div>

        <EspecialesDelDiaBanner
          productos={productos}
          combos={combos}
          ahora={ahoraMesa}
          compacto
          onSeleccionarItem={(tipo, item) =>
            tipo === 'combo'
              ? handleAgregarCombo(item as Combo)
              : handleAgregarProducto(item as Producto)
          }
        />

        <FiltroDieteticoBar
          filtro={filtroDietetico}
          onChange={setFiltroDietetico}
          totalVisibles={catalogoFiltrado.productos.length + catalogoFiltrado.combos.length}
        />

        {/* Sección de Combos (si aplica) */}
        {catalogoFiltrado.combos.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 border-b border-neutral-800/80 pb-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <h2 className="font-display text-base font-bold text-white">
                Combos Especiales
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {catalogoFiltrado.combos.map((combo) => {
                const enCarrito = itemsAutopedido.find((it) => it.referenciaId === combo.id);
                const evaluacion86 = evaluarDisponibilidadItem86(combo, ahoraMesa);
                const personalizable = esComboPersonalizable(combo);
                const resumenElecciones = formatearResumenCortoEleccionesCombo(
                  enCarrito?.eleccionesCombo
                );

                return (
                  <article
                    key={combo.id}
                    className={`flex flex-col justify-between rounded-2xl border bg-neutral-900/70 p-3.5 shadow-lg transition-all ${
                      evaluacion86.agotado86
                        ? 'border-red-900/50 opacity-75'
                        : 'border-neutral-800 hover:border-amber-500/30'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3 className="font-display text-sm font-bold text-white leading-tight">
                          {combo.nombre}
                        </h3>
                        <span className="font-mono text-sm font-black text-amber-400 shrink-0">
                          {formatCOP(combo.precioEspecial)}
                        </span>
                      </div>
                      {combo.descripcion && (
                        <p className="mt-1 text-xs text-neutral-400 line-clamp-2">
                          {combo.descripcion}
                        </p>
                      )}
                      <BadgesDieteticos
                        perfil={perfilDieteticoLookup.get(combo.id)}
                        mostrarNutricion
                        className="mt-2"
                      />
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        <BadgeEspecialDelDia evaluacion={evaluacion86} />
                        <Badge86Estado evaluacion={evaluacion86} />
                      </div>
                      {personalizable && combo.gruposEleccion && combo.gruposEleccion.length > 0 && (
                        <p className="mt-1.5 text-[11px] font-medium text-amber-300/90">
                          Personaliza: {combo.gruposEleccion.map((g) => g.nombre).join(' · ')}
                        </p>
                      )}
                      {resumenElecciones && (
                        <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-950/25 p-2 space-y-1">
                          <p className="text-[11px] font-medium text-amber-200">
                            Tu selección: {resumenElecciones}
                          </p>
                          <button
                            type="button"
                            onClick={() => abrirPersonalizadorComboMesa(combo, enCarrito)}
                            className="min-h-[44px] w-full rounded-lg border border-amber-400/40 bg-amber-500/15 px-2.5 text-xs font-bold text-amber-300 hover:bg-amber-500/25"
                          >
                            Cambiar opciones
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-800 flex items-center justify-between">
                      <span className="text-[11px] text-amber-400/80 font-semibold">
                        {personalizable ? 'Arma tu Combo' : 'Ahorro especial'}
                      </span>

                      <button
                        type="button"
                        disabled={!evaluacion86.puedePedirsePublico}
                        aria-label={
                          evaluacion86.agotado86
                            ? `${combo.nombre} agotado hoy`
                            : personalizable && !enCarrito
                              ? `Personalizar ${combo.nombre}`
                              : undefined
                        }
                        onClick={() =>
                          personalizable && enCarrito
                            ? handleIncrement(combo.id)
                            : handleAgregarCombo(combo)
                        }
                        className={`flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black shadow-md transition-all ${
                          !evaluacion86.puedePedirsePublico
                            ? 'cursor-not-allowed border border-neutral-700 bg-neutral-800 text-neutral-400'
                            : 'bg-amber-400 text-neutral-950 hover:brightness-110 active:scale-95'
                        }`}
                      >
                        {evaluacion86.puedePedirsePublico && <Plus className="h-3.5 w-3.5" />}
                        <span>
                          {evaluacion86.agotado86
                            ? '86 · Agotado'
                            : enCarrito
                              ? `Agregar (${enCarrito.cantidad})`
                              : personalizable
                                ? 'Armar Combo'
                                : 'Pedir'}
                        </span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Sección de Platos Individuales */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 border-b border-neutral-800/80 pb-2">
            <UtensilsCrossed className="h-4 w-4 text-amber-400" />
            <h2 className="font-display text-base font-bold text-white">
              {categoriaActiva === 'todos' ? 'Nuestros Platos' : categoriaActiva}
            </h2>
            <span className="text-xs text-neutral-500">
              ({catalogoFiltrado.productos.length})
            </span>
          </div>

          {catalogoFiltrado.productos.length === 0 && catalogoFiltrado.combos.length === 0 ? (
            <div className="py-16 text-center text-neutral-500 text-xs space-y-3">
              <p>No hay productos que coincidan con la búsqueda o filtros.</p>
              {contarFiltrosDieteticosActivos(filtroDietetico) > 0 && (
                <button
                  type="button"
                  onClick={() => setFiltroDietetico(FILTRO_DIETETICO_VACIO)}
                  className="mx-auto inline-flex min-h-[44px] items-center justify-center rounded-xl border border-amber-400/40 bg-amber-500/15 px-4 text-xs font-bold text-amber-300 hover:bg-amber-500/25"
                >
                  Quitar filtros de dieta
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {catalogoFiltrado.productos.map((producto) => {
                const enCarrito = itemsAutopedido.find((it) => it.referenciaId === producto.id);
                const evaluacion86 = evaluarDisponibilidadItem86(producto, ahoraMesa);
                const imagen = producto.imagenUrl || getGourmetImage(producto.nombre, producto.categoria);

                return (
                  <article
                    key={producto.id}
                    className={`flex flex-col justify-between rounded-2xl border bg-neutral-900/70 p-3 shadow-lg transition-all overflow-hidden ${
                      evaluacion86.agotado86
                        ? 'border-red-900/50 opacity-75'
                        : 'border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex gap-3">
                      {imagen && (
                        <img
                          src={imagen}
                          alt={producto.nombre}
                          className="h-20 w-20 rounded-xl object-cover border border-neutral-800 shrink-0 bg-neutral-950"
                          loading="lazy"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display text-sm font-bold text-white leading-tight line-clamp-1">
                          {producto.nombre}
                        </h3>
                        {producto.descripcion && (
                          <p className="mt-1 text-[11px] text-neutral-400 line-clamp-2 leading-relaxed">
                            {producto.descripcion}
                          </p>
                        )}
                        <BadgesDieteticos
                          perfil={perfilDieteticoLookup.get(producto.id)}
                          compacto
                          className="mt-1.5"
                        />
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <BadgeEspecialDelDia evaluacion={evaluacion86} compacto />
                          <Badge86Estado evaluacion={evaluacion86} compacto />
                        </div>
                        <div className="mt-2 font-mono text-sm font-black text-amber-400">
                          {formatCOP(producto.precio)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-800 flex items-center justify-between">
                      <span className="text-[10px] text-neutral-500">
                        {producto.categoria || 'Cocina'}
                      </span>

                      <button
                        type="button"
                        disabled={!evaluacion86.puedePedirsePublico}
                        onClick={() => handleAgregarProducto(producto)}
                        className={`flex min-h-[44px] items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-black transition-all ${
                          !evaluacion86.puedePedirsePublico
                            ? 'cursor-not-allowed border border-neutral-700 bg-neutral-800 text-neutral-400'
                            : enCarrito
                              ? 'bg-amber-400 text-neutral-950 shadow-md active:scale-95'
                              : 'bg-neutral-800 text-white hover:bg-neutral-700 border border-neutral-700 active:scale-95'
                        }`}
                      >
                        {evaluacion86.puedePedirsePublico && <Plus className="h-3.5 w-3.5" />}
                        <span>
                          {evaluacion86.agotado86
                            ? '86 · Agotado'
                            : enCarrito
                              ? `En pedido (${enCarrito.cantidad})`
                              : 'Agregar'}
                        </span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Barra Flotante de Autopedido en Mesa (si hay ítems agregados) */}
      {cantidadTotalAutopedido > 0 && (
        <aside
          aria-label="Resumen de autopedido"
          className="fixed bottom-4 inset-x-4 max-w-lg mx-auto z-40 rounded-2xl border border-amber-400/40 bg-neutral-950/95 p-3 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 animate-slide-up"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400 text-neutral-950 font-black text-xs shrink-0">
              {cantidadTotalAutopedido}
            </span>
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block truncate">
                Ronda a Cocina
              </span>
              <span className="font-display text-base font-black text-amber-400">
                {formatCOP(totalRondaAutopedido)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDrawerAutopedidoOpen(true)}
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-2 text-xs font-black text-neutral-950 shadow-lg hover:brightness-110 active:scale-95 transition-all"
          >
            <ShoppingCart className="h-4 w-4" />
            <span>Ver Pedido</span>
          </button>
        </aside>
      )}

      {/* Modal: Llamar al Mesero */}
      <LlamarMeseroModal
        isOpen={modalLlamarOpen}
        mesaNumero={mesa.numero}
        mesaNombre={mesa.nombre}
        onClose={() => setModalLlamarOpen(false)}
        onSubmit={handleLlamarMeseroSubmit}
      />

      {/* Modal: Pre-Cuenta de Mesa */}
      <PrecuentaMesaModal
        isOpen={modalPrecuentaOpen}
        mesaNumero={mesa.numero}
        mesaNombre={mesa.nombre}
        cuenta={cuenta}
        negocioNombre={negocio.nombre}
        onClose={() => setModalPrecuentaOpen(false)}
        onSubmit={handleSolicitarPrecuentaSubmit}
      />

      {/* Modal / Sheet: Cuenta en Vivo */}
      <MesaCuentaEnVivoSheet
        isOpen={sheetCuentaEnVivoOpen}
        mesaNumero={mesa.numero}
        mesaNombre={mesa.nombre}
        cuenta={cuenta}
        onClose={() => setSheetCuentaEnVivoOpen(false)}
        onPedirCuenta={() => setModalPrecuentaOpen(true)}
      />

      {/* Drawer: Autopedido */}
      <AutopedidoDrawer
        isOpen={drawerAutopedidoOpen}
        mesaNumero={mesa.numero}
        mesaNombre={mesa.nombre}
        items={itemsAutopedido}
        onClose={() => setDrawerAutopedidoOpen(false)}
        onIncrementItem={handleIncrement}
        onDecrementItem={handleDecrement}
        onRemoveItem={handleRemove}
        onUpdateItemNotas={handleUpdateNotas}
        onEnviarPedido={handleEnviarAutopedido}
      />

      {/* Modal: Arma tu Combo en Mesa */}
      <ArmaTuComboModal
        combo={comboPersonalizando}
        isOpen={Boolean(comboPersonalizando)}
        productos={productos}
        initialItem={comboItemEditando}
        modoStorefront
        onClose={() => {
          setComboPersonalizando(null);
          setComboItemEditando(null);
        }}
        onConfirm={handleConfirmarComboMesa}
      />
    </div>
  );
}

export default MenuMesaPage;
