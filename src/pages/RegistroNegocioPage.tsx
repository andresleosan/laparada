// src/pages/RegistroNegocioPage.tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Store,
  CheckCircle2,
  ArrowLeft,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createToast } from '@/components/ui/Toast';
import { solicitarRegistroNegocio } from '@/services/negociosService';

export function RegistroNegocioPage() {
  const [nombreNegocio, setNombreNegocio] = useState('');
  const [nombrePropietario, setNombrePropietario] = useState('');
  const [telefono, setTelefono] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [direccion, setDireccion] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registroExitoso, setRegistroExitoso] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nombreNegocio.trim() || !nombrePropietario.trim() || !telefono.trim() || !email.trim() || !password) {
      setError('Por favor completa todos los campos obligatorios');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await solicitarRegistroNegocio({
        nombreNegocio: nombreNegocio.trim(),
        nombrePropietario: nombrePropietario.trim(),
        telefono: telefono.trim(),
        ciudad: ciudad.trim(),
        direccion: direccion.trim(),
        email: email.trim(),
        password,
      });

      setRegistroExitoso(nombreNegocio.trim());
      createToast('🎉 Solicitud de negocio enviada con éxito', 'success');
    } catch (err: any) {
      console.error('Error al registrar negocio:', err);
      if (err?.code === 'auth/email-already-in-use') {
        setError('El correo electrónico ya se encuentra registrado. Intenta iniciar sesión.');
      } else {
        setError(err?.message || 'Error al enviar la solicitud de registro');
      }
      createToast('Error en el registro', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-restaurant-theme flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Luces de fondo */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Botón flotante superior */}
      <div className="w-full max-w-lg mb-3 flex justify-between items-center z-10">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:text-white transition-all shadow-md active:scale-95"
        >
          <ArrowLeft size={14} className="text-amber-400" />
          <span>Volver al Login</span>
        </Link>

        <span className="text-[11px] text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
          SaaS para Restaurantes
        </span>
      </div>

      <div className="w-full max-w-lg bg-food-card border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        {registroExitoso ? (
          <div className="text-center space-y-5 py-4 animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <h2 className="text-2xl font-display font-black text-white">
                ¡Solicitud Recibida!
              </h2>
              <p className="text-amber-400 font-semibold text-sm mt-1">
                {registroExitoso}
              </p>
            </div>

            <div className="p-4 bg-neutral-950/80 rounded-2xl border border-neutral-800 text-xs text-neutral-300 space-y-2.5 text-left">
              <div className="flex items-start gap-2.5">
                <Clock size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <p>
                  Tu solicitud ha sido enviada al <strong>Super Administrador</strong> para su revisión y activación.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <Store size={16} className="text-sky-400 shrink-0 mt-0.5" />
                <p>
                  Una vez aprobada tu cuenta, podrás ingresar y gestionar tu propio <strong>Dashboard, POS, Productos, Ventas, Inventario y Reportes</strong>.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => navigate('/login')}
                className="text-xs"
              >
                Ir a Iniciar Sesión
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={() => navigate('/')}
                className="text-xs font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                Ir a la Tienda
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header del Formulario */}
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-2 border border-amber-500/30">
                <Store size={24} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-black text-white">
                Registra tu Restaurante
              </h1>
              <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                Lleva el control de tus ventas, inventario y pedidos con nuestro sistema administrativo integral.
              </p>
            </div>

            {error && (
              <div className="rounded-xl bg-red-950/40 border border-red-900/50 p-3 text-xs text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Nombre del Negocio *"
                  value={nombreNegocio}
                  onChange={(e) => setNombreNegocio(e.target.value)}
                  placeholder="Ej: El Punto Fast Food"
                  required
                />
                <Input
                  label="Nombre del Propietario *"
                  value={nombrePropietario}
                  onChange={(e) => setNombrePropietario(e.target.value)}
                  placeholder="Ej: Carlos Pérez"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="WhatsApp de Contacto *"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej: 300 987 6543"
                  required
                />
                <Input
                  label="Ciudad / Barrio"
                  value={ciudad}
                  onChange={(e) => setCiudad(e.target.value)}
                  placeholder="Ej: Cúcuta - Centro"
                />
              </div>

              <Input
                label="Dirección del Local (Opcional)"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej: Av. 5 # 10-20"
              />

              <Input
                label="Correo Electrónico para Administrador *"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@elpunto.com"
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Contraseña *"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  required
                />
                <Input
                  label="Confirmar Contraseña *"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  required
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  fullWidth
                  loading={loading}
                  disabled={loading}
                  className="text-xs font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400 py-3 shadow-lg shadow-amber-500/20"
                >
                  Solicitar Activación de Cuenta
                </Button>
              </div>
            </form>

            <div className="pt-2 text-center border-t border-neutral-800/80">
              <p className="text-xs text-neutral-400">
                ¿Ya tienes una cuenta registrada?{' '}
                <Link to="/login" className="text-amber-400 font-semibold hover:underline">
                  Inicia sesión aquí
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default RegistroNegocioPage;
