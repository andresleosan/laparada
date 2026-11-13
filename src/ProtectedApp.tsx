import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { NegocioProvider, useNegocio } from '@/context/NegocioContext';
import { AdminShell } from '@/components/layout/AdminShell';
import { LoginPage } from '@/pages/LoginPage';
import { canAccessAdmin } from '@/security/adminAuthorization';
import { auth } from '@/services/firebase';

const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((module) => ({ default: module.DashboardPage })));
const POSPage = lazy(() => import('@/pages/POSPage').then((module) => ({ default: module.POSPage })));
const ProductosPage = lazy(() => import('@/pages/ProductosPage').then((module) => ({ default: module.ProductosPage })));
const InventarioPage = lazy(() => import('@/pages/InventarioPage').then((module) => ({ default: module.InventarioPage })));
const DomiciliosPage = lazy(() => import('@/pages/DomiciliosPage').then((module) => ({ default: module.DomiciliosPage })));
const ReservasPage = lazy(() => import('@/pages/ReservasPage').then((module) => ({ default: module.ReservasPage })));
const VentasPage = lazy(() => import('@/pages/VentasPage').then((module) => ({ default: module.VentasPage })));
const GastosPage = lazy(() => import('@/pages/GastosPage').then((module) => ({ default: module.GastosPage })));
const ReportesPage = lazy(() => import('@/pages/ReportesPage').then((module) => ({ default: module.ReportesPage })));
const BotConfigPage = lazy(() => import('@/pages/BotConfigPage').then((module) => ({ default: module.BotConfigPage })));
const AdminSettingsPage = lazy(() => import('@/pages/AdminSettingsPage').then((module) => ({ default: module.AdminSettingsPage })));
const WhatsAppPage = lazy(() => import('@/pages/WhatsAppPage').then((module) => ({ default: module.WhatsAppPage })));
const ChatsPage = lazy(() => import('@/pages/ChatsPage').then((module) => ({ default: module.ChatsPage })));
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage'));
const SuperAdminNegociosPage = lazy(() => import('@/pages/SuperAdminNegociosPage').then((module) => ({ default: module.SuperAdminNegociosPage })));
const RegistroNegocioPage = lazy(() => import('@/pages/RegistroNegocioPage').then((module) => ({ default: module.RegistroNegocioPage })));
const RepartidorPage = lazy(() => import('@/pages/RepartidorPage').then((module) => ({ default: module.RepartidorPage })));
const ClientesPage = lazy(() => import('@/pages/ClientesPage').then((module) => ({ default: module.ClientesPage })));
const CocinaPage = lazy(() => import('@/pages/CocinaPage').then((module) => ({ default: module.CocinaPage })));
const MesasPage = lazy(() => import('@/pages/MesasPage').then((module) => ({ default: module.MesasPage })));
const ProveedoresPage = lazy(() => import('@/pages/ProveedoresPage').then((module) => ({ default: module.ProveedoresPage })));
const PersonalPage = lazy(() => import('@/pages/PersonalPage').then((module) => ({ default: module.PersonalPage })));
const KioscoPage = lazy(() => import('@/pages/KioscoPage').then((module) => ({ default: module.KioscoPage })));
const TurnosSalonPage = lazy(() => import('@/pages/TurnosSalonPage').then((module) => ({ default: module.TurnosSalonPage })));
const AuditoriaPage = lazy(() => import('@/pages/AuditoriaPage').then((module) => ({ default: module.AuditoriaPage })));
const MeserosPage = lazy(() => import('@/pages/MeserosPage').then((module) => ({ default: module.MeserosPage })));
const PromocionesPage = lazy(() => import('@/pages/PromocionesPage').then((module) => ({ default: module.PromocionesPage })));
const NotificacionesPage = lazy(() => import('@/pages/NotificacionesPage').then((module) => ({ default: module.NotificacionesPage })));
const FacturacionPage = lazy(() => import('@/pages/FacturacionPage').then((module) => ({ default: module.FacturacionPage })));
const ContabilidadPage = lazy(() => import('@/pages/ContabilidadPage').then((module) => ({ default: module.ContabilidadPage })));
const SatisfaccionPage = lazy(() => import('@/pages/SatisfaccionPage').then((module) => ({ default: module.SatisfaccionPage })));
const TandasPage = lazy(() => import('@/pages/TandasPage').then((module) => ({ default: module.TandasPage })));
const EsperaPage = lazy(() => import('@/pages/EsperaPage').then((module) => ({ default: module.EsperaPage })));

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-base-dark flex items-center justify-center" role="status">
      <div className="animate-spin h-8 w-8 border-4 border-gold-400 border-t-transparent rounded-full" />
      <span className="sr-only">Cargando...</span>
    </div>
  );
}

