import { useMemo, useState } from 'react';
import { CheckCircle2, Gift, QrCode, X } from 'lucide-react';
import type { BonoPrepago, EvaluacionRedencionBono } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import {
  evaluarEstadoBono,
  evaluarRedencionBono,
  extraerCodigoDesdeQrOEntrada,
} from '@/utils/bonosUtils';

export interface SeleccionRedencionBono {
  bono: BonoPrepago;
  evaluacion: EvaluacionRedencionBono;
  montoRedimir: number;
  esMontoPersonalizado?: boolean;
}

interface RedimirBonoSelectorProps {
  bonos: BonoPrepago[];
  totalOrden: number;
  seleccionActual: SeleccionRedencionBono | null;
  disabled?: boolean;
  onAplicarBono: (seleccion: SeleccionRedencionBono | null) => void;
}

export function RedimirBonoSelector({
  bonos,
  totalOrden,
  seleccionActual,
  disabled = false,
  onAplicarBono,
}: RedimirBonoSelectorProps) {
  const [entradaCodigo, setEntradaCodigo] = useState('');
  const [montoParcialInput, setMontoParcialInput] = useState('');
  const [modoParcial, setModoParcial] = useState(false);
  const [mensajeError, setMensajeError] = useState('');

  const bonosDisponibles = useMemo(
    () => bonos.filter((b) => evaluarEstadoBono(b).puedeRedimir),
    [bonos]
  );

  const aplicarBonoCandidato = (
    bono: BonoPrepago,
    montoCustom?: number
  ) => {
    const evalRed = evaluarRedencionBono(bono, totalOrden, montoCustom);
    if (!evalRed.valido) {
      setMensajeError(evalRed.motivoRechazo || 'No es posible aplicar este bono.');
      return;
    }
    setMensajeError('');
    onAplicarBono({
      bono,
      evaluacion: evalRed,
      montoRedimir: evalRed.montoAplicable,
      esMontoPersonalizado: montoCustom !== undefined,
    });
  };

  const handleBuscarYAplicar = () => {
    const codigoNorm = extraerCodigoDesdeQrOEntrada(entradaCodigo);
    if (!codigoNorm) {
      setMensajeError('Ingresa o escanea el código QR del bono.');
      return;
    }
    const encontrado = bonos.find(
      (b) => extraerCodigoDesdeQrOEntrada(b.codigo) === codigoNorm
    );
    if (!encontrado) {
      setMensajeError(`No se encontró ningún bono con el código ${codigoNorm}.`);
      return;
    }
    setModoParcial(false);
    setMontoParcialInput('');
    aplicarBonoCandidato(encontrado);
  };

  if (seleccionActual) {
    const evalVigente = evaluarRedencionBono(
      seleccionActual.bono,
      totalOrden,
      modoParcial && montoParcialInput ? Number(montoParcialInput) : undefined
    );

    return (
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/25 p-3 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              Bono Aplicado · {seleccionActual.bono.codigo}
            </span>
            <p className="text-[11px] text-neutral-300 truncate mt-0.5">
              {seleccionActual.bono.titularNombre} · Saldo:{' '}
              <strong className="text-white">
                {formatCOP(seleccionActual.bono.saldoActual)}
              </strong>
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setModoParcial(false);
              setMontoParcialInput('');
              setMensajeError('');
              onAplicarBono(null);
            }}
            aria-label="Quitar bono aplicado"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-300 hover:text-red-400"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Conmutador Máximo vs Monto Parcial */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={disabled}
            aria-pressed={!modoParcial}
            onClick={() => {
              setModoParcial(false);
              setMontoParcialInput('');
              aplicarBonoCandidato(seleccionActual.bono);
            }}
            className={`min-h-[38px] flex-1 rounded-lg border px-2 text-[11px] font-bold transition-colors ${
              !modoParcial
                ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                : 'border-neutral-800 bg-neutral-900 text-neutral-400'
            }`}
          >
            Máximo ({formatCOP(Math.min(seleccionActual.bono.saldoActual, totalOrden))})
          </button>
          <button
            type="button"
            disabled={disabled}
            aria-pressed={modoParcial}
            onClick={() => {
              setModoParcial(true);
              setMontoParcialInput(String(seleccionActual.montoRedimir));
            }}
            className={`min-h-[38px] flex-1 rounded-lg border px-2 text-[11px] font-bold transition-colors ${
              modoParcial
                ? 'border-gold-400 bg-gold-400/20 text-gold-200'
                : 'border-neutral-800 bg-neutral-900 text-neutral-400'
            }`}
          >
            Monto Parcial
          </button>
        </div>

        {modoParcial && (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="1000"
              max={Math.min(seleccionActual.bono.saldoActual, totalOrden)}
              step="1000"
              value={montoParcialInput}
              onChange={(e) => setMontoParcialInput(e.target.value)}
              disabled={disabled}
              aria-label="Monto parcial a redimir del bono"
              placeholder="Ej: 20000"
              className="min-h-[40px] flex-1 rounded-lg border border-neutral-700 bg-neutral-950 px-3 text-xs font-bold text-white focus:border-gold-400 focus:outline-none"
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                aplicarBonoCandidato(
                  seleccionActual.bono,
                  Number(montoParcialInput) || 0
                )
              }
              className="min-h-[40px] rounded-lg bg-gold-400 px-3 text-xs font-black text-base-dark hover:bg-gold-500"
            >
              Aplicar
            </button>
          </div>
        )}

        <div className="grid grid-cols-3 gap-1.5 rounded-lg border border-neutral-800 bg-neutral-950/90 p-2 text-[11px]">
          <div>
            <span className="text-neutral-500 block">Redime</span>
            <strong className="font-display text-emerald-400">
              -{formatCOP(evalVigente.valido ? evalVigente.montoAplicable : seleccionActual.montoRedimir)}
            </strong>
          </div>
          <div>
            <span className="text-neutral-500 block">Saldo Bono</span>
            <strong className="font-display text-white">
              {formatCOP(evalVigente.valido ? evalVigente.saldoRestanteBono : seleccionActual.evaluacion.saldoRestanteBono)}
            </strong>
          </div>
          <div>
            <span className="text-neutral-500 block">Excedente</span>
            <strong className="font-display text-gold-400">
              {formatCOP(evalVigente.valido ? evalVigente.excedentePorPagar : seleccionActual.evaluacion.excedentePorPagar)}
            </strong>
          </div>
        </div>

        {mensajeError && (
          <p role="alert" className="text-[11px] font-semibold text-red-300">
            {mensajeError}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-300">
          <Gift className="h-3.5 w-3.5 text-gold-400" aria-hidden="true" />
          Redimir Bono / Prepago
        </span>
        {bonosDisponibles.length > 0 && (
          <span className="text-[11px] font-semibold text-gold-400">
            {bonosDisponibles.length} disponible(s)
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <QrCode
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500"
            aria-hidden="true"
          />
          <input
            type="text"
            value={entradaCodigo}
            onChange={(e) => {
              setEntradaCodigo(e.target.value);
              if (mensajeError) setMensajeError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleBuscarYAplicar();
              }
            }}
            disabled={disabled}
            aria-label="Código o lectura QR del bono"
            placeholder="Código BON-... o escanear QR"
            className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 pl-8 pr-3 text-xs font-mono uppercase text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none"
          />
        </div>
        <button
          type="button"
          disabled={disabled || !entradaCodigo.trim()}
          onClick={handleBuscarYAplicar}
          className="min-h-[44px] rounded-xl bg-gold-400 px-3 text-xs font-black text-base-dark hover:bg-gold-500 disabled:opacity-40"
        >
          Validar
        </button>
      </div>

      {bonosDisponibles.length > 0 && (
        <select
          value=""
          onChange={(e) => {
            const elegido = bonosDisponibles.find((b) => b.id === e.target.value);
            if (elegido) {
              setModoParcial(false);
              setMontoParcialInput('');
              aplicarBonoCandidato(elegido);
            }
          }}
          disabled={disabled}
          aria-label="Seleccionar bono o tarjeta prepago activa"
          className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 text-xs text-neutral-200 focus:border-gold-400 focus:outline-none"
        >
          <option value="">Elegir bono activo del negocio...</option>
          {bonosDisponibles.map((b) => (
            <option key={b.id} value={b.id}>
              {b.codigo} · {b.titularNombre} (Disp: {formatCOP(b.saldoActual)})
            </option>
          ))}
        </select>
      )}

      {mensajeError && (
        <p role="alert" className="text-[11px] font-semibold text-red-300">
          {mensajeError}
        </p>
      )}
    </div>
  );
}
