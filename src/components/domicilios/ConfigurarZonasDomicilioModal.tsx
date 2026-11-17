import { useEffect, useState } from 'react';
import { Map, Plus, RotateCcw, Save, Trash2, X } from 'lucide-react';
import type { ConfiguracionZonasDomicilio, ZonaDomicilio } from '@/types';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ZONAS_DOMICILIO_CUCUTA_DEFAULT } from '@/utils/despachoDomiciliosUtils';

export interface ConfigurarZonasDomicilioModalProps {
  isOpen: boolean;
  configuracion: ConfiguracionZonasDomicilio;
  onGuardar: (
    input: Omit<ConfiguracionZonasDomicilio, 'id' | 'negocioId' | 'actualizadoEn'>
  ) => Promise<void>;
  onClose: () => void;
}

interface ZonaEditable {
  id: string;
  nombre: string;
  barriosTexto: string;
  tarifaEnvio: string;
  tiempoEstimadoMin: string;
  pedidoMinimo: string;
  activa: boolean;
}

function toZonaEditable(zona: ZonaDomicilio): ZonaEditable {
  return {
    id: zona.id,
    nombre: zona.nombre,
    barriosTexto: (zona.barrios || []).join(', '),
    tarifaEnvio: String(zona.tarifaEnvio ?? 0),
    tiempoEstimadoMin: String(zona.tiempoEstimadoMin ?? 30),
    pedidoMinimo: String(zona.pedidoMinimo ?? 0),
    activa: zona.activa,
  };
}

