import { useEffect, useState } from 'react';
import { Bike, MessageCircle, Send, UserCheck, X } from 'lucide-react';
import type { Domicilio } from '@/types';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCOP } from '@/utils/formatCOP';
import { construirUrlWhatsAppHojaRutaRepartidor } from '@/utils/despachoDomiciliosUtils';

export interface RepartidorSugerido {
  id: string;
  nombre: string;
  telefono?: string;
}

export interface AsignarRepartidorModalProps {
  isOpen: boolean;
  domiciliosObjetivo: Domicilio[];
  repartidoresSugeridos: RepartidorSugerido[];
  negocioNombre: string;
  guardando?: boolean;
  onConfirmar: (datos: {
    domiciliarioId: string;
    domiciliarioNombre: string;
    despacharEnCamino: boolean;
  }) => Promise<void>;
  onClose: () => void;
}

export function AsignarRepartidorModal({
  isOpen,
  domiciliosObjetivo,
  repartidoresSugeridos,
  negocioNombre,
  guardando = false,
  onConfirmar,
  onClose,
}: AsignarRepartidorModalProps) {
  const [domiciliarioId, setDomiciliarioId] = useState('');
  const [domiciliarioNombre, setDomiciliarioNombre] = useState('');
  const [telefonoRepartidor, setTelefonoRepartidor] = useState('');
  const [despacharEnCamino, setDespacharEnCamino] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    if (domiciliosObjetivo.length === 1 && domiciliosObjetivo[0].domiciliarioNombre) {
      const actualNombre = domiciliosObjetivo[0].domiciliarioNombre;
      const actualId = domiciliosObjetivo[0].domiciliarioId || '';
      const match = repartidoresSugeridos.find(
        (r) => r.id === actualId || r.nombre === actualNombre
      );
      setDomiciliarioId(actualId);
      setDomiciliarioNombre(actualNombre);
      setTelefonoRepartidor(match?.telefono || '');
    } else {
      setDomiciliarioId('');
      setDomiciliarioNombre('');
      setTelefonoRepartidor('');
    }
    setDespacharEnCamino(true);
  }, [isOpen, domiciliosObjetivo, repartidoresSugeridos]);

  if (!isOpen || domiciliosObjetivo.length === 0) return null;

  const totalEfectivo = domiciliosObjetivo
    .filter((d) => d.metodoPago !== 'transferencia')
    .reduce((sum, d) => sum + (Number.isFinite(d.total) ? d.total : 0), 0);

  const hojaRutaWhatsAppUrl = construirUrlWhatsAppHojaRutaRepartidor(
    telefonoRepartidor,
    domiciliosObjetivo,
    domiciliarioNombre.trim() || 'Repartidor',
    negocioNombre
  );

  const handleSeleccionarSugerido = (rep: RepartidorSugerido) => {
    setDomiciliarioId(rep.id);
    setDomiciliarioNombre(rep.nombre);
    setTelefonoRepartidor(rep.telefono || '');
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = domiciliarioNombre.trim();
    if (!nombre) {
      setError('Ingresa o selecciona el nombre del repartidor.');
      return;
    }

    try {
      setError('');
      await onConfirmar({
        domiciliarioId: domiciliarioId || `rep-${nombre.toLowerCase().replace(/\s+/g, '-')}`,
        domiciliarioNombre: nombre,
        despacharEnCamino,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible asignar el repartidor.');
    }
  };

  return (
    <StorefrontDialog
      labelledBy="asignar-repartidor-title"
      onClose={onClose}
      onBackdropClick={onClose}
      canClose={!guardando}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-white shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-400/10 text-sky-400">
              <Bike className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="asignar-repartidor-title" className="font-display text-lg font-bold text-white">
                {domiciliosObjetivo.length > 1
                  ? `Despachar ${domiciliosObjetivo.length} domicilios en ruta`
                  : 'Asignar repartidor y despachar'}
              </h2>
              <p className="text-xs text-neutral-400">
                Efectivo a recaudar en esta salida:{' '}
                <strong className="text-gold-400">{formatCOP(totalEfectivo)}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar modal de asignación"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Resumen de paradas seleccionadas */}
        <div className="mb-4 max-h-36 space-y-1.5 overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-950 p-3">
          {domiciliosObjetivo.map((dom, index) => (
            <div
              key={dom.id}
              className="flex items-center justify-between gap-2 text-xs text-neutral-300"
            >
              <span className="truncate">
                <strong className="text-gold-400">{index + 1}.</strong> {dom.clienteNombre} ·{' '}
                {dom.barrio || dom.direccion}
              </span>
              <span className="shrink-0 font-bold text-white">{formatCOP(dom.total)}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {repartidoresSugeridos.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Repartidores disponibles
              </p>
              <div className="flex flex-wrap gap-2">
                {repartidoresSugeridos.map((rep) => {
                  const activo =
                    domiciliarioNombre.trim().toLowerCase() === rep.nombre.trim().toLowerCase();
                  return (
                    <button
                      key={rep.id}
                      type="button"
                      onClick={() => handleSeleccionarSugerido(rep)}
                      aria-pressed={activo}
                      className={`inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 text-xs font-bold transition-colors ${
                        activo
                          ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                          : 'border-neutral-800 bg-neutral-950 text-neutral-300 hover:border-neutral-700 hover:text-white'
                      }`}
                    >
                      <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                      {rep.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Nombre del repartidor"
              type="text"
              placeholder="Ej: Mateo Rojas"
              value={domiciliarioNombre}
              onChange={(e) => {
                setDomiciliarioNombre(e.target.value);
                if (!repartidoresSugeridos.some((r) => r.nombre === e.target.value)) {
                  setDomiciliarioId('');
                }
                if (error) setError('');
              }}
              disabled={guardando}
            />
            <Input
              label="WhatsApp del repartidor (opcional)"
              type="tel"
              placeholder="Ej: 3150001122"
              value={telefonoRepartidor}
              onChange={(e) => setTelefonoRepartidor(e.target.value)}
              disabled={guardando}
            />
          </div>

          <button
            type="button"
            onClick={() => setDespacharEnCamino((prev) => !prev)}
            aria-pressed={despacharEnCamino}
            disabled={domiciliosObjetivo.length > 1 || guardando}
            className={`flex min-h-[44px] w-full items-center justify-between rounded-xl border px-3.5 py-2 text-left text-xs font-semibold transition-colors ${
              despacharEnCamino
                ? 'border-sky-500/40 bg-sky-950/30 text-sky-200'
                : 'border-neutral-800 bg-neutral-950 text-neutral-400'
            }`}
          >
            <span>Cambiar estado automáticamente a «En camino»</span>
            <span className="rounded-md bg-neutral-900 px-2 py-0.5 text-[11px] font-bold">
              {despacharEnCamino ? 'Activado' : 'Solo asignar'}
            </span>
          </button>

          {error && (
            <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2 sm:flex-row">
            {domiciliarioNombre.trim() && (
              <a
                href={hojaRutaWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-4 text-xs font-bold text-emerald-300 transition-colors hover:bg-emerald-950/50"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                <span>Enviar Hoja de Ruta</span>
              </a>
            )}

            <Button
              type="submit"
              variant="primary"
              loading={guardando}
              disabled={guardando}
              className="flex min-h-[44px] flex-1 items-center justify-center gap-2 text-xs font-bold"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              <span>{despacharEnCamino ? 'Asignar y despachar' : 'Guardar asignación'}</span>
            </Button>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
