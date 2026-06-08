// src/pages/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/services/firebase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createToast } from '@/components/ui/Toast';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
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
          navigate('/');
          return;
        } else {
          throw new Error('Email y contraseña requeridos');
        }
      }
      
      await signInWithEmailAndPassword(auth, email, password);
      createToast('¡Sesión iniciada!', 'success');
      navigate('/');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al iniciar sesión';
      setError(message);
      createToast('Error al iniciar sesión', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    try {
      if (!auth) {
        // Modo DEMO: crear usuario sin Firebase
        localStorage.setItem('demo_user', JSON.stringify({ email, uid: 'demo_' + Date.now() }));
        createToast('✅ Cuenta creada en MODO DEMO', 'success');
        navigate('/');
        return;
      }

      await createUserWithEmailAndPassword(auth, email, password);
      createToast('¡Cuenta creada! Iniciando sesión...', 'success');
      navigate('/');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error al crear cuenta';
      setError(message);
      createToast('Error al crear cuenta', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo / Header */}
        <div className="text-center">
          <h1 className="text-4xl font-display font-bold text-gold-400 mb-2">
            La Parada
          </h1>
          <p className="text-neutral-400">Sistema de Administración</p>
        </div>

        {/* Form */}
        <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="tu@email.com"
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

          {isSignUp && (
            <Input
              label="Confirmar Contraseña"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              required
            />
          )}

          {error && (
            <div className="rounded-lg bg-status-error/20 border border-status-error p-3">
              <p className="text-sm text-status-error">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            fullWidth
            loading={loading}
            disabled={loading}
            size="lg"
          >
            {isSignUp ? 'Crear Cuenta' : 'Iniciar Sesión'}
          </Button>

          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setEmail('');
              setPassword('');
              setConfirmPassword('');
            }}
            className="w-full text-center text-sm text-neutral-400 hover:text-gold-400 transition"
            disabled={loading}
          >
            {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-neutral-500">
          Desarrollado por Andrés Santiago © 2026
        </p>
      </div>
    </div>
  );
}
