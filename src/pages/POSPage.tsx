// src/pages/POSPage.tsx
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Receipt, ShoppingCart, Utensils } from 'lucide-react';
import type { ItemVenta, MetodoPago, TicketVentaData, TipoEntrega } from '@/types';
import { useNegocio } from '@/context/NegocioContext';
import { useProductos } from '@/hooks/useProductos';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Catalogo } from '@/components/pos/Catalogo';
import { Carrito } from '@/components/pos/Carrito';
import { SarinVoiceAssistant } from '@/components/pos/SarinVoiceAssistant';
import { OfflineStatusBanner } from '@/components/pos/OfflineStatusBanner';
import { TicketVentaModal } from '@/components/pos/TicketVentaModal';
import type { SarinVoiceMatchedItem } from '@/utils/sarinVoicePos';
import { createToast } from '@/components/ui/Toast';
import {
  anularVentaPorVoz,
  getSarinOperationalSnapshot,
  uploadFotoTransferencia,
} from '@/services/ventasService';
import { crearDomicilioDesdePos } from '@/services/domiciliosService';
import {
  calcularSubtotal,
  decrementarItem,
  incrementarItem,
  limpiarCarrito,
} from '@/utils/carritoUtils';
import { formatCOP } from '@/utils/formatCOP';
import { formatHora } from '@/utils/dateUtils';
import { useHoraActual } from '@/hooks/useHoraActual';
import { useClientes } from '@/hooks/useClientes';
import { useInventario } from '@/hooks/useInventario';
import {
  evaluarEstadoStockCombo,
  evaluarEstadoStockProducto,
} from '@/utils/recetasEscandallo';
import type { Cliente } from '@/types';

