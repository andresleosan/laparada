import React, { useEffect, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, ShieldAlert, X } from 'lucide-react';
import type { RegistrarMovimientoCajaInput, TipoMovimientoCaja } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { ValoresRapidos } from '@/components/ui/ValoresRapidos';
import { formatCOP } from '@/utils/formatCOP';
import {
  CATALOGO_TIPOS_MOVIMIENTO_CAJA,
  MOTIVOS_FRECUENTES_CAJA,
  sanitizarMontoMovimientoCaja,
} from '@/utils/movimientosCajaUtils';

interface RegistrarMovimientoCajaModalProps {
  isOpen: boolean;
  tipoInicial?: TipoMovimientoCaja;
  efectivoActualEsperado: number;
  cajaId?: string;
  responsableDefault?: string;
  guardando: boolean;
  onClose: () => void;
  onConfirmar: (
    input: Omit<RegistrarMovimientoCajaInput, 'negocioId' | 'responsableRol'>
  ) => Promise<void>;
}

const TIPOS_ORDEN: TipoMovimientoCaja[] = [
  'sangria_caja_fuerte',
  'egreso_caja_menor',
  'ingreso_sencillo',
];

export function RegistrarMovimientoCajaModal({
  isOpen,
  tipoInicial = 'sangria_caja_fuerte',
  efectivoActualEsperado,
  cajaId,
  responsableDefault = '',
  guardando,
  onClose,
  onConfirmar,
}: RegistrarMovimientoCajaModalProps) {
  const [tipo, setTipo] = useState<TipoMovimientoCaja>(tipoInicial);
  const [montoStr, setMontoStr] = useState('');
  const [motivo, setMotivo] = useState('');
  const [referencia, setReferencia] = useState('');
  const [autorizadoPor, setAutorizadoPor] = useState('');
  const [notas, setNotas] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setTipo(tipoInicial);
    setMontoStr('');
    setMotivo('');
    setReferencia('');
    setAutorizadoPor('');
    setNotas('');
    setErrorMsg(null);
  }, [isOpen, tipoInicial]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !guardando) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, guardando, onClose]);

  if (!isOpen) return null;

  const info = CATALOGO_TIPOS_MOVIMIENTO_CAJA[tipo];
  const montoNum = sanitizarMontoMovimientoCaja(montoStr);
  const nuevoSaldoEstimado = Math.max(
    0,
    efectivoActualEsperado + info.signo * montoNum
  );
  const superaSaldo = info.signo < 0 && montoNum > efectivoActualEsperado;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (guardando) return;
    setErrorMsg(null);

    if (montoNum <= 0) {
      setErrorMsg('Ingresa un monto válido mayor a $0 COP.');
      return;
    }
    if (motivo.trim().length < 2) {
      setErrorMsg('Indica el motivo o concepto del movimiento.');
      return;
    }
    if (superaSaldo) {
      setErrorMsg(
        `El retiro (${formatCOP(montoNum)}) supera el efectivo esperado en caja (${formatCOP(efectivoActualEsperado)}).`
      );
      return;
    }

    try {
      await onConfirmar({
        cajaId,
        tipo,
        monto: montoNum,
        motivo: motivo.trim(),
        referencia: referencia.trim() || undefined,
        responsableNombre: responsableDefault || 'Cajero de Turno',
        autorizadoPor: autorizadoPor.trim() || undefined,
        notas: notas.trim() || undefined,
      });
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'No se pudo registrar el movimiento.'
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-mov-caja-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-sm"
    >
      <div className="relative flex max-h-[95vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 p-4 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div>
            <h2 id="modal-mov-caja-title" className="font-display text-lg font-bold text-white">
              Registrar Movimiento de Caja
            </h2>
            <p className="text-xs text-neutral-400">
              Registro inmutable auditado con impacto inmediato en efectivo esperado
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar modal de movimiento de caja"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white disabled:opacity-40"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1">
          {/* Selector táctil de tipo de movimiento */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {TIPOS_ORDEN.map((t) => {
              const cat = CATALOGO_TIPOS_MOVIMIENTO_CAJA[t];
              const activo = tipo === t;
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={activo}
                  disabled={guardando}
                  onClick={() => setTipo(t)}
                  className={`flex min-h-[52px] items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold transition-all ${
                    activo
                      ? 'border-gold-400 bg-gold-400/15 text-gold-300'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                  }`}
                >
                  {t === 'ingreso_sencillo' ? (
                    <ArrowDownLeft className="h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                  ) : t === 'sangria_caja_fuerte' ? (
                    <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
                  )}
                  <span>{cat.shortLabel}</span>
                </button>
              );
            })}
          </div>

          <p className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-xs text-neutral-300">
            {info.descripcion}
          </p>

          <Input
            label="Monto en pesos (COP)"
            type="number"
            min="100"
            step="500"
            placeholder="Ej: 150000"
            value={montoStr}
            onChange={(e) => setMontoStr(e.target.value)}
            disabled={guardando}
            required
          />

          <ValoresRapidos
            value={montoStr}
            onChange={setMontoStr}
            disabled={guardando}
            etiqueta="Montos frecuentes (1 toque):"
          />

          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-300">
              Motivo / Concepto obligatorio
            </label>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {MOTIVOS_FRECUENTES_CAJA[tipo].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  disabled={guardando}
                  onClick={() => setMotivo(sug)}
                  className="min-h-[36px] rounded-lg border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-[11px] text-neutral-300 transition-colors hover:border-gold-400/60 hover:text-gold-300"
                >
                  {sug}
                </button>
              ))}
            </div>
            <Input
              type="text"
              placeholder="Describe el motivo del movimiento..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={guardando}
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Referencia / Nro. Sobre (Opcional)"
              type="text"
              placeholder="Ej: Sobre #04 o Recibo #12"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              disabled={guardando}
            />
            <Input
              label="Autorizado por (Opcional)"
              type="text"
              placeholder="Ej: Admin Turno"
              value={autorizadoPor}
              onChange={(e) => setAutorizadoPor(e.target.value)}
              disabled={guardando}
            />
          </div>

          <Textarea
            label="Notas adicionales (Opcional)"
            rows={2}
            placeholder="Observaciones para auditoría..."
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            disabled={guardando}
          />

          {/* Vista previa del impacto en caja */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 text-xs space-y-1">
            <div className="flex justify-between text-neutral-400">
              <span>Efectivo esperado actual:</span>
              <span className="font-semibold text-white">{formatCOP(efectivoActualEsperado)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Nuevo saldo esperado en cajón:</span>
              <span className={`font-display text-sm font-black ${superaSaldo ? 'text-red-400' : 'text-gold-400'}`}>
                {formatCOP(nuevoSaldoEstimado)}
              </span>
            </div>
          </div>

          {errorMsg && (
            <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300">
              {errorMsg}
            </p>
          )}

          <div className="flex gap-2.5 pt-1">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={guardando}
              className="flex-1 min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={guardando}
              disabled={guardando || montoNum <= 0 || superaSaldo}
              className="flex-1 min-h-[44px] font-bold"
            >
              Registrar Movimiento
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
