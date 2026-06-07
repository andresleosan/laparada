// src/pages/GastosPage.tsx
import React, { useState } from 'react';
import { Gasto, CategoriaGasto, Jornada } from '@/types';
import {
  crearGasto,
  getTodosGastos,
  eliminarGasto,
  getGastosPorCategoriaAgrupados,
} from '@/services/gastosService';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { createToast } from '@/components/ui/Toast';
import { formatCOP } from '@/utils/formatCOP';
import { DollarSign, Plus, Trash2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

const categorias: CategoriaGasto[] = ['salarios', 'servicios', 'insumos', 'mantenimiento', 'otros'];
const categoriaEmoji: Record<CategoriaGasto, string> = {
  salarios: '👨‍💼',
  servicios: '⚡',
  insumos: '📦',
  mantenimiento: '🔧',
  otros: '❓',
};

const jornadas: Jornada[] = ['mañana', 'noche', 'ambas'];

export function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [creandoGasto, setCreandoGasto] = useState(false);

  // Form state
  const [descripcion, setDescripcion] = useState('');
  const [montoStr, setMontoStr] = useState('');
  const [categoria, setCategoria] = useState<CategoriaGasto>('otros');
  const [jornada, setJornada] = useState<Jornada>('ambas');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar gastos
  React.useEffect(() => {
    const cargarGastos = async () => {
      try {
        const datos = await getTodosGastos();
        setGastos(datos);
      } catch (err) {
        console.error('Error cargando gastos:', err);
      } finally {
        setLoading(false);
      }
    };

    cargarGastos();
  }, []);

  const handleCrearGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!descripcion.trim()) newErrors.descripcion = 'Descripción requerida';
    if (!montoStr.trim()) newErrors.monto = 'Monto requerido';
    if (isNaN(Number(montoStr))) newErrors.monto = 'Monto debe ser número';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const monto = Number(montoStr) * 1000; // Convertir a centavos
      const data: Omit<Gasto, 'id'> = {
        descripcion: descripcion.trim(),
        monto,
        categoria,
        jornada,
        fecha: Timestamp.now(),
      };

      await crearGasto(data);
      createToast({ title: '✅ Gasto registrado', type: 'success' });

      // Refrescar
      const datos = await getTodosGastos();
      setGastos(datos);

      // Limpiar form
      setDescripcion('');
      setMontoStr('');
      setCategoria('otros');
      setJornada('ambas');
      setErrors({});
      setCreandoGasto(false);
    } catch (err) {
      createToast({ title: '❌ Error al crear', type: 'error' });
    }
  };

  const handleEliminarGasto = async (id: string) => {
    if (!window.confirm('¿Eliminar este gasto?')) return;
    try {
      await eliminarGasto(id);
      createToast({ title: '✅ Gasto eliminado', type: 'success' });

      const datos = await getTodosGastos();
      setGastos(datos);
    } catch (err) {
      createToast({ title: '❌ Error al eliminar', type: 'error' });
    }
  };

  const totalGastos = gastos.reduce((sum, g) => sum + (g.monto || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-dark pb-24 pt-6">
        <div className="mx-auto max-w-4xl px-4">
          <h1 className="mb-6 text-3xl font-bold text-white">Gastos y Cierre</h1>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-dark pb-24 pt-6">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white">Gastos y Cierre</h1>
          <p className="mt-2 text-neutral-400">
            Total: <span className="text-lg font-bold text-red-400">{formatCOP(totalGastos)}</span>
          </p>
        </div>

        {/* Botón crear */}
        <div className="mb-6">
          <Button
            onClick={() => setCreandoGasto(!creandoGasto)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            {creandoGasto ? 'Cancelar' : 'Registrar Gasto'}
          </Button>
        </div>

        {/* Form crear gasto */}
        {creandoGasto && (
          <Card className="mb-6 p-4">
            <form onSubmit={handleCrearGasto} className="space-y-3">
              <Input
                label="Descripción"
                value={descripcion}
                onChange={(e) => {
                  setDescripcion(e.target.value);
                  if (errors.descripcion) setErrors({ ...errors, descripcion: '' });
                }}
                placeholder="Ej: Pago de luz"
                error={errors.descripcion}
              />

              <Input
                label="Monto (miles COP)"
                type="number"
                step="0.5"
                value={montoStr}
                onChange={(e) => {
                  setMontoStr(e.target.value);
                  if (errors.monto) setErrors({ ...errors, monto: '' });
                }}
                placeholder="Ej: 50 (= $50.000)"
                error={errors.monto}
              />

              <Select label="Categoría" value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaGasto)}>
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>
                    {categoriaEmoji[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </Select>

              <Select label="Jornada" value={jornada} onChange={(e) => setJornada(e.target.value as Jornada)}>
                {jornadas.map((j) => (
                  <option key={j} value={j}>
                    {j === 'mañana' ? '🌅' : j === 'noche' ? '🌙' : '📅'} {j}
                  </option>
                ))}
              </Select>

              <Button type="submit" variant="primary" className="w-full">
                Registrar Gasto
              </Button>
            </form>
          </Card>
        )}

        {/* Listado */}
        {gastos.length === 0 ? (
          <EmptyState icon={DollarSign} title="Sin gastos" description="Registra tu primer gasto" />
        ) : (
          <div className="space-y-3">
            {gastos.map((gasto) => (
              <Card key={gasto.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-white">{gasto.descripcion}</span>
                      <Badge variant="outline">
                        {categoriaEmoji[gasto.categoria]} {gasto.categoria}
                      </Badge>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-sm text-neutral-400">
                      <span>
                        {gasto.fecha?.toDate
                          ? gasto.fecha.toDate().toLocaleDateString()
                          : 'N/A'}
                      </span>
                      <span>•</span>
                      <span>{gasto.jornada}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-400">{formatCOP(gasto.monto)}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleEliminarGasto(gasto.id)}
                      title="Eliminar"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
