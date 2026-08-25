// src/pages/LandingTiendaPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  CheckCircle2,
  User,
  LogOut,
  MapPin,
  Flame,
  Search,
  MessageCircle,
  Clock,
  Truck,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  UtensilsCrossed,
  ArrowRight,
  ShieldCheck,
  Send,
  Banknote,
  Phone,
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
} from 'firebase/auth';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import { getProductos, getCombos } from '@/services/productosService';
import { Producto, Combo, ItemVenta, Jornada, MetodoPago } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createToast } from '@/components/ui/Toast';
import { useCategorias } from '@/hooks/useCategorias';

// Determina el tipo de plato y estilo para placeholders gastronómicos elegantes
function getCategoryTag(nombre: string): { label: string; tagColor: string } {
  const n = nombre.toLowerCase();
  if (n.includes('hamburguesa') || n.includes('burger')) return { label: 'Burgers', tagColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
  if (n.includes('perro') || n.includes('hot dog')) return { label: 'Perros', tagColor: 'bg-red-500/20 text-red-300 border-red-500/30' };
  if (n.includes('salchipapa')) return { label: 'Salchipapas', tagColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' };
  if (n.includes('tequeño')) return { label: 'Entradas', tagColor: 'bg-orange-500/20 text-orange-300 border-orange-500/30' };
  if (n.includes('arepa') || n.includes('caldo') || n.includes('desayuno')) return { label: 'Tradicional', tagColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
  if (n.includes('jugo') || n.includes('gaseosa') || n.includes('bebida') || n.includes('coca')) return { label: 'Bebidas', tagColor: 'bg-sky-500/20 text-sky-300 border-sky-500/30' };
  return { label: 'Especialidad', tagColor: 'bg-neutral-800 text-neutral-300 border-neutral-700' };
}

export function LandingTiendaPage() {
  const { categorias: categoriasDB } = useCategorias();
  // Estados de Catálogo
  const [jornada, setJornada] = useState<Jornada>('noche');
  const [categoriaActiva, setCategoriaActiva] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loadingMenu, setLoadingMenu] = useState(true);

  // Estados del Carrito
  const [carrito, setCarrito] = useState<ItemVenta[]>([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  // Estados de Auth Cliente (Firebase)
  const [clienteUser, setClienteUser] = useState<FirebaseUser | null>(null);
  const [modalAuthAbierto, setModalAuthAbierto] = useState(false);
  const [modoAuth, setModoAuth] = useState<'login' | 'registro'>('login');
  const [emailAuth, setEmailAuth] = useState('');
  const [passwordAuth, setPasswordAuth] = useState('');
  const [nombreAuth, setNombreAuth] = useState('');
  const [cargandoAuth, setCargandoAuth] = useState(false);
  const [errorAuth, setErrorAuth] = useState('');

  // Estados de Checkout
  const [modalCheckoutAbierto, setModalCheckoutAbierto] = useState(false);
  const [nombreCliente, setNombreCliente] = useState('');
  const [telefonoCliente, setTelefonoCliente] = useState('');
  const [direccionCliente, setDireccionCliente] = useState('');
  const [barrioCliente, setBarrioCliente] = useState('');
  const [notasCliente, setNotasCliente] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('efectivo');
  const [pagaConCuanto, setPagaConCuanto] = useState('');
  const [cargandoPedido, setCargandoPedido] = useState(false);

  // Estado de Confirmación de Pedido
  const [pedidoExitoso, setPedidoExitoso] = useState<{ id: string; total: number } | null>(null);

  // Escuchar estado de autenticación del cliente
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setClienteUser(user);
      if (user?.displayName && !nombreCliente) {
        setNombreCliente(user.displayName);
      }
    });
    return () => unsubscribe();
  }, []);

  // Cargar menú según jornada
  useEffect(() => {
    const cargarMenu = async () => {
      setLoadingMenu(true);
      try {
        const [prodsData, combosData] = await Promise.all([
          getProductos(jornada),
          getCombos(jornada),
        ]);
        setProductos(prodsData.filter((p) => p.disponible !== false));
        setCombos(combosData.filter((c) => c.disponible !== false));
      } catch (error) {
        console.error('Error cargando menú:', error);
      } finally {
        setLoadingMenu(false);
      }
    };
    cargarMenu();
  }, [jornada]);

  // Carrito helpers
  const agregarAlCarrito = (tipo: 'producto' | 'combo', item: Producto | Combo) => {
    const precio = tipo === 'producto' ? (item as Producto).precio : (item as Combo).precioEspecial;
    setCarrito((prev) => {
      const existe = prev.find((i) => i.referenciaId === item.id);
      if (existe) {
        return prev.map((i) =>
          i.referenciaId === item.id
            ? { ...i, cantidad: i.cantidad + 1, subtotal: (i.cantidad + 1) * i.precioUnitario }
            : i
        );
      }
      return [
        ...prev,
        {
          tipo,
          referenciaId: item.id,
          nombre: item.nombre,
          cantidad: 1,
          precioUnitario: precio,
          subtotal: precio,
        },
      ];
    });
    createToast(`🛒 ${item.nombre} agregado al pedido`, 'success');
  };

  const modificarCantidadCarrito = (referenciaId: string, delta: number) => {
    setCarrito((prev) =>
      prev
        .map((item) => {
          if (item.referenciaId === referenciaId) {
            const nuevaCantidad = item.cantidad + delta;
            return nuevaCantidad > 0
              ? { ...item, cantidad: nuevaCantidad, subtotal: nuevaCantidad * item.precioUnitario }
              : null;
          }
          return item;
        })
        .filter(Boolean) as ItemVenta[]
    );
  };

  const eliminarDelCarrito = (referenciaId: string) => {
    setCarrito((prev) => prev.filter((i) => i.referenciaId !== referenciaId));
  };

  const totalCarrito = carrito.reduce((sum, item) => sum + item.subtotal, 0);
  const totalItemsCarrito = carrito.reduce((sum, item) => sum + item.cantidad, 0);

  // Extraer categorías únicas para la tienda pública
  const categoriasDisponibles = useMemo(() => {
    const list: Array<{ id: string; label: string; count?: number }> = [
      { id: 'todos', label: '🍽️ Todos', count: productos.length + combos.length },
    ];
    if (combos.length > 0) {
      list.push({ id: 'combos', label: '🎯 Combos', count: combos.length });
    }
    const setCats = new Set<string>();
    productos.forEach((p) => {
      if (p.categoria && p.categoria.trim()) {
        setCats.add(p.categoria.trim());
      }
    });

    if (setCats.size > 0) {
      setCats.forEach((c) => {
        const count = productos.filter(
          (p) => p.categoria?.toLowerCase().trim() === c.toLowerCase().trim()
        ).length;
        list.push({ id: c.toLowerCase(), label: c, count });
      });
    } else {
      list.push(
        { id: 'tequeños', label: '🥟 Tequeños' },
        { id: 'pancerotis', label: '🥟 Pancerotis' },
        { id: 'hamburguesas', label: '🍔 Hamburguesas' },
        { id: 'perros', label: '🌭 Perros Calientes' },
        { id: 'salchipapas', label: '🍟 Salchipapas' },
        { id: 'bebidas', label: '🥤 Bebidas' },
        { id: 'otros', label: '🍽️ Otros' }
      );
    }

    return list;
  }, [productos, combos]);

  // Filtrado de productos según categoría y búsqueda
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const matchBusqueda =
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(busqueda.toLowerCase()));

      if (!matchBusqueda) return false;

      if (categoriaActiva === 'todos' || categoriaActiva === 'combos') return true;

      // Si el producto tiene categoría asignada
      if (p.categoria && p.categoria.trim()) {
        return p.categoria.toLowerCase().trim() === categoriaActiva.toLowerCase().trim();
      }

      // Fallback semántico si no tiene categoría explícita
      const n = p.nombre.toLowerCase();
      if (categoriaActiva === 'tequeños') return n.includes('tequeño');
      if (categoriaActiva === 'pancerotis') return n.includes('panceroti') || n.includes('panzerotti');
      if (categoriaActiva === 'hamburguesas') return n.includes('hamburguesa') || n.includes('burger');
      if (categoriaActiva === 'perros') return n.includes('perro') || n.includes('hot dog');
      if (categoriaActiva === 'salchipapas') return n.includes('salchipapa') || n.includes('papa');
      if (categoriaActiva === 'bebidas') return n.includes('jugo') || n.includes('gaseosa') || n.includes('bebida') || n.includes('coca');
      if (categoriaActiva === 'otros') return true;
      return true;
    });
  }, [productos, busqueda, categoriaActiva]);

  // Lista de items destacados seleccionados por el administrador
  const itemsDestacados = useMemo(() => {
    const list: Array<{
      tipo: 'combo' | 'producto';
      item: Combo | Producto;
      id: string;
      nombre: string;
      descripcion: string;
      precio: number;
      precioOriginal?: number;
      imagenUrl?: string;
    }> = [];

    combos
      .filter((c) => c.destacado && c.disponible !== false)
      .forEach((c) => {
        list.push({
          tipo: 'combo',
          item: c,
          id: c.id,
          nombre: c.nombre,
          descripcion: c.descripcion || 'Combo especial preparado al instante.',
          precio: c.precioEspecial,
          precioOriginal: c.precioTotal || Math.round(c.precioEspecial * 1.25),
          imagenUrl: c.imagenUrl,
        });
      });

    productos
      .filter((p) => p.destacado && p.disponible !== false)
      .forEach((p) => {
        list.push({
          tipo: 'producto',
          item: p,
          id: p.id,
          nombre: p.nombre,
          descripcion: p.descripcion || 'Plato artesanal con ingredientes frescos de la casa.',
          precio: p.precio,
          precioOriginal: Math.round(p.precio * 1.2),
          imagenUrl: p.imagenUrl,
        });
      });

    return list;
  }, [combos, productos]);

  const [destacadoIndex, setDestacadoIndex] = useState(0);
  const [pausarCarrusel, setPausarCarrusel] = useState(false);

  useEffect(() => {
    if (itemsDestacados.length > 0 && destacadoIndex >= itemsDestacados.length) {
      setDestacadoIndex(0);
    }
  }, [itemsDestacados.length, destacadoIndex]);

  useEffect(() => {
    if (itemsDestacados.length <= 1 || pausarCarrusel) return;
    const interval = setInterval(() => {
      setDestacadoIndex((prev) => (prev + 1) % itemsDestacados.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [itemsDestacados.length, pausarCarrusel]);

  const itemActivoDestacado = itemsDestacados[destacadoIndex] || null;

  // Manejo de Auth
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorAuth('');
    setCargandoAuth(true);

    try {
      if (!auth) throw new Error('Firebase Auth no disponible');

      if (modoAuth === 'registro') {
        await createUserWithEmailAndPassword(auth, emailAuth, passwordAuth);
        if (nombreAuth) {
          setNombreCliente(nombreAuth);
        }
        createToast('🎉 ¡Cuenta creada con éxito!', 'success');
      } else {
        await signInWithEmailAndPassword(auth, emailAuth, passwordAuth);
        createToast('✅ Sesión iniciada', 'success');
      }
      setModalAuthAbierto(false);
      setEmailAuth('');
      setPasswordAuth('');
      setNombreAuth('');
    } catch (err: any) {
      console.error('Error auth:', err);
      setErrorAuth(err.message || 'Error al procesar autenticación');
    } finally {
      setCargandoAuth(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorAuth('');
    setCargandoAuth(true);
    try {
      if (!auth) throw new Error('Firebase Auth no disponible');
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user?.displayName) {
        setNombreCliente(result.user.displayName);
      }
      createToast(`🎉 ¡Bienvenido, ${result.user.displayName || 'Cliente'}!`, 'success');
      setModalAuthAbierto(false);
    } catch (err: any) {
      console.error('Error Google Sign-In:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorAuth(err.message || 'Error al iniciar sesión con Google');
      }
    } finally {
      setCargandoAuth(false);
    }
  };

  const handleCerrarSesion = async () => {
    if (auth) {
      await signOut(auth);
      createToast('Sesión cerrada', 'success');
    }
  };

  // Confirmar Pedido
  const handleConfirmarPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (carrito.length === 0) return;

    if (!nombreCliente.trim() || !telefonoCliente.trim() || !direccionCliente.trim() || !barrioCliente.trim()) {
      createToast('Por favor completa todos los campos de entrega', 'error');
      return;
    }

    setCargandoPedido(true);
    try {
      const nuevoDomicilio = {
        clienteNombre: nombreCliente.trim(),
        clienteTelefono: telefonoCliente.trim(),
        direccion: `${direccionCliente.trim()} ${notasCliente ? `(${notasCliente.trim()})` : ''}`,
        barrio: barrioCliente.trim(),
        items: carrito,
        total: totalCarrito,
        metodoPago,
        origen: 'web' as const,
        estado: 'pendiente' as const,
        jornada,
        notas: notasCliente.trim(),
        pagaCon: metodoPago === 'efectivo' && pagaConCuanto ? Number(pagaConCuanto) * 1000 : null,
        creadoEn: Timestamp.now(),
        actualizadoEn: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'domicilios'), nuevoDomicilio);
      const codigoOrden = 'LP-' + docRef.id.slice(-5).toUpperCase();

      setPedidoExitoso({
        id: codigoOrden,
        total: totalCarrito,
      });

      setCarrito([]);
      setModalCheckoutAbierto(false);
      setCarritoAbierto(false);
      createToast('🎉 ¡Tu pedido ha sido recibido en cocina!', 'success');
    } catch (error) {
      console.error('Error enviando pedido:', error);
      createToast('Error al enviar el pedido. Por favor intenta de nuevo.', 'error');
    } finally {
      setCargandoPedido(false);
    }
  };

  return (
    <div className="min-h-screen bg-restaurant-theme text-neutral-100 font-sans selection:bg-amber-500 selection:text-black relative overflow-x-hidden">
      {/* 0. Ticker de Estado del Local & Despachos */}
      <div className="bg-neutral-950 border-b border-amber-500/20 py-2 px-4 text-xs text-neutral-300 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-white">Cocina Abierta</span>
          <span className="text-neutral-500 hidden sm:inline">•</span>
          <span className="text-neutral-400 hidden sm:inline">Despachando a domicilio en 25-35 min</span>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-neutral-400">
          <span className="hidden md:flex items-center gap-1">
            <MapPin size={12} className="text-amber-400" />
            <span>Punto físico & Domicilios</span>
          </span>
          <a
            href="https://wa.me/573001234567?text=Hola%20La%20Parada,%20quiero%20hacer%20un%20pedido"
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 transition-colors"
          >
            <Phone size={12} />
            <span>WhatsApp Directo</span>
          </a>
        </div>
      </div>

      {/* 1. Header Principal */}
      <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
          {/* Logo y Marca */}
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/Logo.jpg"
              alt="La Parada"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border border-amber-500/40 object-cover shadow-lg group-hover:border-amber-400 transition-all"
            />
            <div>
              <span className="font-display font-black text-xl sm:text-2xl text-white tracking-wide uppercase leading-none block">
                La Parada
              </span>
              <span className="text-[10px] sm:text-xs text-amber-400 font-medium tracking-wider uppercase">
                Comida Rápida & Tradición
              </span>
            </div>
          </Link>

          {/* Selector de Turno + Auth + Carrito */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Selector Mañana / Noche */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-1 flex text-xs">
              <button
                onClick={() => setJornada('mañana')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  jornada === 'mañana'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                ☀️ <span className="hidden sm:inline">Mañana</span>
              </button>
              <button
                onClick={() => setJornada('noche')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  jornada === 'noche'
                    ? 'bg-amber-500 text-neutral-950 shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                🌙 <span className="hidden sm:inline">Noche</span>
              </button>
            </div>

            {/* Auth Button */}
            {clienteUser ? (
              <div className="flex items-center gap-2 bg-neutral-900 px-3 py-1.5 rounded-xl border border-neutral-800 text-xs">
                <span className="font-semibold text-neutral-200">
                  {clienteUser.displayName || clienteUser.email?.split('@')[0]}
                </span>
                <button
                  onClick={handleCerrarSesion}
                  title="Cerrar sesión"
                  className="text-neutral-400 hover:text-red-400 transition-colors"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setModalAuthAbierto(true)}
                className="px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <User size={14} className="text-amber-400" />
                <span className="hidden sm:inline">Ingresar</span>
              </button>
            )}

            {/* Botón Carrito */}
            <button
              onClick={() => setCarritoAbierto(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
            >
              <ShoppingCart size={17} />
              <span className="hidden sm:inline">Ver Pedido</span>
              {totalItemsCarrito > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-neutral-950 text-amber-400 text-xs font-black">
                  {totalItemsCarrito}
                </span>
              )}
            </button>

            {/* Acceso Staff */}
            <Link
              to="/admin"
              className="text-xs text-neutral-500 hover:text-amber-400 transition-colors hidden lg:inline-block border-l border-neutral-800 pl-3"
            >
              Staff
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Gastronómico */}
      <section className="relative py-10 sm:py-16 px-4 sm:px-6 lg:px-8 border-b border-neutral-800/80">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Columna Izquierda: Copy Directo y Búsqueda */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Flame size={14} className="text-amber-400" />
              <span>
                {jornada === 'mañana'
                  ? 'Desayunos tradicionales, arepas rellenas y caldos caseros'
                  : 'Carne 100% de res a la parrilla, tocineta crujiente y pan brioche'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-black tracking-tight text-white leading-tight">
              Sabor auténtico a la parrilla, <br className="hidden sm:inline" />
              <span className="text-amber-400">listo en tu mesa.</span>
            </h1>

            <p className="text-sm sm:text-base text-neutral-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
              Preparado al instante con ingredientes frescos y salsas artesanales de la casa. Pide online en menos de 1 minuto y recíbelo bien caliente.
            </p>

            {/* Buscador de Platos */}
            <div className="relative max-w-lg mx-auto lg:mx-0">
              <Search className="absolute left-4 top-3.5 text-neutral-400" size={18} />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Busca tu plato favorito (ej: Hamburguesa, Salchipapa, Tequeño...)"
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:outline-none focus:border-amber-500 shadow-xl transition-all"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  className="absolute right-3.5 top-3.5 text-neutral-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {/* Badges de Confianza */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-4 text-xs text-neutral-300 pt-2">
              <span className="flex items-center gap-1.5 bg-neutral-900/80 px-3 py-1.5 rounded-xl border border-neutral-800">
                <Flame size={14} className="text-amber-400" /> Preparación al Instante
              </span>
              <span className="flex items-center gap-1.5 bg-neutral-900/80 px-3 py-1.5 rounded-xl border border-neutral-800">
                <Truck size={14} className="text-emerald-400" /> Domicilios Rápidos
              </span>
              <span className="flex items-center gap-1.5 bg-neutral-900/80 px-3 py-1.5 rounded-xl border border-neutral-800">
                <CreditCard size={14} className="text-sky-400" /> Nequi, Daviplata o Efectivo
              </span>
            </div>
          </div>

          {/* Columna Derecha: Showcase del Plato / Combo Estrella */}
          {itemsDestacados.length > 0 && itemActivoDestacado && (
            <div
              className="lg:col-span-5 flex justify-center"
              onMouseEnter={() => setPausarCarrusel(true)}
              onMouseLeave={() => setPausarCarrusel(false)}
            >
              <div className="relative w-full max-w-sm bg-neutral-900 rounded-3xl border border-amber-500/30 overflow-hidden shadow-2xl transition-all duration-300">
                {/* Imagen del Plato Estrella */}
                <div className="relative h-56 bg-neutral-950 overflow-hidden group">
                  {itemActivoDestacado.imagenUrl ? (
                    <img
                      src={itemActivoDestacado.imagenUrl}
                      alt={itemActivoDestacado.nombre}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-neutral-900 to-neutral-950 p-6 text-center">
                      <UtensilsCrossed size={48} className="text-amber-400/50 mb-2" />
                      <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                        Especialidad de la Casa
                      </span>
                    </div>
                  )}

                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-neutral-950 font-black text-xs shadow-md">
                      RECOMENDADO
                    </span>
                  </div>

                  {itemsDestacados.length > 1 && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 text-xs">
                      <button
                        onClick={() =>
                          setDestacadoIndex(
                            (prev) => (prev - 1 + itemsDestacados.length) % itemsDestacados.length
                          )
                        }
                        className="text-neutral-400 hover:text-white p-0.5"
                      >
                        <ChevronLeft size={14} />
                      </button>
                      <span className="font-bold text-amber-400">
                        {destacadoIndex + 1}/{itemsDestacados.length}
                      </span>
                      <button
                        onClick={() =>
                          setDestacadoIndex((prev) => (prev + 1) % itemsDestacados.length)
                        }
                        className="text-neutral-400 hover:text-white p-0.5"
                      >
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Info del Plato */}
                <div className="p-5 space-y-3">
                  <div>
                    <h3 className="font-display font-black text-xl text-white">
                      {itemActivoDestacado.nombre}
                    </h3>
                    <p className="text-xs text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                      {itemActivoDestacado.descripcion}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
                    <div>
                      {itemActivoDestacado.precioOriginal &&
                        itemActivoDestacado.precioOriginal > itemActivoDestacado.precio && (
                          <span className="text-[11px] text-neutral-500 line-through block">
                            {formatCOP(itemActivoDestacado.precioOriginal)}
                          </span>
                        )}
                      <span className="text-2xl font-black text-amber-400 font-display">
                        {formatCOP(itemActivoDestacado.precio)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        agregarAlCarrito(itemActivoDestacado.tipo, itemActivoDestacado.item)
                      }
                      className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                    >
                      <Plus size={16} />
                      <span>Pedir Ahora</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. Barra de Categorías Estilo Pills */}
      <section className="sticky top-16 sm:top-20 z-30 bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 min-w-max">
            {categoriasDisponibles.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoriaActiva(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  categoriaActiva === cat.id
                    ? 'bg-amber-500 text-neutral-950 shadow-md scale-[1.02]'
                    : 'bg-neutral-900 text-neutral-300 hover:text-white border border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <span>{cat.label}</span>
                {cat.count !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      categoriaActiva === cat.id
                        ? 'bg-neutral-950 text-amber-400'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {cat.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          <span className="text-xs text-neutral-400 hidden lg:inline font-medium min-w-max">
            Menú:{' '}
            <strong className="text-amber-400">
              {jornada === 'mañana' ? 'Mañana / Tarde' : 'Noche'}
            </strong>
          </span>
        </div>
      </section>

      {/* 4. Menú Principal de Productos y Combos */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Combos Destacados */}
        {(categoriaActiva === 'todos' || categoriaActiva === 'combos') && combos.length > 0 && !busqueda && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame size={22} className="text-amber-400" />
                <h2 className="text-xl font-black text-white font-display">
                  Combos de la Casa
                </h2>
              </div>
              <span className="text-xs text-neutral-400 hidden sm:inline">
                Ahorra más pidiendo en combo
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {combos.map((combo) => (
                <div
                  key={combo.id}
                  className="bg-neutral-900 rounded-3xl border border-neutral-800 hover:border-amber-500/50 p-5 shadow-lg transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {/* Imagen o Placeholder del Combo */}
                    {combo.imagenUrl ? (
                      <div className="h-44 rounded-2xl overflow-hidden mb-4 bg-neutral-950">
                        <img
                          src={combo.imagenUrl}
                          alt={combo.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <div className="h-28 rounded-2xl bg-neutral-950 border border-neutral-800/80 flex items-center justify-center mb-4">
                        <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
                          Combo Especial La Parada
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-base text-white group-hover:text-amber-400 transition-colors">
                        {combo.nombre}
                      </h3>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                        COMBO
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-neutral-300 leading-relaxed line-clamp-2">
                      {combo.descripcion || 'Combinación perfecta de nuestros mejores platos.'}
                    </p>

                    {combo.items && combo.items.length > 0 && (
                      <div className="mt-3 p-3 bg-neutral-950 rounded-2xl border border-neutral-800 text-xs text-neutral-300 space-y-1">
                        {combo.items.map((it, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <CheckCircle2 size={13} className="text-amber-400 shrink-0" />
                            <span>
                              {it.cantidad}x {it.nombreSnapshot}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">
                        Precio
                      </span>
                      <span className="text-xl font-black text-amber-400 font-display">
                        {formatCOP(combo.precioEspecial)}
                      </span>
                    </div>

                    <button
                      onClick={() => agregarAlCarrito('combo', combo)}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                    >
                      <Plus size={15} />
                      <span>Agregar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Platos Individuales */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UtensilsCrossed size={20} className="text-amber-400" />
              <h2 className="text-xl font-black text-white font-display">
                {categoriaActiva === 'combos' ? 'Combos Disponibles' : 'Platos & Especialidades'}
              </h2>
            </div>
            <span className="text-xs text-neutral-400">
              {productosFiltrados.length} opciones disponibles
            </span>
          </div>

          {loadingMenu ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="h-56 bg-neutral-900/60 rounded-3xl animate-pulse border border-neutral-800"
                />
              ))}
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 bg-neutral-900 rounded-3xl border border-neutral-800 space-y-2">
              <Search size={32} className="mx-auto text-neutral-500" />
              <p className="font-semibold text-white text-sm">No encontramos platos con ese criterio</p>
              <p className="text-xs">Prueba con otra palabra o selecciona otra categoría.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
              {productosFiltrados.map((producto) => {
                const catTag = getCategoryTag(producto.nombre);
                const imagenAMostrar =
                  producto.imagenUrl ||
                  categoriasDB.find(
                    (c) => c.nombre.toLowerCase().trim() === producto.categoria?.toLowerCase().trim()
                  )?.imagenUrl;

                return (
                  <div
                    key={producto.id}
                    className="bg-neutral-900 rounded-2xl sm:rounded-3xl border border-neutral-800 hover:border-amber-500/40 p-3 sm:p-4 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
                  >
                    <div>
                      {/* Imagen Real, Fondo de Categoría o Placeholder Gastronómico Elegante */}
                      {imagenAMostrar ? (
                        <div className="h-32 sm:h-36 rounded-xl sm:rounded-2xl overflow-hidden mb-3 bg-neutral-950">
                          <img
                            src={imagenAMostrar}
                            alt={producto.nombre}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="h-24 sm:h-28 rounded-xl sm:rounded-2xl bg-neutral-950 border border-neutral-800/80 flex flex-col items-center justify-center p-2 mb-3 text-center">
                          <span
                            className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded border font-bold ${catTag.tagColor}`}
                          >
                            {catTag.label}
                          </span>
                          <span className="text-[10px] text-neutral-500 mt-1 font-medium">
                            La Parada
                          </span>
                        </div>
                      )}

                      <h3 className="font-bold text-xs sm:text-sm text-white line-clamp-2 group-hover:text-amber-400 transition-colors">
                        {producto.nombre}
                      </h3>
                      {producto.descripcion && (
                        <p className="mt-1 text-[11px] text-neutral-400 line-clamp-2 leading-tight">
                          {producto.descripcion}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-neutral-800 flex items-center justify-between">
                      <span className="text-xs sm:text-sm font-black text-amber-400 font-display">
                        {formatCOP(producto.precio)}
                      </span>

                      <button
                        onClick={() => agregarAlCarrito('producto', producto)}
                        className="p-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                        title="Agregar al pedido"
                      >
                        <Plus size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 5. Sección de Confianza: Horarios, Cobertura y Métodos de Pago Reales */}
        <section className="mt-16 bg-neutral-900/90 rounded-3xl border border-neutral-800 p-6 sm:p-8 shadow-2xl">
          <div className="max-w-3xl mx-auto text-center space-y-2 mb-8">
            <h3 className="text-2xl sm:text-3xl font-display font-black text-white">
              Punto de Venta & Cobertura de Domicilios
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400">
              Disfruta de la mejor comida rápida en nuestro punto físico o en la comodidad de tu casa.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Tarjeta 1: Horarios */}
            <div className="p-5 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Clock size={20} />
              </div>
              <h4 className="font-bold text-sm text-white">Horarios de Atención</h4>
              <ul className="text-xs text-neutral-300 space-y-1.5">
                <li className="flex justify-between">
                  <span className="text-neutral-400">Jornada Mañana:</span>
                  <span className="font-semibold text-white">7:00 AM – 1:00 PM</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-neutral-400">Jornada Noche:</span>
                  <span className="font-semibold text-white">6:00 PM – 11:30 PM</span>
                </li>
                <li className="text-[11px] text-emerald-400 pt-1">
                  Abierto de Lunes a Domingo
                </li>
              </ul>
            </div>

            {/* Tarjeta 2: Tiempos & Cobertura */}
            <div className="p-5 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Truck size={20} />
              </div>
              <h4 className="font-bold text-sm text-white">Tiempos & Entrega</h4>
              <ul className="text-xs text-neutral-300 space-y-1.5">
                <li className="flex justify-between">
                  <span className="text-neutral-400">Tiempo promedio:</span>
                  <span className="font-semibold text-emerald-400">25 a 35 minutos</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-neutral-400">Empaque:</span>
                  <span className="font-semibold text-white">Térmico & Sellado</span>
                </li>
                <li className="text-[11px] text-neutral-400 pt-1">
                  Cobertura en todo el perímetro urbano.
                </li>
              </ul>
            </div>

            {/* Tarjeta 3: Métodos de Pago */}
            <div className="p-5 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <ShieldCheck size={20} />
              </div>
              <h4 className="font-bold text-sm text-white">Medios de Pago</h4>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[11px] font-bold">
                  Nequi
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-[11px] font-bold">
                  Daviplata
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 text-[11px] font-bold">
                  Bancolombia
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                  Efectivo
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-300 text-[11px] font-bold">
                  Datáfono
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 6. Barra Flotante de Carrito en Móvil */}
      {totalItemsCarrito > 0 && !carritoAbierto && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto animate-in slide-in-from-bottom duration-300">
          <button
            onClick={() => setCarritoAbierto(true)}
            className="w-full p-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-sm flex items-center justify-between shadow-2xl shadow-amber-500/30 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-neutral-950 text-amber-400 text-xs font-black">
                {totalItemsCarrito}
              </span>
              <span>Ver mi pedido</span>
            </div>
            <div className="flex items-center gap-1 font-display font-black text-base">
              <span>{formatCOP(totalCarrito)}</span>
              <ArrowRight size={18} />
            </div>
          </button>
        </div>
      )}

      {/* 7. Botón Flotante de WhatsApp */}
      <a
        href="https://wa.me/573001234567?text=Hola%20La%20Parada,%20quiero%20hacer%20un%20pedido%20o%20tengo%20una%20pregunta"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 right-4 z-40 p-3.5 rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer group"
        title="Chatea con nosotros por WhatsApp"
      >
        <MessageCircle size={24} />
      </a>

      {/* 8. Drawer de Carrito */}
      {carritoAbierto && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-neutral-950 border-l border-neutral-800 h-full flex flex-col justify-between p-5 shadow-2xl animate-in slide-in-from-right duration-200">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                    <ShoppingCart size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white font-display text-base">Tu Pedido</h3>
                    <p className="text-xs text-neutral-400">
                      {totalItemsCarrito} items seleccionados
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCarritoAbierto(false)}
                  className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-900 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Lista */}
              <div className="mt-4 space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {carrito.length === 0 ? (
                  <div className="text-center py-16 text-neutral-500 text-xs space-y-2">
                    <ShoppingCart size={36} className="mx-auto text-neutral-600 mb-2" />
                    <p className="font-semibold text-white">Tu canasta está vacía</p>
                    <p className="text-neutral-400">Agrega tus platos favoritos del menú.</p>
                  </div>
                ) : (
                  carrito.map((item) => (
                    <div
                      key={item.referenciaId}
                      className="p-3 bg-neutral-900 rounded-2xl border border-neutral-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-white truncate">{item.nombre}</p>
                        <p className="text-[11px] text-amber-400 font-bold mt-0.5">
                          {formatCOP(item.precioUnitario)} c/u
                        </p>
                      </div>

                      {/* Controles de cantidad */}
                      <div className="flex items-center gap-2 bg-neutral-950 rounded-xl border border-neutral-800 p-1">
                        <button
                          onClick={() => modificarCantidadCarrito(item.referenciaId, -1)}
                          className="p-1 text-neutral-400 hover:text-white"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-bold text-white px-1">{item.cantidad}</span>
                        <button
                          onClick={() => modificarCantidadCarrito(item.referenciaId, 1)}
                          className="p-1 text-neutral-400 hover:text-white"
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <button
                        onClick={() => eliminarDelCarrito(item.referenciaId)}
                        className="text-neutral-500 hover:text-red-400 p-1.5 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer Carrito */}
            {carrito.length > 0 && (
              <div className="border-t border-neutral-800 pt-4 space-y-3">
                <div className="space-y-1.5 text-xs text-neutral-400 bg-neutral-900 p-3 rounded-2xl border border-neutral-800">
                  <div className="flex justify-between">
                    <span>Subtotal de productos:</span>
                    <span className="font-semibold text-white">{formatCOP(totalCarrito)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Entrega a Domicilio:</span>
                    <span className="text-emerald-400 font-semibold">Tarifa Estándar</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-neutral-800">
                    <span>Total a Pagar:</span>
                    <span className="text-amber-400 font-display text-lg">
                      {formatCOP(totalCarrito)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setModalCheckoutAbierto(true)}
                  className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all cursor-pointer"
                >
                  <span>Continuar con los Datos de Entrega</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. Modal de Checkout */}
      {modalCheckoutAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-white font-display text-base flex items-center gap-2">
                <MapPin size={18} className="text-amber-400" />
                Datos de Entrega
              </h3>
              <button
                onClick={() => setModalCheckoutAbierto(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmarPedido} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Tu Nombre Completo"
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  placeholder="Ej: Laura Gómez"
                  required
                />
                <Input
                  label="Teléfono WhatsApp"
                  value={telefonoCliente}
                  onChange={(e) => setTelefonoCliente(e.target.value)}
                  placeholder="Ej: 3001234567"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Dirección de Entrega"
                  value={direccionCliente}
                  onChange={(e) => setDireccionCliente(e.target.value)}
                  placeholder="Ej: Calle 45 # 12-34"
                  required
                />
                <Input
                  label="Barrio"
                  value={barrioCliente}
                  onChange={(e) => setBarrioCliente(e.target.value)}
                  placeholder="Ej: Centro / Floresta"
                  required
                />
              </div>

              <Input
                label="Instrucciones para el domiciliario (Opcional)"
                value={notasCliente}
                onChange={(e) => setNotasCliente(e.target.value)}
                placeholder="Ej: Apto 302, timbre blanco, sin cebolla"
              />

              {/* Selector de Método de Pago */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-neutral-300">
                  Método de Pago Preferido
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMetodoPago('efectivo')}
                    className={`p-2.5 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      metodoPago === 'efectivo'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Banknote size={16} />
                    <span>Efectivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetodoPago('transferencia')}
                    className={`p-2.5 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      metodoPago === 'transferencia'
                        ? 'bg-purple-500/20 border-purple-400 text-purple-300 font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Send size={16} />
                    <span>Nequi / Davi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetodoPago('domicilio')}
                    className={`p-2.5 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      metodoPago === 'domicilio'
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <CreditCard size={16} />
                    <span>Datáfono</span>
                  </button>
                </div>
              </div>

              {metodoPago === 'efectivo' && (
                <Input
                  label="¿Con cuánto pagas? (Para llevarte el cambio exacto)"
                  type="number"
                  value={pagaConCuanto}
                  onChange={(e) => setPagaConCuanto(e.target.value)}
                  placeholder="Ej: 50 (= $50.000 COP)"
                />
              )}

              {metodoPago === 'transferencia' && (
                <div className="p-3.5 bg-neutral-950 rounded-2xl border border-purple-500/30 text-xs space-y-1 text-neutral-300">
                  <p className="font-bold text-white flex items-center gap-1">
                    📲 Datos para Transferencia:
                  </p>
                  <p>
                    • <strong>Nequi / Daviplata:</strong> 300 123 4567
                  </p>
                  <p>
                    • <strong>Bancolombia Ahorros:</strong> 123-456789-00
                  </p>
                  <p className="text-[11px] text-neutral-400 pt-1">
                    Muestra el comprobante al domiciliario cuando recibas tu orden.
                  </p>
                </div>
              )}

              <div className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800 flex justify-between items-center text-sm font-bold text-white">
                <span>Total a Pagar:</span>
                <span className="text-amber-400 text-xl font-display font-black">
                  {formatCOP(totalCarrito)}
                </span>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setModalCheckoutAbierto(false)}
                  className="flex-1 text-xs"
                >
                  Volver
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={cargandoPedido}
                  disabled={cargandoPedido}
                  className="flex-1 text-xs font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400"
                >
                  Confirmar y Enviar a Cocina
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. Modal de Pedido Exitoso */}
      {pedidoExitoso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 size={36} />
            </div>
            <h3 className="text-2xl font-black font-display text-white">¡Pedido Confirmado!</h3>
            <p className="text-xs text-neutral-300">
              Tu pedido ha ingresado a la cocina de <strong>La Parada</strong> y ya está en preparación.
            </p>

            <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">
                Código de Orden
              </span>
              <span className="text-2xl font-black font-mono text-amber-400">
                {pedidoExitoso.id}
              </span>
              <p className="text-xs text-neutral-400 mt-1">
                Total: <strong>{formatCOP(pedidoExitoso.total)}</strong>
              </p>
            </div>

            <Button
              fullWidth
              variant="primary"
              onClick={() => setPedidoExitoso(null)}
              className="text-xs font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              Hacer otro pedido
            </Button>
          </div>
        </div>
      )}

      {/* 11. Modal de Auth */}
      {modalAuthAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-white font-display text-base flex items-center gap-2">
                <User size={18} className="text-amber-400" />
                {modoAuth === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </h3>
              <button
                onClick={() => setModalAuthAbierto(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {modoAuth === 'registro' && (
                <Input
                  label="Nombre Completo"
                  value={nombreAuth}
                  onChange={(e) => setNombreAuth(e.target.value)}
                  placeholder="Tu nombre"
                  required
                />
              )}

              <Input
                label="Correo Electrónico"
                type="email"
                value={emailAuth}
                onChange={(e) => setEmailAuth(e.target.value)}
                placeholder="tu@email.com"
                required
              />

              <Input
                label="Contraseña"
                type="password"
                value={passwordAuth}
                onChange={(e) => setPasswordAuth(e.target.value)}
                placeholder="••••••••"
                required
              />

              {errorAuth && (
                <p className="text-xs text-red-400 p-2.5 bg-red-950/40 rounded-xl border border-red-900/50">
                  {errorAuth}
                </p>
              )}

              <Button
                type="submit"
                fullWidth
                variant="primary"
                loading={cargandoAuth}
                disabled={cargandoAuth}
                className="text-xs font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                {modoAuth === 'login' ? 'Iniciar Sesión' : 'Registrarme'}
              </Button>
            </form>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-neutral-800"></div>
              <span className="flex-shrink mx-3 text-[11px] text-neutral-500 uppercase tracking-wider font-semibold">
                o también
              </span>
              <div className="flex-grow border-t border-neutral-800"></div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={cargandoAuth}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-white text-xs font-semibold transition-all shadow-md active:scale-[0.99] cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continuar con Google</span>
            </button>

            <div className="text-center pt-2 border-t border-neutral-800">
              {modoAuth === 'login' ? (
                <p className="text-xs text-neutral-400">
                  ¿No tienes cuenta aún?{' '}
                  <button
                    onClick={() => setModoAuth('registro')}
                    className="text-amber-400 font-semibold hover:underline"
                  >
                    Crear una cuenta
                  </button>
                </p>
              ) : (
                <p className="text-xs text-neutral-400">
                  ¿Ya tienes cuenta?{' '}
                  <button
                    onClick={() => setModoAuth('login')}
                    className="text-amber-400 font-semibold hover:underline"
                  >
                    Iniciar sesión
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 12. Footer */}
      <footer className="border-t border-neutral-800 bg-neutral-950 py-10 mt-16 text-center text-xs text-neutral-500 space-y-3">
        <div className="flex justify-center items-center gap-2.5">
          <img
            src="/Logo.jpg"
            alt="La Parada"
            className="w-7 h-7 rounded-full border border-amber-500/40 object-cover"
          />
          <span className="font-display font-black text-amber-400 text-sm">La Parada</span>
          <span>•</span>
          <span className="text-neutral-400">Sabores que te acompañan © 2026</span>
        </div>
        <p className="max-w-md mx-auto text-neutral-500 text-[11px]">
          Comida rápida artesanal & tradicional. Domicilios en toda la ciudad.
        </p>
      </footer>
    </div>
  );
}

export default LandingTiendaPage;
