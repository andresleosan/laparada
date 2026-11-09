import type { LucideIcon } from 'lucide-react';
import {
  Award,
  BarChart3,
  Bell,
  Bike,
  Bot,
  Boxes,
  Building2,
  CalendarDays,
  ChefHat,
  CircleDollarSign,
  ClipboardList,
  FileText,
  Fingerprint,
  Flame,
  MessagesSquare,
  LineChart,
  LayoutDashboard,
  PackageSearch,
  Percent,
  Receipt,
  Scale,
  Settings2,
  ShieldCheck,
  ShoppingBag,
  Smile,
  Store,
  Tablet,
  Truck,
  Tv,
  UserCheck,
  Users,
  Utensils,
} from 'lucide-react';

export type AdminSection = 'Operación' | 'Gestión' | 'Análisis' | 'Sistema';

export type LiveBadgeKey = 'cocina' | 'mesas' | 'domicilios';

export interface AdminRouteMeta {
  path: string;
  title: string;
  shortTitle: string;
  description: string;
  section: AdminSection;
  icon: LucideIcon;
  aliases?: string[];
  access?: 'all' | 'admin' | 'superadmin';
  external?: boolean;
  badgeKey?: LiveBadgeKey;
}

export interface AdminNavigationGroup {
  label: AdminSection;
  items: AdminRouteMeta[];
}

export interface AdminNavigationAccess {
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isDelivery?: boolean;
  isCook?: boolean;
}

