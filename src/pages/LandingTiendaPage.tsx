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
  Sparkles,
  ChefHat,
  Sun,
  Moon,
  ArrowRight,
  Banknote,
  Send,
  Flame,
  Search,
  MessageCircle,
  Star,
  Truck,
  CreditCard,
  ChevronLeft,
  ChevronRight,
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
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { createToast } from '@/components/ui/Toast';

// Helper para asignar emoji sugerente a productos
function getFoodEmoji(nombre: string): string {
  const n = nombre.toLowerCase();
  if (n.includes('hamburguesa') || n.includes('burger')) return '🍔';
  if (n.includes('perro') || n.includes('hot dog') || n.includes('salchipapa')) return '🌭';
  if (n.includes('papa') || n.includes('frita') || n.includes('nugget')) return '🍟';
  if (n.includes('combo') || n.includes('parada') || n.includes('familiar')) return '🔥';
  if (n.includes('jugo') || n.includes('gaseosa') || n.includes('coca') || n.includes('bebida')) return '🥤';
  if (n.includes('arepa') || n.includes('huevo') || n.includes('desayuno') || n.includes('cafe')) return '🍳';
  if (n.includes('sandwich') || n.includes('sanduche')) return '🥪';
  if (n.includes('pollo') || n.includes('alitas') || n.includes('crispy')) return '🍗';
  if (n.includes('carne') || n.includes('parrillada') || n.includes('churrasco')) return '🥩';
  return '🍽️';
}

