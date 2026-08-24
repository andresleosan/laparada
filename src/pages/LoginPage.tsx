// src/pages/LoginPage.tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createToast } from '@/components/ui/Toast';
import { X, ArrowLeft, ShieldCheck } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!auth) {
        // Modo DEMO: permitir login sin Firebase
        if (email && password) {
          localStorage.setItem('demo_user', JSON.stringify({ email, uid: 'demo_' + Date.now() }));
          createToast('✅ Modo DEMO - Sesión iniciada', 'success');
          navigate('/admin');
          return;
        } else {
          throw new Error('Email y contraseña requeridos');
        }
      }
      
      await signInWithEmailAndPassword(auth, email, password);
      createToast('¡Sesión iniciada!', 'success');
      navigate('/admin');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(message);
      createToast('Error al iniciar sesión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      if (!auth) {
        localStorage.setItem('demo_user', JSON.stringify({ email: 'admin.google@laparada.com', uid: 'demo_google_' + Date.now() }));
        createToast('✅ Modo DEMO - Sesión iniciada con Google', 'success');
        navigate('/admin');
        return;
      }

      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      createToast('¡Sesión iniciada con Google!', 'success');
      navigate('/admin');
    } catch (err: any) {
      console.error('Error login con Google:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        const message = err?.message || 'Error al iniciar sesión con Google';
        setError(message);
        createToast('Error al iniciar sesión con Google', 'error');
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

      {/* Botón flotante superior de regreso */}
      <div className="w-full max-w-md mb-3 flex justify-between items-center z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-amber-500/20 text-xs font-semibold text-neutral-300 hover:text-white transition-all shadow-md active:scale-95"
        >
          <ArrowLeft size={14} className="text-amber-400" />
          <span>Volver a la Tienda</span>
        </Link>

        <span className="text-[11px] text-neutral-500 flex items-center gap-1">
          <ShieldCheck size={13} className="text-emerald-400" /> Área Staff
        </span>
      </div>

      <div className="w-full max-w-md space-y-6 bg-food-card border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        {/* Botón X para cerrar en la esquina de la tarjeta */}
        <button
          onClick={() => navigate('/')}
          className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
          title="Cerrar y volver a la tienda"
        >
          <X size={18} />
        </button>

        {/* Logo / Header */}
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-red-600 p-0.5 mx-auto mb-2 shadow-lg shadow-amber-500/20">
            <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center font-display font-black text-amber-400 text-xl">
              LP
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-black text-white mb-1">
            La Parada
          </h1>
          <p className="text-xs sm:text-sm text-amber-400/80 font-medium">Panel Administrativo & Operaciones</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Correo Electrónico"
            type="email"
            placeholder="admin@laparada.com"
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
            className="text-xs font-bold"
          >
            Iniciar Sesión
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
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-neutral-950 hover:bg-neutral-800 border border-neutral-700/80 hover:border-neutral-600 text-white text-xs font-semibold transition-all shadow-md active:scale-[0.99] cursor-pointer"
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
          <span>Iniciar sesión con Google</span>
        </button>

        {/* Link a Tienda Pública */}
        <div className="pt-2 text-center border-t border-neutral-800">
          <Link
            to="/"
            className="text-xs text-gold-400 hover:underline inline-flex items-center gap-1 font-medium"
          >
            ← Volver a la Tienda Pública
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-neutral-500">
          La Parada Admin © 2026
        </p>
      </div>
    </div>
  );
}
