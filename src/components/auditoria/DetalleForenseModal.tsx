import React, { useId, useState } from 'react';
import {
  X,
  Fingerprint,
  Copy,
  Check,
  Share2,
  ShieldCheck,
  Clock,
  User,
  Database,
  Lock,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { formatCOP } from '@/utils/formatCOP';
import { toValidAdminDate } from '@/utils/adminAnalytics';
import {
  CATEGORIAS_AUDITORIA_CATALOGO,
  SEVERIDAD_AUDITORIA_CATALOGO,
  generarCertificadoForenseTexto,
} from '@/utils/auditoriaUtils';
import type { EventoAuditoria } from '@/types';

interface DetalleForenseModalProps {
  evento: EventoAuditoria | null;
  onClose: () => void;
}

export const DetalleForenseModal: React.FC<DetalleForenseModalProps> = ({
  evento,
  onClose,
}) => {
  const generatedId = useId();
  const titleId = `modal-certificado-forense-${generatedId.replace(/:/g, '')}-title`;
  const [copiado, setCopiado] = useState(false);

  if (!evento) return null;

  const catInfo = CATEGORIAS_AUDITORIA_CATALOGO[evento.categoria];
  const sevInfo = SEVERIDAD_AUDITORIA_CATALOGO[evento.severidad];
  const fechaObj = toValidAdminDate(evento.fecha);
  const fechaCompleta = fechaObj
    ? fechaObj.toLocaleString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Fecha no registrada';

  const handleCopiar = async () => {
    try {
      const texto = generarCertificadoForenseTexto(evento);
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch (err) {
      console.warn('No se pudo copiar certificado:', err);
    }
  };

  const handleCompartirWhatsApp = () => {
    const texto = generarCertificadoForenseTexto(evento);
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const entradasForenses = Object.entries(evento.detallesForenses || {});

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-2xl shadow-2xl overflow-hidden my-6 mx-auto p-0"
    >
      {/* Cabecera */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/30 bg-gold-400/10 text-gold-400">
            <Fingerprint className="h-5 w-5" />
          </div>
          <div>
            <h2 id={titleId} className="font-display text-lg font-bold text-white">
              Certificado Forense de Auditoría
            </h2>
            <p className="font-mono text-xs text-gold-400">
              {evento.huellaForense} · {evento.codigoVisible}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar certificado forense"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Cuerpo del Certificado */}
      <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
        {/* Sello de Integridad */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>
              Integridad Verificada · Tenant:{' '}
              <strong className="font-mono uppercase">{evento.negocioId}</strong>
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md bg-neutral-950/80 px-2.5 py-1 text-[11px] font-medium text-neutral-300">
            <Lock className="h-3 w-3 text-gold-400" />
            {evento.origenRegistro === 'bitacora_inmutable'
              ? 'Bitácora Inmutable Firestore'
              : 'Correlación Forense Verificada'}
          </span>
        </div>

        {/* Resumen Principal */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${sevInfo.badgeClass}`}
            >
              <span className={`h-2 w-2 rounded-full ${sevInfo.dotClass}`} />
              Severidad {sevInfo.label}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${catInfo.badgeClass}`}
            >
              {catInfo.label}
            </span>
          </div>

          <h3 className="text-lg font-bold text-white font-display">
            {evento.titulo}
          </h3>
          <p className="text-sm text-neutral-300 leading-relaxed">
            {evento.descripcion}
          </p>

          <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2 border-t border-neutral-800/80">
            <div>
              <span className="block text-[11px] uppercase tracking-wider text-neutral-400">
                Motivo / Justificación
              </span>
              <p className="mt-0.5 text-sm font-medium text-gold-300">
                {evento.motivo || 'No especificado'}
              </p>
            </div>
            <div>
              <span className="block text-[11px] uppercase tracking-wider text-neutral-400">
                Impacto Financiero Auditado
              </span>
              <p className="mt-0.5 text-lg font-black text-gold-400 font-display">
                {formatCOP(evento.montoImpacto)}
              </p>
            </div>
          </div>
        </div>

        {/* Trazabilidad de Operador y Tiempo */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3">
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <User className="h-3.5 w-3.5 text-gold-400" />
              <span>Operador Responsable</span>
            </div>
            <p className="mt-1 text-sm font-semibold text-white">
              {evento.responsableNombre}
            </p>
            {evento.responsableRol && (
              <span className="text-[11px] uppercase text-neutral-400">
                Rol: {evento.responsableRol}
              </span>
            )}
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3">
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <Clock className="h-3.5 w-3.5 text-gold-400" />
              <span>Estampa de Tiempo</span>
            </div>
            <p className="mt-1 text-xs font-medium text-white">
              {fechaCompleta}
            </p>
          </div>

          <div className="rounded-xl border border-neutral-800 bg-neutral-950/70 p-3">
            <div className="flex items-center gap-1.5 text-xs text-neutral-400">
              <Database className="h-3.5 w-3.5 text-gold-400" />
              <span>Referencia Canónica</span>
            </div>
            <p className="mt-1 font-mono text-xs font-semibold text-white break-all">
              {evento.referenciaId}
            </p>
            <span className="text-[11px] uppercase text-neutral-400">
              Entidad: {evento.entidadTipo}
            </span>
          </div>
        </div>

        {/* Metadatos Forenses Adicionales */}
        {entradasForenses.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              Evidencia y Atributos Técnicos del Evento
            </h4>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 divide-y divide-neutral-800/80">
              {entradasForenses.map(([clave, valor]) => (
                <div
                  key={clave}
                  className="flex items-center justify-between px-4 py-2.5 text-xs"
                >
                  <span className="font-mono text-neutral-400">{clave}</span>
                  <span className="font-semibold text-neutral-200 text-right">
                    {typeof valor === 'boolean'
                      ? valor
                        ? 'Sí'
                        : 'No'
                      : String(valor)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Pie de Acciones */}
      <div className="flex flex-wrap items-center justify-end gap-3 px-6 py-4 border-t border-neutral-800 bg-neutral-950/80">
        <button
          type="button"
          onClick={handleCopiar}
          className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-700 transition-colors"
        >
          {copiado ? (
            <>
              <Check className="h-4 w-4 text-emerald-400" />
              <span className="text-emerald-300">Certificado Copiado</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 text-gold-400" />
              <span>Copiar Certificado</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleCompartirWhatsApp}
          className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition-colors"
        >
          <Share2 className="h-4 w-4" />
          <span>Enviar por WhatsApp</span>
        </button>
      </div>
    </StorefrontDialog>
  );
};