export function LandingTiendaPage() {
  // Estados de Catálogo
  const [jornada, setJornada] = useState<Jornada>('noche');
  const [categoriaActiva, setCategoriaActiva] = useState<'todos' | 'combos' | 'hamburguesas' | 'perros' | 'bebidas' | 'otros'>('todos');
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

  // Filtrado reactivo de productos según categoría y búsqueda
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const matchBusqueda =
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.descripcion && p.descripcion.toLowerCase().includes(busqueda.toLowerCase()));

      if (!matchBusqueda) return false;

      if (categoriaActiva === 'todos' || categoriaActiva === 'combos') return true;
      const n = p.nombre.toLowerCase();
      if (categoriaActiva === 'hamburguesas') return n.includes('hamburguesa') || n.includes('burger');
      if (categoriaActiva === 'perros') return n.includes('perro') || n.includes('hot dog') || n.includes('salchipapa');
      if (categoriaActiva === 'bebidas') return n.includes('jugo') || n.includes('gaseosa') || n.includes('bebida') || n.includes('coca');
      if (categoriaActiva === 'otros') return !n.includes('hamburguesa') && !n.includes('perro') && !n.includes('jugo');
      return true;
    });
  }, [productos, busqueda, categoriaActiva]);

  // Lista de items destacados seleccionados por el administrador desde el panel de productos (con corazón)
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
          descripcion: c.descripcion || 'Combo especial seleccionado por la casa.',
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
          descripcion: p.descripcion || 'Plato artesanal preparado al instante.',
          precio: p.precio,
          precioOriginal: Math.round(p.precio * 1.2),
          imagenUrl: p.imagenUrl,
        });
      });

    return list;
  }, [combos, productos]);

  // Estado del carrusel de destacados
  const [destacadoIndex, setDestacadoIndex] = useState(0);
  const [pausarCarrusel, setPausarCarrusel] = useState(false);

  // Asegurar que el índice esté dentro del rango
  useEffect(() => {
    if (itemsDestacados.length > 0 && destacadoIndex >= itemsDestacados.length) {
      setDestacadoIndex(0);
    }
  }, [itemsDestacados.length, destacadoIndex]);

  // Auto-rotación del carrusel cada 4.5 segundos si hay más de 1 destacado
  useEffect(() => {
    if (itemsDestacados.length <= 1 || pausarCarrusel) return;
    const interval = setInterval(() => {
      setDestacadoIndex((prev) => (prev + 1) % itemsDestacados.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [itemsDestacados.length, pausarCarrusel]);

  const itemActivoDestacado = itemsDestacados[destacadoIndex] || null;

  // Manejo de Firebase Auth
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
      if (err?.code === 'auth/unauthorized-domain') {
        const dom = window.location.hostname;
        setErrorAuth(
          `⚠️ El dominio "${dom}" debe ser agregado en Firebase Console → Authentication → Settings → Authorized domains para habilitar el inicio con Google.`
        );
        createToast('Dominio no autorizado en Firebase', 'error');
      } else if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorAuth(err.message || 'Error al iniciar sesión con Google');
        createToast('Error al iniciar sesión con Google', 'error');
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

  // Enviar Pedido a Firestore
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

      // Limpiar carrito y modales
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
    <div className="min-h-screen bg-restaurant-theme text-white font-sans selection:bg-amber-500 selection:text-black relative overflow-x-hidden">
      {/* Luces ambientales y destellos de fondo tipo parrilla / fast-food */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute top-1/3 right-10 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-10 w-80 h-80 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* 0. Ticker de Promociones y Horarios en Vivo */}
      <div className="bg-gradient-to-r from-amber-950/80 via-red-950/70 to-amber-950/80 border-b border-amber-500/20 py-1.5 px-4 text-center text-[11px] font-semibold text-amber-300 flex items-center justify-center gap-3 overflow-hidden">
        <span className="flex items-center gap-1 text-gold-400">
          <Flame size={13} className="text-red-500 animate-bounce" />
          <strong>¡PROMO DEL DÍA!</strong> Domicilio GRATIS en órdenes desde $35.000 COP
        </span>
        <span className="hidden md:inline text-amber-500/60">•</span>
        <span className="hidden md:inline text-neutral-300">
          ⚡ Tiempo promedio de entrega: <strong>25 a 35 min</strong>
        </span>
        <span className="hidden lg:inline text-amber-500/60">•</span>
        <span className="hidden lg:inline text-emerald-400">
          🟢 Cocina Abierta y Recibiendo Pedidos
        </span>
      </div>

      {/* 1. Header de la Tienda con Glassmorphism */}
      <header className="sticky top-0 z-40 bg-neutral-950/85 backdrop-blur-md border-b border-amber-500/20 shadow-lg shadow-black/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo y Marca Oficial con Acabado Premium */}
          <Link to="/" className="flex items-center gap-3.5 group">
            <div className="relative">
              <img
                src="/Logo.jpg"
                alt="Logo La Parada"
                className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-amber-500/50 shadow-md shadow-amber-500/20 object-cover group-hover:scale-105 group-hover:border-amber-400 transition-all duration-300 ring-2 ring-amber-500/20"
              />
            </div>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-lg sm:text-xl text-gold-400 tracking-wider group-hover:text-amber-300 transition-colors uppercase leading-none drop-shadow-sm">
                  La Parada
                </span>
                <span className="text-[9px] uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded-md font-extrabold hidden xs:inline-block">
                  Restaurante
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-neutral-400 font-medium tracking-wide mt-1 hidden sm:block">
                Sabores que te acompañan • Comida Rápida
              </p>
            </div>
          </Link>

          {/* Selector de Jornada & Carrito & Auth */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Selector Mañana / Noche */}
            <div className="flex bg-neutral-900/90 border border-amber-500/20 rounded-xl p-1 text-xs shadow-inner">
              <button
                onClick={() => setJornada('mañana')}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                  jornada === 'mañana'
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-neutral-950 font-bold shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Sun size={13} className={jornada === 'mañana' ? 'text-black' : 'text-amber-400'} />
                <span className="hidden sm:inline">Mañana/Tarde</span>
              </button>
              <button
                onClick={() => setJornada('noche')}
                className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                  jornada === 'noche'
                    ? 'bg-gradient-to-r from-red-600 to-amber-500 text-white font-bold shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Moon size={13} className={jornada === 'noche' ? 'text-amber-200' : 'text-blue-400'} />
                <span className="hidden sm:inline">Noche</span>
              </button>
            </div>

            {/* Auth Button */}
            {clienteUser ? (
              <div className="flex items-center gap-2 bg-neutral-900/80 px-2.5 py-1 rounded-xl border border-neutral-800">
                <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
                  {clienteUser.displayName ? clienteUser.displayName[0].toUpperCase() : 'U'}
                </div>
                <span className="hidden md:inline text-xs text-neutral-300 font-medium">
                  {clienteUser.displayName || clienteUser.email?.split('@')[0]}
                </span>
                <button
                  onClick={handleCerrarSesion}
                  title="Cerrar sesión"
                  className="p-1 text-neutral-400 hover:text-red-400 transition-colors ml-1"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setModalAuthAbierto(true)}
                className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
              >
                <User size={14} className="text-amber-400" />
                <span className="hidden sm:inline">Ingresar</span>
              </button>
            )}

            {/* Botón Carrito */}
            <button
              onClick={() => setCarritoAbierto(true)}
              className="relative px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-neutral-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ShoppingCart size={16} />
              <span className="hidden sm:inline">Mi Pedido</span>
              {totalItemsCarrito > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-neutral-950 text-amber-400 text-[11px] font-black animate-bounce">
                  {totalItemsCarrito}
                </span>
              )}
            </button>

            {/* Acceso Staff / Admin */}
            <Link
              to="/admin"
              className="text-[11px] text-neutral-500 hover:text-amber-400 transition-colors hidden lg:inline-block border-l border-neutral-800 pl-3"
            >
              Staff 🔐
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section con Fondo Llamativo y Efectos */}
      <section className="relative py-12 sm:py-16 px-4 sm:px-6 lg:px-8 border-b border-amber-500/15">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Columna Izquierda: Mensaje y CTA */}
          <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-red-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold shadow-md">
              <Sparkles size={14} className="text-amber-400 animate-spin" />
              {jornada === 'mañana'
                ? '🌅 Desayunos Tradicionales & Caldos Caseros'
                : '🔥 Hamburguesas Artesanales, Perros & Salchipapas'}
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-display font-black tracking-tight text-white leading-tight">
              El verdadero sabor que <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-amber-400 via-yellow-400 to-red-500 bg-clip-text text-transparent">
                te hace volver siempre
              </span>
            </h1>

            <p className="text-xs sm:text-base text-neutral-300 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Carne 100% artesanal, pan brioche recién horneado, quesos fundidos y salsas de la casa. Pide online en 1 minuto y recíbelo bien caliente en tu mesa.
            </p>

            {/* Buscador de Platos en Tiempo Real */}
            <div className="relative max-w-md mx-auto lg:mx-0 pt-2">
              <Search className="absolute left-3.5 top-5 text-amber-400" size={18} />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="¿Qué se te antoja hoy? Ej: Especial, Combo, Papas..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-neutral-900/90 border border-amber-500/30 text-white placeholder-neutral-500 text-xs sm:text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 shadow-xl transition-all"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  className="absolute right-3 top-5 text-neutral-400 hover:text-white p-0.5"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Badges de Garantía con Iconos */}
            <div className="pt-3 flex flex-wrap justify-center lg:justify-start gap-3 sm:gap-4 text-xs text-neutral-300">
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-900/70 border border-neutral-800">
                <ChefHat size={14} className="text-amber-400" /> 100% Fresco al Instante
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-900/70 border border-neutral-800">
                <Truck size={14} className="text-emerald-400" /> Domicilios Rápidos
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-900/70 border border-neutral-800">
                <Banknote size={14} className="text-sky-400" /> Efectivo o Nequi
              </span>
            </div>
          </div>

          {/* Columna Derecha: Tarjeta Visual Destacada (Solo si hay items marcados con ❤️ por el admin) */}
          {itemsDestacados.length > 0 && itemActivoDestacado && (
            <div 
              className="lg:col-span-5 flex justify-center"
              onMouseEnter={() => setPausarCarrusel(true)}
              onMouseLeave={() => setPausarCarrusel(false)}
            >
              <div className="relative w-full max-w-sm">
                {/* Tarjeta Visual de Promo con Transición */}
                <div className="relative bg-food-card rounded-3xl border border-amber-500/40 p-6 shadow-2xl space-y-4 transform hover:-translate-y-2 transition-all duration-300">
                  {/* Header de la tarjeta con Badge y Controles */}
                  <div className="flex justify-between items-center">
                    <Badge className="bg-red-500/20 text-red-400 border border-red-500/40 text-[11px] font-black flex items-center gap-1">
                      <Flame size={12} className="text-red-500 animate-bounce" />
                      DESTACADO DEL DÍA
                    </Badge>

                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-amber-400 font-bold">
                        <Star size={13} className="fill-amber-400" /> 4.9
                      </span>

                      {/* Flechas de navegación si hay más de 1 destacado */}
                      {itemsDestacados.length > 1 && (
                        <div className="flex items-center gap-1 bg-neutral-950/80 p-0.5 rounded-lg border border-neutral-800">
                          <button
                            type="button"
                            onClick={() =>
                              setDestacadoIndex(
                                (prev) => (prev - 1 + itemsDestacados.length) % itemsDestacados.length
                              )
                            }
                            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
                            title="Anterior destacado"
                          >
                            <ChevronLeft size={13} />
                          </button>
                          <span className="text-[10px] font-bold text-amber-400 px-0.5">
                            {destacadoIndex + 1}/{itemsDestacados.length}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setDestacadoIndex((prev) => (prev + 1) % itemsDestacados.length)
                            }
                            className="p-1 text-neutral-400 hover:text-white rounded hover:bg-neutral-800 transition-colors"
                            title="Siguiente destacado"
                          >
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contenido del Item Activo */}
                  <div className="py-3 text-center min-h-[160px] flex flex-col justify-center items-center">
                    {itemActivoDestacado.imagenUrl ? (
                      <img
                        src={itemActivoDestacado.imagenUrl}
                        alt={itemActivoDestacado.nombre}
                        className="w-24 h-24 rounded-2xl object-cover border border-amber-500/30 mb-2 shadow-md animate-float"
                      />
                    ) : (
                      <div className="text-6xl mb-2 animate-float">
                        {getFoodEmoji(itemActivoDestacado.nombre)}
                      </div>
                    )}

                    <h3 className="text-xl font-display font-black text-white line-clamp-1">
                      {itemActivoDestacado.nombre}
                    </h3>
                    <p className="text-xs text-neutral-300 mt-1 line-clamp-2 max-w-xs leading-relaxed">
                      {itemActivoDestacado.descripcion}
                    </p>
                  </div>

                  {/* Indicadores de Puntos (Dots) si hay más de 1 */}
                  {itemsDestacados.length > 1 && (
                    <div className="flex justify-center gap-1.5 py-1">
                      {itemsDestacados.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setDestacadoIndex(idx)}
                          className={`h-1.5 rounded-full transition-all ${
                            idx === destacadoIndex
                              ? 'w-6 bg-amber-400'
                              : 'w-1.5 bg-neutral-700 hover:bg-neutral-500'
                          }`}
                          title={`Ver destacado ${idx + 1}`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Footer con Precio y Botón de Pedido */}
                  <div className="pt-3 border-t border-amber-500/20 flex items-center justify-between">
                    <div>
                      {itemActivoDestacado.precioOriginal && itemActivoDestacado.precioOriginal > itemActivoDestacado.precio && (
                        <span className="text-[10px] text-neutral-500 line-through block">
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
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-neutral-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>Pedir Ahora</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 3. Barra de Categorías Interactivas con Emojis */}
      <section className="sticky top-16 z-30 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80 py-3 px-4 sm:px-6 lg:px-8 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setCategoriaActiva('todos')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                categoriaActiva === 'todos'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 shadow-lg shadow-amber-500/20 scale-105'
                  : 'bg-neutral-900/90 text-neutral-300 hover:text-white border border-neutral-800 hover:border-amber-500/30'
              }`}
            >
              🍽️ Todos ({productos.length + combos.length})
            </button>

            <button
              onClick={() => setCategoriaActiva('combos')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                categoriaActiva === 'combos'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 shadow-lg shadow-amber-500/20 scale-105'
                  : 'bg-neutral-900/90 text-neutral-300 hover:text-white border border-neutral-800 hover:border-amber-500/30'
              }`}
            >
              🔥 Combos Especiales ({combos.length})
            </button>

            <button
              onClick={() => setCategoriaActiva('hamburguesas')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                categoriaActiva === 'hamburguesas'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 shadow-lg shadow-amber-500/20 scale-105'
                  : 'bg-neutral-900/90 text-neutral-300 hover:text-white border border-neutral-800 hover:border-amber-500/30'
              }`}
            >
              🍔 Hamburguesas
            </button>

            <button
              onClick={() => setCategoriaActiva('perros')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                categoriaActiva === 'perros'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 shadow-lg shadow-amber-500/20 scale-105'
                  : 'bg-neutral-900/90 text-neutral-300 hover:text-white border border-neutral-800 hover:border-amber-500/30'
              }`}
            >
              🌭 Perros & Especiales
            </button>

            <button
              onClick={() => setCategoriaActiva('bebidas')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                categoriaActiva === 'bebidas'
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-neutral-950 shadow-lg shadow-amber-500/20 scale-105'
                  : 'bg-neutral-900/90 text-neutral-300 hover:text-white border border-neutral-800 hover:border-amber-500/30'
              }`}
            >
              🥤 Bebidas
            </button>
          </div>

          <span className="text-xs text-neutral-400 hidden lg:inline font-medium min-w-max">
            Turno: <strong className="text-amber-400 font-bold">{jornada === 'mañana' ? 'Mañana/Tarde' : 'Noche'}</strong>
          </span>
        </div>
      </section>

      {/* 4. Catálogo Principal de Platos y Combos */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* Sección de Combos Promocionales */}
        {(categoriaActiva === 'todos' || categoriaActiva === 'combos') && combos.length > 0 && !busqueda && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame size={22} className="text-red-500 animate-bounce" />
                <h2 className="text-xl font-black text-white font-display">
                  Combos & Promociones de la Casa
                </h2>
              </div>
              <span className="text-xs text-amber-400 font-bold hidden sm:inline">
                Ahorra hasta un 25% ordenando en combo
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {combos.map((combo) => (
                <div
                  key={combo.id}
                  className="bg-food-card rounded-3xl border border-amber-500/30 hover:border-amber-400 p-5 shadow-xl hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-300 flex flex-col justify-between group transform hover:-translate-y-1.5"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getFoodEmoji(combo.nombre)}</span>
                        <h3 className="font-bold text-base text-white group-hover:text-amber-400 transition-colors">
                          {combo.nombre}
                        </h3>
                      </div>
                      <Badge className="bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-black">
                        AHORRO
                      </Badge>
                    </div>

                    <p className="mt-2 text-xs text-neutral-300 line-clamp-2 leading-relaxed">
                      {combo.descripcion || 'Combinación perfecta de nuestros platos más vendidos.'}
                    </p>

                    {combo.items && combo.items.length > 0 && (
                      <div className="mt-3 p-2.5 bg-neutral-950/70 rounded-2xl border border-neutral-800/80 text-[11px] text-neutral-300 space-y-1">
                        {combo.items.map((it, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-amber-400 shrink-0" />
                            <span>{it.cantidad}x {it.nombreSnapshot}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Precio Combo</span>
                      <span className="text-xl font-black text-amber-400 font-display">
                        {formatCOP(combo.precioEspecial)}
                      </span>
                    </div>

                    <button
                      onClick={() => agregarAlCarrito('combo', combo)}
                      className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-neutral-950 font-bold text-xs flex items-center gap-1.5 hover:scale-105 active:scale-95 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Agregar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sección de Platos Individuales */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ChefHat size={22} className="text-amber-400" />
              <h2 className="text-xl font-black text-white font-display">
                {categoriaActiva === 'combos' ? 'Combos Disponibles' : 'Platos & Especialidades'}
              </h2>
            </div>
            <span className="text-xs text-neutral-400">
              {productosFiltrados.length} opciones encontradas
            </span>
          </div>

          {loadingMenu ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-48 bg-neutral-900/60 rounded-3xl animate-pulse border border-neutral-800" />
              ))}
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="p-12 text-center text-neutral-400 bg-food-card rounded-3xl border border-neutral-800 space-y-2">
              <span className="text-4xl block">🔍</span>
              <p className="font-semibold text-white text-sm">No encontramos platos con ese criterio</p>
              <p className="text-xs">Prueba con otra palabra o revisa otra categoría.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
              {productosFiltrados.map((producto) => (
                <div
                  key={producto.id}
                  className="bg-food-card rounded-2xl sm:rounded-3xl border border-neutral-800/90 hover:border-amber-500/40 p-3.5 sm:p-4 shadow-lg hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 flex flex-col justify-between group transform hover:-translate-y-1"
                >
                  <div>
                    {/* Icono / Emoji de Plato con Fondo Cálido */}
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/20 to-red-500/10 border border-amber-500/20 flex items-center justify-center text-2xl mb-3 shadow-inner group-hover:scale-110 transition-transform">
                      {getFoodEmoji(producto.nombre)}
                    </div>

                    <h3 className="font-bold text-xs sm:text-sm text-white line-clamp-2 group-hover:text-amber-400 transition-colors">
                      {producto.nombre}
                    </h3>
                    {producto.descripcion && (
                      <p className="mt-1 text-[11px] text-neutral-400 line-clamp-2 leading-tight">
                        {producto.descripcion}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-neutral-800/80 flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-black text-amber-400 font-display">
                      {formatCOP(producto.precio)}
                    </span>

                    <button
                      onClick={() => agregarAlCarrito('producto', producto)}
                      className="p-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-neutral-950 font-bold hover:scale-110 active:scale-95 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                      title="Agregar al pedido"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5. Banner de Testimonios y Por Qué Elegirnos */}
        <section className="mt-12 bg-food-card rounded-3xl border border-amber-500/20 p-6 sm:p-8 shadow-2xl">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-6">
            <h3 className="text-2xl font-display font-black text-white">
              ¿Por qué nuestros clientes aman <span className="text-amber-400">La Parada</span>?
            </h3>
            <p className="text-xs text-neutral-400">
              Más de 5 años preparando los mejores antojos con ingredientes de primera calidad.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-neutral-950/60 rounded-2xl border border-neutral-800 space-y-2">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className="fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-neutral-300 italic">
                "La hamburguesa especial es de otro nivel, el pan súper suave y llega calientica a la casa en 25 minutos."
              </p>
              <p className="text-[11px] font-bold text-white">— Carlos Mendoza (Floresta)</p>
            </div>

            <div className="p-4 bg-neutral-950/60 rounded-2xl border border-neutral-800 space-y-2">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className="fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-neutral-300 italic">
                "Los combos familiares rinden muchísimo y el sabor de la salsa de la casa es insuperable. 100% recomendado."
              </p>
              <p className="text-[11px] font-bold text-white">— Andrea Gómez (Centro)</p>
            </div>

            <div className="p-4 bg-neutral-950/60 rounded-2xl border border-neutral-800 space-y-2">
              <div className="flex items-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={14} className="fill-amber-400" />
                ))}
              </div>
              <p className="text-xs text-neutral-300 italic">
                "Pagar por Nequi directo al pedir desde la web es comodísimo. Pedimos todos los fines de semana."
              </p>
              <p className="text-[11px] font-bold text-white">— Javier Rincón (Prados del Este)</p>
            </div>
          </div>
        </section>
      </main>

      {/* 6. Barra Flotante de Carrito en la parte inferior si hay items */}
      {totalItemsCarrito > 0 && !carritoAbierto && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto animate-in slide-in-from-bottom duration-300">
          <button
            onClick={() => setCarritoAbierto(true)}
            className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 text-neutral-950 font-bold text-xs sm:text-sm flex items-center justify-between shadow-2xl shadow-amber-500/30 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-neutral-950 text-amber-400 text-xs font-black">
                {totalItemsCarrito}
              </span>
              <span>Ver mi pedido</span>
            </div>
            <div className="flex items-center gap-1.5 font-display font-black text-base">
              <span>{formatCOP(totalCarrito)}</span>
              <ArrowRight size={18} />
            </div>
          </button>
        </div>
      )}

      {/* 7. Botón Flotante de Asistencia WhatsApp */}
      <a
        href="https://wa.me/573001234567?text=Hola%20La%20Parada,%20quiero%20hacer%20un%20pedido%20o%20tengo%20una%20pregunta"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 right-4 z-40 p-3 rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/30 hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer group"
        title="Escríbenos a WhatsApp"
      >
        <MessageCircle size={22} className="group-hover:rotate-12 transition-transform" />
        <span className="absolute right-12 bg-neutral-900 text-white text-[11px] font-semibold py-1 px-2.5 rounded-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity border border-neutral-700 pointer-events-none shadow-lg">
          ¿Dudas? Chatea con nosotros
        </span>
      </a>

      {/* 8. Carrito Drawer / Modal Lateral */}
      {carritoAbierto && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-neutral-950 border-l border-amber-500/30 h-full flex flex-col justify-between p-5 shadow-2xl animate-in slide-in-from-right duration-200">
            <div>
              {/* Header del Carrito */}
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
                    <ShoppingCart size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-white font-display text-base">Tu Pedido</h3>
                    <p className="text-[10px] text-neutral-400">{totalItemsCarrito} productos agregados</p>
                  </div>
                </div>
                <button
                  onClick={() => setCarritoAbierto(false)}
                  className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-900 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Lista de Items */}
              <div className="mt-4 space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {carrito.length === 0 ? (
                  <div className="text-center py-16 text-neutral-500 text-xs space-y-3">
                    <span className="text-4xl block">🛒</span>
                    <p className="font-semibold text-white">Tu canasta está vacía</p>
                    <p className="text-neutral-400">¡Selecciona tus platos y combos favoritos del menú!</p>
                  </div>
                ) : (
                  carrito.map((item) => (
                    <div
                      key={item.referenciaId}
                      className="p-3 bg-food-card rounded-2xl border border-neutral-800 flex items-center justify-between gap-3 shadow-md"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-white truncate">{item.nombre}</p>
                        <p className="text-[11px] text-amber-400 font-bold mt-0.5">{formatCOP(item.precioUnitario)} c/u</p>
                      </div>

                      {/* Controles de cantidad */}
                      <div className="flex items-center gap-2 bg-neutral-950 rounded-xl border border-neutral-800 p-1">
                        <button
                          onClick={() => modificarCantidadCarrito(item.referenciaId, -1)}
                          className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs font-bold text-white px-1">{item.cantidad}</span>
                        <button
                          onClick={() => modificarCantidadCarrito(item.referenciaId, 1)}
                          className="p-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded"
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

            {/* Footer del Carrito & Botón Checkout */}
            {carrito.length > 0 && (
              <div className="border-t border-neutral-800 pt-4 space-y-3">
                <div className="space-y-1.5 text-xs text-neutral-400 bg-neutral-900/60 p-3 rounded-2xl border border-neutral-800">
                  <div className="flex justify-between">
                    <span>Subtotal de productos</span>
                    <span className="font-semibold text-white">{formatCOP(totalCarrito)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Entrega a Domicilio</span>
                    <span className="text-emerald-400 font-semibold">Tarifa Estándar</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-neutral-800">
                    <span>Total a Pagar</span>
                    <span className="text-amber-400 font-display text-lg">{formatCOP(totalCarrito)}</span>
                  </div>
                </div>

                <button
                  onClick={() => setModalCheckoutAbierto(true)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-neutral-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <span>Continuar con la Entrega</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. Modal de Checkout / Datos de Entrega */}
      {modalCheckoutAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-neutral-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-white font-display text-base flex items-center gap-2">
                <MapPin size={18} className="text-amber-400" />
                Datos de Entrega a Domicilio
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
                  placeholder="Ej: La Floresta / Prados"
                  required
                />
              </div>

              <Input
                label="Notas para Cocina o Domiciliario (Opcional)"
                value={notasCliente}
                onChange={(e) => setNotasCliente(e.target.value)}
                placeholder="Ej: Sin cebolla, Apto 302, timbre blanco"
              />

              {/* Selector de Método de Pago */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-neutral-300">Método de Pago Preferido</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMetodoPago('efectivo')}
                    className={`p-2.5 rounded-2xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                      metodoPago === 'efectivo'
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-md'
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
                        ? 'bg-purple-500/20 border-purple-400 text-purple-300 font-bold shadow-md'
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
                        ? 'bg-sky-500/20 border-sky-400 text-sky-300 font-bold shadow-md'
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
                  label="¿Con cuánto vas a pagar? (Para llevarte el cambio exacto)"
                  type="number"
                  value={pagaConCuanto}
                  onChange={(e) => setPagaConCuanto(e.target.value)}
                  placeholder="Ej: 50 (= $50.000 COP)"
                />
              )}

              {metodoPago === 'transferencia' && (
                <div className="p-3.5 bg-neutral-950 rounded-2xl border border-purple-500/30 text-xs space-y-1 text-neutral-300">
                  <p className="font-bold text-white flex items-center gap-1">
                    📲 Datos para Transferencia Inmediata:
                  </p>
                  <p>• <strong>Nequi / Daviplata:</strong> 300 123 4567</p>
                  <p>• <strong>Bancolombia Ahorros:</strong> 123-456789-00</p>
                  <p className="text-[11px] text-neutral-400 pt-1">
                    Envía el comprobante al domiciliario o por WhatsApp.
                  </p>
                </div>
              )}

              {/* Resumen Total */}
              <div className="p-3.5 bg-neutral-950 rounded-2xl border border-neutral-800 flex justify-between items-center text-sm font-bold text-white">
                <span>Total a Pagar:</span>
                <span className="text-amber-400 text-xl font-display font-black">{formatCOP(totalCarrito)}</span>
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
                  className="flex-1 text-xs font-bold"
                >
                  Confirmar y Enviar Pedido
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 10. Modal de Pedido Exitoso */}
      {pedidoExitoso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-neutral-900 border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-2xl font-black font-display text-white">¡Pedido Recibido!</h3>
            <p className="text-xs text-neutral-300">
              Tu pedido ha entrado en la pantalla de cocina de <strong>La Parada</strong> y ya empezó su preparación.
            </p>

            <div className="p-4 bg-neutral-950 rounded-2xl border border-neutral-800 space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Código de Seguimiento</span>
              <span className="text-2xl font-black font-mono text-amber-400">{pedidoExitoso.id}</span>
              <p className="text-xs text-neutral-400 mt-1">Total: <strong>{formatCOP(pedidoExitoso.total)}</strong></p>
            </div>

            <Button
              fullWidth
              variant="primary"
              onClick={() => setPedidoExitoso(null)}
              className="text-xs font-bold"
            >
              Hacer otro pedido
            </Button>
          </div>
        </div>
      )}

      {/* 11. Modal de Autenticación de Cliente (Firebase + Google) */}
      {modalAuthAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-neutral-900 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
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
                className="text-xs font-bold"
              >
                {modoAuth === 'login' ? 'Iniciar Sesión' : 'Registrarme'}
              </Button>
            </form>

            {/* Separador */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-neutral-800"></div>
              <span className="flex-shrink mx-3 text-[11px] text-neutral-500 uppercase tracking-wider font-semibold">
                o también
              </span>
              <div className="flex-grow border-t border-neutral-800"></div>
            </div>

            {/* Botón de Google Sign-In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={cargandoAuth}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-800/80 border border-neutral-700/80 hover:border-neutral-600 text-white text-xs font-semibold transition-all shadow-md active:scale-[0.99] cursor-pointer"
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

      {/* 12. Footer de la Tienda */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950/90 py-10 mt-16 text-center text-xs text-neutral-500 space-y-3">
        <div className="flex justify-center items-center gap-2.5">
          <img
            src="/Logo.jpg"
            alt="Logo La Parada"
            className="w-7 h-7 rounded-full border border-amber-500/40 object-cover"
          />
          <span className="font-display font-black text-amber-400 text-sm">La Parada</span>
          <span>•</span>
          <span className="text-neutral-400">Sabores que te acompañan © 2026</span>
        </div>
        <p className="max-w-md mx-auto text-neutral-500 text-[11px]">
          Preparado con pasión. Domicilios en toda la ciudad. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}

export default LandingTiendaPage;
