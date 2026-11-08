import { useState } from 'react';
import {
  Sparkles,
  Scale,
  Clock,
  Copy,
  Check,
  RotateCcw,
} from 'lucide-react';
import type {
  DistribucionPropinaItem,
  ModoDistribucionPropinas,
} from '@/types/personal';
import { CARGOS_PERSONAL_CONFIG } from '@/utils/personalUtils';
import { formatCOP } from '@/utils/formatCOP';

interface DistribuirPropinasCardProps {
  propinasRecaudadasVentas: number;
  fondoActivo: number;
  modo: ModoDistribucionPropinas;
  onCambiarModo: (modo: ModoDistribucionPropinas) => void;
  onCambiarFondoPersonalizado: (monto: number | null) => void;
  distribucion: DistribucionPropinaItem[];
}

export function DistribuirPropinasCard({
  propinasRecaudadasVentas,
  fondoActivo,
  modo,
  onCambiarModo,
  onCambiarFondoPersonalizado,
  distribucion,
}: DistribuirPropinasCardProps) {
  const [copiado, setCopiado] = useState(false);

  const handleCopiarResumen = async () => {
    const lineas = distribucion.map(
      (d) =>
        `• *${d.empleadoNombre}* (${d.turnosCompletados} turnos - ${d.porcentajeParticipacion}%): *${formatCOP(
          d.montoPropina
        )}*`
    );

    const texto = `✨ *REPARTO DE PROPINAS DEL EQUIPO - LA PARADA* ✨
• *Fondo a repartir:* ${formatCOP(fondoActivo)}
• *Modalidad:* ${
      modo === 'partes_iguales' ? 'Partes Iguales' : 'Proporcional a Turnos Trabajados'
    }

${lineas.join('\n')}

¡Gracias a todo el equipo por el excelente servicio! 🙌🔥`;

    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Fallback silencioso
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-4 shadow">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-400/10 border border-gold-400/30 flex items-center justify-center text-gold-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg text-white">
              Calculadora y Reparto de Propinas del Equipo
            </h3>
            <p className="text-xs text-neutral-400">
              El valor calculado por colaborador se incluye automáticamente al liquidar su nómina
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopiarResumen}
          disabled={distribucion.length === 0 || fondoActivo <= 0}
          className="h-11 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-gold-400 border border-neutral-700 font-bold text-xs inline-flex items-center gap-2 transition-colors disabled:opacity-40"
        >
          {copiado ? (
            <>
              <Check className="w-4 h-4 text-emerald-400" />
              <span className="text-emerald-400">¡Resumen Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              <span>Copiar Tabla para WhatsApp</span>
            </>
          )}
        </button>
      </div>

      {/* Controles de Fondo y Modo de Distribución */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fondo de Propinas */}
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-neutral-300">
              Fondo Total de Propinas a Repartir (COP)
            </label>
            {fondoActivo !== propinasRecaudadasVentas && (
              <button
                type="button"
                onClick={() => onCambiarFondoPersonalizado(null)}
                className="text-[11px] text-gold-400 hover:underline inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Usar recaudado ({formatCOP(propinasRecaudadasVentas)})</span>
              </button>
            )}
          </div>

          <input
            type="number"
            min={0}
            step={1000}
            value={fondoActivo || ''}
            placeholder="0"
            onChange={(e) => onCambiarFondoPersonalizado(Number(e.target.value))}
            className="w-full h-11 px-3.5 rounded-xl bg-neutral-900 border border-neutral-800 text-gold-400 font-display font-black text-lg focus:border-gold-400 focus:outline-none"
          />

          <p className="text-[11px] text-neutral-400">
            Propinas recaudadas en ventas (últimos 7 días):{' '}
            <strong className="text-white">{formatCOP(propinasRecaudadasVentas)}</strong>
          </p>
        </div>

        {/* Selector de Criterio de Reparto */}
        <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
          <span className="text-xs font-semibold text-neutral-300 block">
            Criterio de Distribución entre Participantes ({distribucion.length})
          </span>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={modo === 'partes_iguales'}
              onClick={() => onCambiarModo('partes_iguales')}
              className={`h-11 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                modo === 'partes_iguales'
                  ? 'bg-gold-400 text-neutral-950 border-gold-400 shadow'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <Scale className="w-4 h-4 shrink-0" />
              <span>Partes Iguales</span>
            </button>

            <button
              type="button"
              aria-pressed={modo === 'proporcional_turnos'}
              onClick={() => onCambiarModo('proporcional_turnos')}
              className={`h-11 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                modo === 'proporcional_turnos'
                  ? 'bg-gold-400 text-neutral-950 border-gold-400 shadow'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:border-neutral-700'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>Segun Turnos</span>
            </button>
          </div>

          <p className="text-[11px] text-neutral-400">
            {modo === 'partes_iguales'
              ? 'Divide el fondo equitativamente entre todos los colaboradores activos con propinas.'
              : 'Asigna mayor porcentaje a quienes completaron más turnos en el periodo.'}
          </p>
        </div>
      </div>

      {/* Tabla de Participantes */}
      {distribucion.length === 0 ? (
        <div className="p-6 text-center bg-neutral-950 rounded-xl border border-neutral-800 text-xs text-neutral-400">
          No hay colaboradores activos marcados con participación en propinas.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {distribucion.map((item) => {
            const cargoCfg =
              CARGOS_PERSONAL_CONFIG[item.cargo] || CARGOS_PERSONAL_CONFIG.cocinero;
            return (
              <div
                key={item.empleadoId}
                className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <span className="font-bold text-sm text-white block truncate">
                    {item.empleadoNombre}
                  </span>
                  <span className="text-[11px] text-neutral-400 block">
                    {cargoCfg.label} • {item.turnosCompletados} turnos ({item.porcentajeParticipacion}%)
                  </span>
                </div>

                <div className="text-right shrink-0">
                  <span className="font-display font-black text-base text-gold-400 block">
                    {formatCOP(item.montoPropina)}
                  </span>
                  <span className="text-[10px] text-neutral-500">Cuota propina</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