const navigationGroups: AdminNavigationGroup[] = [
  {
    label: 'Operación',
    items: [
      {
        path: '/admin',
        title: 'Dashboard',
        shortTitle: 'Inicio',
        description: 'Pulso de ventas, caja y pedidos del turno.',
        section: 'Operación',
        icon: LayoutDashboard,
        aliases: ['/'],
      },
      {
        path: '/pos',
        title: 'Punto de venta',
        shortTitle: 'POS',
        description: 'Arma el pedido, cobra y registra la venta.',
        section: 'Operación',
        icon: ChefHat,
      },
      {
        path: '/mesas',
        title: 'Modo mesas y salón',
        shortTitle: 'Mesas',
        description: 'Control de mesas en vivo, cuentas abiertas y comandas.',
        section: 'Operación',
        icon: Utensils,
        aliases: ['/salon'],
        badgeKey: 'mesas',
      },
      {
        path: '/pedidos',
        title: 'Pedidos',
        shortTitle: 'Pedidos',
        description: 'Gestiona pedidos entrantes y conversaciones.',
        section: 'Operación',
        icon: ClipboardList,
        aliases: ['/whatsapp'],
      },
      {
        path: '/chats',
        title: 'Chats de la tienda',
        shortTitle: 'Chats',
        description: 'Responde a quien escribe desde la tienda web.',
        section: 'Operación',
        icon: MessagesSquare,
      },
      {
        path: '/domicilios',
        title: 'Domicilios',
        shortTitle: 'Domicilios',
        description: 'Sigue preparación, despacho y entrega.',
        section: 'Operación',
        icon: Truck,
        badgeKey: 'domicilios',
      },
      {
        path: '/repartidor',
        title: 'Portal Repartidor',
        shortTitle: 'Repartidor',
        description: 'Tus entregas asignadas, navegación GPS y cobro.',
        section: 'Operación',
        icon: Bike,
        aliases: ['/mis-entregas'],
      },
      {
        path: '/cocina',
        title: 'Pantalla de cocina (KDS)',
        shortTitle: 'Cocina',
        description: 'Comandas en tiempo real, tiempos y preparación.',
        section: 'Operación',
        icon: Flame,
        aliases: ['/kds'],
        badgeKey: 'cocina',
      },
      {
        path: '/kiosco',
        title: 'Kiosco de Autoservicio',
        shortTitle: 'Kiosco',
        description: 'Terminal táctil para clientes y emisión de turnos.',
        section: 'Operación',
        icon: Tablet,
      },
      {
        path: '/turnos',
        title: 'Pantalla de Turnos',
        shortTitle: 'Turnos',
        description: 'Llamador de pedidos para TV y pantallas de salón.',
        section: 'Operación',
        icon: Tv,
        aliases: ['/llamador'],
      },
      {
        path: '/reservas',
        title: 'Reservas y agenda',
        shortTitle: 'Reservas',
        description: 'Agenda de mesas y reservas de comensales.',
        section: 'Operación',
        icon: CalendarDays,
      },
      {
        path: '/notificaciones',
        title: 'Centro de notificaciones y alertas',
        shortTitle: 'Alertas',
        description: 'Alertas operativas de cocina, pedidos, bodega y salón.',
        section: 'Operación',
        icon: Bell,
        aliases: ['/alertas', '/bandeja-alertas'],
      },
    ],
  },
  {
    label: 'Gestión',
    items: [
      {
        path: '/productos',
        title: 'Productos y combos',
        shortTitle: 'Productos',
        description: 'Administra catálogo, precios y disponibilidad.',
        section: 'Gestión',
        icon: ShoppingBag,
        access: 'admin',
      },
      {
        path: '/inventario',
        title: 'Inventario',
        shortTitle: 'Inventario',
        description: 'Controla existencias y alertas de reposición.',
        section: 'Gestión',
        icon: Boxes,
        access: 'admin',
      },
      {
        path: '/ventas',
        title: 'Ventas',
        shortTitle: 'Ventas',
        description: 'Consulta el historial y los medios de pago.',
        section: 'Gestión',
        icon: Receipt,
      },
      {
        path: '/clientes',
        title: 'Directorio de Clientes',
        shortTitle: 'Clientes',
        description: 'Historial, compras frecuentes y direcciones.',
        section: 'Gestión',
        icon: Users,
      },
      {
        path: '/gastos',
        title: 'Gastos',
        shortTitle: 'Gastos',
        description: 'Registra y revisa egresos operativos.',
        section: 'Gestión',
        icon: CircleDollarSign,
      },
      {
        path: '/proveedores',
        title: 'Proveedores y Cuentas por Pagar',
        shortTitle: 'Proveedores',
        description: 'Compras a crédito, plazos y programación de pagos.',
        section: 'Gestión',
        icon: Building2,
        access: 'admin',
      },
      {
        path: '/personal',
        title: 'Personal, Turnos y Nómina',
        shortTitle: 'Personal',
        description: 'Turnos, reparto de propinas, vales y liquidación.',
        section: 'Gestión',
        icon: UserCheck,
        aliases: ['/nomina'],
        access: 'admin',
      },
      {
        path: '/meseros',
        title: 'Gestión de Meseros y Salón',
        shortTitle: 'Meseros',
        description: 'Desempeño, comisiones, propinas y mesas asignadas.',
        section: 'Gestión',
        icon: Award,
        aliases: ['/camareros', '/atencion-salon'],
      },
      {
        path: '/promociones',
        title: 'Promociones y Happy Hour',
        shortTitle: 'Promociones',
        description: 'Descuentos automatizados, 2x1 y cupones QR.',
        section: 'Gestión',
        icon: Percent,
        aliases: ['/happy-hour', '/cupones'],
        access: 'admin',
      },
      {
        path: '/facturacion',
        title: 'Facturación & Documento POS',
        shortTitle: 'Facturación',
        description: 'Resolución DIAN, Comprobante Z y control de Impoconsumo.',
        section: 'Gestión',
        icon: FileText,
        aliases: ['/resolucion-dian', '/comprobante-z'],
        access: 'admin',
      },
    ],
  },
  {
    label: 'Análisis',
    items: [
      {
        path: '/reportes',
        title: 'Reportes',
        shortTitle: 'Reportes',
        description: 'Balance y composición del resultado.',
        section: 'Análisis',
        icon: BarChart3,
      },
      {
        path: '/analytics',
        title: 'Analytics',
        shortTitle: 'Analytics',
        description: 'Tendencias y señales de la operación.',
        section: 'Análisis',
        icon: LineChart,
      },
      {
        path: '/auditoria',
        title: 'Auditoría y Bitácora Forense',
        shortTitle: 'Auditoría',
        description: 'Log inmutable de anulaciones, cortesías, mermas y accesos.',
        section: 'Análisis',
        icon: Fingerprint,
        aliases: ['/seguridad', '/bitacora'],
        access: 'admin',
      },
      {
        path: '/contabilidad',
        title: 'Conciliación & Libro Fiscal',
        shortTitle: 'Contabilidad',
        description: 'Libro diario Art. 616 E.T., Formulario 310 y exportación a Siigo/World Office.',
        section: 'Análisis',
        icon: Scale,
        aliases: ['/libro-fiscal', '/conciliacion', '/impoconsumo-310'],
        access: 'admin',
      },
      {
        path: '/satisfaccion',
        title: 'Satisfacción y Reseñas',
        shortTitle: 'Satisfacción',
        description: 'Encuestas post-venta, índice NPS, quejas y Google Reviews.',
        section: 'Análisis',
        icon: Smile,
        aliases: ['/calificaciones', '/nps', '/encuestas'],
      },
    ],
  },
  {
    label: 'Sistema',
    items: [
      {
        path: '/bot',
        title: 'Automatización',
        shortTitle: 'Bot',
        description: 'Configura respuestas y comportamiento del bot.',
        section: 'Sistema',
        icon: Bot,
        access: 'admin',
      },
      {
        path: '/admin-settings',
        title: 'Configuración y equipo',
        shortTitle: 'Configuración',
        description: 'Gestiona negocio, accesos y operadores.',
        section: 'Sistema',
        icon: Settings2,
        access: 'admin',
      },
      {
        path: '/super-admin/negocios',
        title: 'Locales y Planes SaaS',
        shortTitle: 'Locales SaaS',
        description: 'Planes por días, cuota de Sarin IA y solicitudes.',
        section: 'Sistema',
        icon: ShieldCheck,
        access: 'superadmin',
        aliases: ['/superadmin/negocios'],
      },
      {
        path: '/',
        title: 'Tienda virtual',
        shortTitle: 'Ver tienda',
        description: 'Abre la experiencia pública del negocio.',
        section: 'Sistema',
        icon: Store,
        external: true,
      },
    ],
  },
];

