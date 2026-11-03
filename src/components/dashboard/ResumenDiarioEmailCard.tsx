// src/components/dashboard/ResumenDiarioEmailCard.tsx
import { useCallback, useEffect, useState } from 'react';
import {
  Mail,
  Send,
  Eye,
  CheckCircle2,
  Clock,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { createToast } from '@/components/ui/Toast';
import { Negocio } from '@/types/negocio';
import { NotificacionCorreo, ResumenDiarioResponse } from '@/types/notificacion';
import {
  enviarResumenDiarioPorCorreo,
  getNotificacionesCorreoDeNegocio,
  obtenerResumenDiarioActual,
} from '@/services/emailNotificationsService';
import { formatCOP } from '@/utils/formatCOP';

interface ResumenDiarioEmailCardProps {
  negocio: Negocio;
  className?: string;
}

export function ResumenDiarioEmailCard({ negocio, className = '' }: ResumenDiarioEmailCardProps) {
  const [resumen, setResumen] = useState<ResumenDiarioResponse | null>(null);
  const [cargandoResumen, setCargandoResumen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [modalPreview, setModalPreview] = useState(false);

  // Historial de correos
  const [historial, setHistorial] = useState<NotificacionCorreo[]>([]);
  const [mostrarHistorial, setMostrarHistorial] = useState(false);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const cargarDatos = useCallback(async () => {
    if (!negocio?.id) return;
    setCargandoResumen(true);
    try {
      const data = await obtenerResumenDiarioActual(negocio.id);
      setResumen(data);
    } catch (err) {
      console.warn('[ResumenDiarioEmailCard] Error obteniendo resumen diario en vivo:', err);
    } finally {
      setCargandoResumen(false);
    }
  }, [negocio?.id]);

  const cargarHistorial = useCallback(async () => {
    if (!negocio?.id) return;
    setCargandoHistorial(true);
    try {
      const data = await getNotificacionesCorreoDeNegocio(negocio.id, 5);
      setHistorial(data);
    } catch (err) {
      console.warn('[ResumenDiarioEmailCard] Error obteniendo historial:', err);
    } finally {
      setCargandoHistorial(false);
    }
  }, [negocio?.id]);

  useEffect(() => {
    void cargarDatos();
    void cargarHistorial();
  }, [cargarDatos, cargarHistorial]);

  const handleEnviarCorreo = async () => {
    if (!negocio?.id) return;
    setEnviando(true);
    try {
      const res = await enviarResumenDiarioPorCorreo(negocio.id);
      if (res.exito) {
        createToast(
          `¡Resumen ejecutivo enviado con éxito a ${res.destinatario}!`,
          'success'
        );
        void cargarHistorial();
      } else {
        createToast(
          `No se pudo enviar el correo: ${res.error || 'Verifica la configuración de Resend'}`,
          'error'
        );
      }
    } catch (err) {
      console.error('[ResumenDiarioEmailCard] Error enviando correo manual:', err);
      createToast('Error al despachar el correo del resumen diario.', 'error');
    } finally {
      setEnviando(false);
    }
  };

  const destinatarioFinal =
    negocio.emailNotificacionesResumen ||
    negocio.propietarioEmail ||
    'alsdevstudio@alsdevstudio.com';

  const datos = resumen?.datos;
  const cierreCaja = datos?.cierreCaja;

  return (
    <Card className={`p-5 bg-neutral-900/90 border-neutral-800 space-y-4 rounded-2xl ${className}`}>
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gold-400/10 text-gold-400 border border-gold-400/30">
            <Mail className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
              Resumen Ejecutivo Diario
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-800 text-gold-400 border border-neutral-700">
                11:00 PM
              </span>
            </h2>
            <p className="text-xs text-neutral-400">
              Despacho automático a <span className="text-neutral-300 font-semibold">{destinatarioFinal}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void cargarDatos()}
            disabled={cargandoResumen}
            className="min-h-[44px] text-xs flex items-center gap-1.5"
            aria-label="Refrescar resumen ejecutivo"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${cargandoResumen ? 'animate-spin text-gold-400' : ''}`} />
            <span className="hidden sm:inline">Refrescar</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setModalPreview(true)}
            disabled={cargandoResumen}
            className="min-h-[44px] text-xs flex items-center gap-1.5 border-neutral-700 text-neutral-200 hover:text-white"
          >
            <Eye className="h-4 w-4 text-neutral-400" />
            <span>Previsualizar</span>
          </Button>

          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleEnviarCorreo}
            loading={enviando}
            disabled={enviando}
            className="min-h-[44px] text-xs font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400 flex items-center gap-1.5"
          >
            <Send className="h-4 w-4" />
            <span>Enviar Ahora</span>
          </Button>
        </div>
      </div>

      {/* Métricas destacadas del día */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
          <p className="text-[10px] uppercase font-bold text-neutral-400">Ventas Hoy</p>
          <p className="font-display text-lg font-black text-gold-400 mt-0.5">
            {cargandoResumen ? '...' : formatCOP(datos?.totalVentasCOP || 0)}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
          <p className="text-[10px] uppercase font-bold text-neutral-400">Pedidos</p>
          <p className="font-display text-lg font-black text-white mt-0.5">
            {cargandoResumen ? '...' : `${datos?.cantidadVentas || 0} pedidos`}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
          <p className="text-[10px] uppercase font-bold text-neutral-400">Ticket Promedio</p>
          <p className="font-display text-lg font-black text-neutral-200 mt-0.5">
            {cargandoResumen ? '...' : formatCOP(datos?.ticketPromedioCOP || 0)}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
          <p className="text-[10px] uppercase font-bold text-neutral-400">Estado Cierre</p>
          <div className="flex items-center gap-1.5 mt-1">
            {cierreCaja?.cerrado ? (
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Cerrado
              </span>
            ) : (
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Pendiente
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Botón para alternar historial de envíos */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setMostrarHistorial(!mostrarHistorial)}
          className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors"
        >
          {mostrarHistorial ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          <span>{mostrarHistorial ? 'Ocultar historial de envíos' : 'Ver últimos correos enviados'}</span>
          {historial.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400">
              {historial.length}
            </span>
          )}
        </button>

        {mostrarHistorial && (
          <div className="mt-3 space-y-2 border-t border-neutral-800 pt-3">
            {cargandoHistorial ? (
              <p className="text-xs text-neutral-500 py-2">Cargando auditoría de correos...</p>
            ) : historial.length === 0 ? (
              <p className="text-xs text-neutral-500 py-2">
                Aún no hay registros de correos enviados para este local.
              </p>
            ) : (
              historial.map((notif) => {
                const badgeColor = {
                  enviado: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                  simulado: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                  fallido: 'bg-red-500/10 text-red-400 border-red-500/30',
                }[notif.estado];

                return (
                  <div
                    key={notif.id}
                    className="p-2.5 rounded-xl bg-neutral-950/60 border border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-0.5 truncate">
                      <p className="font-semibold text-white truncate">{notif.asunto}</p>
                      <p className="text-[11px] text-neutral-400 truncate">
                        A: <span className="text-neutral-300">{notif.destinatario}</span> · Tipo: {notif.tipo}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider border ${badgeColor}`}>
                        {notif.estado}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* MODAL DE PREVISUALIZACIÓN */}
      <Modal
        isOpen={modalPreview}
        onClose={() => setModalPreview(false)}
        title="Previsualización del Resumen Diario"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
            <div className="flex justify-between">
              <span className="text-neutral-400">Remitente oficial:</span>
              <span className="font-mono text-gold-400">La Parada SaaS · ALS Dev Studio</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Destinatario:</span>
              <span className="text-white font-semibold">{destinatarioFinal}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Fecha del reporte:</span>
              <span className="text-neutral-300">{resumen?.fechaTexto || 'Hoy'}</span>
            </div>
          </div>

          {/* Tarjeta Visual Estilo Correo */}
          <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#242424] space-y-3">
            <div className="text-center pb-2 border-b border-[#242424]">
              <span className="text-[10px] uppercase font-bold text-gold-400 tracking-wider">
                Venta Total del Día
              </span>
              <p className="font-display text-2xl font-black text-gold-400 my-1">
                {formatCOP(datos?.totalVentasCOP || 0)}
              </p>
              <p className="text-neutral-400 text-[11px]">
                {datos?.cantidadVentas || 0} pedidos · Ticket Promedio: {formatCOP(datos?.ticketPromedioCOP || 0)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                <span className="text-neutral-400 block font-bold">Canales</span>
                <span>POS: {formatCOP(datos?.ventasPosCOP || 0)}</span>
                <br />
                <span className="text-gold-400">WhatsApp/Web: {formatCOP(datos?.ventasWhatsappWebCOP || 0)}</span>
              </div>
              <div className="p-2 rounded bg-neutral-900 border border-neutral-800">
                <span className="text-neutral-400 block font-bold">Cobros</span>
                <span>Efectivo: {formatCOP(datos?.ventasEfectivoCOP || 0)}</span>
                <br />
                <span className="text-sky-400">Transferencia: {formatCOP(datos?.ventasTransferenciaCOP || 0)}</span>
              </div>
            </div>

            {/* Top Productos */}
            <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800 space-y-1.5">
              <span className="text-gold-400 font-bold block text-[11px] uppercase tracking-wider">
                Top Productos Vendidos
              </span>
              {datos?.topProductos && datos.topProductos.length > 0 ? (
                datos.topProductos.map((p, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] border-b border-neutral-800/60 pb-1 last:border-0 last:pb-0">
                    <span>
                      <strong className="text-gold-400">#{idx + 1}</strong> {p.nombre} ({p.cantidad} ud.)
                    </span>
                    <span className="font-bold text-neutral-200">{formatCOP(p.subtotal)}</span>
                  </div>
                ))
              ) : (
                <p className="text-neutral-500 italic text-[11px]">No hay ítems registrados en la jornada.</p>
              )}
            </div>

            {/* Operaciones */}
            <div className="p-2.5 rounded bg-neutral-900 border border-neutral-800 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>🚴 Domicilios entregados:</span>
                <strong className="text-white">{datos?.domiciliosEntregados || 0}</strong>
              </div>
              <div className="flex justify-between">
                <span>📅 Reservas agendadas:</span>
                <strong className="text-white">{datos?.reservasAgendadas || 0}</strong>
              </div>
              <div className="flex justify-between">
                <span>🤖 Respuestas Sarin IA:</span>
                <strong className="text-gold-400">{datos?.respuestasIAUsadasHoy || 0}</strong>
              </div>
            </div>

            {/* Estado Cierre de Caja */}
            {cierreCaja?.cerrado ? (
              <div className="p-2.5 rounded bg-emerald-950/30 border border-emerald-500/30 text-emerald-300 text-[11px]">
                <strong className="block text-emerald-400">✓ Cierre de Caja del Día Archivado</strong>
                <span>Utilidad Neta: {formatCOP(cierreCaja.utilidadNetaCOP || 0)}</span>
                {cierreCaja.notas && <p className="italic text-neutral-300 mt-1">"{cierreCaja.notas}"</p>}
              </div>
            ) : (
              <div className="p-2.5 rounded bg-amber-950/30 border border-amber-500/30 text-amber-300 text-[11px]">
                <strong>⚠️ Cierre de Turno Pendiente en el POS/Dashboard</strong>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalPreview(false)} className="min-h-[44px]">
              Cerrar
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                setModalPreview(false);
                await handleEnviarCorreo();
              }}
              className="min-h-[44px] font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400"
            >
              Enviar a mi Correo
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
export default ResumenDiarioEmailCard;
