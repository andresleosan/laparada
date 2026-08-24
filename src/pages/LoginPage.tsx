// src/pages/LoginPage.tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createToast } from '@/components/ui/Toast';
import { X, ArrowLeft, ShieldCheck, Store, Clock, AlertTriangle } from 'lucide-react';
import { getPerfilUsuarioYNegocio } from '@/services/negociosService';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [negocioPendiente, setNegocioPendiente] = useState<{
    nombre: string;
    estado: 'pendiente' | 'rechazado' | 'suspendido';
    notas?: string;
  } | null>(null);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNegocioPendiente(null);
    setLoading(true);

    try {
      if (!auth) {
        // Modo DEMO
        if (email && password) {
          localStorage.setItem('demo_user', JSON.stringify({ email, uid: 'demo_' + Date.now() }));
          createToast('✅ Modo DEMO - Sesión iniciada', 'success');
          navigate('/admin');
          return;
        } else {
          throw new Error('Email y contraseña requeridos');
        }
      }

      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Verificar estado de aprobación del negocio
      const perfil = await getPerfilUsuarioYNegocio(user.email || email, user.uid);

      if (!perfil.esSuperAdmin && perfil.negocio.estado !== 'activo') {
        // Si no está activo, desconectar auth y mostrar aviso
        await signOut(auth);
        setNegocioPendiente({
          nombre: perfil.negocio.nombre,
          estado: perfil.negocio.estado,
          notas: perfil.negocio.notasAdmin,
        });
        return;
      }

      createToast(`¡Bienvenido a ${perfil.negocio.nombre}!`, 'success');
      navigate('/admin');
    } catch (err: any) {
      console.error('Error login:', err);
      const message =
        err?.code === 'auth/invalid-credential' || err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password'
          ? 'Correo o contraseña incorrectos'
          : err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(message);
      createToast('Error al iniciar sesión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setNegocioPendiente(null);
    setLoading(true);
    try {
      if (!auth) {
        localStorage.setItem(
          'demo_user',
          JSON.stringify({ email: 'andres.san1404@gmail.com', uid: 'demo_google_' + Date.now() })
        );
        createToast('✅ Modo DEMO - Sesión iniciada con Google', 'success');
        navigate('/admin');
        return;
      }

      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const perfil = await getPerfilUsuarioYNegocio(user.email || '', user.uid);

      if (!perfil.esSuperAdmin && perfil.negocio.estado !== 'activo') {
        await signOut(auth);
        setNegocioPendiente({
          nombre: perfil.negocio.nombre,
          estado: perfil.negocio.estado,
          notas: perfil.negocio.notasAdmin,
        });
        return;
      }

      createToast(`¡Bienvenido a ${perfil.negocio.nombre}!`, 'success');
      navigate('/admin');
    } catch (err: any) {
      console.error('Error login con Google:', err);
      if (err?.code === 'auth/unauthorized-domain') {
        const dominioActual = window.location.hostname;
        setError(
          `⚠️ El dominio "${dominioActual}" no está autorizado en Firebase Console.`
        );
      } else if (err?.code !== 'auth/popup-closed-by-user') {
        setError(err?.message || 'Error al iniciar sesión con Google');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-restaurant-theme flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Luces cálidas de fondo */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Botón superior de regreso */}
      <div className="w-full max-w-md mb-3 flex justify-between items-center z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:text-white transition-all shadow-md active:scale-95"
        >
          <ArrowLeft size={14} className="text-amber-400" />
          <span>Volver a la Tienda</span>
        </Link>

        <span className="text-[11px] text-neutral-400 flex items-center gap-1">
          <ShieldCheck size={13} className="text-emerald-400" /> Acceso Administrativo
        </span>
      </div>

      <div className="w-full max-w-md space-y-6 bg-food-card border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        {/* Botón X para volver */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
          title="Cerrar y volver a la tienda"
        >
          <X size={18} />
        </button>

        {/* Logo / Header */}
        <div className="text-center">
          <img
            src="/Logo.jpg"
            alt="Logo La Parada"
            className="w-16 h-16 rounded-full border-2 border-amber-500/50 mx-auto mb-2 shadow-lg shadow-amber-500/30 object-cover"
          />
          <h1 className="text-3xl font-display font-black text-white mb-1">
            Panel de Operaciones
          </h1>
          <p className="text-xs text-amber-400/90 font-medium">Gestión de Restaurante & POS</p>
        </div>

        {/* Aviso de Cuenta en Revisión / Pendiente */}
        {negocioPendiente ? (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3 text-center animate-in fade-in">
            {negocioPendiente.estado === 'pendiente' ? (
              <>
                <Clock size={32} className="text-amber-400 mx-auto" />
                <h3 className="font-bold text-white text-sm">
                  Solicitud en Revisión
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Tu cuenta para el negocio <strong>{negocioPendiente.nombre}</strong> está pendiente de aprobación por el Super Administrador. Te notificaremos cuando tu acceso esté habilitado.
                </p>
              </>
            ) : (
              <>
                <AlertTriangle size={32} className="text-red-400 mx-auto" />
                <h3 className="font-bold text-red-300 text-sm">
                  Cuenta {negocioPendiente.estado === 'suspendido' ? 'Suspendida' : 'Rechazada'}
                </h3>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  {negocioPendiente.notas || 'Comunícate con el Super Admin para más información.'}
                </p>
              </>
            )}

            <Button
              type="button"
              variant="secondary"
              fullWidth
              onClick={() => setNegocioPendiente(null)}
              className="text-xs"
            >
              Intentar con otra cuenta
            </Button>
          </div>
        ) : (
          <>
            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label="Correo Electrónico"
                type="email"
                placeholder="admin@tunegocio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />

              <Input
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />

              {error && (
                <div className="rounded-xl bg-red-950/40 border border-red-900/50 p-3">
                  <p className="text-xs text-red-400">{error}</p>
                </div>
              )}

              <Button
                type="submit"
                fullWidth
                loading={loading}
                disabled={loading}
                size="lg"
                className="text-xs font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                Ingresar al Panel
              </Button>
            </form>

            {/* Separador */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-neutral-800"></div>
              <span className="flex-shrink mx-3 text-[11px] text-neutral-500 uppercase tracking-wider font-semibold">
                o continúa con
              </span>
              <div className="flex-grow border-t border-neutral-800"></div>
            </div>

            {/* Botón Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
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

            {/* Enlace para registrar un nuevo negocio */}
            <div className="pt-2 text-center border-t border-neutral-800 space-y-2">
              <Link
                to="/registro-negocio"
                className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold hover:underline"
              >
                <Store size={14} />
                <span>¿Quieres este sistema para tu negocio? Regístrate aquí</span>
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
