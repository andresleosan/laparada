// src/pages/AdminSettingsPage.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  ArrowLeft,
  Eye,
  EyeOff,
  Users,
  UserPlus,
  Store,
  Lock,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { createToast } from '@/components/ui/Toast';
import { changeAdminPin } from '@/services/changePinService';
import { initializeAdminPin } from '@/services/initPinService';
import { useNegocio } from '@/context/NegocioContext';
import {
  getUsuariosDeNegocio,
  registrarUsuarioParaNegocio,
  toggleUsuarioActivo,
  actualizarDatosNegocio,
} from '@/services/negociosService';
import { UsuarioNegocio } from '@/types/negocio';

export function AdminSettingsPage() {
  const navigate = useNavigate();
  const { negocioActual, refrescarNegocio } = useNegocio();

  const [tabActiva, setTabActiva] = useState<'usuarios' | 'negocio' | 'seguridad'>('usuarios');

  // ================= ESTADOS DE USUARIOS DEL NEGOCIO =================
  const [usuarios, setUsuarios] = useState<UsuarioNegocio[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [modalCrearUsuario, setModalCrearUsuario] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoEmail, setNuevoEmail] = useState('');
  const [nuevoPassword, setNuevoPassword] = useState('');
  const [nuevoRol, setNuevoRol] = useState<'admin' | 'cajero'>('cajero');
  const [guardandoUsuario, setGuardandoUsuario] = useState(false);

  // ================= ESTADOS DE DATOS DEL NEGOCIO =================
  const [nombreNegocio, setNombreNegocio] = useState(negocioActual.nombre || '');
  const [telefonoNegocio, setTelefonoNegocio] = useState(negocioActual.telefono || '');
  const [ciudadNegocio, setCiudadNegocio] = useState(negocioActual.ciudad || '');
  const [direccionNegocio, setDireccionNegocio] = useState(negocioActual.direccion || '');
  const [guardandoNegocio, setGuardandoNegocio] = useState(false);

  // ================= ESTADOS DE PIN DE SEGURIDAD =================
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loadingPin, setLoadingPin] = useState(false);
  const [errorsPin, setErrorsPin] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const [initPin, setInitPin] = useState('');
  const [initConfirmPin, setInitConfirmPin] = useState('');
  const [initLoading, setInitLoading] = useState(false);
  const [showInitForm, setShowInitForm] = useState(false);

  // Cargar usuarios
  const cargarUsuarios = async () => {
    if (!negocioActual?.id) return;
    setCargandoUsuarios(true);
    try {
      const data = await getUsuariosDeNegocio(negocioActual.id);
      setUsuarios(data);
    } catch (err) {
      console.error('Error cargando usuarios:', err);
    } finally {
      setCargandoUsuarios(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
    setNombreNegocio(negocioActual.nombre || '');
    setTelefonoNegocio(negocioActual.telefono || '');
    setCiudadNegocio(negocioActual.ciudad || '');
    setDireccionNegocio(negocioActual.direccion || '');
  }, [negocioActual]);

  // Handler: Crear nuevo usuario para el negocio
  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim() || !nuevoEmail.trim() || !nuevoPassword.trim()) {
      createToast('Por favor completa todos los campos', 'error');
      return;
    }

    if (nuevoPassword.length < 6) {
      createToast('La contraseña debe tener al menos 6 caracteres', 'error');
      return;
    }

    setGuardandoUsuario(true);
    try {
      await registrarUsuarioParaNegocio(negocioActual.id, {
        nombre: nuevoNombre.trim(),
        email: nuevoEmail.trim(),
        password: nuevoPassword,
        rol: nuevoRol,
      });

      createToast('🎉 Usuario creado exitosamente', 'success');
      setModalCrearUsuario(false);
      setNuevoNombre('');
      setNuevoEmail('');
      setNuevoPassword('');
      setNuevoRol('cajero');
      await cargarUsuarios();
    } catch (err: any) {
      console.error('Error al crear usuario:', err);
      createToast(err?.message || 'Error al crear usuario', 'error');
    } finally {
      setGuardandoUsuario(false);
    }
  };

  // Handler: Cambiar estado de usuario (Activo / Inactivo)
  const handleToggleUsuario = async (u: UsuarioNegocio) => {
    try {
      await toggleUsuarioActivo(u.uid, !u.activo);
      createToast(`Usuario ${!u.activo ? 'activado' : 'desactivado'}`, 'success');
      await cargarUsuarios();
    } catch (err) {
      console.error('Error:', err);
      createToast('Error al actualizar estado del usuario', 'error');
    }
  };

  // Handler: Guardar datos del negocio
  const handleGuardarNegocio = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoNegocio(true);
    try {
      await actualizarDatosNegocio(negocioActual.id, {
        nombre: nombreNegocio.trim(),
        telefono: telefonoNegocio.trim(),
        ciudad: ciudadNegocio.trim(),
        direccion: direccionNegocio.trim(),
      });
      createToast('✅ Datos del negocio actualizados', 'success');
      await refrescarNegocio();
    } catch (err) {
      console.error('Error:', err);
      createToast('Error al guardar datos', 'error');
    } finally {
      setGuardandoNegocio(false);
    }
  };

  // Handler: Cambiar PIN
  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!currentPin.trim()) newErrors.currentPin = 'PIN actual requerido';
    if (!newPin.trim()) newErrors.newPin = 'PIN nuevo requerido';
    if (!confirmPin.trim()) newErrors.confirmPin = 'Confirmación requerida';
    if (newPin && !/^\d{6}$/.test(newPin)) newErrors.newPin = 'PIN debe ser 6 dígitos';

    if (Object.keys(newErrors).length > 0) {
      setErrorsPin(newErrors);
      return;
    }

    setLoadingPin(true);
    setErrorsPin({});

    try {
      const result = await changeAdminPin(currentPin, newPin, confirmPin);
      createToast('✅ ' + result.message, 'success');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (error: any) {
      const errorMessage = error.message || 'Error al cambiar PIN';
      if (errorMessage.includes('No se encontró configuración de PIN')) {
        setShowInitForm(true);
        createToast('⚠️ Necesitas inicializar el PIN primero', 'info');
      } else {
        createToast('❌ ' + errorMessage, 'error');
        if (errorMessage.includes('incorrecto')) {
          setErrorsPin({ currentPin: 'PIN actual incorrecto' });
        } else if (errorMessage.includes('no coinciden')) {
          setErrorsPin({ confirmPin: 'Los PINs no coinciden' });
        }
      }
    } finally {
      setLoadingPin(false);
    }
  };

  // Handler: Inicializar PIN
  const handleInitializePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!initPin.trim() || !initConfirmPin.trim()) {
      createToast('Por favor completa ambos campos de PIN', 'error');
      return;
    }

    if (!/^\d{6}$/.test(initPin)) {
      createToast('El PIN debe tener exactamente 6 dígitos numéricos', 'error');
      return;
    }

    if (initPin !== initConfirmPin) {
      createToast('Los PINs no coinciden', 'error');
      return;
    }

    setInitLoading(true);

    try {
      const result = await initializeAdminPin(initPin);
      createToast('✅ ' + result.message, 'success');
      setInitPin('');
      setInitConfirmPin('');
      setShowInitForm(false);
      setCurrentPin(initPin);
    } catch (error: any) {
      createToast('❌ ' + (error.message || 'Error al inicializar PIN'), 'error');
    } finally {
      setInitLoading(false);
    }
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords({ ...showPasswords, [field]: !showPasswords[field] });
  };

  return (
    <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="p-2 hover:bg-neutral-800 rounded-xl transition-colors"
            title="Volver"
          >
            <ArrowLeft size={20} className="text-neutral-400" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-black text-white flex items-center gap-2">
              <Settings size={28} className="text-amber-400" />
              Configuración & Equipo
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
              Administra los usuarios de tu negocio ({negocioActual.nombre}) y la seguridad del sistema.
            </p>
          </div>
        </div>

        {/* Selector de Pestañas */}
        <div className="flex gap-2 p-1 bg-neutral-900 rounded-2xl border border-neutral-800 text-xs">
          <button
            onClick={() => setTabActiva('usuarios')}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
              tabActiva === 'usuarios'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Users size={15} />
            <span>Equipo & Usuarios ({usuarios.length})</span>
          </button>

          <button
            onClick={() => setTabActiva('negocio')}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
              tabActiva === 'negocio'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Store size={15} />
            <span>Datos del Negocio</span>
          </button>

          <button
            onClick={() => setTabActiva('seguridad')}
            className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
              tabActiva === 'seguridad'
                ? 'bg-amber-500 text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Lock size={15} />
            <span>PIN de Seguridad</span>
          </button>
        </div>

        {/* PESTAÑA 1: EQUIPO & USUARIOS */}
        {tabActiva === 'usuarios' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-neutral-900 p-4 rounded-3xl border border-neutral-800">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Users size={18} className="text-amber-400" />
                  Operadores de {negocioActual.nombre}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Crea cuentas adicionales para administradores o cajeros de tu negocio.
                </p>
              </div>

              <Button
                variant="primary"
                onClick={() => setModalCrearUsuario(true)}
                className="text-xs font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400 flex items-center gap-1.5"
              >
                <UserPlus size={15} />
                <span>Crear Usuario</span>
              </Button>
            </div>

            {/* Modal para Crear Usuario */}
            {modalCrearUsuario && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-xs">
                <div className="w-full max-w-md bg-neutral-900 border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
                  <h3 className="font-bold text-white font-display text-base flex items-center gap-2">
                    <UserPlus size={18} className="text-amber-400" />
                    Nuevo Usuario para {negocioActual.nombre}
                  </h3>

                  <form onSubmit={handleCrearUsuario} className="space-y-3">
                    <Input
                      label="Nombre Completo *"
                      value={nuevoNombre}
                      onChange={(e) => setNuevoNombre(e.target.value)}
                      placeholder="Ej: Daniel Gómez"
                      required
                    />

                    <Input
                      label="Correo Electrónico *"
                      type="email"
                      value={nuevoEmail}
                      onChange={(e) => setNuevoEmail(e.target.value)}
                      placeholder="cajero@elpunto.com"
                      required
                    />

                    <Input
                      label="Contraseña de Acceso *"
                      type="password"
                      value={nuevoPassword}
                      onChange={(e) => setNuevoPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                    />

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-neutral-300">Rol del Usuario:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setNuevoRol('cajero')}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                            nuevoRol === 'cajero'
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                          }`}
                        >
                          <span>🛒 Cajero / POS</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setNuevoRol('admin')}
                          className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                            nuevoRol === 'admin'
                              ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                          }`}
                        >
                          <span>👑 Administrador</span>
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-3">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setModalCrearUsuario(false)}
                        className="flex-1 text-xs"
                      >
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        variant="primary"
                        loading={guardandoUsuario}
                        disabled={guardandoUsuario}
                        className="flex-1 text-xs font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400"
                      >
                        Guardar Usuario
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Listado de Usuarios */}
            {cargandoUsuarios ? (
              <div className="text-center py-10 text-neutral-400">
                <Loader2 size={24} className="animate-spin mx-auto mb-2" />
                <span className="text-xs">Cargando equipo...</span>
              </div>
            ) : usuarios.length === 0 ? (
              <div className="p-8 text-center bg-neutral-900 rounded-3xl border border-neutral-800 text-neutral-400 space-y-2">
                <Users size={32} className="mx-auto text-neutral-600 mb-1" />
                <p className="font-semibold text-white text-xs">No hay usuarios adicionales creados</p>
                <p className="text-[11px] text-neutral-500">
                  Haz clic en "Crear Usuario" para añadir un cajero o segundo administrador a tu negocio.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {usuarios.map((u) => (
                  <div
                    key={u.uid}
                    className="p-4 bg-neutral-900 rounded-2xl border border-neutral-800 flex items-center justify-between gap-3 shadow-md"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-10 h-10 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center font-bold text-amber-400 text-sm shrink-0">
                        {u.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="truncate">
                        <h4 className="font-bold text-xs text-white truncate">{u.nombre}</h4>
                        <p className="text-[11px] text-neutral-400 truncate">{u.email}</p>
                        <span className="inline-block mt-0.5 text-[9px] uppercase tracking-wider px-1.5 py-0.2 rounded bg-neutral-800 text-amber-400 font-extrabold border border-neutral-700">
                          {u.rol}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleUsuario(u)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition-colors ${
                        u.activo
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30'
                          : 'bg-neutral-800 text-neutral-500 border border-neutral-700 hover:bg-emerald-500/10 hover:text-emerald-400'
                      }`}
                      title="Haz clic para cambiar estado"
                    >
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PESTAÑA 2: DATOS DEL NEGOCIO */}
        {tabActiva === 'negocio' && (
          <Card className="p-6 bg-neutral-900 border border-neutral-800 rounded-3xl">
            <form onSubmit={handleGuardarNegocio} className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
                <Store size={20} className="text-amber-400" />
                <h3 className="font-bold text-white text-base">Información de {negocioActual.nombre}</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Nombre del Negocio"
                  value={nombreNegocio}
                  onChange={(e) => setNombreNegocio(e.target.value)}
                  disabled={negocioActual.id === 'laparada'}
                  required
                />
                <Input
                  label="Teléfono WhatsApp"
                  value={telefonoNegocio}
                  onChange={(e) => setTelefonoNegocio(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Ciudad"
                  value={ciudadNegocio}
                  onChange={(e) => setCiudadNegocio(e.target.value)}
                  placeholder="Ej: Cúcuta"
                />
                <Input
                  label="Dirección"
                  value={direccionNegocio}
                  onChange={(e) => setDireccionNegocio(e.target.value)}
                  placeholder="Ej: Calle Principal # 12-34"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  loading={guardandoNegocio}
                  disabled={guardandoNegocio}
                  className="text-xs font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400"
                >
                  Guardar Cambios del Negocio
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* PESTAÑA 3: SEGURIDAD Y PIN */}
        {tabActiva === 'seguridad' && (
          <Card className="p-6 bg-neutral-900 border border-neutral-800 rounded-3xl">
            {showInitForm && (
              <form onSubmit={handleInitializePinSubmit} className="space-y-4 mb-6 pb-6 border-b border-neutral-800">
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3">
                  <p className="text-xs text-amber-300">
                    ⚠️ El PIN no está inicializado. Por favor crea un PIN de 6 dígitos para confirmar acciones de borrado.
                  </p>
                </div>

                <Input
                  label="PIN para Inicializar (6 dígitos) *"
                  type="password"
                  value={initPin}
                  onChange={(e) => setInitPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                />

                <Input
                  label="Confirmar PIN *"
                  type="password"
                  value={initConfirmPin}
                  onChange={(e) => setInitConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  loading={initLoading}
                  disabled={initLoading || !initPin || !initConfirmPin}
                  className="text-xs font-bold"
                >
                  Inicializar PIN
                </Button>
              </form>
            )}

            <form onSubmit={handleChangePinSubmit} className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-neutral-800">
                <Lock size={20} className="text-amber-400" />
                <h3 className="font-bold text-white text-base">Cambiar PIN Administrativo</h3>
              </div>

              <p className="text-xs text-neutral-400">
                El PIN de 6 dígitos se utiliza para autorizar eliminaciones de productos, gastos y ventas en el sistema.
              </p>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">PIN Actual *</label>
                <div className="relative">
                  <input
                    type={showPasswords.currentPin ? 'text' : 'password'}
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-amber-400 tracking-widest font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => togglePasswordVisibility('currentPin')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
                  >
                    {showPasswords.currentPin ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errorsPin.currentPin && <p className="text-xs text-red-400 mt-1">{errorsPin.currentPin}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">PIN Nuevo *</label>
                  <div className="relative">
                    <input
                      type={showPasswords.newPin ? 'text' : 'password'}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-amber-400 tracking-widest font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('newPin')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    >
                      {showPasswords.newPin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errorsPin.newPin && <p className="text-xs text-red-400 mt-1">{errorsPin.newPin}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-300 mb-1">Confirmar PIN Nuevo *</label>
                  <div className="relative">
                    <input
                      type={showPasswords.confirmPin ? 'text' : 'password'}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2.5 text-white placeholder-neutral-500 text-xs focus:outline-none focus:border-amber-400 tracking-widest font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('confirmPin')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400"
                    >
                      {showPasswords.confirmPin ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errorsPin.confirmPin && <p className="text-xs text-red-400 mt-1">{errorsPin.confirmPin}</p>}
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={loadingPin}
                disabled={loadingPin || !currentPin || !newPin || !confirmPin}
                className="text-xs font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                Actualizar PIN
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}

export default AdminSettingsPage;
