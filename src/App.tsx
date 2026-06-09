// src/App.tsx
import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { JornadaProvider } from '@/context/JornadaContext';
import { BotProvider } from '@/context/BotContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { BottomNav } from '@/components/layout/BottomNav';
import { Header } from '@/components/layout/Header';
import { LoginPage } from '@/pages/LoginPage';
import { ToastContainer } from '@/components/ui/Toast';

// Lazy load todas las páginas
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const POSPage = lazy(() => import('@/pages/POSPage').then(m => ({ default: m.POSPage })));
const ProductosPage = lazy(() => import('@/pages/ProductosPage').then(m => ({ default: m.ProductosPage })));
const InventarioPage = lazy(() => import('@/pages/InventarioPage').then(m => ({ default: m.InventarioPage })));
const DomiciliosPage = lazy(() => import('@/pages/DomiciliosPage').then(m => ({ default: m.DomiciliosPage })));
const VentasPage = lazy(() => import('@/pages/VentasPage').then(m => ({ default: m.VentasPage })));
const GastosPage = lazy(() => import('@/pages/GastosPage').then(m => ({ default: m.GastosPage })));
const ReportesPage = lazy(() => import('@/pages/ReportesPage').then(m => ({ default: m.ReportesPage })));
const BotConfigPage = lazy(() => import('@/pages/BotConfigPage').then(m => ({ default: m.BotConfigPage })));
const AdminSettingsPage = lazy(() => import('@/pages/AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage })));
const PagosPage = lazy(() => import('@/pages/PagosPage').then(m => ({ default: m.PagosPage })));
const WhatsAppPage = lazy(() => import('@/pages/WhatsAppPage').then(m => ({ default: m.WhatsAppPage })));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then(m => ({ default: m.default })));
const Phase10DashboardPage = lazy(() => import('@/pages/Phase10DashboardPage').then(m => ({ default: m.default })));

// Componente Loading Spinner
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-base-dark flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-gold-400 border-t-transparent rounded-full" />
    </div>
  );
}

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
      <Header />
      <main className="min-h-screen bg-base-dark">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/pos" element={<POSPage />} />
            <Route path="/productos" element={<ProductosPage />} />
            <Route path="/inventario" element={<InventarioPage />} />
            <Route path="/domicilios" element={<DomiciliosPage />} />
            <Route path="/ventas" element={<VentasPage />} />
            <Route path="/gastos" element={<GastosPage />} />
            <Route path="/reportes" element={<ReportesPage />} />
            <Route path="/pagos" element={<PagosPage />} />
            <Route path="/whatsapp" element={<WhatsAppPage />} />
            <Route path="/bot" element={<BotConfigPage />} />
            <Route path="/admin-settings" element={<AdminSettingsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/phase10" element={<Phase10DashboardPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
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
              <ToastContainer position="top-right" />
            </BrowserRouter>
          </BotProvider>
        </JornadaProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
