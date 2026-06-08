// src/pages/InventarioPage.tsx
import { useState } from 'react';
import { Insumo } from '@/types';
import { useInventario } from '@/hooks/useInventario';
import { Timestamp } from 'firebase/firestore';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { createToast } from '@/components/ui/Toast';
import { formatCOP } from '@/utils/formatCOP';
import { Plus, AlertTriangle, TrendingDown } from 'lucide-react';

type TabType = 'insumos' | 'bajo-stock';

export function InventarioPage() {
  const [tab, setTab] = useState<TabType>('insumos');
  const [crearOpen, setCrearOpen] = useState(false);
  const [nombreInsumo, setNombreInsumo] = useState('');
  const [stockInicial, setStockInicial] = useState('');
  const [costoUnitario, setCostoUnitario] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { insumos, insumosConBajoStock, loading, crear, refresh } =
    useInventario();

  const handleCrearInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!nombreInsumo.trim()) newErrors.nombre = 'Nombre requerido';
    if (!stockInicial.trim()) newErrors.stock = 'Stock inicial requerido';
    if (!costoUnitario.trim()) newErrors.costo = 'Costo unitario requerido';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const stock = Number(stockInicial);

      const insumoData: Omit<Insumo, 'id'> = {
        nombre: nombreInsumo.trim(),
        stockActual: stock,
        stockMinimo: 10,
        unidad: 'unidades',
        creadoEn: Timestamp.now(),
        actualizadoEn: Timestamp.now(),
      };

      await crear(insumoData);
      createToast('✅ Insumo creado correctamente', 'success');

      // Limpiar
      setNombreInsumo('');
      setStockInicial('');
      setCostoUnitario('');
      setCrearOpen(false);
      setErrors({});
      refresh();
    } catch (err) {
      createToast({ title: '❌ Error al crear', type: 'error' });
    }
  };

  const displayInsumos = tab === 'bajo-stock' ? insumosConBajoStock : insumos;

  if (loading) {
    return (
      <div className="min-h-screen bg-base-dark pb-24 pt-6">
        <div className="mx-auto max-w-4xl px-4">
          <h1 className="mb-6 text-3xl font-bold text-white">Inventario</h1>
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
          <h1 className="text-3xl font-bold text-white">Inventario</h1>
          <p className="mt-2 text-neutral-400">Gestión de insumos y stock</p>
        </div>

        {/* Botón crear */}
        <div className="mb-6">
          <Button
            onClick={() => setCrearOpen(!crearOpen)}
            variant="primary"
            className="flex items-center gap-2"
          >
            <Plus size={16} />
            {crearOpen ? 'Cancelar' : 'Crear Insumo'}
          </Button>
        </div>

        {/* Form crear insumo */}
        {crearOpen && (
          <Card className="mb-6 p-4">
            <form onSubmit={handleCrearInsumo} className="space-y-3">
              <Input
                label="Nombre del Insumo"
                value={nombreInsumo}
                onChange={(e) => {
                  setNombreInsumo(e.target.value);
                  if (errors.nombre) setErrors({ ...errors, nombre: '' });
                }}
                placeholder="Ej: Carne molida"
                error={errors.nombre}
              />
              <Input
                label="Stock Inicial"
                type="number"
                value={stockInicial}
                onChange={(e) => {
                  setStockInicial(e.target.value);
                  if (errors.stock) setErrors({ ...errors, stock: '' });
                }}
                placeholder="Ej: 50"
                error={errors.stock}
              />
              <Input
                label="Costo Unitario (miles COP)"
                type="number"
                step="0.5"
                value={costoUnitario}
                onChange={(e) => {
                  setCostoUnitario(e.target.value);
                  if (errors.costo) setErrors({ ...errors, costo: '' });
                }}
                placeholder="Ej: 5 (= $5.000)"
                error={errors.costo}
              />
              <Button type="submit" variant="primary" className="w-full">
                Crear Insumo
              </Button>
            </form>
          </Card>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-neutral-700">
          <button
            onClick={() => setTab('insumos')}
            className={`px-4 py-2 font-semibold transition-colors ${
              tab === 'insumos'
                ? 'border-b-2 border-gold text-gold'
                : 'border-b-2 border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            📦 Todos ({insumos.length})
          </button>
          <button
            onClick={() => setTab('bajo-stock')}
            className={`px-4 py-2 font-semibold transition-colors ${
              tab === 'bajo-stock'
                ? 'border-b-2 border-gold text-gold'
                : 'border-b-2 border-transparent text-neutral-400 hover:text-white'
            }`}
          >
            ⚠️ Bajo Stock ({insumosConBajoStock.length})
          </button>
        </div>

        {/* Contenido */}
        {displayInsumos.length === 0 ? (
          <EmptyState
            icon={tab === 'bajo-stock' ? AlertTriangle : TrendingDown}
            title={tab === 'bajo-stock' ? 'Stock normal' : 'Sin insumos'}
            description={
              tab === 'bajo-stock'
                ? 'Todos los insumos tienen stock suficiente'
                : 'Crea tu primer insumo'
            }
          />
        ) : (
          <div className="space-y-3">
            {displayInsumos.map((insumo) => {
              const porcentajeStock =
                ((insumo.stockActual || 0) / (insumo.stockMinimo || 10)) * 100;
              const isLowStock = (insumo.stockActual || 0) < (insumo.stockMinimo || 10);

              return (
                <Card key={insumo.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white">{insumo.nombre}</h3>

                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-neutral-400">Stock</span>
                          <span className={isLowStock ? 'text-red-400 font-bold' : 'text-white'}>
                            {insumo.stockActual || 0} {insumo.unidad}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-neutral-400">Costo Total</span>
                          <span className="text-gold font-bold">
                            {formatCOP(0)}
                          </span>
                        </div>

                        {/* Progress bar */}
                        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-neutral-700">
                          <div
                            className={`h-full transition-all ${
                              isLowStock ? 'bg-red-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(porcentajeStock, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Badges */}
                      <div className="mt-3 flex gap-2">
                        {isLowStock && (
                          <Badge variant="outline" className="border-red-500/50 bg-red-500/10 text-red-400 border">
                            ⚠️ Bajo Stock
                          </Badge>
                        )}
                        <Badge variant="outline">Mín: {insumo.stockMinimo || 10}</Badge>
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        title="Agregar stock"
                        disabled
                        className="opacity-50"
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