export function POSPage() {
  const { negocioActual, usuarioNegocio, esSuperAdmin } = useNegocio();
  const { productos, combos, loading } = useProductos();
  const { insumos } = useInventario();
  const {
    isOnline,
    ventasPendientes,
    cantidadPendientes,
    sincronizando,
    sincronizarAhora,
    guardarVentaConFallback,
    descartarVentaPendiente,
  } = useOfflineSync(negocioActual.id);
  const { clientes } = useClientes(negocioActual.id);

  const [items, setItems] = useState<ItemVenta[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [registrando, setRegistrando] = useState(false);
  const [ticketComprobante, setTicketComprobante] = useState<TicketVentaData | null>(null);
  const [modalTicketOpen, setModalTicketOpen] = useState(false);
  const checkoutLockRef = useRef(false);
  const ahora = useHoraActual();
  const puedeAnularVenta = esSuperAdmin || usuarioNegocio?.rol === 'admin';

  const handleAgregarProducto = (producto: typeof productos[0]) => {
    if (!producto.disponible || registrando) return;
    const alerta = evaluarEstadoStockProducto(producto.receta, insumos);
    if (alerta.estado === 'agotado') {
      createToast(`${producto.nombre} no se puede agregar: ${alerta.insumoCritico || 'insumo'} agotado`, 'error', 3000);
      return;
    }
    if (alerta.estado === 'bajo_stock') {
      createToast(`⚠️ ${producto.nombre}: ${alerta.insumoCritico} con stock bajo (${alerta.porcionesDisponibles} disp.)`, 'info', 2500);
    }
    setItems((currentItems) =>
      incrementarItem(
        currentItems,
        'producto',
        producto.id,
        producto.nombre,
        producto.precio
      )
    );
    createToast(`${producto.nombre} agregado al carrito`, 'success', 2000);
  };

  const handleAgregarCombo = (combo: typeof combos[0]) => {
    if (!combo.disponible || registrando) return;
    const alerta = evaluarEstadoStockCombo(combo, productos, insumos);
    if (alerta.estado === 'agotado') {
      createToast(`${combo.nombre} no se puede agregar: ${alerta.insumoCritico || 'insumo'} agotado`, 'error', 3000);
      return;
    }
    if (alerta.estado === 'bajo_stock') {
      createToast(`⚠️ ${combo.nombre}: ${alerta.insumoCritico} con stock bajo (${alerta.porcionesDisponibles} disp.)`, 'info', 2500);
    }
    setItems((currentItems) =>
      incrementarItem(
        currentItems,
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
    fotoTransferencia?: File | null,
    propina?: number,
    subtotal?: number
  ) => {
    if (checkoutLockRef.current) return;
    if (items.length === 0) {
      createToast('El carrito está vacío', 'error');
      return;
    }
    checkoutLockRef.current = true;
    setRegistrando(true);

    try {
      const subtotalConsumos = typeof subtotal === 'number' ? subtotal : items.reduce((sum, item) => sum + item.subtotal, 0);
      const propinaSegura = typeof propina === 'number' && propina > 0 ? propina : 0;
      const total = subtotalConsumos + propinaSegura;
      let nuevoVentaId: string;
      let esOffline = false;

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
          barrio || ''
        );
        nuevoVentaId = `DOM-${Date.now().toString().slice(-6)}`;
        createToast('¡Domicilio registrado exitosamente!', 'success');
      } else {
        // Crear venta normal con respaldo y cola offline si no hay red
        let fotoPath: string | undefined;
        if (metodoPago === 'transferencia' && fotoTransferencia && isOnline) {
          try {
            fotoPath = await uploadFotoTransferencia(fotoTransferencia, negocioActual.id);
          } catch {
            // Si la foto no subió por red, procedemos registrando la venta offline
          }
        }

        const nombreCompleto = [clienteNombre, clienteApellido].filter(Boolean).join(' ') || undefined;
        const resultado = await guardarVentaConFallback({
          items,
          subtotal: subtotalConsumos,
          propina: propinaSegura > 0 ? propinaSegura : undefined,
          total,
          metodoPago,
          tipoEntrega,
          clienteTelefono: clienteTelefono || undefined,
          clienteNombre: nombreCompleto,
          direccion: direccion || undefined,
          barrio: barrio || undefined,
          fotoTransferenciaPath: fotoPath,
        });

        if (resultado.guardadoEn === 'offline') {
          nuevoVentaId = resultado.ventaOffline.id;
          esOffline = true;
          createToast(
            `💾 Venta guardada sin conexión (${formatCOP(total)}). Quedó en cola local.`,
            'success',
            4000
          );
        } else {
          nuevoVentaId = resultado.ventaId;
          createToast(`¡Venta registrada a las ${formatHora(new Date())}!`, 'success');
        }
      }

      // Preparar el comprobante de venta para impresión o WhatsApp
      const nuevoTicket: TicketVentaData = {
        ventaId: nuevoVentaId,
        negocioNombre: negocioActual.nombre || 'La Parada',
        negocioSlug: negocioActual.slug,
        negocioDireccion: negocioActual.direccion,
        negocioTelefono: negocioActual.telefono,
        fecha: new Date(),
        items: [...items],
        subtotal: subtotalConsumos,
        propina: propinaSegura > 0 ? propinaSegura : undefined,
        total,
        metodoPago,
        tipoEntrega,
        montoRecibido: typeof _montoRecibido === 'number' && _montoRecibido > 0 ? _montoRecibido : undefined,
        cambio: typeof _montoRecibido === 'number' && _montoRecibido >= total ? _montoRecibido - total : undefined,
        clienteNombre: [clienteNombre, clienteApellido].filter(Boolean).join(' ') || undefined,
        clienteTelefono,
        direccionEntrega: direccion,
        barrioEntrega: barrio,
        esOffline,
      };

      setTicketComprobante(nuevoTicket);
      setModalTicketOpen(true);
      setItems(limpiarCarrito());
      setClienteSeleccionado(null);
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : 'Error al registrar venta';
      createToast(mensaje, 'error');
    } finally {
      checkoutLockRef.current = false;
      setRegistrando(false);
    }
  };

  const handleVoiceDirectSale = async (
    voiceItems: SarinVoiceMatchedItem[],
    metodoPago: MetodoPago
  ): Promise<string | void> => {
    if (checkoutLockRef.current || voiceItems.length === 0) return;
    checkoutLockRef.current = true;
    setRegistrando(true);
    try {
      const total = voiceItems.reduce((sum, item) => sum + item.subtotal, 0);
      const resultado = await guardarVentaConFallback({
        items: voiceItems,
        total,
        metodoPago,
        tipoEntrega: 'mostrador',
      });

      const ventaIdGenerado =
        resultado.guardadoEn === 'offline' ? resultado.ventaOffline.id : resultado.ventaId;

      const nuevoTicket: TicketVentaData = {
        ventaId: ventaIdGenerado,
        negocioNombre: negocioActual.nombre || 'La Parada',
        negocioSlug: negocioActual.slug,
        negocioDireccion: negocioActual.direccion,
        negocioTelefono: negocioActual.telefono,
        fecha: new Date(),
        items: [...voiceItems],
        total,
        metodoPago,
        tipoEntrega: 'mostrador',
        esOffline: resultado.guardadoEn === 'offline',
      };
      setTicketComprobante(nuevoTicket);

      if (resultado.guardadoEn === 'offline') {
        createToast(
          `🎙️ Sarin guardó venta sin conexión por ${formatCOP(total)} (${metodoPago})`,
          'success'
        );
        return resultado.ventaOffline.id;
      } else {
        createToast(
          `🎙️ Sarin registró venta por ${formatCOP(total)} (${metodoPago})`,
          'success'
        );
        return resultado.ventaId;
      }
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : 'Error al registrar venta por voz';
      createToast(mensaje, 'error');
    } finally {
      checkoutLockRef.current = false;
      setRegistrando(false);
    }
  };

  const handleVoiceUndoDirectSale = async (ventaId: string) => {
    if (checkoutLockRef.current) return;
    checkoutLockRef.current = true;
    setRegistrando(true);
    try {
      const estaEnColaOffline = ventasPendientes.some((v) => v.id === ventaId);
      if (estaEnColaOffline) {
        await descartarVentaPendiente(ventaId);
        createToast('↩️ Venta offline anulada de la cola local', 'success');
      } else {
        await anularVentaPorVoz(ventaId, negocioActual.id);
        createToast('↩️ Venta por voz anulada correctamente', 'success');
      }
    } catch (error) {
      const mensaje =
        error instanceof Error ? error.message : 'No se pudo anular la venta';
      createToast(mensaje, 'error');
      throw error;
    } finally {
      checkoutLockRef.current = false;
      setRegistrando(false);
    }
  };

  const handleCargarLoDeSiempre = (itemsLoDeSiempre: ItemVenta[]) => {
    setItems(itemsLoDeSiempre);
    createToast('⚡ ¡Lo de siempre cargado al ticket!', 'success', 2500);
  };

  const handleVoiceAddItems = (voiceItems: SarinVoiceMatchedItem[]) => {
    setItems((current) => {
      let updated = [...current];
      for (const item of voiceItems) {
        for (let i = 0; i < item.cantidad; i++) {
          updated = incrementarItem(
            updated,
            item.tipo,
            item.referenciaId,
            item.nombre,
            item.precioUnitario
          );
        }
      }
      return updated;
    });
  };

  const handleVoiceRemoveItems = (voiceItems: SarinVoiceMatchedItem[]) => {
    setItems((current) => {
      let updated = [...current];
      for (const item of voiceItems) {
        for (let i = 0; i < item.cantidad; i++) {
          updated = decrementarItem(updated, item.tipo, item.referenciaId);
        }
      }
      return updated;
    });
  };

  const totalTicket = calcularSubtotal(items);
  const cantidadTicket = items.reduce((sum, item) => sum + item.cantidad, 0);

  return (
    <div className="px-3 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-8">
      <div className="mx-auto mb-5 max-w-[1500px]">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Venta rápida</p>
            <h1 className="font-display text-2xl font-black text-white sm:text-3xl">Punto de venta</h1>
            <p className="mt-1 text-sm text-neutral-400">Selecciona productos, revisa el ticket y cobra.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/mesas"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-500/40 bg-neutral-900 px-3.5 py-2 text-xs font-bold text-amber-300 transition-colors hover:border-amber-400 hover:bg-neutral-800"
              aria-label="Ir a Modo Mesas y Salón"
            >
              <Utensils className="h-4 w-4 text-amber-400" aria-hidden="true" />
              <span>Modo Mesas</span>
            </Link>

            {ticketComprobante && (
              <button
                type="button"
                onClick={() => setModalTicketOpen(true)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-900 px-3.5 py-2 text-xs font-bold text-neutral-200 transition-colors hover:border-gold-400 hover:text-gold-400"
                aria-label="Ver último comprobante de venta"
              >
                <Receipt className="h-4 w-4 text-gold-400" aria-hidden="true" />
                <span>Último ticket</span>
              </button>
            )}

            <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs font-bold text-neutral-300">
              <Clock className="h-4 w-4 text-gold-400" aria-hidden="true" />
              <span>
                Se registrará a las{' '}
                <time dateTime={ahora.toISOString()} className="text-white">
                  {formatHora(ahora)}
                </time>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1500px]">
        {/* Banner y control de estado Offline / Sincronización */}
        <OfflineStatusBanner
          isOnline={isOnline}
          cantidadPendientes={cantidadPendientes}
          sincronizando={sincronizando}
          ventasPendientes={ventasPendientes}
          onSincronizar={() => void sincronizarAhora()}
          onDescartarVenta={descartarVentaPendiente}
        />

        <SarinVoiceAssistant
          productos={productos}
          combos={combos}
          currentCartItems={items}
          disabled={registrando}
          onDirectSale={handleVoiceDirectSale}
          onAddItemsToCart={handleVoiceAddItems}
          onRemoveItemsFromCart={handleVoiceRemoveItems}
          onUndoDirectSale={puedeAnularVenta ? handleVoiceUndoDirectSale : undefined}
          onCheckoutCurrentCart={(metodoPago, montoRecibido) =>
            handleRegistrarVenta(metodoPago, 'mostrador', montoRecibido)
          }
          onClearCart={() => setItems(limpiarCarrito())}
          onQueryOperationalStatus={() => getSarinOperationalSnapshot(negocioActual.id)}
          onOpenTicketModal={() => setModalTicketOpen(true)}
        />

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_25rem] xl:grid-cols-[minmax(0,1fr)_27rem]">
          <div className="min-w-0">
            <Catalogo
              combos={combos}
              productos={productos}
              insumos={insumos}
              loading={loading}
              disabled={registrando}
              onAgregarProducto={handleAgregarProducto}
              onAgregarCombo={handleAgregarCombo}
            />
          </div>

          <aside
            id="pos-ticket"
            aria-label="Ticket de venta"
            className={`${items.length === 0 ? 'hidden lg:block' : 'block'} scroll-mt-24 lg:sticky lg:top-24 lg:h-fit`}
          >
            <Carrito
              items={items}
              onActualizarItems={setItems}
              onRegistrarVenta={handleRegistrarVenta}
              loading={registrando}
              clientes={clientes}
              clienteSeleccionado={clienteSeleccionado}
              onSeleccionarCliente={setClienteSeleccionado}
              onCargarLoDeSiempre={handleCargarLoDeSiempre}
              productos={productos}
              combos={combos}
              insumos={insumos}
            />
          </aside>
        </div>
      </div>

      {items.length > 0 && (
        <a
          href="#pos-ticket"
          className="fixed bottom-[5.2rem] left-3 right-3 z-30 flex min-h-12 items-center justify-between rounded-xl bg-[#201f1b] px-4 text-sm font-bold text-[#fffdf8] shadow-2xl lg:hidden"
          aria-label={`Ver ticket con ${cantidadTicket} productos por ${formatCOP(totalTicket)}`}
        >
          <span className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" aria-hidden="true" />
            Ver ticket · {cantidadTicket}
          </span>
          <span>{formatCOP(totalTicket)}</span>
        </a>
      )}

      {/* Modal de Comprobante Térmico y Envío por WhatsApp */}
      <TicketVentaModal
        ticket={ticketComprobante}
        isOpen={modalTicketOpen}
        onClose={() => setModalTicketOpen(false)}
      />
    </div>
  );
}
