// src/context/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/services/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    try {
      // Modo DEMO
      const demoUser = localStorage.getItem('demo_user');
      if (demoUser) {
        localStorage.removeItem('demo_user');
        setUser(null);
        return;
      }

      // Modo normal con Firebase
      if (auth) {
        await signOut(auth);
      }
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Verificar si hay usuario en DEMO mode
    const demoUser = localStorage.getItem('demo_user');
    
    if (!auth) {
      console.warn('Auth no está disponible - usando MODO DEMO');
      if (demoUser) {
        try {
          const userData = JSON.parse(demoUser);
          // Crear un objeto similar a User para DEMO
          setUser({
            email: userData.email,
            uid: userData.uid,
            displayName: userData.email?.split('@')[0] || 'Demo User',
          } as any);
        } catch (e) {
          console.error('Error parsing demo user:', e);
        }
      }
      setLoading(false);
      return;
    }

    // Modo normal con Firebase
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
}
