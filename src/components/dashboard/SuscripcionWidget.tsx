// src/components/dashboard/SuscripcionWidget.tsx
import { Sparkles, Calendar, MessageSquare, ShieldCheck, Zap } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Negocio, PLANES_SAAS, TipoPlanSaaS } from '@/types/negocio';
import { formatCOP } from '@/utils/formatCOP';

interface SuscripcionWidgetProps {
  negocio: Negocio;
  esSuperAdmin?: boolean;
}

export function SuscripcionWidget({ negocio, esSuperAdmin: _esSuperAdmin }: SuscripcionWidgetProps) {
  const isInsignia = negocio.id === 'laparada' || negocio.plan === 'enterprise';

  const planConfig = negocio.planId && PLANES_SAAS[negocio.planId]
    ? PLANES_SAAS[negocio.planId]
    : negocio.plan && PLANES_SAAS[negocio.plan as TipoPlanSaaS]
      ? PLANES_SAAS[negocio.plan as TipoPlanSaaS]
      : PLANES_SAAS.prueba_3d;

  let diasRestantes = 999;
  let estadoVigencia: 'activo' | 'por_vencer' | 'vencido' | 'permanente' = 'permanente';
  let textoVigencia = 'Acceso Permanente';

  if (!isInsignia) {
    if (negocio.suscripcionVenceEn) {
      const venceEnMs =
        typeof negocio.suscripcionVenceEn.toMillis === 'function'
          ? negocio.suscripcionVenceEn.toMillis()
          : 'seconds' in negocio.suscripcionVenceEn
            ? (negocio.suscripcionVenceEn as { seconds: number }).seconds * 1000
            : 0;

      const diffMs = venceEnMs - Date.now();
      diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diasRestantes < 0) {
        estadoVigencia = 'vencido';
        textoVigencia = `Vencido hace ${Math.abs(diasRestantes)} d`;
      } else if (diasRestantes <= 3) {
        estadoVigencia = 'por_vencer';
        textoVigencia = `${diasRestantes} día(s) restante(s)`;
      } else {
        estadoVigencia = 'activo';
        textoVigencia = `${diasRestantes} días restantes`;
      }
    } else {
      estadoVigencia = 'por_vencer';
      textoVigencia = 'Prueba activa';
    }
  }

  const usadas = negocio.respuestasIAUsadas || 0;
  const cuota = negocio.cuotaRespuestasIA || planConfig.cuotaRespuestasIA || 300;
  const pctUso = Math.min(100, Math.round((usadas / cuota) * 100));

  const whatsappPhone = '573001234567';
  const whatsappMensaje = encodeURIComponent(
    `Hola Andrés, deseo renovar o ampliar el plan SaaS de mi local "${negocio.nombre}" (ID: ${negocio.id}). Plan actual: ${planConfig.nombre}.`
  );
  const whatsappUrl = `https://wa.me/${whatsappPhone}?text=${whatsappMensaje}`;

  return (
    <Card className="p-5 bg-neutral-900/90 border-neutral-800 space-y-4 shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-400" />
          <h2 className="text-base font-bold text-white">Suscripción SaaS & IA</h2>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
          {planConfig.nombre}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Días restantes */}
        <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800">
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1">
            <Calendar className="h-3 w-3 text-sky-400" />
            Vigencia
          </span>
          <p className={`font-bold text-sm mt-1 font-display ${
            estadoVigencia === 'vencido' ? 'text-red-400' :
            estadoVigencia === 'por_vencer' ? 'text-amber-400' :
            'text-emerald-400'
          }`}>
            {textoVigencia}
          </p>
        </div>

        {/* Tarifa / Plan */}
        <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800">
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-emerald-400" />
            Tarifa Plan
          </span>
          <p className="font-bold text-sm text-neutral-200 mt-1 font-display">
            {isInsignia ? 'Insignia' : `${formatCOP(planConfig.precioCOP)}`}
          </p>
        </div>
      </div>

      {/* Barra de Consumo de IA */}
      <div className="p-3 rounded-xl bg-neutral-950/70 border border-neutral-800 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-neutral-300 font-semibold flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-gold-400" />
            Respuestas Sarin IA
          </span>
          <span className="font-mono text-white font-bold">
            {usadas.toLocaleString('es-CO')} / {cuota.toLocaleString('es-CO')}
          </span>
        </div>
        <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              pctUso >= 90 ? 'bg-red-500' : pctUso >= 70 ? 'bg-amber-400' : 'bg-emerald-400'
            }`}
            style={{ width: `${pctUso}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-neutral-400">
          <span>{pctUso}% consumido</span>
          <span>{Math.max(0, cuota - usadas).toLocaleString('es-CO')} disponibles</span>
        </div>
      </div>

      {/* Botón de Renovación por WhatsApp */}
      {!isInsignia && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold transition-all shadow-md active:scale-98 min-h-[44px]"
        >
          <MessageSquare className="h-4 w-4" />
          <span>Renovar o Recargar por WhatsApp</span>
        </a>
      )}
    </Card>
  );
}

export default SuscripcionWidget;

