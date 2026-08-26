import { Suspense, lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { ToastContainer } from '@/components/ui/Toast';
import { LandingTiendaPage } from '@/pages/LandingTiendaPage';

const ProtectedApp = lazy(() => import('@/ProtectedApp'));

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-base-dark flex items-center justify-center" role="status">
      <div className="animate-spin h-8 w-8 border-4 border-gold-400 border-t-transparent rounded-full" />
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingTiendaPage />} />
      <Route path="/tienda" element={<LandingTiendaPage />} />
      <Route
        path="/*"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <ProtectedApp />
          </Suspense>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRouter />
        <ToastContainer position="top-right" />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
