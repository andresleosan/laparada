import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  DollarSign,
  FileText,
  Receipt,
  ShieldCheck,
  X,
} from 'lucide-react';
import type {
  CategoriaGasto,
  Gasto,
  MetodoPagoGasto,
  OrigenFondoGasto,
  RegistrarGastoInput,
} from '@/types';
import {
  CATEGORIAS_GASTO_META,
  ORIGENES_FONDO_GASTO_META,
  getOrigenFondoGastoMeta,
} from '@/utils/gastosUtils';
import { parseFiniteNumber, validatePositiveAmount } from '@/utils/adminInputValidation';
import { formatCOP } from '@/utils/formatCOP';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';

interface RegistrarGastoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: Omit<RegistrarGastoInput, 'negocioId'>) => Promise<void>;
  gastoEditando?: Gasto | null;
  responsableDefault: string;
  guardando: boolean;
}

export function RegistrarGastoModal({
  isOpen,
  onClose,
  onSubmit,
  gastoEditando,
  responsableDefault,
  guardando,
}: RegistrarGastoModalProps) {
  const [concepto, setConcepto] = useState('');
  const [montoStr, setMontoStr] = useState('');
  const [categoria, setCategoria] = useState<CategoriaGasto>('servicios');
  const [origenFondo, setOrigenFondo] = useState<OrigenFondoGasto>('caja_turno');
  const [metodoPago, setMetodoPago] = useState<MetodoPagoGasto>('efectivo');
  const [proveedorNombre, setProveedorNombre] = useState('');
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [responsableNombre, setResponsableNombre] = useState(responsableDefault);
  const [deducible, setDeducible] = useState(false);
  const [notas, setNotas] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    if (gastoEditando) {
      setConcepto(gastoEditando.concepto || '');
      setMontoStr(String(gastoEditando.monto || ''));
      setCategoria(gastoEditando.categoria || 'servicios');
      setOrigenFondo(gastoEditando.origenFondo || 'caja_turno');
      setMetodoPago(
        gastoEditando.metodoPago ||
          getOrigenFondoGastoMeta(gastoEditando.origenFondo).metodoDefault
      );
      setProveedorNombre(gastoEditando.proveedorNombre || '');
      setNumeroComprobante(gastoEditando.numeroComprobante || '');
      setResponsableNombre(gastoEditando.responsableNombre || responsableDefault);
      setDeducible(Boolean(gastoEditando.deducible));
      setNotas(gastoEditando.notas || '');
    } else {
      setConcepto('');
      setMontoStr('');
      setCategoria('servicios');
      setOrigenFondo('caja_turno');
      setMetodoPago('efectivo');
      setProveedorNombre('');
      setNumeroComprobante('');
      setResponsableNombre(responsableDefault);
      setDeducible(false);
      setNotas('');
    }
    setErrors({});
  }, [isOpen, gastoEditando, responsableDefault]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !guardando) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, guardando, onClose]);

  if (!isOpen) return null;

  const origenMeta = getOrigenFondoGastoMeta(origenFondo);
  const montoNumerico = parseFiniteNumber(montoStr) || 0;

  const handleSeleccionarOrigen = (nuevoOrigen: OrigenFondoGasto) => {
    setOrigenFondo(nuevoOrigen);
    const meta = getOrigenFondoGastoMeta(nuevoOrigen);
    setMetodoPago(meta.metodoDefault);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;

    const newErrors: Record<string, string> = {};
    if (!concepto.trim()) {
      newErrors.concepto = 'Ingresa el concepto del gasto operativo';
    }
    const montoError = validatePositiveAmount(montoStr);
    if (montoError) {
      newErrors.monto = montoError;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit({
      concepto: concepto.trim(),
      monto: Math.round(montoNumerico),
      categoria,
      origenFondo,
      metodoPago,
      proveedorNombre: proveedorNombre.trim() || undefined,
      numeroComprobante: numeroComprobante.trim() || undefined,
      responsableNombre: responsableNombre.trim() || responsableDefault,
      deducible,
      notas: notas.trim() || undefined,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-gasto-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-4 sm:p-6 shadow-2xl">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Receipt className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="modal-gasto-title" className="font-display text-lg font-bold text-white">
                {gastoEditando ? 'Editar Gasto Operativo' : 'Registrar Gasto Operativo'}
              </h2>
              <p className="text-xs text-neutral-400">
                Conciliado con P&amp;L, Caja Menor y Cierre de Turno (100 % offline)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar modal de gasto operativo"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white disabled:opacity-40"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleFormSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Concepto del gasto *"
              value={concepto}
              onChange={(e) => {
                setConcepto(e.target.value);
                if (errors.concepto) setErrors({ ...errors, concepto: '' });
              }}
              placeholder="Ej: Recibo de energía, Canon local, Detergentes"
              error={errors.concepto}
            />

            <Input
              label="Monto en pesos (COP) *"
              type="number"
              min="1"
              step="100"
              value={montoStr}
              onChange={(e) => {
                setMontoStr(e.target.value);
                if (errors.monto) setErrors({ ...errors, monto: '' });
              }}
              placeholder="Ej: 85000"
              error={errors.monto}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Categoría operativa *"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaGasto)}
              options={CATEGORIAS_GASTO_META.map((c) => ({
                value: c.categoria,
                label: `${c.etiqueta} (${c.tipoCosto === 'fijo' ? 'Fijo' : 'Variable'})`,
              }))}
            />

            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-300">
                Método de pago (offline)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['efectivo', 'transferencia'] as MetodoPagoGasto[]).map((m) => {
                  const active = metodoPago === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setMetodoPago(m)}
                      className={`min-h-[44px] rounded-xl border px-3 text-xs font-semibold transition-all ${
                        active
                          ? 'border-amber-400 bg-amber-500/15 text-amber-300'
                          : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700 hover:text-white'
                      }`}
                    >
                      {m === 'efectivo' ? 'Efectivo' : 'Transferencia'}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Origen del Fondo */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-300">
              Origen del fondo (impacto en caja vs P&amp;L)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ORIGENES_FONDO_GASTO_META.map((item) => {
                const active = origenFondo === item.origen;
                return (
                  <button
                    key={item.origen}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleSeleccionarOrigen(item.origen)}
                    className={`min-h-[44px] rounded-xl border p-3 text-left transition-all ${
                      active
                        ? 'border-amber-400 bg-amber-500/10'
                        : 'border-neutral-800 bg-neutral-900/70 hover:border-neutral-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white">{item.etiqueta}</span>
                      {active && <CheckCircle2 className="h-4 w-4 text-amber-400 shrink-0" />}
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-neutral-400">
                      {item.descripcion}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Banner didáctico de conciliación */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-3 text-xs flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-neutral-300">
              <strong className="text-white">Conciliación automática:</strong>{' '}
              {origenMeta.impactaCajaTurno
                ? `Al guardar, ${montoNumerico > 0 ? formatCOP(montoNumerico) : 'este monto'} se descontará del Efectivo Esperado en el Cierre de Turno y se sumará al P&L.`
                : origenMeta.impactaCajaMenor
                  ? 'Este gasto se controlará contra el saldo disponible de Caja Menor y se reflejará en el Estado de Resultados (P&L) sin descuadrar las ventas del cajón.'
                  : 'Este gasto se registrará en el Estado de Resultados (P&L) sin descontar efectivo físico del cajón de ventas.'}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Proveedor / Entidad"
              value={proveedorNombre}
              onChange={(e) => setProveedorNombre(e.target.value)}
              placeholder="Ej: CENS, Aguas Kpital"
            />
            <Input
              label="N° Factura / Recibo"
              value={numeroComprobante}
              onChange={(e) => setNumeroComprobante(e.target.value)}
              placeholder="Ej: FAC-4021"
            />
            <Input
              label="Responsable"
              value={responsableNombre}
              onChange={(e) => setResponsableNombre(e.target.value)}
              placeholder="Nombre quien autoriza/paga"
            />
          </div>

          <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs text-neutral-200 hover:border-neutral-700">
            <input
              type="checkbox"
              checked={deducible}
              onChange={(e) => setDeducible(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-600 bg-neutral-900 text-amber-400 focus:ring-amber-400"
            />
            <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Cuenta con soporte tributario / factura deducible</span>
          </label>

          <Textarea
            label="Notas adicionales (opcional)"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Detalle del servicio, periodo facturado u observaciones..."
            rows={2}
          />

          <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5 border-t border-neutral-800 pt-3">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={guardando}
              className="w-full sm:w-auto min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={guardando}
              className="w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2"
            >
              <DollarSign className="h-4 w-4" />
              {guardando
                ? 'Guardando...'
                : gastoEditando
                  ? 'Guardar Cambios'
                  : 'Registrar Gasto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
