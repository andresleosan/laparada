// src/pages/POSPage.tsx
import { useState } from 'react';
import type { ItemVenta, MetodoPago, TipoEntrega } from '@/types';
import { useJornada } from '@/context/JornadaContext';
import { useNegocio } from '@/context/NegocioContext';
import { useProductos } from '@/hooks/useProductos';
import { Button } from '@/components/ui/Button';
import { Catalogo } from '@/components/pos/Catalogo';
import { Carrito } from '@/components/pos/Carrito';
import { createToast } from '@/components/ui/Toast';
import { registrarVenta, uploadFotoTransferencia } from '@/services/ventasService';
import { crearDomicilioDesdePos } from '@/services/domiciliosService';
import {
  incrementarItem,
  limpiarCarrito,
} from '@/utils/carritoUtils';

export function POSPage() {
  const { jornadaActual, setJornada } = useJornada();
  const { negocioActual } = useNegocio();
  const { productos, combos, loading } = useProductos(jornadaActual);
  const [items, setItems] = useState<ItemVenta[]>([]);
  const [registrando, setRegistrando] = useState(false);
  const [jornadaSeleccionada, setJornadaSeleccionada] = useState<'mañana' | 'noche' | null>(() => {
    if (jornadaActual === 'ambas') return null;
    const hora = new Date().getHours();
    if ((hora >= 5 && hora < 11) || (hora >= 18 && hora < 24)) {
      return jornadaActual as 'mañana' | 'noche';
    }
    return null;
  });

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
    tipoEntrega: TipoEntrega,
    _montoRecibido?: number,
    clienteNombre?: string,
    clienteApellido?: string,
    clienteTelefono?: string,
    direccion?: string,
    barrio?: string,
    fotoTransferencia?: File | null
  ) => {
    if (items.length === 0) {
      createToast('El carrito está vacío', 'error');
      return;
    }

    setRegistrando(true);

    try {
      const total = items.reduce((sum, item) => sum + item.subtotal, 0);
      const jornadaAUsar = jornadaSeleccionada || (jornadaActual === 'ambas' ? 'mañana' : jornadaActual) as 'mañana' | 'noche';
      
      if (tipoEntrega === 'domicilio') {
        // Crear domicilio
        await crearDomicilioDesdePos(
          negocioActual.id,
          items,
          total,
          metodoPago,
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
        let fotoPath: string | undefined;
        if (metodoPago === 'transferencia' && fotoTransferencia) {
          fotoPath = await uploadFotoTransferencia(fotoTransferencia, negocioActual.id);
        }
        await registrarVenta(
          negocioActual.id,
          items,
          total,
          metodoPago,
          jornadaAUsar,
          undefined,
          undefined,
          fotoPath,
          tipoEntrega
        );
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
    <div className="pb-20 px-3 pt-3 pb-6">
      {/* Header */}
      <div className="mb-6 max-w-7xl mx-auto">
        <h1 className="text-xl font-display font-bold text-gold-400 mb-2">
          Punto de Venta
        </h1>

        {/* Selector de Jornada si es necesario */}
        {jornadaSeleccionada === null && (
          <div className="mb-4 p-4 bg-neutral-800 rounded-lg border border-neutral-700">
            <p className="text-sm text-neutral-300 mb-3">Selecciona la jornada para registrar ventas:</p>
            <div className="flex gap-2">
              <Button
                onClick={() => setJornadaSeleccionada('mañana')}
                variant="primary"
                size="sm"
              >
                🌅 Mañana/Tarde
              </Button>
              <Button
                onClick={() => setJornadaSeleccionada('noche')}
                variant="primary"
                size="sm"
              >
                🌙 Noche
              </Button>
            </div>
          </div>
        )}

        {/* Toggle Jornada */}
        <div className="flex gap-2">
          <Button
            onClick={() => setJornada('mañana')}
            variant={jornadaActual === 'mañana' ? 'primary' : 'secondary'}
            size="sm"
          >
            🌅 Mañana/Tarde
          </Button>
          <Button
            onClick={() => setJornada('noche')}
            variant={jornadaActual === 'noche' ? 'primary' : 'secondary'}
            size="sm"
          >
            🌙 Noche
          </Button>
        </div>
      </div>

      {/* Layout: Catálogo + Carrito */}
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Carrito — primero en mobile, último en desktop */}
          <div className="order-first lg:order-last lg:sticky lg:top-6 lg:h-fit">
            <Carrito
              items={items}
              onActualizarItems={setItems}
              onRegistrarVenta={handleRegistrarVenta}
              loading={registrando}
            />
          </div>

          {/* Catálogo — segundo en mobile, primero en desktop */}
          <div className="order-last lg:order-first lg:col-span-2">
            <Catalogo
              combos={combos}
              productos={productos}
              loading={loading}
              onAgregarProducto={handleAgregarProducto}
              onAgregarCombo={handleAgregarCombo}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
