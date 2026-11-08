import {
  Phone,
  MessageCircle,
  Clock,
  Wallet,
  Banknote,
  Edit2,
  Trash2,
  Sparkles,
  FileText,
} from 'lucide-react';
import type { EmpleadoPersonal, ResumenPreLiquidacionEmpleado } from '@/types/personal';
import { CARGOS_PERSONAL_CONFIG, MODALIDADES_PAGO_CONFIG } from '@/utils/personalUtils';
import { formatCOP } from '@/utils/formatCOP';

interface EmpleadoCardProps {
  empleado: EmpleadoPersonal;
  preLiquidacion?: ResumenPreLiquidacionEmpleado;
  onRegistrarTurno: (empleado: EmpleadoPersonal) => void;
  onRegistrarVale: (empleado: EmpleadoPersonal) => void;
  onLiquidar: (empleado: EmpleadoPersonal) => void;
  onEditar: (empleado: EmpleadoPersonal) => void;
  onEliminar: (empleado: EmpleadoPersonal) => void;
}

export function EmpleadoCard({
  empleado,
  preLiquidacion,
  onRegistrarTurno,
  onRegistrarVale,
  onLiquidar,
  onEditar,
  onEliminar,
}: EmpleadoCardProps) {
  const cargoCfg = CARGOS_PERSONAL_CONFIG[empleado.cargo] || CARGOS_PERSONAL_CONFIG.cocinero;
  const modalidadLabel =
    MODALIDADES_PAGO_CONFIG[empleado.modalidadPago] || empleado.modalidadPago;

  const turnosPendientes = preLiquidacion?.cantidadTurnos || 0;
  const totalDevengado = preLiquidacion?.totalDevengadoTurnos || 0;
  const totalVales = preLiquidacion?.totalValesPendientes || 0;
  const propinaSugerida = preLiquidacion?.propinaSugerida || 0;
  const netoAPagar = preLiquidacion?.netoAPagar || 0;

  const telefonoLimpio = empleado.telefono.replace(/\D/g, '');
  const whatsappHref = telefonoLimpio
    ? `https://wa.me/${telefonoLimpio.startsWith('57') ? telefonoLimpio : `57${telefonoLimpio}`}?text=${encodeURIComponent(
        `Hola ${empleado.nombre}, te escribimos desde La Parada respecto a tu turno y programación de equipo. 👋`
      )}`
    : undefined;

  return (
    <div
      className={`rounded-2xl border p-5 transition-all flex flex-col justify-between ${
        empleado.activo
          ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
          : 'bg-neutral-950/60 border-neutral-800/60 opacity-75'
      }`}
    >
      <div>
        {/* Cabecera del Colaborador */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${cargoCfg.badgeBg}`}
              >
                {cargoCfg.label}
              </span>
              {empleado.participaPropinas && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gold-400/10 text-gold-400 border border-gold-400/30 inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Propinas</span>
                </span>
              )}
              {!empleado.activo && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700">
                  Inactivo
                </span>
              )}
            </div>

            <h3 className="font-display font-bold text-lg text-white leading-tight">
              {empleado.nombre}
            </h3>

            <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1 flex-wrap">
              {empleado.documento && (
                <span className="inline-flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-neutral-500" />
                  <span>CC {empleado.documento}</span>
                </span>
              )}
              <span>• {modalidadLabel}</span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] uppercase tracking-wider text-neutral-400 block">
              Tarifa Turno
            </span>
            <span className="font-display font-black text-base text-gold-400">
              {formatCOP(empleado.tarifaTurno)}
            </span>
          </div>
        </div>

        {/* Resumen Financiero de Nómina Activa */}
        <div className="bg-neutral-950 border border-neutral-800/80 rounded-xl p-3.5 mb-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">
              Turnos por liquidar ({turnosPendientes}):
            </span>
            <span className="font-semibold text-white">
              +{formatCOP(totalDevengado)}
            </span>
          </div>

          {propinaSugerida > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-gold-400/90 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Propina asignada:</span>
              </span>
              <span className="font-semibold text-gold-400">
                +{formatCOP(propinaSugerida)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">Vales / Adelantos a descontar:</span>
            <span
              className={`font-semibold ${
                totalVales > 0 ? 'text-rose-400' : 'text-neutral-500'
              }`}
            >
              -{formatCOP(totalVales)}
            </span>
          </div>

          <div className="pt-2 border-t border-neutral-800 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Neto a Liquidar:
            </span>
            <span className="font-display font-black text-lg text-emerald-400">
              {formatCOP(netoAPagar)}
            </span>
          </div>
        </div>
      </div>

      {/* Acciones Operativas Táctiles (>= 44px) */}
      <div className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onRegistrarTurno(empleado)}
            className="h-11 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-neutral-700"
            aria-label={`Registrar turno a ${empleado.nombre}`}
          >
            <Clock className="w-3.5 h-3.5 text-gold-400 shrink-0" />
            <span>+ Turno</span>
          </button>

          <button
            type="button"
            onClick={() => onRegistrarVale(empleado)}
            className="h-11 px-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors border border-neutral-700"
            aria-label={`Registrar vale o adelanto a ${empleado.nombre}`}
          >
            <Wallet className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>+ Vale</span>
          </button>

          <button
            type="button"
            onClick={() => onLiquidar(empleado)}
            disabled={turnosPendientes === 0 && totalVales === 0 && propinaSugerida === 0}
            className="h-11 px-2.5 rounded-xl bg-gold-400 hover:bg-gold-500 text-neutral-950 font-black text-xs flex items-center justify-center gap-1.5 transition-colors shadow disabled:opacity-40"
            aria-label={`Liquidar nómina de ${empleado.nombre}`}
          >
            <Banknote className="w-3.5 h-3.5 shrink-0" />
            <span>Liquidar</span>
          </button>
        </div>

        {/* Barra de Contacto y Edición */}
        <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60 gap-2">
          <div className="flex items-center gap-1.5">
            {empleado.telefono && (
              <a
                href={`tel:${empleado.telefono}`}
                className="h-11 w-11 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 flex items-center justify-center transition-colors"
                aria-label={`Llamar a ${empleado.nombre}`}
                title={`Llamar (${empleado.telefono})`}
              >
                <Phone className="w-4 h-4" />
              </a>
            )}
            {whatsappHref && (
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="h-11 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                aria-label={`Enviar WhatsApp a ${empleado.nombre}`}
              >
                <MessageCircle className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onEditar(empleado)}
              className="h-11 w-11 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 flex items-center justify-center transition-colors"
              aria-label={`Editar datos de ${empleado.nombre}`}
              title="Editar colaborador"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onEliminar(empleado)}
              className="h-11 w-11 rounded-xl bg-neutral-950 hover:bg-rose-500/10 text-neutral-400 hover:text-rose-400 border border-neutral-800 hover:border-rose-500/30 flex items-center justify-center transition-colors"
              aria-label={`Eliminar a ${empleado.nombre}`}
              title="Eliminar colaborador"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
