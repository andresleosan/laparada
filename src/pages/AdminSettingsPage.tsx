import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { createToast } from '@/components/ui/Toast';
import { changeAdminPin } from '@/services/changePinService';
import { initializeAdminPin } from '@/services/initPinService';

export function AdminSettingsPage() {
  const navigate = useNavigate();

  // Change PIN form state
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Initialize PIN form state
  const [initPin, setInitPin] = useState('');
  const [initConfirmPin, setInitConfirmPin] = useState('');
  const [initLoading, setInitLoading] = useState(false);
  const [initErrors, setInitErrors] = useState<Record<string, string>>({});
  const [initShowPasswords, setInitShowPasswords] = useState<Record<string, boolean>>({});
  const [showInitForm, setShowInitForm] = useState(false);

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Validations
    if (!currentPin.trim()) {
      newErrors.currentPin = 'PIN actual requerido';
    }
    if (!newPin.trim()) {
      newErrors.newPin = 'PIN nuevo requerido';
    }
    if (!confirmPin.trim()) {
      newErrors.confirmPin = 'Confirmación requerida';
    }

    // Validate PIN format (6 digits)
    if (newPin && !/^\d{6}$/.test(newPin)) {
      newErrors.newPin = 'PIN debe ser 6 dígitos';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const result = await changeAdminPin(currentPin, newPin, confirmPin);

      createToast({
        title: '✅ ' + result.message,
        type: 'success',
      });

      // Clear form
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');

      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error: any) {
      const errorMessage = error.message || 'Error al cambiar PIN';
      
      // Detect if PIN needs initialization
      if (errorMessage.includes('No se encontró configuración de PIN')) {
        setShowInitForm(true);
        createToast({
          title: '⚠️ Necesitas inicializar el PIN primero',
          type: 'info',
        });
      } else {
        createToast({
          title: '❌ ' + errorMessage,
          type: 'error',
        });

        // Set specific error if it's about PIN validation
        if (errorMessage.includes('incorrecto')) {
          setErrors({ currentPin: 'PIN actual incorrecto' });
        } else if (errorMessage.includes('no coinciden')) {
          setErrors({ confirmPin: 'Los PINs no coinciden' });
        } else if (errorMessage.includes('diferente')) {
          setErrors({ newPin: 'El nuevo PIN debe ser diferente' });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInitializePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    // Validations
    if (!initPin.trim()) {
      newErrors.initPin = 'PIN requerido';
    }
    if (!initConfirmPin.trim()) {
      newErrors.initConfirmPin = 'Confirmación requerida';
    }

    // Validate PIN format (6 digits)
    if (initPin && !/^\d{6}$/.test(initPin)) {
      newErrors.initPin = 'PIN debe ser 6 dígitos';
    }

    // Validate PINs match
    if (initPin && initConfirmPin && initPin !== initConfirmPin) {
      newErrors.initConfirmPin = 'Los PINs no coinciden';
    }

    if (Object.keys(newErrors).length > 0) {
      setInitErrors(newErrors);
      return;
    }

    setInitLoading(true);
    setInitErrors({});

    try {
      const result = await initializeAdminPin(initPin);

      createToast({
        title: '✅ ' + result.message,
        type: 'success',
      });

      // Clear form
      setInitPin('');
      setInitConfirmPin('');
      setShowInitForm(false);

      // Update current PIN to the initialized value for immediate change
      setCurrentPin(initPin);
    } catch (error: any) {
      const errorMessage = error.message || 'Error al inicializar PIN';
      createToast({
        title: '❌ ' + errorMessage,
        type: 'error',
      });

      if (errorMessage.includes('ya existe')) {
        setInitErrors({ initPin: 'La configuración de PIN ya existe' });
      }
    } finally {
      setInitLoading(false);
    }
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords({
      ...showPasswords,
      [field]: !showPasswords[field],
    });
  };

  const toggleInitPasswordVisibility = (field: string) => {
    setInitShowPasswords({
      ...initShowPasswords,
      [field]: !initShowPasswords[field],
    });
  };

  return (
    <div className="min-h-screen bg-base-dark pb-24 pt-6">
      <div className="mx-auto max-w-2xl px-4">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            title="Volver"
          >
            <ArrowLeft size={20} className="text-neutral-400" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <Settings size={28} />
              Configuración de Administrador
            </h1>
            <p className="mt-2 text-neutral-400">Gestiona la seguridad de tu cuenta</p>
          </div>
        </div>

        {/* Form Card */}
        <Card className="p-6">
          {/* Initialization Form - Show if PIN not configured */}
          {showInitForm && (
            <form onSubmit={handleInitializePinSubmit} className="space-y-4 mb-8 pb-8 border-b border-neutral-700">
              <div className="rounded-lg bg-yellow-500/10 border border-yellow-500/30 p-4 mb-6">
                <p className="text-sm text-yellow-300">
                  ⚠️ El PIN no está inicializado. Por favor crea un PIN de 6 dígitos para comenzar.
                </p>
              </div>

              {/* Initialize PIN */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  PIN para Inicializar*
                </label>
                <div className="relative">
                  <input
                    type={initShowPasswords['initPin'] ? 'text' : 'password'}
                    value={initPin}
                    onChange={(e) => setInitPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className={`w-full bg-neutral-800 border rounded-lg px-4 py-2 pr-10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 ${
                      initErrors.initPin ? 'border-red-500 focus:ring-red-500' : 'border-neutral-700 focus:ring-gold'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => toggleInitPasswordVisibility('initPin')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  >
                    {initShowPasswords['initPin'] ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {initErrors.initPin && <p className="mt-1 text-sm text-red-400">{initErrors.initPin}</p>}
              </div>

              {/* Confirm PIN */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Confirmar PIN*
                </label>
                <div className="relative">
                  <input
                    type={initShowPasswords['initConfirmPin'] ? 'text' : 'password'}
                    value={initConfirmPin}
                    onChange={(e) => setInitConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className={`w-full bg-neutral-800 border rounded-lg px-4 py-2 pr-10 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 ${
                      initErrors.initConfirmPin ? 'border-red-500 focus:ring-red-500' : 'border-neutral-700 focus:ring-gold'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => toggleInitPasswordVisibility('initConfirmPin')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  >
                    {initShowPasswords['initConfirmPin'] ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {initErrors.initConfirmPin && <p className="mt-1 text-sm text-red-400">{initErrors.initConfirmPin}</p>}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                loading={initLoading}
                disabled={initLoading || !initPin || !initConfirmPin}
              >
                Inicializar PIN
              </Button>
            </form>
          )}

          {/* Change PIN Form */}
          <form onSubmit={handleChangePinSubmit} className="space-y-4">
            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-4 mb-6">
              <p className="text-sm text-blue-300">
                ℹ️ El PIN administrativo se utiliza para confirmar acciones sensibles como
                eliminar productos, gastos y ventas. Mantén tu PIN seguro y único.
              </p>
            </div>

            {/* Current PIN */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                PIN Actual*
              </label>
              <div className="relative">
                <input
                  type={showPasswords.currentPin ? 'text' : 'password'}
                  value={currentPin}
                  onChange={(e) => {
                    setCurrentPin(e.target.value);
                    if (errors.currentPin) {
                      setErrors({ ...errors, currentPin: '' });
                    }
                  }}
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  disabled={loading}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 pr-10 text-white placeholder-neutral-500 focus:border-gold focus:outline-none disabled:opacity-50 tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('currentPin')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  disabled={loading}
                >
                  {showPasswords.currentPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.currentPin && (
                <p className="mt-1 text-xs text-red-500">{errors.currentPin}</p>
              )}
            </div>

            {/* New PIN */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                PIN Nuevo*
              </label>
              <div className="relative">
                <input
                  type={showPasswords.newPin ? 'text' : 'password'}
                  value={newPin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setNewPin(value);
                    if (errors.newPin) {
                      setErrors({ ...errors, newPin: '' });
                    }
                  }}
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  disabled={loading}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 pr-10 text-white placeholder-neutral-500 focus:border-gold focus:outline-none disabled:opacity-50 tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('newPin')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  disabled={loading}
                >
                  {showPasswords.newPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.newPin && <p className="mt-1 text-xs text-red-500">{errors.newPin}</p>}
              <p className="mt-1 text-xs text-neutral-400">Debe ser 6 dígitos</p>
            </div>

            {/* Confirm New PIN */}
            <div>
              <label className="block text-sm font-semibold text-white mb-2">
                Confirmar PIN Nuevo*
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirmPin ? 'text' : 'password'}
                  value={confirmPin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setConfirmPin(value);
                    if (errors.confirmPin) {
                      setErrors({ ...errors, confirmPin: '' });
                    }
                  }}
                  placeholder="000000"
                  inputMode="numeric"
                  maxLength={6}
                  disabled={loading}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 pr-10 text-white placeholder-neutral-500 focus:border-gold focus:outline-none disabled:opacity-50 tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirmPin')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  disabled={loading}
                >
                  {showPasswords.confirmPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPin && (
                <p className="mt-1 text-xs text-red-500">{errors.confirmPin}</p>
              )}
            </div>

            {/* Security Info */}
            <div className="rounded-lg bg-neutral-800 p-4 space-y-2">
              <p className="text-xs font-semibold text-neutral-300">🔒 Información de Seguridad:</p>
              <ul className="text-xs text-neutral-400 space-y-1 ml-4">
                <li>✓ El PIN se almacena hasheado en la base de datos</li>
                <li>✓ Nunca se transmite sin cifrar</li>
                <li>✓ Solo se valida en servidor seguro</li>
                <li>✓ No se guarda en el navegador</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  navigate('/');
                }}
                disabled={loading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={loading || !currentPin || !newPin || !confirmPin}
                className="flex-1"
              >
                {loading ? 'Guardando...' : 'Cambiar PIN'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
