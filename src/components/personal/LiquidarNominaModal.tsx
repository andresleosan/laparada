import { useState, useEffect, useId, type FormEvent } from 'react';
import {
  X,
  Banknote,
  CreditCard,
  Check,
  CheckCircle2,
  MessageCircle,
  Sparkles,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type {
  EmpleadoPersonal,
  ResumenPreLiquidacionEmpleado,
  CrearLiquidacionInput,
  LiquidacionNomina,
} from '@/types/personal';
import {
  CARGOS_PERSONAL_CONFIG,
  generarMensajeWhatsAppLiquidacion,
} from '@/utils/personalUtils';
import { formatCOP } from '@/utils/formatCOP';

interface LiquidarNominaModalProps {
  isOpen: boolean;
  onClose: () => void;
  empleado: EmpleadoPersonal | null;
  preLiquidacion: ResumenPreLiquidacionEmpleado | null;
  nombreNegocio: string;
  onSubmit: (data: CrearLiquidacionInput) => Promise<LiquidacionNomina>;
}

export function LiquidarNominaModal({
  isOpen,
  onClose,
  empleado,
  preLiquidacion,
  nombreNegocio,
  onSubmit,
}: LiquidarNominaModalProps) {
  const generatedId = useId();
  const titleId = `modal-liquidar-${generatedId.replace(/:/g, '')}-title`;

  const hoyStr = new Date().toISOString().split('T')[0];
  const hace7Dias = new Date();
  hace7Dias.setDate(hace7Dias.getDate() - 7);
  const desdeDefault = hace7Dias.toISOString().split('T')[0];

  const [periodoDesde, setPeriodoDesde] = useState(desdeDefault);
  const [periodoHasta, setPeriodoHasta] = useState(hoyStr);
  const [propinaEditable, setPropinaEditable] = useState<number>(0);
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'transferencia'>('efectivo');
  const [referenciaPago, setReferenciaPago] = useState('');
  const [registrarGastoSalarios, setRegistrarGastoSalarios] = useState(true);
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [liquidacionEmitida, setLiquidacionEmitida] = useState<LiquidacionNomina | null>(null);

  useEffect(() => {
    if (!isOpen || !preLiquidacion) return;
    setPropinaEditable(preLiquidacion.propinaSugerida || 0);
    setMetodoPago('efectivo');
    setReferenciaPago('');
    setRegistrarGastoSalarios(true);
    setNotas('');
    setErrorLocal(null);
    setLiquidacionEmitida(null);
  }, [isOpen, preLiquidacion]);

  if (!isOpen || !empleado || !preLiquidacion) return null;

  const subtotalTurnos = preLiquidacion.subtotalTurnos;
  const subtotalBonos = preLiquidacion.subtotalBonos;
  const totalVales = preLiquidacion.totalValesPendientes;
  const propinaFinal = Math.max(0, Math.round(Number(propinaEditable) || 0));
  const netoCalculado = Math.max(
    0,
    subtotalTurnos + subtotalBonos + propinaFinal - totalVales
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);
    setGuardando(true);

    try {
      const resultado = await onSubmit({
        empleadoId: empleado.id,
        empleadoNombre: empleado.nombre,
        cargo: empleado.cargo,
        periodoDesde,
        periodoHasta,
        turnosIds: preLiquidacion.turnosPendientes.map((t) => t.id),
        valesIds: preLiquidacion.valesPendientes.map((v) => v.id),
        totalTurnosValor: subtotalTurnos,
        totalBonos: subtotalBonos,
        totalPropinas: propinaFinal,
        totalValesDescontados: totalVales,
        netoPagado: netoCalculado,
        metodoPago,
        referenciaPago: referenciaPago.trim() || undefined,
        registrarGastoSalarios,
        notas: notas.trim() || undefined,
      });

      setLiquidacionEmitida(resultado);
    } catch (err) {
      setErrorLocal(
        err instanceof Error ? err.message : 'No se pudo procesar la liquidación.'
      );
    } finally {
      setGuardando(false);
    }
  };

  const cargoCfg = CARGOS_PERSONAL_CONFIG[empleado.cargo] || CARGOS_PERSONAL_CONFIG.cocinero;

  const telefonoLimpio = empleado.telefono.replace(/\D/g, '');
  const whatsappUrl =
    liquidacionEmitida && telefonoLimpio
      ? `https://wa.me/${
          telefonoLimpio.startsWith('57') ? telefonoLimpio : `57${telefonoLimpio}`
        }?text=${encodeURIComponent(
          generarMensajeWhatsAppLiquidacion(liquidacionEmitida, nombreNegocio)
        )}`
      : undefined;

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      onBackdropClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between sticky top-0 bg-neutral-900/95 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h2 id={titleId} className="font-display font-bold text-lg text-white">
                {liquidacionEmitida
                  ? '¡Liquidación Registrada con Éxito!'
                  : `Liquidar Nómina: ${empleado.nombre}`}
              </h2>
              <p className="text-xs text-neutral-400">
                {cargoCfg.label} • Cierre de turnos, propinas y descuento de vales
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de liquidación"
            className="h-11 w-11 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {liquidacionEmitida ? (
          <div className="p-6 text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="font-display font-black text-2xl text-white">
                {formatCOP(liquidacionEmitida.netoPagado)}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Pagado a <strong className="text-white">{empleado.nombre}</strong> ({liquidacionEmitida.cantidadTurnos} turnos saldados y {liquidacionEmitida.valesIds.length} vales descontados)
              </p>
            </div>

            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-left text-xs space-y-1.5 font-mono text-neutral-300">
              <div className="flex justify-between">
                <span>(+) Valor Turnos ({liquidacionEmitida.cantidadTurnos}):</span>
                <span>{formatCOP(liquidacionEmitida.totalTurnosValor)}</span>
              </div>
              <div className="flex justify-between">
                <span>(+) Bonificaciones:</span>
                <span>{formatCOP(liquidacionEmitida.totalBonos)}</span>
              </div>
              <div className="flex justify-between text-gold-400">
                <span>(+) Propinas Equipo:</span>
                <span>{formatCOP(liquidacionEmitida.totalPropinas)}</span>
              </div>
              <div className="flex justify-between text-rose-400">
                <span>(-) Vales Descontados:</span>
                <span>-{formatCOP(liquidacionEmitida.totalValesDescontados)}</span>
              </div>
              <div className="pt-2 border-t border-neutral-800 flex justify-between font-bold text-emerald-400 text-sm">
                <span>NETO PAGADO:</span>
                <span>{formatCOP(liquidacionEmitida.netoPagado)}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto h-11 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-neutral-950 font-black text-xs sm:text-sm inline-flex items-center justify-center gap-2 transition-colors shadow-lg"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Enviar Comprobante por WhatsApp</span>
                </a>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto h-11 px-5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs sm:text-sm transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {errorLocal && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                {errorLocal}
              </div>
            )}

            {/* Periodo Liquidado */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Periodo Desde
                </label>
                <input
                  type="date"
                  required
                  value={periodoDesde}
                  onChange={(e) => setPeriodoDesde(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs sm:text-sm focus:border-gold-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Periodo Hasta
                </label>
                <input
                  type="date"
                  required
                  value={periodoHasta}
                  onChange={(e) => setPeriodoHasta(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs sm:text-sm focus:border-gold-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Cascada de Liquidación */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">
                  (+) Turnos completados ({preLiquidacion.cantidadTurnos} turnos •{' '}
                  {preLiquidacion.horasAcumuladas} h):
                </span>
                <span className="font-bold text-white">
                  {formatCOP(subtotalTurnos)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">(+) Bonos extras de turno:</span>
                <span className="font-bold text-white">
                  {formatCOP(subtotalBonos)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-rose-300">
                  (-) Vales y adelantos pendientes ({preLiquidacion.valesPendientes.length}):
                </span>
                <span className="font-bold text-rose-400">
                  -{formatCOP(totalVales)}
                </span>
              </div>

              {/* Propina Editable */}
              <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-3">
                <label className="text-xs font-semibold text-gold-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>(+) Propina del Equipo a Incluir (COP):</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={propinaEditable || ''}
                  placeholder="0"
                  onChange={(e) => setPropinaEditable(Number(e.target.value))}
                  className="w-36 h-10 px-3 rounded-lg bg-neutral-900 border border-gold-400/40 text-gold-400 font-display font-bold text-sm text-right focus:border-gold-400 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-neutral-800 flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider text-white">
                  Neto Total a Pagar:
                </span>
                <span className="font-display font-black text-2xl text-emerald-400">
                  {formatCOP(netoCalculado)}
                </span>
              </div>
            </div>

            {/* Medio de Pago y Referencia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Medio de Pago Offline
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={metodoPago === 'efectivo'}
                    onClick={() => setMetodoPago('efectivo')}
                    className={`h-11 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      metodoPago === 'efectivo'
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Efectivo</span>
                  </button>

                  <button
                    type="button"
                    aria-pressed={metodoPago === 'transferencia'}
                    onClick={() => setMetodoPago('transferencia')}
                    className={`h-11 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      metodoPago === 'transferencia'
                        ? 'bg-blue-500/15 border-blue-500/50 text-blue-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Transferencia</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  Referencia / Comprobante
                </label>
                <input
                  type="text"
                  value={referenciaPago}
                  onChange={(e) => setReferenciaPago(e.target.value)}
                  placeholder="Ej: Nequi #8821 o Recibo Caja"
                  className="w-full h-11 px-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:border-gold-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Toggle Registrar Gasto de Salarios */}
            <button
              type="button"
              aria-pressed={registrarGastoSalarios}
              onClick={() => setRegistrarGastoSalarios((prev) => !prev)}
              className={`w-full min-h-[48px] p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                registrarGastoSalarios
                  ? 'bg-gold-400/10 border-gold-400/40 text-gold-300'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400'
              }`}
            >
              <div>
                <span className="text-xs font-bold block">
                  Registrar egreso automático en Gastos Operativos (Categoría Salarios)
                </span>
                <span className="text-[11px] opacity-80">
                  Impacta el Estado de Resultados (P&L) y el cuadre de caja del día
                </span>
              </div>
              <span className="text-xs font-black uppercase">
                {registrarGastoSalarios ? 'SÍ' : 'NO'}
              </span>
            </button>

            {/* Notas */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Observaciones de Liquidación
              </label>
              <input
                type="text"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Pago semana completa sin novedades"
                className="w-full h-11 px-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs focus:border-gold-400 focus:outline-none"
              />
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={onClose}
                className="h-11 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-xs sm:text-sm transition-colors"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={guardando}
                className="h-11 px-5 rounded-xl bg-gold-400 hover:bg-gold-500 text-neutral-950 font-black text-xs sm:text-sm flex items-center gap-2 transition-colors shadow-lg disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>
                  {guardando
                    ? 'Procesando...'
                    : `Confirmar Pago (${formatCOP(netoCalculado)})`}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </StorefrontDialog>
  );
}
