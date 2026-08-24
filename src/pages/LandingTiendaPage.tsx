// src/pages/LandingTiendaPage.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
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
  Clock,
  Sun,
  Moon,
  ArrowRight,
  Shield,
  CreditCard,
  Banknote,
  Send,
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/services/firebase';
import { getProductos, getCombos } from '@/services/productosService';
import { Producto, Combo, ItemVenta, Jornada, MetodoPago } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { createToast } from '@/components/ui/Toast';

export function LandingTiendaPage() {

  // Estados de Catálogo
  const [jornada, setJornada] = useState<Jornada>('noche');
  const [categoriaActiva, setCategoriaActiva] = useState<'todos' | 'combos' | 'platos'>('todos');
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
    <div className="min-h-screen bg-base-dark text-white font-sans selection:bg-gold-400 selection:text-black">
      {/* 1. Header de la Tienda */}
      <header className="sticky top-0 z-40 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo y Slogan */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gold-400/20 border border-gold-400/40 flex items-center justify-center font-display font-black text-gold-400 text-lg shadow-lg">
              LP
            </div>
            <div>
              <span className="font-display font-bold text-lg sm:text-xl text-white tracking-wide">
                La Parada
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] text-gold-400 font-medium px-2 py-0.5 rounded-full bg-gold-400/10 border border-gold-400/20">
                Comida Rápida & Desayunos
              </span>
            </div>
          </div>

          {/* Selector de Jornada & Carrito & Auth */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Selector Mañana / Noche */}
            <div className="flex bg-neutral-900 border border-neutral-800 rounded-xl p-0.5 text-xs">
              <button
                onClick={() => setJornada('mañana')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                  jornada === 'mañana'
                    ? 'bg-gold-400 text-neutral-950 font-bold shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Sun size={13} />
                <span className="hidden sm:inline">Mañana</span>
              </button>
              <button
                onClick={() => setJornada('noche')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all ${
                  jornada === 'noche'
                    ? 'bg-gold-400 text-neutral-950 font-bold shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Moon size={13} />
                <span className="hidden sm:inline">Noche</span>
              </button>
            </div>

            {/* Auth Button */}
            {clienteUser ? (
              <div className="flex items-center gap-2">
                <span className="hidden md:inline text-xs text-neutral-300">
                  Hola, {clienteUser.email?.split('@')[0]}
                </span>
                <button
                  onClick={handleCerrarSesion}
                  title="Cerrar sesión"
                  className="p-2 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-red-400 transition-colors"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setModalAuthAbierto(true)}
                className="text-xs flex items-center gap-1.5"
              >
                <User size={14} />
                <span className="hidden sm:inline">Mi Cuenta</span>
              </Button>
            )}

            {/* Botón Carrito */}
            <button
              onClick={() => setCarritoAbierto(true)}
              className="relative p-2 sm:px-3.5 sm:py-2 rounded-xl bg-gold-400 text-neutral-950 font-bold text-xs flex items-center gap-1.5 hover:bg-gold-300 transition-all shadow-lg"
            >
              <ShoppingCart size={16} />
              <span className="hidden sm:inline">Mi Pedido</span>
              {totalItemsCarrito > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-neutral-950 text-gold-400 text-[10px] font-black">
                  {totalItemsCarrito}
                </span>
              )}
            </button>

            {/* Acceso Staff / Admin */}
            <Link
              to="/admin"
              className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors hidden lg:inline-block border-l border-neutral-800 pl-3"
            >
              Staff Admin 🔐
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden border-b border-neutral-800/80 bg-radial from-neutral-900 via-base-dark to-base-dark py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-400/10 border border-gold-400/30 text-gold-400 text-xs font-semibold">
            <Sparkles size={14} />
            {jornada === 'mañana' ? 'Desayunos Frescos & Tradicionales' : 'Comidas Rápidas Artesanales & Combos'}
          </div>

          <h1 className="text-3xl sm:text-5xl font-display font-black tracking-tight text-white max-w-3xl mx-auto">
            El verdadero sabor de <span className="text-gold-400">La Parada</span> en tu puerta
          </h1>

          <p className="text-xs sm:text-base text-neutral-400 max-w-xl mx-auto">
            Pide en línea en segundos. Ingredientes seleccionados, preparación al instante y domicilios rápidos a toda la ciudad.
          </p>

          {/* Badges de garantía */}
          <div className="pt-4 flex flex-wrap justify-center gap-4 sm:gap-6 text-xs text-neutral-300">
            <span className="flex items-center gap-1.5">
              <ChefHat size={15} className="text-gold-400" /> Preparación fresca al momento
            </span>
            <span className="flex items-center gap-1.5">
              <Clock size={15} className="text-emerald-400" /> Entrega promedio 25-35 min
            </span>
            <span className="flex items-center gap-1.5">
              <Shield size={15} className="text-sky-400" /> Pago contraentrega o Nequi
            </span>
          </div>
        </div>
      </section>

      {/* 3. Catálogo de Menú */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Filtros de Categoría */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setCategoriaActiva('todos')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                categoriaActiva === 'todos'
                  ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              🍔 Todo el Menú
            </button>
            <button
              onClick={() => setCategoriaActiva('combos')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                categoriaActiva === 'combos'
                  ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              🔥 Combos Especiales ({combos.length})
            </button>
            <button
              onClick={() => setCategoriaActiva('platos')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                categoriaActiva === 'platos'
                  ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40'
                  : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white'
              }`}
            >
              🍽️ Platos Individuales ({productos.length})
            </button>
          </div>

          <span className="text-xs text-neutral-500 hidden sm:inline">
            Mostrando menú para turno: <strong className="capitalize text-gold-400">{jornada}</strong>
          </span>
        </div>

        {/* Listado de Combos Promocionales */}
        {(categoriaActiva === 'todos' || categoriaActiva === 'combos') && combos.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-gold-400" />
              <h2 className="text-lg font-bold text-white font-display">Combos & Promociones</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {combos.map((combo) => (
                <Card
                  key={combo.id}
                  className="p-5 bg-neutral-900/90 border-neutral-800 hover:border-gold-400/50 transition-all flex flex-col justify-between group shadow-xl"
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="font-bold text-base text-white group-hover:text-gold-400 transition-colors">
                        {combo.nombre}
                      </h3>
                      <Badge className="bg-gold-400/20 text-gold-400 border border-gold-400/40 text-[10px]">
                        COMBO
                      </Badge>
                    </div>

                    <p className="mt-2 text-xs text-neutral-400 line-clamp-2">
                      {combo.descripcion || 'Incluye combinación de nuestros mejores platos y bebidas.'}
                    </p>

                    {combo.items && combo.items.length > 0 && (
                      <div className="mt-3 p-2 bg-neutral-950/60 rounded-xl border border-neutral-800/80 text-[11px] text-neutral-300 space-y-0.5">
                        {combo.items.map((it, idx) => (
                          <div key={idx} className="flex items-center gap-1.5">
                            <span className="text-gold-400">✓</span> {it.cantidad}x {it.nombreSnapshot}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 pt-3 border-t border-neutral-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Precio Especial</span>
                      <span className="text-xl font-bold text-gold-400 font-display">
                        {formatCOP(combo.precioEspecial)}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => agregarAlCarrito('combo', combo)}
                      className="text-xs flex items-center gap-1"
                    >
                      <Plus size={14} />
                      Ordenar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Listado de Productos Individuales */}
        {(categoriaActiva === 'todos' || categoriaActiva === 'platos') && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ChefHat size={18} className="text-gold-400" />
              <h2 className="text-lg font-bold text-white font-display">Platos & Especialidades</h2>
            </div>

            {loadingMenu ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="h-44 bg-neutral-900/60 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : productos.length === 0 ? (
              <Card className="p-8 text-center text-neutral-400 bg-neutral-900/60 border-neutral-800">
                No hay productos disponibles en este momento para la jornada {jornada}.
              </Card>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                {productos.map((producto) => (
                  <Card
                    key={producto.id}
                    className="p-4 bg-neutral-900/90 border-neutral-800 hover:border-neutral-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <h3 className="font-semibold text-xs sm:text-sm text-white line-clamp-2">
                        {producto.nombre}
                      </h3>
                      {producto.descripcion && (
                        <p className="mt-1 text-[11px] text-neutral-400 line-clamp-2">
                          {producto.descripcion}
                        </p>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-800 flex items-center justify-between">
                      <span className="text-sm sm:text-base font-bold text-gold-400 font-display">
                        {formatCOP(producto.precio)}
                      </span>

                      <button
                        onClick={() => agregarAlCarrito('producto', producto)}
                        className="p-1.5 rounded-lg bg-gold-400 text-neutral-950 font-bold hover:bg-gold-300 transition-colors shadow"
                        title="Agregar al pedido"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* 4. Carrito Drawer / Modal Lateral */}
      {carritoAbierto && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-neutral-950 border-l border-neutral-800 h-full flex flex-col justify-between p-5 shadow-2xl animate-in slide-in-from-right duration-200">
            <div>
              {/* Header del Carrito */}
              <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={18} className="text-gold-400" />
                  <h3 className="font-bold text-white font-display text-base">Tu Pedido</h3>
                  <Badge variant="outline" className="text-[10px] text-neutral-400">
                    {totalItemsCarrito} items
                  </Badge>
                </div>
                <button
                  onClick={() => setCarritoAbierto(false)}
                  className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Lista de Items */}
              <div className="mt-4 space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {carrito.length === 0 ? (
                  <div className="text-center py-12 text-neutral-500 text-xs">
                    <ShoppingBag size={32} className="mx-auto mb-2 opacity-50" />
                    Tu carrito está vacío. ¡Elige tus platos favoritos del menú!
                  </div>
                ) : (
                  carrito.map((item) => (
                    <div
                      key={item.referenciaId}
                      className="p-3 bg-neutral-900/90 rounded-xl border border-neutral-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs text-white truncate">{item.nombre}</p>
                        <p className="text-[11px] text-gold-400 mt-0.5">{formatCOP(item.precioUnitario)} c/u</p>
                      </div>

                      {/* Controles de cantidad */}
                      <div className="flex items-center gap-2 bg-neutral-950 rounded-lg border border-neutral-800 p-1">
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
                        className="text-neutral-500 hover:text-red-400 p-1"
                        title="Eliminar"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer del Carrito & Botón Checkout */}
            {carrito.length > 0 && (
              <div className="border-t border-neutral-800 pt-4 space-y-3">
                <div className="space-y-1 text-xs text-neutral-400">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>{formatCOP(totalCarrito)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Costo de entrega</span>
                    <span className="text-emerald-400">Domicilio Estándar</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-neutral-800/60">
                    <span>Total a Pagar</span>
                    <span className="text-gold-400 font-display">{formatCOP(totalCarrito)}</span>
                  </div>
                </div>

                <Button
                  fullWidth
                  variant="primary"
                  size="lg"
                  onClick={() => setModalCheckoutAbierto(true)}
                  className="text-xs flex items-center justify-center gap-2"
                >
                  <span>Proceder al Pago</span>
                  <ArrowRight size={15} />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. Modal de Checkout / Datos de Entrega */}
      {modalCheckoutAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-white font-display text-base flex items-center gap-2">
                <MapPin size={16} className="text-gold-400" />
                Finalizar Pedido a Domicilio
              </h3>
              <button
                onClick={() => setModalCheckoutAbierto(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X size={16} />
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
                  placeholder="Ej: La Floresta / Centro"
                  required
                />
              </div>

              <Input
                label="Notas para la Cocina o Domiciliario (Opcional)"
                value={notasCliente}
                onChange={(e) => setNotasCliente(e.target.value)}
                placeholder="Ej: Sin salsa tártara, Apto 402, tocar timbre"
              />

              {/* Selector de Método de Pago */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-neutral-300">Método de Pago</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMetodoPago('efectivo')}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                      metodoPago === 'efectivo'
                        ? 'bg-gold-400/20 border-gold-400 text-gold-300 font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <Banknote size={16} />
                    <span>Efectivo</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetodoPago('transferencia')}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                      metodoPago === 'transferencia'
                        ? 'bg-purple-400/20 border-purple-400 text-purple-300 font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <Send size={16} />
                    <span>Nequi / Bancolombia</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetodoPago('domicilio')}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                      metodoPago === 'domicilio'
                        ? 'bg-sky-400/20 border-sky-400 text-sky-300 font-bold'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <CreditCard size={16} />
                    <span>Datáfono / Tarjeta</span>
                  </button>
                </div>
              </div>

              {metodoPago === 'efectivo' && (
                <Input
                  label="¿Con cuánto dinero pagarás? (Para llevarte cambio)"
                  type="number"
                  value={pagaConCuanto}
                  onChange={(e) => setPagaConCuanto(e.target.value)}
                  placeholder="Ej: 50 (= $50.000 COP)"
                />
              )}

              {metodoPago === 'transferencia' && (
                <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 text-xs space-y-1 text-neutral-300">
                  <p className="font-semibold text-white">Datos de Transferencia:</p>
                  <p>📲 <strong>Nequi / Daviplata:</strong> 300 123 4567</p>
                  <p>🏦 <strong>Bancolombia Ahorros:</strong> 123-456789-00</p>
                  <p className="text-[11px] text-neutral-500 pt-1">Envía el comprobante por WhatsApp al recibir el pedido.</p>
                </div>
              )}

              {/* Resumen Total */}
              <div className="p-3 bg-neutral-950/80 rounded-xl border border-neutral-800 flex justify-between items-center text-sm font-bold text-white">
                <span>Total del Pedido:</span>
                <span className="text-gold-400 text-lg font-display">{formatCOP(totalCarrito)}</span>
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

      {/* 6. Modal de Pedido Exitoso */}
      {pedidoExitoso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <CheckCircle2 size={48} className="text-emerald-400 mx-auto" />
            <h3 className="text-xl font-bold font-display text-white">¡Pedido Confirmado!</h3>
            <p className="text-xs text-neutral-300">
              Hemos enviado tu pedido directamente a la cocina de <strong>La Parada</strong>.
            </p>

            <div className="p-4 bg-neutral-950 rounded-xl border border-neutral-800 space-y-1">
              <span className="text-[10px] text-neutral-500 uppercase tracking-wider block">Código de Seguimiento</span>
              <span className="text-2xl font-black font-mono text-gold-400">{pedidoExitoso.id}</span>
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

      {/* 7. Modal de Autenticación de Cliente (Firebase) */}
      {modalAuthAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <h3 className="font-bold text-white font-display text-base flex items-center gap-2">
                <User size={16} className="text-gold-400" />
                {modoAuth === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </h3>
              <button
                onClick={() => setModalAuthAbierto(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X size={16} />
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
                <p className="text-xs text-red-400 p-2 bg-red-950/40 rounded-lg border border-red-900/50">
                  {errorAuth}
                </p>
              )}

              <Button
                type="submit"
                fullWidth
                variant="primary"
                loading={cargandoAuth}
                disabled={cargandoAuth}
                className="text-xs"
              >
                {modoAuth === 'login' ? 'Iniciar Sesión' : 'Registrarme'}
              </Button>
            </form>

            <div className="text-center pt-2 border-t border-neutral-800">
              {modoAuth === 'login' ? (
                <p className="text-xs text-neutral-400">
                  ¿No tienes cuenta aún?{' '}
                  <button
                    onClick={() => setModoAuth('registro')}
                    className="text-gold-400 font-semibold hover:underline"
                  >
                    Crear una cuenta
                  </button>
                </p>
              ) : (
                <p className="text-xs text-neutral-400">
                  ¿Ya tienes cuenta?{' '}
                  <button
                    onClick={() => setModoAuth('login')}
                    className="text-gold-400 font-semibold hover:underline"
                  >
                    Iniciar sesión
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950 py-8 mt-12 text-center text-xs text-neutral-500 space-y-2">
        <p className="font-display font-bold text-neutral-400">La Parada — Sabores que te acompañan © 2026</p>
        <p>Todos los derechos reservados. Desarrollado por Andrés Santiago.</p>
      </footer>
    </div>
  );
}
export default LandingTiendaPage;