const mobileAdminPrimaryPaths = ['/admin', '/pos', '/pedidos', '/productos'];
const mobileCashierPrimaryPaths = ['/admin', '/pos', '/pedidos', '/domicilios'];
const mobileDeliveryPrimaryPaths = ['/repartidor', '/domicilios', '/pedidos', '/admin'];
const mobileCookPrimaryPaths = ['/cocina', '/pedidos', '/admin'];

function canSeeItem(item: AdminRouteMeta, access: AdminNavigationAccess) {
  if (item.access === 'superadmin') return access.isSuperAdmin;
  if (item.access === 'admin') return access.isAdmin || access.isSuperAdmin;
  return true;
}

export function getVisibleAdminNavigation(
  access: AdminNavigationAccess
): AdminNavigationGroup[] {
  return navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canSeeItem(item, access)),
    }))
    .filter((group) => group.items.length > 0);
}

export function getMobilePrimaryItems(access: AdminNavigationAccess): AdminRouteMeta[] {
  const items = navigationGroups.flatMap((group) => group.items);
  let primaryPaths = mobileCashierPrimaryPaths;
  if (access.isCook) {
    primaryPaths = mobileCookPrimaryPaths;
  } else if (access.isDelivery) {
    primaryPaths = mobileDeliveryPrimaryPaths;
  } else if (access.isAdmin || access.isSuperAdmin) {
    primaryPaths = mobileAdminPrimaryPaths;
  }
  return primaryPaths
    .map((path) => items.find((item) => item.path === path))
    .filter((item): item is AdminRouteMeta => Boolean(item) && canSeeItem(item as AdminRouteMeta, access));
}

export function getAdminRouteMeta(pathname: string): AdminRouteMeta {
  const normalizedPath = pathname !== '/' && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname;
  const match = navigationGroups
    .flatMap((group) => group.items)
    .find((item) => (
      item.path === normalizedPath
      || item.aliases?.includes(normalizedPath)
    ));

  return match ?? {
    path: '/admin',
    title: 'Panel administrativo',
    shortTitle: 'Panel',
    description: 'Gestiona la operación del negocio.',
    section: 'Operación',
    icon: PackageSearch,
  };
}

export function isAdminRouteActive(pathname: string, itemPath: string): boolean {
  const item = navigationGroups
    .flatMap((group) => group.items)
    .find((candidate) => candidate.path === itemPath);

  if (!item) return false;
  return pathname === item.path || Boolean(item.aliases?.includes(pathname));
}
