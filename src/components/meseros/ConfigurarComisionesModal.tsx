import { useState, useId, useEffect, useRef, type FormEvent } from 'react';
import {
  Percent,
  Sliders,
  Sparkles,
  Target,
  Wallet,
  X,
} from 'lucide-react';
import type { DesempenoMesero } from '@/types/mesero';
import { formatCOP } from '@/utils/formatCOP';

export interface ConfigurarComisionesModalProps {
  isOpen: boolean;
  desempeno: DesempenoMesero | null;
  onClose: () => void;
  onGuardar: (input: {
    id?: string;
    empleadoId: string;
    nombre: string;
    porcentajeComision: number;
    porcentajePropina: number;
    metaVentaTurno?: number;
    activo?: boolean;
  }) => Promise<void>;
  cargando?: boolean;
}

export function ConfigurarComisionesModal({
  isOpen,
  desempeno,
  onClose,
  onGuardar,
  cargando = false,
}: ConfigurarComisionesModalProps) {
  const generatedId = useId();
  const titleId = `modal-config-mesero-${generatedId.replace(/:/g, '')}-title`;
  const modalRef = useRef<HTMLDivElement>(null);

  const [porcentajeComision, setPorcentajeComision] = useState<number>(0);
  const [porcentajePropina, setPorcentajePropina] = useState<number>(100);
  const [metaVentaTurno, setMetaVentaTurno] = useState<string>('');
  const [activo, setActivo] = useState(true);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !desempeno) return;
    setPorcentajeComision(desempeno.porcentajeComision || 0);
    setPorcentajePropina(
      typeof desempeno.totalPropinas === 'number' && desempeno.totalPropinas > 0
        ? Math.round((desempeno.propinaDirecta / desempeno.totalPropinas) * 100)
        : 100
    );
    setMetaVentaTurno(desempeno.metaVentaTurno ? String(desempeno.metaVentaTurno) : '');
    setActivo(desempeno.activo ?? true);
    setErrorLocal(null);
  }, [isOpen, desempeno]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !desempeno) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    const comisionNum = Math.max(0, Math.min(100, Number(porcentajeComision) || 0));
    const propinaNum = Math.max(0, Math.min(100, Number(porcentajePropina) || 100));
    const metaNum = metaVentaTurno.trim() ? Math.max(0, Math.round(Number(metaVentaTurno))) : undefined;

    try {
      await onGuardar({
        empleadoId: desempeno.meseroId,
        nombre: desempeno.meseroNombre,
        porcentajeComision: comisionNum,
        porcentajePropina: propinaNum,
        metaVentaTurno: metaNum,
        activo,
      });
      onClose();
    } catch (err: unknown) {
      setErrorLocal(err instanceof Error ? err.message : 'Error al guardar configuración.');
    }
  };

  // Simulación didáctica
  const ventaEjemplo = 200000;
  const propinaEjemplo = 20000;
  const comisionSimulada = Math.round((ventaEjemplo * porcentajeComision) / 100);
  const propinaDirectaSimulada = Math.round((propinaEjemplo * porcentajePropina) / 100);
  const totalIncentivoSimulado = comisionSimulada + propinaDirectaSimulada;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-lg rounded-3xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-neutral-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sliders className="h-6 w-6" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-xl font-bold text-white">
                Incentivos y Comisiones
              </h2>
              <p className="text-xs text-neutral-400">
                {desempeno.meseroNombre}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-900 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorLocal && (
          <div className="mt-4 rounded-xl bg-red-950/50 border border-red-500/50 p-3 text-xs text-red-300">
            {errorLocal}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Porcentaje de Comisión */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 text-amber-400" />
                <span>Comisión sobre Ventas Netas</span>
              </label>
              <span className="text-xs font-black text-amber-400">{porcentajeComision}%</span>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-2">
              {[0, 2, 3, 5, 10].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setPorcentajeComision(pct)}
                  aria-pressed={porcentajeComision === pct}
                  className={`min-h-[44px] rounded-xl text-xs font-bold transition-all ${
                    porcentajeComision === pct
                      ? 'bg-amber-400 text-neutral-950 font-black shadow-md'
                      : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            <input
              type="range"
              min="0"
              max="20"
              step="0.5"
              value={porcentajeComision}
              onChange={(e) => setPorcentajeComision(parseFloat(e.target.value) || 0)}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          {/* Repartición de Propinas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-emerald-400" />
                <span>Modalidad de Propinas</span>
              </label>
              <span className="text-xs font-black text-emerald-400">
                {porcentajePropina}% directa {porcentajePropina < 100 && `(${100 - porcentajePropina}% pool)`}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPorcentajePropina(100)}
                aria-pressed={porcentajePropina === 100}
                className={`min-h-[44px] rounded-xl px-3 text-xs font-bold transition-all ${
                  porcentajePropina === 100
                    ? 'bg-emerald-500 text-neutral-950 font-black shadow-md'
                    : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
                }`}
              >
                100% Directa al Mesero
              </button>

              <button
                type="button"
                onClick={() => setPorcentajePropina(70)}
                aria-pressed={porcentajePropina === 70}
                className={`min-h-[44px] rounded-xl px-3 text-xs font-bold transition-all ${
                  porcentajePropina === 70
                    ? 'bg-emerald-500 text-neutral-950 font-black shadow-md'
                    : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
                }`}
              >
                70% Mesero / 30% Pool
              </button>
            </div>
          </div>

          {/* Meta de Ventas por Turno */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-300 mb-1 flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-amber-400" />
              <span>Meta de Ventas por Turno (COP opcional)</span>
            </label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[150000, 250000, 350000, 500000].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetaVentaTurno(String(m))}
                  aria-pressed={metaVentaTurno === String(m)}
                  className={`min-h-[44px] rounded-xl text-[11px] font-bold transition-all ${
                    metaVentaTurno === String(m)
                      ? 'bg-amber-400 text-neutral-950 font-black shadow-md'
                      : 'bg-neutral-900 text-neutral-300 border border-neutral-800 hover:bg-neutral-800'
                  }`}
                >
                  {formatCOP(m)}
                </button>
              ))}
            </div>

            <input
              type="number"
              min="0"
              step="10000"
              value={metaVentaTurno}
              onChange={(e) => setMetaVentaTurno(e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900 py-2.5 px-3 text-sm text-white placeholder-neutral-500 focus:border-amber-400 focus:outline-none"
              placeholder="Ej. 300000"
            />
          </div>

          {/* Tarjeta de Simulación Didáctica */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-neutral-300">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>Simulación Didáctica (Ejemplo: $ 200.000 venta + $ 20.000 propina)</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400">
              <span>Comisión ({porcentajeComision}%):</span>
              <span className="font-medium text-amber-300">+{formatCOP(comisionSimulada)}</span>
            </div>
            <div className="flex items-center justify-between text-neutral-400">
              <span>Propina directa ({porcentajePropina}%):</span>
              <span className="font-medium text-emerald-300">+{formatCOP(propinaDirectaSimulada)}</span>
            </div>
            <div className="border-t border-neutral-800 pt-1.5 flex items-center justify-between font-bold">
              <span className="text-white">Incentivo estimado total:</span>
              <span className="text-amber-400 font-display text-sm font-black">
                {formatCOP(totalIncentivoSimulado)}
              </span>
            </div>
          </div>

          {/* Toggle Activo */}
          <label className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/50 p-3 cursor-pointer hover:border-neutral-700 transition-colors">
            <input
              type="checkbox"
              checked={activo}
              onChange={(e) => setActivo(e.target.checked)}
              className="h-5 w-5 rounded border-neutral-700 bg-neutral-900 text-amber-500 focus:ring-amber-500"
            />
            <div className="text-xs">
              <span className="font-bold text-white block">Mesero activo en salón</span>
              <span className="text-neutral-400">Disponible para asignación de comandas y mesas</span>
            </div>
          </label>

          {/* Acciones */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={cargando}
              className="min-h-[44px] rounded-xl px-4 py-2.5 text-sm font-semibold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 px-6 py-2.5 text-sm font-black text-neutral-950 shadow-lg hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
            >
              {cargando ? 'Guardando...' : 'Guardar Configuración'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
