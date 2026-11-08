import {
  Award,
  CircleDollarSign,
  Crown,
  Percent,
  Receipt,
  Share2,
  Sliders,
  TrendingUp,
  UserCheck,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import type { DesempenoMesero } from '@/types/mesero';
import { formatCOP } from '@/utils/formatCOP';
import { generarComprobanteMeseroWhatsApp } from '@/utils/meserosUtils';

export interface MeseroCardProps {
  desempeno: DesempenoMesero;
  negocioNombre: string;
  periodoTexto: string;
  onLiquidar: (desempeno: DesempenoMesero) => void;
  onConfigurar: (desempeno: DesempenoMesero) => void;
}

export function MeseroCard({
  desempeno,
  negocioNombre,
  periodoTexto,
  onLiquidar,
  onConfigurar,
}: MeseroCardProps) {
  const {
    ranking,
    esEstrella,
    meseroNombre,
    telefono,
    totalVentas,
    cantidadVentas,
    ticketPromedio,
    totalPropinas,
    propinaDirecta,
    propinaPool,
    porcentajeComision,
    comisionVentas,
    totalIncentivos,
    mesasActivasCount,
    mesasActivasNombres,
    metaVentaTurno,
    porcentajeMeta,
    activo,
  } = desempeno;

  const handleCompartirWhatsApp = () => {
    const texto = generarComprobanteMeseroWhatsApp(desempeno, periodoTexto, negocioNombre);
    const tel = telefono ? telefono.replace(/\D/g, '') : '';
    const phoneParam = tel ? `phone=${tel.startsWith('57') ? tel : `57${tel}`}&` : '';
    const url = `https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden rounded-3xl border p-5 sm:p-6 transition-all duration-300 ${
        esEstrella
          ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/20 via-neutral-900 to-neutral-950 shadow-xl shadow-amber-500/5'
          : 'border-neutral-800 bg-neutral-900/90 hover:border-neutral-700'
      }`}
    >
      {/* Cinta / Glow de Mesero Estrella */}
      {esEstrella && (
        <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />
      )}

      <div>
        {/* Cabecera del Mesero */}
        <div className="flex items-start justify-between gap-3 border-b border-neutral-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border font-display text-lg font-black ${
                esEstrella
                  ? 'border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-lg shadow-amber-500/10'
                  : ranking === 2
                  ? 'border-neutral-600 bg-neutral-800 text-neutral-200'
                  : ranking === 3
                  ? 'border-amber-700/40 bg-amber-950/30 text-amber-600'
                  : 'border-neutral-800 bg-neutral-950 text-neutral-400'
              }`}
            >
              {esEstrella ? (
                <Crown className="h-6 w-6 text-amber-400" />
              ) : (
                `#${ranking}`
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-white tracking-wide">
                  {meseroNombre}
                </h3>
                {esEstrella && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-black uppercase text-amber-300">
                    <Award className="h-3 w-3" /> Estrella
                  </span>
                )}
                {!activo && (
                  <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-400">
                    Inactivo
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400">
                {telefono ? `Tel: ${telefono}` : 'Atención en salón'}
              </p>
            </div>
          </div>

          {/* Botón rápido de configuración */}
          <button
            type="button"
            onClick={() => onConfigurar(desempeno)}
            aria-label={`Configurar incentivos de ${meseroNombre}`}
            title="Configurar % de comisiones y metas"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-950 text-neutral-400 border border-neutral-800 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
          >
            <Sliders className="h-4 w-4" />
          </button>
        </div>

        {/* Mesas Activas en Vivo */}
        {mesasActivasCount > 0 ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-2 text-xs text-amber-300">
            <UtensilsCrossed className="h-4 w-4 shrink-0 text-amber-400" />
            <span className="font-semibold">
              Atendiendo {mesasActivasCount} {mesasActivasCount === 1 ? 'mesa' : 'mesas'}:
            </span>
            <span className="truncate text-white font-medium">
              {mesasActivasNombres.join(', ')}
            </span>
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-neutral-950 px-3 py-2 text-xs text-neutral-500 border border-neutral-800/60">
            <UtensilsCrossed className="h-4 w-4 shrink-0 text-neutral-600" />
            <span>Sin mesas asignadas en este momento</span>
          </div>
        )}

        {/* Progreso de Meta del Turno (si aplica) */}
        {metaVentaTurno && metaVentaTurno > 0 ? (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-neutral-400 font-medium">Meta de Turno</span>
              <span className={`font-bold ${porcentajeMeta >= 100 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {porcentajeMeta}% · {formatCOP(totalVentas)} / {formatCOP(metaVentaTurno)}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-950 border border-neutral-800">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  porcentajeMeta >= 100
                    ? 'bg-gradient-to-r from-emerald-500 to-green-400'
                    : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, porcentajeMeta))}%` }}
              />
            </div>
          </div>
        ) : null}

        {/* Grilla de Métricas Principales */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/70 p-3">
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
              <span>Ventas Facturadas</span>
            </div>
            <p className="font-display text-base sm:text-lg font-black text-white">
              {formatCOP(totalVentas)}
            </p>
            <p className="text-[11px] text-neutral-500">
              {cantidadVentas} {cantidadVentas === 1 ? 'cuenta' : 'cuentas cobradas'}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/70 p-3">
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
              <Receipt className="h-3.5 w-3.5 text-sky-400" />
              <span>Ticket Promedio</span>
            </div>
            <p className="font-display text-base sm:text-lg font-black text-white">
              {formatCOP(ticketPromedio)}
            </p>
            <p className="text-[11px] text-neutral-500">Por mesa atendida</p>
          </div>

          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/70 p-3">
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
              <CircleDollarSign className="h-3.5 w-3.5 text-emerald-400" />
              <span>Propinas Salón</span>
            </div>
            <p className="font-display text-base sm:text-lg font-black text-emerald-300">
              {formatCOP(totalPropinas)}
            </p>
            <p className="text-[11px] text-neutral-500">
              Directa: {formatCOP(propinaDirecta)}
              {propinaPool > 0 && ` · Pool: ${formatCOP(propinaPool)}`}
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800/80 bg-neutral-950/70 p-3">
            <div className="flex items-center gap-1.5 text-xs text-neutral-400 mb-1">
              <Percent className="h-3.5 w-3.5 text-amber-400" />
              <span>Comisiones ({porcentajeComision}%)</span>
            </div>
            <p className="font-display text-base sm:text-lg font-black text-amber-300">
              {formatCOP(comisionVentas)}
            </p>
            <p className="text-[11px] text-neutral-500">Sobre ventas netas</p>
          </div>
        </div>

        {/* Resumen de Incentivo Neto Total */}
        <div className="mt-3 flex items-center justify-between rounded-2xl bg-gradient-to-r from-emerald-950/30 to-amber-950/30 border border-emerald-500/20 p-3.5">
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-xs font-bold text-neutral-300">Total Incentivos a Liquidar</p>
              <p className="text-[10px] text-neutral-400">Propinas directas + comisiones</p>
            </div>
          </div>
          <p className="font-display text-lg font-black text-emerald-300">
            {formatCOP(totalIncentivos)}
          </p>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="mt-5 flex items-center gap-2 pt-3 border-t border-neutral-800/80">
        <button
          type="button"
          onClick={handleCompartirWhatsApp}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-950/30 px-3 py-2 text-xs font-bold text-emerald-300 hover:bg-emerald-900/40 hover:text-white transition-all active:scale-95"
        >
          <Share2 className="h-4 w-4" />
          <span>Reporte WhatsApp</span>
        </button>

        <button
          type="button"
          onClick={() => onLiquidar(desempeno)}
          disabled={totalIncentivos <= 0}
          className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-4 py-2 text-xs font-black text-neutral-950 shadow-md hover:brightness-110 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
        >
          <UserCheck className="h-4 w-4" />
          <span>Liquidar</span>
        </button>
      </div>
    </div>
  );
}