function ProtectedLayout() {
  const { user, loading: authLoading } = useAuth();
  const {
    cargandoNegocio,
    identidadResueltaUid,
    estadoAprobacion,
    esSuperAdmin,
    usuarioNegocio,
  } = useNegocio();

  if (
    authLoading
    || cargandoNegocio
    || (!user && Boolean(auth?.currentUser))
    || (Boolean(user) && identidadResueltaUid !== user?.uid)
  ) {
    return <LoadingSpinner />;
  }

  if (
    !canAccessAdmin({
      isAuthenticated: Boolean(user),
      isSuperAdmin: esSuperAdmin,
      profile: usuarioNegocio,
    })
  ) {
    return <Navigate to="/login" replace />;
  }

  if (!esSuperAdmin && estadoAprobacion !== 'activo') {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = esSuperAdmin || usuarioNegocio?.rol === 'admin';
  const isCourier = usuarioNegocio?.rol === 'domiciliario';
  const isCook = usuarioNegocio?.rol === 'cocinero';

  const defaultHome = isCourier
    ? <Navigate to="/repartidor" replace />
    : isCook
      ? <Navigate to="/cocina" replace />
      : <DashboardPage />;

  return (
    <AdminShell>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
            <Route path="/" element={defaultHome} />
            <Route path="/admin" element={defaultHome} />
            <Route path="/cocina" element={<CocinaPage />} />
            <Route path="/kds" element={<CocinaPage />} />
            <Route path="/mesas" element={<MesasPage />} />
            <Route path="/salon" element={<MesasPage />} />
            <Route path="/espera" element={<EsperaPage />} />
            <Route path="/lista-espera" element={<EsperaPage />} />
            <Route path="/walk-ins" element={<EsperaPage />} />
            <Route path="/meseros" element={<MeserosPage />} />
            <Route path="/camareros" element={<MeserosPage />} />
            <Route path="/promociones" element={isAdmin ? <PromocionesPage /> : <Navigate to="/admin" replace />} />
            <Route path="/happy-hour" element={isAdmin ? <PromocionesPage /> : <Navigate to="/admin" replace />} />
            <Route path="/cupones" element={isAdmin ? <PromocionesPage /> : <Navigate to="/admin" replace />} />
            <Route path="/repartidor" element={<RepartidorPage />} />
            <Route path="/mis-entregas" element={<RepartidorPage />} />
            <Route path="/pos" element={isCourier ? <Navigate to="/repartidor" replace /> : isCook ? <Navigate to="/cocina" replace /> : <POSPage />} />
            <Route path="/tandas" element={<TandasPage />} />
            <Route path="/vitrina" element={<TandasPage />} />
            <Route path="/kiosco" element={<KioscoPage />} />
            <Route path="/turnos" element={<TurnosSalonPage />} />
            <Route path="/llamador" element={<TurnosSalonPage />} />
            <Route path="/productos" element={isAdmin ? <ProductosPage /> : <Navigate to="/admin" replace />} />
            <Route path="/ventas" element={<VentasPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/inventario" element={isAdmin ? <InventarioPage /> : <Navigate to="/admin" replace />} />
            <Route path="/gastos" element={<GastosPage />} />
            <Route path="/proveedores" element={isAdmin ? <ProveedoresPage /> : <Navigate to="/admin" replace />} />
            <Route path="/personal" element={isAdmin ? <PersonalPage /> : <Navigate to="/admin" replace />} />
            <Route path="/nomina" element={isAdmin ? <PersonalPage /> : <Navigate to="/admin" replace />} />
            <Route path="/domicilios" element={<DomiciliosPage />} />
            <Route path="/reservas" element={<ReservasPage />} />
            <Route path="/notificaciones" element={<NotificacionesPage />} />
            <Route path="/alertas" element={<NotificacionesPage />} />
            <Route path="/bandeja-alertas" element={<NotificacionesPage />} />
            <Route path="/chats" element={<ChatsPage />} />
            <Route path="/pedidos" element={<WhatsAppPage />} />
            <Route path="/whatsapp" element={<WhatsAppPage />} />
            <Route path="/reportes" element={<ReportesPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/auditoria" element={isAdmin ? <AuditoriaPage /> : <Navigate to="/admin" replace />} />
            <Route path="/seguridad" element={isAdmin ? <AuditoriaPage /> : <Navigate to="/admin" replace />} />
            <Route path="/bitacora" element={isAdmin ? <AuditoriaPage /> : <Navigate to="/admin" replace />} />
            <Route path="/facturacion" element={isAdmin ? <FacturacionPage /> : <Navigate to="/admin" replace />} />
            <Route path="/resolucion-dian" element={isAdmin ? <FacturacionPage /> : <Navigate to="/admin" replace />} />
            <Route path="/comprobante-z" element={isAdmin ? <FacturacionPage /> : <Navigate to="/admin" replace />} />
            <Route path="/contabilidad" element={isAdmin ? <ContabilidadPage /> : <Navigate to="/admin" replace />} />
            <Route path="/libro-fiscal" element={isAdmin ? <ContabilidadPage /> : <Navigate to="/admin" replace />} />
            <Route path="/conciliacion" element={isAdmin ? <ContabilidadPage /> : <Navigate to="/admin" replace />} />
            <Route path="/impoconsumo-310" element={isAdmin ? <ContabilidadPage /> : <Navigate to="/admin" replace />} />
            <Route path="/satisfaccion" element={<SatisfaccionPage />} />
            <Route path="/calificaciones" element={<SatisfaccionPage />} />
            <Route path="/nps" element={<SatisfaccionPage />} />
            <Route path="/encuestas" element={<SatisfaccionPage />} />
            <Route path="/bot" element={isAdmin ? <BotConfigPage /> : <Navigate to="/admin" replace />} />
            <Route
              path="/admin-settings"
              element={
                isAdmin
                  ? <AdminSettingsPage />
                  : <Navigate to="/admin" replace />
              }
            />
            <Route
              path="/super-admin/negocios"
              element={
                esSuperAdmin
                  ? <SuperAdminNegociosPage />
                  : <Navigate to="/admin" replace />
              }
            />
            <Route
              path="/superadmin/negocios"
              element={
                esSuperAdmin
                  ? <SuperAdminNegociosPage />
                  : <Navigate to="/admin" replace />
              }
            />
            <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </AdminShell>
  );
}

function ProtectedRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/registro-negocio"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <RegistroNegocioPage />
          </Suspense>
        }
      />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
}

export default function ProtectedApp() {
  return (
    <AuthProvider>
      <NegocioProvider>
        <ProtectedRouter />
      </NegocioProvider>
    </AuthProvider>
  );
}