export function ConfigurarZonasDomicilioModal({
  isOpen,
  configuracion,
  onGuardar,
  onClose,
}: ConfigurarZonasDomicilioModalProps) {
  const [habilitarTarifaAutomatica, setHabilitarTarifaAutomatica] = useState(true);
  const [tarifaPorDefecto, setTarifaPorDefecto] = useState('5000');
  const [tiempoPorDefecto, setTiempoPorDefecto] = useState('30');
  const [envioGratisDesdeMonto, setEnvioGratisDesdeMonto] = useState('0');
  const [zonas, setZonas] = useState<ZonaEditable[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setHabilitarTarifaAutomatica(configuracion.habilitarTarifaAutomatica);
    setTarifaPorDefecto(String(configuracion.tarifaPorDefecto ?? 5000));
    setTiempoPorDefecto(String(configuracion.tiempoEstimadoPorDefectoMin ?? 30));
    setEnvioGratisDesdeMonto(String(configuracion.envioGratisDesdeMonto ?? 0));
    setZonas((configuracion.zonas || []).map(toZonaEditable));
    setError('');
  }, [isOpen, configuracion]);

  if (!isOpen) return null;

  const handleAgregarZona = () => {
    setZonas((prev) => [
      ...prev,
      {
        id: `zona-${Date.now().toString().slice(-5)}`,
        nombre: `Nueva Zona ${prev.length + 1}`,
        barriosTexto: '',
        tarifaEnvio: '5000',
        tiempoEstimadoMin: '30',
        pedidoMinimo: '20000',
        activa: true,
      },
    ]);
  };

  const handleRestaurarCucuta = () => {
    setZonas(ZONAS_DOMICILIO_CUCUTA_DEFAULT.map(toZonaEditable));
  };

  const handleActualizarZona = (idx: number, patch: Partial<ZonaEditable>) => {
    setZonas((prev) => prev.map((z, i) => (i === idx ? { ...z, ...patch } : z)));
  };

  const handleEliminarZona = (idx: number) => {
    setZonas((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    try {
      const zonasLimpias: ZonaDomicilio[] = zonas
        .filter((z) => z.nombre.trim().length > 0)
        .map((z, idx) => ({
          id: z.id || `zona-${idx + 1}`,
          nombre: z.nombre.trim(),
          barrios: z.barriosTexto
            .split(',')
            .map((b) => b.trim())
            .filter(Boolean),
          tarifaEnvio: Math.max(0, Math.round(Number(z.tarifaEnvio) || 0)),
          tiempoEstimadoMin: Math.max(10, Math.round(Number(z.tiempoEstimadoMin) || 30)),
          pedidoMinimo: Math.max(0, Math.round(Number(z.pedidoMinimo) || 0)),
          activa: z.activa,
        }));

      await onGuardar({
        habilitarTarifaAutomatica,
        tarifaPorDefecto: Math.max(0, Math.round(Number(tarifaPorDefecto) || 0)),
        tiempoEstimadoPorDefectoMin: Math.max(10, Math.round(Number(tiempoPorDefecto) || 30)),
        envioGratisDesdeMonto: Math.max(0, Math.round(Number(envioGratisDesdeMonto) || 0)),
        zonas: zonasLimpias,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible guardar las zonas.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <StorefrontDialog
      labelledBy="config-zonas-domicilio-title"
      onClose={onClose}
      onBackdropClick={onClose}
      canClose={!guardando}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-6 text-white shadow-2xl">
        <div className="mb-5 flex items-center justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-400">
              <Map className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="config-zonas-domicilio-title" className="font-display text-lg font-bold">
                Tarifario de Zonas y Barrios de Cobertura
              </h2>
              <p className="text-xs text-neutral-400">
                Calcula tarifas de envío y tiempos estimados automáticamente al digitar el barrio en POS.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar configuración de zonas"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Parámetros globales */}
          <div className="space-y-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Reglas generales de envío
              </span>
              <button
                type="button"
                onClick={() => setHabilitarTarifaAutomatica((prev) => !prev)}
                aria-pressed={habilitarTarifaAutomatica}
                className={`min-h-[44px] rounded-xl border px-3.5 text-xs font-bold transition-colors ${
                  habilitarTarifaAutomatica
                    ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                    : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                }`}
              >
                {habilitarTarifaAutomatica
                  ? 'Tarifa automática por barrio: ACTIVADA'
                  : 'Tarifa automática: DESACTIVADA'}
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Input
                label="Tarifa base por defecto (COP)"
                type="number"
                min="0"
                step="500"
                value={tarifaPorDefecto}
                onChange={(e) => setTarifaPorDefecto(e.target.value)}
                disabled={guardando}
              />
              <Input
                label="Tiempo estimado base (min)"
                type="number"
                min="10"
                step="5"
                value={tiempoPorDefecto}
                onChange={(e) => setTiempoPorDefecto(e.target.value)}
                disabled={guardando}
              />
              <Input
                label="Envío gratis desde (COP, 0 = off)"
                type="number"
                min="0"
                step="1000"
                value={envioGratisDesdeMonto}
                onChange={(e) => setEnvioGratisDesdeMonto(e.target.value)}
                disabled={guardando}
              />
            </div>
          </div>

          {/* Lista de zonas */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white">Zonas configuradas ({zonas.length})</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleRestaurarCucuta}
                  disabled={guardando}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs font-semibold text-neutral-300 transition-colors hover:border-neutral-600 hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Restaurar Zonas de Cúcuta</span>
                </button>
                <button
                  type="button"
                  onClick={handleAgregarZona}
                  disabled={guardando}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-gold-400/40 bg-gold-400/15 px-3 text-xs font-bold text-gold-300 transition-colors hover:bg-gold-400/25"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Agregar zona</span>
                </button>
              </div>
            </div>

            {zonas.map((zona, idx) => (
              <div
                key={zona.id}
                className={`space-y-3 rounded-2xl border p-4 ${
                  zona.activa
                    ? 'border-neutral-800 bg-neutral-950/90'
                    : 'border-neutral-800/50 bg-neutral-950/40 opacity-70'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-[200px] flex-1">
                    <Input
                      label={`Nombre de zona ${idx + 1}`}
                      type="text"
                      value={zona.nombre}
                      onChange={(e) => handleActualizarZona(idx, { nombre: e.target.value })}
                      disabled={guardando}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleActualizarZona(idx, { activa: !zona.activa })}
                      aria-pressed={zona.activa}
                      className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold transition-colors ${
                        zona.activa
                          ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                          : 'border-neutral-700 bg-neutral-900 text-neutral-400'
                      }`}
                    >
                      {zona.activa ? 'Activa' : 'Pausada'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEliminarZona(idx)}
                      aria-label={`Eliminar zona ${zona.nombre}`}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-red-500/30 bg-red-950/20 text-red-400 transition-colors hover:bg-red-950/40"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Input
                    label="Tarifa envío (COP)"
                    type="number"
                    min="0"
                    step="500"
                    value={zona.tarifaEnvio}
                    onChange={(e) => handleActualizarZona(idx, { tarifaEnvio: e.target.value })}
                    disabled={guardando}
                  />
                  <Input
                    label="Tiempo estimado (min)"
                    type="number"
                    min="10"
                    step="5"
                    value={zona.tiempoEstimadoMin}
                    onChange={(e) =>
                      handleActualizarZona(idx, { tiempoEstimadoMin: e.target.value })
                    }
                    disabled={guardando}
                  />
                  <Input
                    label="Pedido mínimo (COP)"
                    type="number"
                    min="0"
                    step="1000"
                    value={zona.pedidoMinimo}
                    onChange={(e) => handleActualizarZona(idx, { pedidoMinimo: e.target.value })}
                    disabled={guardando}
                  />
                </div>

                <Input
                  label="Barrios incluidos (separados por coma)"
                  type="text"
                  placeholder="Ej: Caobos, Centro, La Playa"
                  value={zona.barriosTexto}
                  onChange={(e) => handleActualizarZona(idx, { barriosTexto: e.target.value })}
                  disabled={guardando}
                />
              </div>
            ))}
          </div>

          {error && (
            <div role="alert" className="rounded-xl border border-red-500/40 bg-red-950/30 p-3 text-xs text-red-300">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-neutral-800 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={guardando}
              className="min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={guardando}
              disabled={guardando}
              className="flex min-h-[44px] items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" aria-hidden="true" />
              <span>Guardar tarifario</span>
            </Button>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
