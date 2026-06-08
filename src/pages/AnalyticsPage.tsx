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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Analytics & IA</h1>
          <p className="text-gray-600">Panel de control integrado con Claude API</p>
        </div>

        {/* KPIs Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="NPS Score"
            value={`${data.nps}`}
            subtitle="Net Promoter Score"
            icon="📊"
            trend={data.nps > 40 ? 'up' : 'down'}
          />
          <StatsCard
            title="Satisfacción"
            value={`${data.satisfaccion}/10`}
            subtitle="Promedio de clientes"
            icon="😊"
            trend={data.satisfaccion > 8 ? 'up' : 'down'}
          />
          <StatsCard
            title="Clientes Leales"
            value={data.clientesLeales.toString()}
            subtitle="Con programa de lealtad"
            icon="⭐"
            trend="up"
          />
          <StatsCard
            title="Puntos Distribuidos"
            value={`${Math.floor(data.puntosDistribuidos / 1000)}k`}
            subtitle="Puntos totales"
            icon="🎁"
            trend="up"
          />
        </div>

        {/* Métricas de Entrega */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Tiempo de Entrega */}
          <Card>
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Predicción vs Real</h3>
            </div>
            <div className="p-6">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dataEntregas}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hora" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="entregas"
                    stroke="#3B82F6"
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
              <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-600">
                  ⏱️ Tiempo promedio: <span className="font-semibold">{data.tiempoPromedioEntrega} min</span>
                </p>
                <p className="text-sm text-gray-600">
                  ⚡ Tiempo ahorrado hoy: <span className="font-semibold text-green-600">{data.tiempoAhorrado} min</span>
                </p>
              </div>
            </div>
          </Card>

          {/* Distribución de Tiers */}
          <Card>
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Clientes por Tier</h3>
            </div>
            <div className="p-6 flex flex-col items-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={dataTiers}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dataTiers.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-2 w-full">
                {dataTiers.map(tier => (
                  <div key={tier.name} className="text-sm text-gray-600">
                    <Badge className="mr-2">{tier.name}</Badge>
                    <span>{tier.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* Satisfacción */}
          <Card>
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">Sentimientos</h3>
            </div>
            <div className="p-6 flex flex-col items-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={dataSatisfaccion}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {dataSatisfaccion.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 text-center">
                <p className={`text-xl font-bold ${getTendenciaColor()}`}>
                  {getTendenciaIcon()} {data.tendencia.charAt(0).toUpperCase() + data.tendencia.slice(1)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Funcionalidades de IA */}
        <Card>
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Capacidades de IA Activas</h3>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-3">🤖</span>
                <h4 className="font-semibold text-gray-800">Análisis de Sentimiento</h4>
              </div>
              <p className="text-sm text-gray-600">Comprende emociones de clientes en tiempo real</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-3">⏱️</span>
                <h4 className="font-semibold text-gray-800">Predicción de Tiempos</h4>
              </div>
              <p className="text-sm text-gray-600">Estima entregas con 95% de precisión</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-3">💬</span>
                <h4 className="font-semibold text-gray-800">Respuestas Contextuales</h4>
              </div>
              <p className="text-sm text-gray-600">Bot genera respuestas personalizadas</p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-3">🎁</span>
                <h4 className="font-semibold text-gray-800">Programa de Lealtad</h4>
              </div>
              <p className="text-sm text-gray-600">Sistema de puntos y tiers automático</p>
            </div>

            <div className="bg-red-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-3">📋</span>
                <h4 className="font-semibold text-gray-800">Encuestas Automáticas</h4>
              </div>
              <p className="text-sm text-gray-600">Recolecta feedback post-entrega</p>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <span className="text-2xl mr-3">📊</span>
                <h4 className="font-semibold text-gray-800">Dashboard Unificado</h4>
              </div>
              <p className="text-sm text-gray-600">Vista completa de métricas en tiempo real</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
