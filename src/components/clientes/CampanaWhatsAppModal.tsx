import { useState, useId, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Copy,
  Sparkles,
  Flame,
  Gift,
  Clock,
  Heart,
  Utensils,
  Check,
} from 'lucide-react';
import type { Cliente, CampanaWhatsAppTipo } from '@/types';
import {
  generarMensajeCampanaWhatsApp,
  evaluarEstadoRiesgoCliente,
  evaluarNivelFidelizacion,
} from '@/utils/fidelizacionUtils';
import { obtenerEnlaceWhatsAppCliente, formatearTelefonoVisual } from '@/utils/clienteUtils';
import { createToast } from '@/components/ui/Toast';

interface CampanaWhatsAppModalProps {
  cliente: Cliente | null;
  isOpen: boolean;
  onClose: () => void;
  nombreNegocio?: string;
  plantillaInicial?: CampanaWhatsAppTipo;
}

export function CampanaWhatsAppModal({
  cliente,
  isOpen,
  onClose,
  nombreNegocio = 'La Parada',
  plantillaInicial,
}: CampanaWhatsAppModalProps) {
  const generatedId = useId();
  const titleId = `modal-campana-wa-${generatedId.replace(/:/g, '')}-title`;
  const modalRef = useRef<HTMLDivElement>(null);

  // Plantilla sugerida inteligente según el estado del cliente
  const determinarPlantillaDefecto = (): CampanaWhatsAppTipo => {
    if (plantillaInicial) return plantillaInicial;
    if (!cliente) return 'agradecimiento_vip';

    if ((cliente.recompensasDisponibles || 0) > 0) {
      return 'recompensa_lista';
    }
    const riesgo = evaluarEstadoRiesgoCliente(cliente).estado;
    if (riesgo === 'en_riesgo' || riesgo === 'inactivo') {
      return 'reactivacion_riesgo';
    }
    if ((cliente.sellosActuales || 0) >= 3) {
      return 'sellos_progreso';
    }
    if (cliente.loDeSiempre && cliente.loDeSiempre.items.length > 0) {
      return 'recordar_lo_de_siempre';
    }
    return 'agradecimiento_vip';
  };

  const [tipoPlantilla, setTipoPlantilla] = useState<CampanaWhatsAppTipo>('agradecimiento_vip');
  const [beneficio, setBeneficio] = useState('10% de descuento en tu próxima cuenta');
  const [mensajePersonalizado, setMensajePersonalizado] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (cliente && isOpen) {
      setTipoPlantilla(determinarPlantillaDefecto());
      setCopiado(false);
    }
  }, [cliente, isOpen, plantillaInicial]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !cliente) return null;

  const riesgoInfo = evaluarEstadoRiesgoCliente(cliente);
  const nivelInfo = evaluarNivelFidelizacion(cliente);

  const mensajeGenerado = generarMensajeCampanaWhatsApp(
    tipoPlantilla,
    cliente,
    nombreNegocio,
    {
      beneficio,
      mensajeLibre: mensajePersonalizado,
    }
  );

  const enlaceWhatsApp = obtenerEnlaceWhatsAppCliente(cliente.telefono, mensajeGenerado);

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(mensajeGenerado);
      setCopiado(true);
      createToast('Mensaje copiado al portapapeles', 'success');
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      createToast('No fue posible copiar el mensaje', 'error');
    }
  };

  const handleEnviarWhatsApp = () => {
    if (enlaceWhatsApp && enlaceWhatsApp !== '#') {
      window.open(enlaceWhatsApp, '_blank', 'noopener,noreferrer');
      createToast(`Abriendo chat de WhatsApp con ${cliente.nombre}`, 'info');
      onClose();
    }
  };

  const plantillasDisponibles: Array<{
    tipo: CampanaWhatsAppTipo;
    titulo: string;
    descripcion: string;
    icono: React.ElementType;
    recomendado?: boolean;
  }> = [
    {
      tipo: 'reactivacion_riesgo',
      titulo: '¡Te extrañamos!',
      descripcion: 'Para recuperar clientes inactivos o en riesgo con una cortesía especial.',
      icono: Clock,
      recomendado: riesgoInfo.estado === 'en_riesgo' || riesgoInfo.estado === 'inactivo',
    },
    {
      tipo: 'recompensa_lista',
      titulo: '¡Recompensa Lista!',
      descripcion: 'Felicita al cliente por completar sus sellos y motívalo a redimirla.',
      icono: Gift,
      recomendado: (cliente.recompensasDisponibles || 0) > 0,
    },
    {
      tipo: 'sellos_progreso',
      titulo: 'Avance de Sellos',
      descripcion: 'Recuérdale cuántos sellos le faltan para ganar su premio de la casa.',
      icono: Sparkles,
      recomendado: (cliente.sellosActuales || 0) >= 3,
    },
    {
      tipo: 'recordar_lo_de_siempre',
      titulo: 'Lo de Siempre',
      descripcion: 'Antójalo directamente con su pedido favorito habitual.',
      icono: Utensils,
      recomendado: Boolean(cliente.loDeSiempre && cliente.loDeSiempre.items.length > 0),
    },
    {
      tipo: 'agradecimiento_vip',
      titulo: 'Agradecimiento VIP',
      descripcion: 'Mensaje de distinción y lealtad para clientes frecuentes.',
      icono: Heart,
      recomendado: nivelInfo.nivel !== 'bronce',
    },
    {
      tipo: 'personalizado',
      titulo: 'Mensaje Libre',
      descripcion: 'Redacta un texto libre manteniendo el nombre y teléfono del cliente.',
      icono: Flame,
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 text-neutral-100 shadow-2xl"
      >
        {/* Cabecera */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-900/95 px-6 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Send className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-white flex items-center gap-2">
                Campaña WhatsApp Directa
              </h2>
              <p className="text-xs text-neutral-400">
                Para: <span className="font-bold text-white">{cliente.nombre}</span> ({formatearTelefonoVisual(cliente.telefono)})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-xl text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
            aria-label="Cerrar ventana de campaña"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Selector de Plantilla de Campaña */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2.5">
              1. Selecciona la intención de la campaña:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {plantillasDisponibles.map((p) => {
                const Icono = p.icono;
                const seleccionada = tipoPlantilla === p.tipo;
                return (
                  <button
                    key={p.tipo}
                    type="button"
                    onClick={() => setTipoPlantilla(p.tipo)}
                    className={`flex items-start gap-3 p-3 text-left rounded-xl border transition-all text-xs ${
                      seleccionada
                        ? 'border-gold-400/80 bg-gold-400/10 text-white shadow-sm shadow-gold-400/10'
                        : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                    }`}
                  >
                    <div
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                        seleccionada
                          ? 'bg-gold-400 text-base-dark'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      <Icono className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-white truncate">{p.titulo}</span>
                        {p.recomendado && (
                          <span className="rounded-full bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider border border-emerald-500/30">
                            Recomendado
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-2">
                        {p.descripcion}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Opciones dinámicas según la plantilla seleccionada */}
          {tipoPlantilla === 'reactivacion_riesgo' && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5 space-y-2">
              <label className="block text-xs font-bold text-amber-300">
                Beneficio o detalle de invitación (opcional):
              </label>
              <input
                type="text"
                value={beneficio}
                onChange={(e) => setBeneficio(e.target.value)}
                placeholder="ej: 10% de descuento, papas de cortesía..."
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none"
              />
            </div>
          )}

          {tipoPlantilla === 'personalizado' && (
            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-300">
                Redacta tu mensaje libre:
              </label>
              <textarea
                rows={3}
                value={mensajePersonalizado}
                onChange={(e) => setMensajePersonalizado(e.target.value)}
                placeholder="Escribe el mensaje personalizado aquí..."
                className="w-full rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none focus:ring-1 focus:ring-gold-400"
              />
            </div>
          )}

          {/* Previsualización del Globo de Chat de WhatsApp */}
          <div>
            <div className="flex items-center justify-between text-xs text-neutral-400 mb-2">
              <span className="font-bold uppercase tracking-wider">
                2. Vista previa del mensaje (formato WhatsApp):
              </span>
              <button
                type="button"
                onClick={handleCopiar}
                className="flex items-center gap-1 text-[11px] font-semibold text-gold-400 hover:text-gold-300 transition-colors"
              >
                {copiado ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copiar
                  </>
                )}
              </button>
            </div>

            <div className="rounded-2xl border border-emerald-600/30 bg-[#0d1418] p-4 text-xs font-sans text-neutral-200 shadow-inner relative">
              <div className="max-w-[90%] whitespace-pre-wrap leading-relaxed bg-[#054640] rounded-2xl rounded-tl-sm p-3.5 text-emerald-50 border border-emerald-500/20 shadow-md">
                {mensajeGenerado}
              </div>
            </div>
          </div>
        </div>

        {/* Acciones del Modal */}
        <div className="sticky bottom-0 z-10 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-800 bg-neutral-900/95 px-6 py-4 backdrop-blur-md">
          <p className="text-xs text-neutral-400 text-center sm:text-left">
            Se abrirá WhatsApp Web o la App oficial con el texto precargado.
          </p>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleCopiar}
              className="flex-1 sm:flex-initial min-h-[44px] flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 px-4 py-2.5 text-xs font-bold text-neutral-200 transition-colors"
            >
              <Copy className="h-4 w-4" />
              Copiar Texto
            </button>

            <button
              type="button"
              onClick={handleEnviarWhatsApp}
              className="flex-1 sm:flex-initial min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 py-2.5 text-xs font-bold text-base-dark transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
            >
              <Send className="h-4 w-4" />
              Abrir WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
