// src/pages/POSPage.tsx
import { useState } from 'react';
import type { ItemVenta, MetodoPago } from '@/types';
import { useJornada } from '@/context/JornadaContext';
import { useProductos } from '@/hooks/useProductos';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Catalogo } from '@/components/pos/Catalogo';
import { Carrito } from '@/components/pos/Carrito';
import { createToast } from '@/components/ui/Toast';
import { registrarVenta } from '@/services/ventasService';
import { crearDomicilioDesdePos } from '@/services/domiciliosService';
import {
  incrementarItem,
  limpiarCarrito,
} from '@/utils/carritoUtils';
import { getNombreJornada } from '@/utils/jornadaUtils';

export function POSPage() {
  const { jornadaActual, setJornada } = useJornada();
  const { productos, combos, loading } = useProductos(jornadaActual);
  const [items, setItems] = useState<ItemVenta[]>([]);
  const [registrando, setRegistrando] = useState(false);

  const handleAgregarProducto = (producto: typeof productos[0]) => {
    if (!producto.disponible) return;
    setItems(
      incrementarItem(
        items,
        'producto',
        producto.id,
        producto.nombre,
        producto.precio
      )
    );
    createToast(`${producto.nombre} agregado al carrito`, 'success', 2000);
  };

  const handleAgregarCombo = (combo: typeof combos[0]) => {
    if (!combo.disponible) return;
    setItems(
      incrementarItem(
        items,
        'combo',
        combo.id,
        combo.nombre,
        combo.precioEspecial
      )
    );
    createToast(`${combo.nombre} agregado al carrito`, 'success', 2000);
  };

  const handleRegistrarVenta = async (
    metodoPago: MetodoPago,
    _montoRecibido?: number,
    clienteNombre?: string,
    clienteApellido?: string,
    clienteTelefono?: string,
    direccion?: string,
    barrio?: string
  ) => {
    if (items.length === 0) {
      createToast('El carrito está vacío', 'error');
      return;
    }

    setRegistrando(true);

    try {
      const total = items.reduce((sum, item) => sum + item.subtotal, 0);
      const jornadaAUsar = (jornadaActual === 'ambas' ? 'mañana' : jornadaActual) as 'mañana' | 'noche';
      
      if (metodoPago === 'domicilio') {
        // Crear domicilio
        await crearDomicilioDesdePos(
          items,
          total,
          clienteNombre || '',
          clienteApellido || '',
          clienteTelefono || '',
          direccion || '',
          barrio || '',
          jornadaAUsar
        );
        createToast('¡Domicilio registrado exitosamente!', 'success');
      } else {
        // Crear venta normal
        await registrarVenta(items, total, metodoPago, jornadaActual);
        createToast('¡Venta registrada exitosamente!', 'success');
      }
      
      setItems(limpiarCarrito());
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : 'Error al registrar venta';
      createToast(mensaje, 'error');
    } finally {
      setRegistrando(false);
    }
  };

  return (
    <div className="pb-20 px-4 py-6">
      {/* Header */}
      <div className="mb-6 max-w-7xl mx-auto">
        <h1 className="text-3xl font-display font-bold text-gold-400 mb-3">
          Punto de Venta
        </h1>

        {/* Toggle Jornada */}
        <div className="flex gap-2">
          <Button
            onClick={() => setJornada('mañana')}
            variant={jornadaActual === 'mañana' ? 'primary' : 'secondary'}
            size="sm"
          >
            🌅 Mañana
          </Button>
          <Button
            onClick={() => setJornada('noche')}
            variant={jornadaActual === 'noche' ? 'primary' : 'secondary'}
            size="sm"
          >
            🌙 Noche
          </Button>
          <Badge variant="default" className="flex items-center">
            {getNombreJornada(jornadaActual)}
          </Badge>
        </div>
      </div>

      {/* Layout: Catálogo + Carrito */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Catálogo - 2 columnas */}
          <div className="lg:col-span-2">
            <Catalogo
              combos={combos}
              productos={productos}
              loading={loading}
              onAgregarProducto={handleAgregarProducto}
              onAgregarCombo={handleAgregarCombo}
            />
          </div>

          {/* Carrito - 1 columna (sticky en desktop) */}
          <div className="lg:sticky lg:top-6 lg:h-fit">
            <Carrito
              items={items}
              onActualizarItems={setItems}
              onRegistrarVenta={handleRegistrarVenta}
              loading={registrando}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
