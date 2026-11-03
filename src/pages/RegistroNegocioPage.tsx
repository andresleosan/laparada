// src/pages/RegistroNegocioPage.tsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Store,
  CheckCircle2,
  ArrowLeft,
  Clock,
  Sparkles,
  Phone,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createToast } from '@/components/ui/Toast';
import { solicitarRegistroNegocio } from '@/services/negociosService';
import { PLANES_SAAS, TipoPlanSaaS } from '@/types/negocio';
import { formatCOP } from '@/utils/formatCOP';

export function RegistroNegocioPage() {
  const [nombreNegocio, setNombreNegocio] = useState('');
  const [nombrePropietario, setNombrePropietario] = useState('');
  const [telefono, setTelefono] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [direccion, setDireccion] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [planDeseado, setPlanDeseado] = useState<TipoPlanSaaS>('prueba_3d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registroExitoso, setRegistroExitoso] = useState<{
    nombre: string;
    plan: TipoPlanSaaS;
  } | null>(null);

  const navigate = useNavigate();

  const planesDisponibles: TipoPlanSaaS[] = [
    'prueba_3d',
    'semanal_7d',
    'quincenal_15d',
    'mensual_30d',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (
      !nombreNegocio.trim() ||
      !nombrePropietario.trim() ||
      !telefono.trim() ||
      !email.trim() ||
      !password
    ) {
      setError('Por favor completa todos los campos obligatorios (*)');
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
        planDeseado,
      });

      setRegistroExitoso({
        nombre: nombreNegocio.trim(),
        plan: planDeseado,
      });
      createToast('🎉 Solicitud de registro enviada con éxito', 'success');
    } catch (err: unknown) {
      console.error('Error al registrar negocio:', err);
      const code = err && typeof err === 'object' && 'code' in err ? String((err as { code: unknown }).code) : '';
      if (code === 'auth/email-already-in-use') {
        setError('El correo electrónico ya se encuentra registrado. Intenta iniciar sesión.');
      } else {
        const msg = err instanceof Error ? err.message : 'Error al registrar el negocio';
        setError(msg);
      }
      createToast('Error en la solicitud de registro', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-restaurant-theme flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Resplandores visuales de fondo */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Botón superior de navegación */}
      <header className="w-full max-w-2xl mb-4 flex justify-between items-center z-10">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:text-white transition-all shadow-md active:scale-95 min-h-[44px]"
        >
          <ArrowLeft className="h-4 w-4 text-amber-400" />
          <span>Volver al Login</span>
        </Link>

        <span className="text-xs text-amber-400 font-bold bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-lg">
          Plataforma SaaS Multi-Tenant
        </span>
      </header>

      <main className="w-full max-w-2xl bg-neutral-900/95 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
        {registroExitoso ? (
          <div className="text-center space-y-6 py-6 animate-in fade-in duration-300">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-black text-white">
                ¡Solicitud Recibida con Éxito!
              </h1>
              <p className="text-amber-400 font-bold text-base mt-1">
                {registroExitoso.nombre}
              </p>
            </div>

            <div className="p-5 bg-neutral-950/80 rounded-2xl border border-neutral-800 text-xs sm:text-sm text-neutral-300 space-y-3.5 text-left">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  Tu solicitud ha sido registrada en estado <strong>Pendiente de Aprobación</strong> con el plan{' '}
                  <strong className="text-amber-400 font-bold">{PLANES_SAAS[registroExitoso.plan].nombre}</strong> ({formatCOP(PLANES_SAAS[registroExitoso.plan].precioCOP)}).
                </p>
              </div>

              <div className="flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  El <strong>Super Administrador</strong> verificará el pago acordado (en efectivo o transferencia directa) y activará tu acceso inmediatamente.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
                <p>
                  ¿Deseas activar tu cuenta más rápido? Escribe directamente al Super Administrador por WhatsApp indicando el nombre de tu local.
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => navigate('/login')}
                className="min-h-[44px] text-xs font-bold"
              >
                Ir a Iniciar Sesión
              </Button>
              <Button
                variant="primary"
                fullWidth
                onClick={() => navigate('/')}
                className="min-h-[44px] text-xs font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                Volver a la Tienda
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header del Formulario */}
            <div className="text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3 border border-amber-500/30">
                <Store className="h-6 w-6" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-black text-white">
                Registra tu Restaurante o Puesto
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-md mx-auto">
                Control de ventas, catálogo digital, pedidos por WhatsApp con Sarin IA y Punto de Venta POS.
              </p>
            </div>

            {error && (
              <div role="alert" className="rounded-xl bg-red-950/60 border border-red-500/50 p-3 text-xs text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Selector de Plan SaaS */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-2">
                  Selecciona tu Plan Deseado *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {planesDisponibles.map((planKey) => {
                    const plan = PLANES_SAAS[planKey];
                    const selected = planDeseado === planKey;
                    return (
                      <button
                        key={planKey}
                        type="button"
                        onClick={() => setPlanDeseado(planKey)}
                        aria-pressed={selected}
                        className={`text-left p-3.5 rounded-2xl border transition-all flex flex-col justify-between min-h-[44px] ${
                          selected
                            ? 'bg-amber-500/10 border-amber-500 shadow-md ring-1 ring-amber-500'
                            : 'bg-neutral-950/60 border-neutral-800 hover:border-neutral-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-white text-xs sm:text-sm block">
                              {plan.nombre}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              {plan.dias} días de servicio
                            </span>
                          </div>
                          <span className="font-display font-black text-amber-400 text-sm">
                            {formatCOP(plan.precioCOP)}
                          </span>
                        </div>

                        <div className="mt-2 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <Sparkles className="h-3 w-3" />
                            {plan.cuotaRespuestasIA.toLocaleString('es-CO')} respuestas IA
                          </span>
                          {selected ? (
                            <span className="h-5 w-5 rounded-full bg-amber-500 text-neutral-950 flex items-center justify-center">
                              <Check className="h-3.5 w-3.5 stroke-[3]" />
                            </span>
                          ) : (
                            <span className="h-5 w-5 rounded-full border border-neutral-700" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Datos del Negocio y Propietario */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="Nombre del Negocio o Puesto *"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                  placeholder="Ej: Cúcuta - Los Patios"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                  className="min-h-[48px] text-xs font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400 shadow-lg shadow-amber-500/20"
                >
                  Solicitar Activación de Cuenta
                </Button>
              </div>
            </form>

            <div className="pt-2 text-center border-t border-neutral-800">
              <p className="text-xs text-neutral-400">
                ¿Ya tienes una cuenta registrada?{' '}
                <Link to="/login" className="text-amber-400 font-semibold hover:underline">
                  Inicia sesión aquí
                </Link>
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default RegistroNegocioPage;

