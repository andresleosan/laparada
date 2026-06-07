// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { JornadaProvider } from '@/context/JornadaContext';
import { BotProvider } from '@/context/BotContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { BottomNav } from '@/components/layout/BottomNav';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { POSPage } from '@/pages/POSPage';
import { ProductosPage } from '@/pages/ProductosPage';
import { InventarioPage } from '@/pages/InventarioPage';
import { DomiciliosPage } from '@/pages/DomiciliosPage';
import { VentasPage } from '@/pages/VentasPage';
import { GastosPage } from '@/pages/GastosPage';
import { ReportesPage } from '@/pages/ReportesPage';
import { BotConfigPage } from '@/pages/BotConfigPage';
import { ToastContainer } from '@/components/ui/Toast';

/**
 * Componente protegido que solo muestra contenido si el usuario está autenticado
 */
function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-base-dark flex items-center justify-center">
        <div className="animate-spin">
          <div className="h-8 w-8 border-4 border-gold-400 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <main className="min-h-screen bg-base-dark">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/pos" element={<POSPage />} />
          <Route path="/productos" element={<ProductosPage />} />
          <Route path="/inventario" element={<InventarioPage />} />
          <Route path="/domicilios" element={<DomiciliosPage />} />
          <Route path="/ventas" element={<VentasPage />} />
          <Route path="/gastos" element={<GastosPage />} />
          <Route path="/reportes" element={<ReportesPage />} />
          <Route path="/bot" element={<BotConfigPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </>
  );
}

function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <JornadaProvider>
          <BotProvider>
            <BrowserRouter>
              <AppRouter />
              <ToastContainer position="bottom-right" />
            </BrowserRouter>
          </BotProvider>
        </JornadaProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
