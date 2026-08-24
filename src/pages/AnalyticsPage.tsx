import { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card } from '../components/ui/Card';
import { StatsCard } from '../components/reportes/StatsCard';
import { Badge } from '../components/ui/Badge';
import { TrendingUp, Truck, ChefHat, Sparkles } from 'lucide-react';

export default function AnalyticsPage() {
  const [jornadaFiltro, setJornadaFiltro] = useState<'todas' | 'mañana' | 'noche'>('todas');

  // Datos reales simulados de Demanda Hora a Hora (Cocina y Despacho)
  const demandaHoraria = [
    { hora: '8:00', real: 4, proyectado: 5, turno: 'mañana' },
    { hora: '9:00', real: 8, proyectado: 9, turno: 'mañana' },
    { hora: '10:00', real: 14, proyectado: 12, turno: 'mañana' },
    { hora: '11:00', real: 22, proyectado: 20, turno: 'mañana' },
    { hora: '12:00', real: 38, proyectado: 35, turno: 'mañana' }, // Pico Almuerzo
    { hora: '13:00', real: 32, proyectado: 30, turno: 'mañana' },
    { hora: '14:00', real: 16, proyectado: 15, turno: 'mañana' },
    { hora: '17:00', real: 10, proyectado: 12, turno: 'noche' },
    { hora: '18:00', real: 28, proyectado: 25, turno: 'noche' },
    { hora: '19:00', real: 46, proyectado: 42, turno: 'noche' }, // Pico Cena
    { hora: '20:00', real: 40, proyectado: 38, turno: 'noche' },
    { hora: '21:00', real: 26, proyectado: 24, turno: 'noche' },
    { hora: '22:00', real: 12, proyectado: 10, turno: 'noche' },
  ];

  // Productos con Mayor Rentabilidad y Rotación
  const productosRentabilidad = [
    { producto: 'Hamburguesa Especial', ventas: 142, margen: 64, ingreso: 2840000 },
    { producto: 'Perro Caliente Suizo', ventas: 118, margen: 58, ingreso: 1770000 },
    { producto: 'Salchipapa Suprema', ventas: 95, margen: 62, ingreso: 1900000 },
    { producto: 'Combo Pareja XL', ventas: 74, margen: 68, ingreso: 2590000 },
    { producto: 'Desayuno Criollo', ventas: 88, margen: 55, ingreso: 1408000 },
    { producto: 'Bebidas & Jugos', ventas: 210, margen: 72, ingreso: 1260000 },
  ];

  // Canales de Entrada de Pedidos
  const canalesVenta = [
    { name: 'WhatsApp Bot', value: 46, fill: '#22C55E' },
    { name: 'POS Local', value: 34, fill: '#EAB308' },
    { name: 'Tienda Web / Landing', value: 20, fill: '#3B82F6' },
  ];

  // Métodos de Pago
  const metodosPago = [
    { name: 'Transferencias (Nequi/Daviplata)', value: 52, fill: '#A855F7' },
    { name: 'Efectivo', value: 38, fill: '#10B981' },
    { name: 'Pasarelas Digitales', value: 10, fill: '#38BDF8' },
  ];

  // Logística y Tiempos de Entrega
  const metricasLogistica = [
    { barrio: 'Centro / La Floresta', tiempo: 18, pedidos: 85, satisfaccion: 9.6 },
    { barrio: 'San Fernando', tiempo: 22, pedidos: 64, satisfaccion: 9.2 },
    { barrio: 'Los Pinos', tiempo: 26, pedidos: 42, satisfaccion: 8.8 },
    { barrio: 'Zona Industrial', tiempo: 29, pedidos: 30, satisfaccion: 8.5 },
  ];

  const demandaFiltrada =
    jornadaFiltro === 'todas'
      ? demandaHoraria
      : demandaHoraria.filter((d) => d.turno === jornadaFiltro);

  return (
    <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">
              Analytics & Business Intelligence (BI)
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-neutral-400">
              Análisis predictivo del comportamiento operativo, rentabilidad de productos y logística
            </p>
          </div>

          {/* Selector de Jornada */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setJornadaFiltro('todas')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                jornadaFiltro === 'todas'
                  ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40'
                  : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
              }`}
            >
              📅 Día Completo
            </button>
            <button
              onClick={() => setJornadaFiltro('mañana')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                jornadaFiltro === 'mañana'
                  ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40'
                  : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
              }`}
            >
              🌅 Mañana
            </button>
            <button
              onClick={() => setJornadaFiltro('noche')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                jornadaFiltro === 'noche'
                  ? 'bg-gold-400/20 text-gold-400 border border-gold-400/40'
                  : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white'
              }`}
            >
              🌙 Noche
            </button>
          </div>
        </div>

        {/* KPIs Principales de Comportamiento del Negocio */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard
            title="Ticket Promedio"
            value="$29.400"
            subtitle="+8.4% vs semana anterior"
            icon={<span className="text-sm">💵</span>}
            trend="up"
          />
          <StatsCard
            title="Tiempo Despacho"
            value="21 min"
            subtitle="Promedio preparación"
            icon={<span className="text-sm">⏱️</span>}
            trend="up"
          />
          <StatsCard
            title="Margen Operativo"
            value="63.5%"
            subtitle="Rentabilidad bruta sobre ventas"
            icon={<span className="text-sm">📈</span>}
            trend="up"
          />
          <StatsCard
            title="Tasa Cumplimiento"
            value="94.2%"
            subtitle="Entregas dentro de ventana"
            icon={<span className="text-sm">🛵</span>}
            trend="up"
          />
        </div>

        {/* Fila 1: Demanda Horaria en Cocina + Recomendaciones Operativas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Gráfico de Demanda Hora a Hora */}
          <Card className="lg:col-span-2 p-4 bg-neutral-900/90 border-neutral-800 flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <TrendingUp size={16} className="text-gold-400" />
                  Comportamiento y Picos de Demanda por Hora
                </h3>
                <p className="text-xs text-neutral-400">Órdenes reales vs modelo predictivo de pedidos</p>
              </div>
              <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30">
                Precisión 92.4%
              </Badge>
            </div>

            <div className="py-3">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={demandaFiltrada}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="hora" stroke="#888" fontSize={11} />
                  <YAxis stroke="#888" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }} />
                  <Legend />
                  <Line type="monotone" dataKey="real" stroke="#EAB308" strokeWidth={2.5} name="Órdenes Reales" />
                  <Line
                    type="monotone"
                    dataKey="proyectado"
                    stroke="#10B981"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    name="Pronóstico IA"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-2 p-3 bg-neutral-950/60 rounded-xl border border-neutral-800 flex items-start gap-2.5">
              <Sparkles size={16} className="text-gold-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-neutral-300">
                <strong>Recomendación Operativa:</strong> Mayor concentración estimada entre <strong>12:00-13:30</strong> (Almuerzo) y <strong>19:00-21:00</strong> (Cena). Se recomienda tener mise en place listo 30 min antes y activar 2 domiciliarios de refuerzo.
              </p>
            </div>
          </Card>

          {/* Canales de Entrada y Medios de Pago */}
          <div className="space-y-4">
            {/* Canales de Venta */}
            <Card className="p-4 bg-neutral-900/90 border-neutral-800">
              <h3 className="text-sm font-semibold text-white mb-2">Canales de Pedido</h3>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={canalesVenta} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value">
                    {canalesVenta.map((entry, index) => (
                      <Cell key={`cell-canal-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-1 pt-2 border-t border-neutral-800 text-[11px] text-center">
                {canalesVenta.map((c) => (
                  <div key={c.name} className="truncate">
                    <p className="text-neutral-400 truncate">{c.name.split(' ')[0]}</p>
                    <p className="font-bold text-white">{c.value}%</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Medios de Pago */}
            <Card className="p-4 bg-neutral-900/90 border-neutral-800">
              <h3 className="text-sm font-semibold text-white mb-2">Distribución de Pagos</h3>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={metodosPago} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value">
                    {metodosPago.map((entry, index) => (
                      <Cell key={`cell-pago-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-3 gap-1 pt-2 border-t border-neutral-800 text-[11px] text-center">
                <div>
                  <p className="text-neutral-400">Transferencias</p>
                  <p className="font-bold text-purple-400">52%</p>
                </div>
                <div>
                  <p className="text-neutral-400">Efectivo</p>
                  <p className="font-bold text-emerald-400">38%</p>
                </div>
                <div>
                  <p className="text-neutral-400">Digitales</p>
                  <p className="font-bold text-sky-400">10%</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Fila 2: Rentabilidad y Rotación de Productos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Productos Estrella y Ventas */}
          <Card className="p-4 bg-neutral-900/90 border-neutral-800 flex flex-col justify-between">
            <div className="pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ChefHat size={16} className="text-gold-400" />
                Ventas y Rentabilidad por Producto
              </h3>
              <p className="text-xs text-neutral-400">Volumen vendido vs porcentaje de margen</p>
            </div>
            <div className="py-3">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={productosRentabilidad} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis type="number" stroke="#888" fontSize={11} />
                  <YAxis dataKey="producto" type="category" stroke="#888" fontSize={10} width={110} />
                  <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="ventas" fill="#EAB308" name="Unidades Vendidas" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="margen" fill="#10B981" name="% Margen Ganancia" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 text-xs text-neutral-400 flex justify-between pt-2 border-t border-neutral-800">
              <span>🌟 Producto más rentable: <strong>Combo Pareja XL (68%)</strong></span>
              <span>🔥 Más vendido: <strong>Hamburguesa Especial</strong></span>
            </div>
          </Card>

          {/* Eficiencia Logística por Barrio */}
          <Card className="p-4 bg-neutral-900/90 border-neutral-800 flex flex-col justify-between">
            <div className="pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <Truck size={16} className="text-gold-400" />
                Eficiencia y Cobertura de Domicilios
              </h3>
              <p className="text-xs text-neutral-400">Tiempos promedio de entrega y pedidos por zona</p>
            </div>
            <div className="space-y-2.5 py-2">
              {metricasLogistica.map((item, idx) => (
                <div key={idx} className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800 flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-white text-xs">{item.barrio}</h4>
                    <p className="text-[11px] text-neutral-400 mt-0.5">📦 {item.pedidos} entregas este mes</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-xs text-emerald-400">{item.tiempo} min prom.</span>
                    <p className="text-[10px] text-neutral-400">⭐ {item.satisfaccion} satisfacción</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 p-2.5 bg-blue-950/30 rounded-xl border border-blue-900/40 text-xs text-blue-300">
              🛵 <strong>Ahorro en Rutas:</strong> La agrupación de pedidos en zona Floresta ahorró 4.2 horas de recorrido esta semana.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
