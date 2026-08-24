// src/App.tsx
import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NegocioProvider, useNegocio } from '@/context/NegocioContext';
import { JornadaProvider } from '@/context/JornadaContext';
import { BotProvider } from '@/context/BotContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { BottomNav } from '@/components/layout/BottomNav';
import { Header } from '@/components/layout/Header';
import { LoginPage } from '@/pages/LoginPage';
import { RegistroNegocioPage } from '@/pages/RegistroNegocioPage';
import { ToastContainer } from '@/components/ui/Toast';

// Lazy load páginas públicas y administrativas
const LandingTiendaPage = lazy(() => import('@/pages/LandingTiendaPage').then(m => ({ default: m.LandingTiendaPage })));
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
const WhatsAppPage = lazy(() => import('@/pages/WhatsAppPage').then(m => ({ default: m.WhatsAppPage })));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then(m => ({ default: m.default })));
const SuperAdminNegociosPage = lazy(() => import('@/pages/SuperAdminNegociosPage').then(m => ({ default: m.SuperAdminNegociosPage })));

// Componente Loading Spinner
function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-base-dark flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-4 border-gold-400 border-t-transparent rounded-full" />
    </div>
  );
}

/**
 * Componente protegido que solo muestra contenido si el usuario administrativo está autenticado
 */
function ProtectedLayout() {
  const { user, loading: authLoading } = useAuth();
  const { cargandoNegocio, estadoAprobacion, esSuperAdmin } = useNegocio();

  if (authLoading || cargandoNegocio) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si no es Super Admin y el negocio está pendiente o suspendido, redirigir al login
  if (!esSuperAdmin && estadoAprobacion !== 'activo') {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-base-dark">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/admin" element={<DashboardPage />} />
            <Route path="/pos" element={<POSPage />} />
            <Route path="/productos" element={<ProductosPage />} />
            <Route path="/ventas" element={<VentasPage />} />
            <Route path="/inventario" element={<InventarioPage />} />
            <Route path="/gastos" element={<GastosPage />} />
            <Route path="/domicilios" element={<DomiciliosPage />} />
            <Route path="/pedidos" element={<WhatsAppPage />} />
            <Route path="/whatsapp" element={<WhatsAppPage />} />
            <Route path="/reportes" element={<ReportesPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/bot" element={<BotConfigPage />} />
            <Route path="/admin-settings" element={<AdminSettingsPage />} />
            {/* Panel de Super Admin */}
            <Route path="/superadmin/negocios" element={<SuperAdminNegociosPage />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </Suspense>
      </main>
      <BottomNav />
    </>
  );
}

function AppRouter() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Ruta Pública: Tienda Virtual / Landing para Clientes */}
        <Route path="/" element={<LandingTiendaPage />} />
        <Route path="/tienda" element={<LandingTiendaPage />} />

        {/* Login Administrativo */}
        <Route path="/login" element={<LoginPage />} />

        {/* Registro Público de Nuevos Negocios */}
        <Route path="/registro-negocio" element={<RegistroNegocioPage />} />

        {/* Panel Administrativo y Operativo Protegido */}
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NegocioProvider>
          <JornadaProvider>
            <BotProvider>
              <BrowserRouter>
                <AppRouter />
                <ToastContainer position="top-right" />
              </BrowserRouter>
            </BotProvider>
          </JornadaProvider>
        </NegocioProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
