import { useEffect, useState } from 'react';
import { CheckCircle2, MessageCircle, Printer, Sparkles } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type { ItemKioscoCustomizado, MetodoPago, TipoServicioKiosco } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import { generarMensajeWhatsAppTurno } from '@/utils/kioscoTurnosUtils';

export interface KioscoTicketTurnoModalProps {
  numeroTurno: string;
  clienteNombre: string;
  clienteTelefono?: string;
  tipoServicio: TipoServicioKiosco;
  mesaNumero?: string;
  items: ItemKioscoCustomizado[];
  total: number;
  metodoPago: MetodoPago;
  negocioNombre: string;
  onFinalizar: () => void;
  autoCloseSeconds?: number;
}

export function KioscoTicketTurnoModal({
  numeroTurno,
  clienteNombre,
  clienteTelefono,
  tipoServicio,
  mesaNumero,
  items,
  total,
  metodoPago,
  negocioNombre,
  onFinalizar,
  autoCloseSeconds = 20,
}: KioscoTicketTurnoModalProps) {
  const [countdown, setCountdown] = useState(autoCloseSeconds);

  // Temporizador de auto-reinicio para liberar la pantalla al siguiente comensal
  useEffect(() => {
    if (countdown <= 0) {
      onFinalizar();
      return;
    }
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown, onFinalizar]);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    const msg = generarMensajeWhatsAppTurno({
      numeroTurno,
      clienteNombre,
      items,
      total,
      negocioNombre,
      tipoServicio,
      mesaNumero,
    });
    const phoneClean = (clienteTelefono || '').replace(/[^0-9]/g, '');
    const url = phoneClean.length >= 10
      ? `https://wa.me/57${phoneClean.slice(-10)}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const esSalon = tipoServicio === 'salon';

  return (
    <StorefrontDialog
      labelledBy="modal-ticket-titulo"
      onClose={onFinalizar}
      className="w-full max-w-lg rounded-3xl border-2 border-gold-400/50 bg-neutral-900 p-6 sm:p-8 text-white shadow-2xl text-center select-none"
    >
      {/* Icono de Éxito */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 mb-4 animate-bounce">
        <CheckCircle2 className="h-8 w-8" />
      </div>

      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/40 bg-gold-400/10 px-3.5 py-1 text-xs font-black uppercase tracking-widest text-gold-400 mb-2">
        <Sparkles className="h-3 w-3" />
        Pedido Registrado Exitosamente
      </span>

      <h2 id="modal-ticket-titulo" className="text-sm font-bold text-neutral-400 uppercase tracking-wider">
        Tu Número de Turno es
      </h2>

      {/* NÚMERO DE TURNO GIGANTE */}
      <div className="my-3 rounded-2xl border-2 border-gold-400/40 bg-black/60 p-4 shadow-inner">
        <span className="font-display text-6xl sm:text-7xl font-black text-gold-400 tracking-tight block">
          {numeroTurno}
        </span>
        <span className="text-xs font-bold text-neutral-400 mt-1 block">
          {clienteNombre} · {esSalon ? `Comer en Salón ${mesaNumero ? `(Mesa ${mesaNumero})` : ''}` : 'Para Llevar'}
        </span>
      </div>

      {/* Instrucciones de Caja */}
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-left my-4 space-y-2">
        <div className="flex items-start gap-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-400 text-black text-xs font-black mt-0.5">
            1
          </div>
          <p className="text-xs sm:text-sm text-neutral-300">
            Acércate a la <strong className="text-white">Caja</strong> con tu número <strong className="text-gold-400">{numeroTurno}</strong> y abona <strong className="text-gold-400">{formatCOP(total)}</strong> en {metodoPago === 'efectivo' ? 'efectivo' : 'transferencia'}.
          </p>
        </div>
        <div className="flex items-start gap-3">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-400 text-black text-xs font-black mt-0.5">
            2
          </div>
          <p className="text-xs sm:text-sm text-neutral-300">
            Observa la <strong className="text-white">pantalla de turnos en salón</strong>. Cuando tu turno pase a <strong className="text-emerald-400">LISTO</strong>, reclama tu pedido en el mostrador.
          </p>
        </div>
      </div>

      {/* Botones de Acción: Imprimir, WhatsApp y Salir */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-700 bg-neutral-800 py-3 text-xs font-black text-white hover:bg-neutral-700 transition-colors min-h-[44px]"
        >
          <Printer className="h-4 w-4" />
          <span>Imprimir Ticket</span>
        </button>

        <button
          type="button"
          onClick={handleWhatsApp}
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-600/40 bg-emerald-950/40 py-3 text-xs font-black text-emerald-300 hover:bg-emerald-900/40 transition-colors min-h-[44px]"
        >
          <MessageCircle className="h-4 w-4" />
          <span>Enviar a WhatsApp</span>
        </button>
      </div>

      {/* Botón Principal de Nuevo Pedido con cuenta regresiva */}
      <button
        type="button"
        onClick={onFinalizar}
        className="w-full mt-4 rounded-2xl bg-gold-400 py-3.5 text-sm font-black text-black shadow-xl hover:bg-gold-500 transition-colors active:scale-[0.99] min-h-[48px]"
      >
        Finalizar e Iniciar Nuevo Pedido ({countdown}s)
      </button>
    </StorefrontDialog>
  );
}
