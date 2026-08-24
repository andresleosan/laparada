import { useState } from 'react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '../components/ui/Card';
import { StatsCard } from '../components/reportes/StatsCard';
import { Badge } from '../components/ui/Badge';

interface DashboardData {
  nps: number;
  satisfaccion: number;
  clientesLeales: number;
  puntosDistribuidos: number;
  tiempoPromedioEntrega: number;
  tiempoAhorrado: number;
  tendencia: 'mejorando' | 'estable' | 'empeorando';
  ventasHoy: number;
}

export default function AnalyticsPage() {
  const [data] = useState<DashboardData>({
    nps: 42,
    satisfaccion: 8.2,
    clientesLeales: 147,
    puntosDistribuidos: 45320,
    tiempoPromedioEntrega: 28,
    tiempoAhorrado: 156,
    tendencia: 'mejorando',
    ventasHoy: 23,
  });

  // Datos para gráficos
  const dataEntregas = [
    { hora: '8am', entregas: 2, estimado: 3 },
    { hora: '9am', entregas: 5, estimado: 6 },
    { hora: '10am', entregas: 8, estimado: 9 },
    { hora: '11am', entregas: 12, estimado: 10 },
    { hora: '12pm', entregas: 18, estimado: 16 },
    { hora: '1pm', entregas: 14, estimado: 15 },
    { hora: '2pm', entregas: 9, estimado: 10 },
  ];

  const dataTiers = [
    { name: 'Bronce', value: 234, fill: '#8D7855' },
    { name: 'Plata', value: 156, fill: '#C0C0C0' },
    { name: 'Oro', value: 89, fill: '#FFD700' },
    { name: 'Platino', value: 34, fill: '#E5E4E2' },
  ];

  const dataSatisfaccion = [
    { name: 'Positivos', value: 287, fill: '#22C55E' },
    { name: 'Neutral', value: 98, fill: '#FBBF24' },
    { name: 'Negativos', value: 28, fill: '#EF4444' },
  ];

  const getTendenciaColor = () => {
    if (data.tendencia === 'mejorando') return 'text-green-600';
    if (data.tendencia === 'empeorando') return 'text-red-600';
    return 'text-gray-600';
  };

  const getTendenciaIcon = () => {
    if (data.tendencia === 'mejorando') return '📈';
    if (data.tendencia === 'empeorando') return '📉';
    return '➡️';
  };

  return (
    <div className="min-h-screen bg-base-dark pb-28 pt-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="pb-2 border-b border-neutral-800">
          <h1 className="text-2xl sm:text-3xl font-bold text-white font-display">Analytics & Inteligencia Artificial</h1>
          <p className="mt-1 text-xs sm:text-sm text-neutral-400">Panel de satisfacción, retención y predicción de entregas</p>
        </div>

        {/* KPIs Principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatsCard
            title="NPS Score"
            value={`${data.nps}`}
            subtitle="Net Promoter Score"
            icon={<span className="text-sm">📊</span>}
            trend={data.nps > 40 ? 'up' : 'down'}
          />
          <StatsCard
            title="Satisfacción"
            value={`${data.satisfaccion}/10`}
            subtitle="Calificación promedio"
            icon={<span className="text-sm">😊</span>}
            trend={data.satisfaccion > 8 ? 'up' : 'down'}
          />
          <StatsCard
            title="Clientes Leales"
            value={data.clientesLeales.toString()}
            subtitle="Programa de lealtad"
            icon={<span className="text-sm">⭐</span>}
            trend="up"
          />
          <StatsCard
            title="Puntos Distribuidos"
            value={`${Math.floor(data.puntosDistribuidos / 1000)}k`}
            subtitle="Puntos acumulados"
            icon={<span className="text-sm">🎁</span>}
            trend="up"
          />
        </div>

        {/* Métricas de Entrega y Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Tiempo de Entrega */}
          <Card className="p-4 bg-neutral-900/90 border-neutral-800 flex flex-col justify-between">
            <div className="pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-semibold text-white">Predicción vs Real</h3>
              <p className="text-xs text-neutral-400">Tiempos de despacho</p>
            </div>
            <div className="py-4">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={dataEntregas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="hora" stroke="#888" fontSize={11} />
                  <YAxis stroke="#888" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: '#171717', border: '1px solid #333', borderRadius: '8px' }} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="entregas"
                    stroke="#EAB308"
                    strokeWidth={2}
                    name="Reales"
                  />
                  <Line
                    type="monotone"
                    dataKey="estimado"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Predicción AI"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-3 pt-3 border-t border-neutral-800 space-y-1">
                <p className="text-xs text-neutral-400">
                  ⏱️ Tiempo promedio: <span className="font-semibold text-white">{data.tiempoPromedioEntrega} min</span>
                </p>
                <p className="text-xs text-neutral-400">
                  ⚡ Tiempo ahorrado hoy: <span className="font-semibold text-emerald-400">{data.tiempoAhorrado} min</span>
                </p>
              </div>
            </div>
          </Card>

          {/* Distribución de Tiers */}
          <Card className="p-4 bg-neutral-900/90 border-neutral-800 flex flex-col justify-between">
            <div className="pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-semibold text-white">Clientes por Tier</h3>
              <p className="text-xs text-neutral-400">Segmentación de lealtad</p>
            </div>
            <div className="py-4 flex flex-col items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={dataTiers}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={65}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dataTiers.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 grid grid-cols-2 gap-2 w-full pt-3 border-t border-neutral-800">
                {dataTiers.map((tier) => (
                  <div key={tier.name} className="text-xs text-neutral-300 flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px]">{tier.name}</Badge>
                    <span className="font-semibold text-white">{tier.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Satisfacción */}
          <Card className="p-4 bg-neutral-900/90 border-neutral-800 flex flex-col justify-between">
            <div className="pb-3 border-b border-neutral-800">
              <h3 className="text-sm font-semibold text-white">Sentimiento de Clientes</h3>
              <p className="text-xs text-neutral-400">Feedback post-venta</p>
            </div>
            <div className="py-4 flex flex-col items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={dataSatisfaccion}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={65}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dataSatisfaccion.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 text-center pt-3 border-t border-neutral-800 w-full">
                <p className={`text-base font-bold ${getTendenciaColor()} flex items-center justify-center gap-1.5`}>
                  <span>{getTendenciaIcon()}</span>
                  <span>Tendencia: {data.tendencia.charAt(0).toUpperCase() + data.tendencia.slice(1)}</span>
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Funcionalidades de IA */}
        <Card className="p-5 bg-neutral-900/90 border-neutral-800">
          <h3 className="text-sm font-semibold text-white mb-4">Módulos Inteligentes Activos</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-lg">🤖</span>
                <h4 className="font-semibold text-white text-xs sm:text-sm">Análisis de Sentimiento</h4>
              </div>
              <p className="text-xs text-neutral-400">Comprende emociones de clientes en mensajes</p>
            </div>

            <div className="bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-lg">⏱️</span>
                <h4 className="font-semibold text-white text-xs sm:text-sm">Predicción de Tiempos</h4>
              </div>
              <p className="text-xs text-neutral-400">Estima entregas con alta precisión según cocina</p>
            </div>

            <div className="bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-lg">💬</span>
                <h4 className="font-semibold text-white text-xs sm:text-sm">Respuestas Contextuales</h4>
              </div>
              <p className="text-xs text-neutral-400">Bot genera respuestas personalizadas de pedidos</p>
            </div>

            <div className="bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-lg">🎁</span>
                <h4 className="font-semibold text-white text-xs sm:text-sm">Programa de Lealtad</h4>
              </div>
              <p className="text-xs text-neutral-400">Sistema de puntos y recompensas automáticas</p>
            </div>

            <div className="bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-lg">📋</span>
                <h4 className="font-semibold text-white text-xs sm:text-sm">Encuestas Post-Entrega</h4>
              </div>
              <p className="text-xs text-neutral-400">Recolecta feedback automático por WhatsApp</p>
            </div>

            <div className="bg-neutral-950/60 p-3.5 rounded-xl border border-neutral-800">
              <div className="flex items-center gap-2.5 mb-1.5">
                <span className="text-lg">📊</span>
                <h4 className="font-semibold text-white text-xs sm:text-sm">Métricas Unificadas</h4>
              </div>
              <p className="text-xs text-neutral-400">Visión de 360° del rendimiento del restaurante</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
