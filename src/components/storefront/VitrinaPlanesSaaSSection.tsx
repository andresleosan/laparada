// src/components/storefront/VitrinaPlanesSaaSSection.tsx
import { Link } from 'react-router-dom';
import {
  Check,
  Bot,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { PLANES_SAAS, TipoPlanSaaS } from '@/types/negocio';
import { formatCOP } from '@/utils/formatCOP';

const PLANES_PUBLICOS: TipoPlanSaaS[] = [
  'prueba_3d',
  'semanal_7d',
  'quincenal_15d',
  'mensual_30d',
];

export function VitrinaPlanesSaaSSection() {
  return (
    <section
      id="planes-saas"
      aria-label="Planes de suscripción para restaurantes y locales"
      className="border-t border-neutral-800 bg-gradient-to-b from-neutral-950 to-neutral-900 py-16 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Cabecera */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold tracking-wider uppercase">
            <Bot size={14} />
            Plataforma SaaS para Restaurantes
          </div>
          <h2 className="font-display font-black text-3xl sm:text-5xl text-white tracking-tight">
            ¿Tienes un Restaurante o Puesto de Comida?
          </h2>
          <p className="text-xs sm:text-base text-neutral-300 leading-relaxed">
            Digitaliza tu carta en minutos, automatiza tus pedidos por WhatsApp con{' '}
            <strong className="text-amber-400">Sarin IA</strong> y controla tu caja sin
            comisiones por venta ni pasarelas intermediarias.
          </p>
        </div>

        {/* Rejilla de Planes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {PLANES_PUBLICOS.map((planKey) => {
            const plan = PLANES_SAAS[planKey];
            const esDestacado = planKey === 'mensual_30d';

            return (
              <div
                key={plan.id}
                className={`rounded-3xl p-6 flex flex-col justify-between transition-all duration-300 relative ${
                  esDestacado
                    ? 'bg-gradient-to-b from-neutral-900 via-neutral-900 to-amber-950/30 border-2 border-amber-500 shadow-2xl shadow-amber-500/10 scale-100 lg:-translate-y-2'
                    : 'bg-neutral-900/90 border border-neutral-800 hover:border-neutral-700 shadow-xl'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-md ${
                        esDestacado
                          ? 'bg-amber-500 text-neutral-950 font-black'
                          : 'bg-neutral-800 text-amber-300 border border-neutral-700'
                      }`}
                    >
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="font-display font-black text-xl text-white">{plan.nombre}</h3>
                    <p className="text-xs text-neutral-400 mt-1 min-h-[32px]">
                      {plan.descripcion}
                    </p>
                  </div>

                  {/* Precio */}
                  <div className="pt-2 pb-1 border-t border-b border-neutral-800">
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-3xl sm:text-4xl font-black text-amber-400">
                        {formatCOP(plan.precioCOP)}
                      </span>
                    </div>
                    <span className="text-[11px] text-neutral-400 font-medium">
                      Acceso total por {plan.dias} {plan.dias === 1 ? 'día' : 'días'}
                    </span>
                  </div>

                  {/* Cuota de IA destacada */}
                  <div className="p-3 bg-neutral-950 rounded-2xl border border-amber-500/20 flex items-center gap-2.5">
                    <Sparkles size={16} className="text-amber-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-semibold">
                        Cuota de Inteligencia
                      </span>
                      <span className="text-xs font-bold text-white">
                        {plan.cuotaRespuestasIA.toLocaleString('es-CO')} respuestas de Sarin IA
                      </span>
                    </div>
                  </div>

                  {/* Características */}
                  <ul className="space-y-2.5 text-xs text-neutral-300 pt-2">
                    {plan.caracteristicas.map((caract, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                        <span className="leading-snug">{caract}</span>
                      </li>
                    ))}
                    <li className="flex items-start gap-2 text-neutral-400">
                      <Check size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">
                        Pagos directos (efectivo y transferencias)
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Botón CTA */}
                <div className="mt-6 pt-4 border-t border-neutral-800">
                  <Link
                    to={`/registro-negocio?plan=${plan.id}`}
                    aria-label={`Comenzar con el plan ${plan.nombre}`}
                    className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-xl font-black text-xs transition-all shadow-lg active:scale-95 ${
                      esDestacado
                        ? 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/20'
                        : 'bg-neutral-800 hover:bg-neutral-700 text-white'
                    }`}
                  >
                    <span>Empezar con este plan</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Banner de soporte de plataforma */}
        <div className="rounded-3xl border border-neutral-800 bg-neutral-950/80 p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="font-display font-black text-lg text-white">
              ¿Tienes dudas o necesitas acompañamiento en la configuración?
            </h4>
            <p className="text-xs text-neutral-400">
              Nuestro equipo te ayuda a subir tu menú, vincular tu número de WhatsApp y poner a
              funcionar tu local en menos de 24 horas.
            </p>
          </div>

          <Link
            to="/registro-negocio"
            className="shrink-0 min-h-11 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all hover:scale-105 active:scale-95"
          >
            <span>Crear Cuenta de Negocio</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}

