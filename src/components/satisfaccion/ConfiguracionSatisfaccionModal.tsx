import { useState, useEffect } from 'react';
import {
  X,
  Settings,
  ExternalLink,
  Copy,
  Check,
  QrCode,
  Sparkles,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import type { ConfiguracionSatisfaccion } from '@/types/satisfaccion';
import { generarUrlEncuestaPublica } from '@/utils/satisfaccionUtils';

interface ConfiguracionSatisfaccionModalProps {
  isOpen: boolean;
  negocioId: string;
  configuracion: ConfiguracionSatisfaccion;
  onGuardar: (config: Partial<ConfiguracionSatisfaccion>) => Promise<void>;
  onClose: () => void;
}

export function ConfiguracionSatisfaccionModal({
  isOpen,
  negocioId,
  configuracion,
  onGuardar,
  onClose,
}: ConfiguracionSatisfaccionModalProps) {
  const [googleBusinessUrl, setGoogleBusinessUrl] = useState('');
  const [telefonoAtencionQuejas, setTelefonoAtencionQuejas] = useState('');
  const [habilitarRedireccionGoogle, setHabilitarRedireccionGoogle] = useState(true);
  const [mensajeAgradecimiento5Estrellas, setMensajeAgradecimiento5Estrellas] = useState('');
  const [mensajeDisculpaQueja, setMensajeDisculpaQueja] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (configuracion) {
      setGoogleBusinessUrl(configuracion.googleBusinessUrl || '');
      setTelefonoAtencionQuejas(configuracion.telefonoAtencionQuejas || '');
      setHabilitarRedireccionGoogle(configuracion.habilitarRedireccionGoogle ?? true);
      setMensajeAgradecimiento5Estrellas(
        configuracion.mensajeAgradecimiento5Estrellas || ''
      );
      setMensajeDisculpaQueja(configuracion.mensajeDisculpaQueja || '');
    }
  }, [configuracion]);

  if (!isOpen) return null;

  const urlEncuesta = generarUrlEncuestaPublica({
    negocioId,
  });

  const handleCopiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(urlEncuesta);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch (e) {
      console.warn('Error al copiar al portapapeles:', e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGuardando(true);
      await onGuardar({
        googleBusinessUrl: googleBusinessUrl.trim(),
        telefonoAtencionQuejas: telefonoAtencionQuejas.trim(),
        habilitarRedireccionGoogle,
        mensajeAgradecimiento5Estrellas: mensajeAgradecimiento5Estrellas.trim(),
        mensajeDisculpaQueja: mensajeDisculpaQueja.trim(),
      });
      onClose();
    } catch (err) {
      console.error('Error al guardar configuración:', err);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <StorefrontDialog
      labelledBy="config-satisfaccion-title"
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 text-white w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/20">
              <Settings className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="config-satisfaccion-title" className="text-lg font-bold font-display">
                Configuración de Satisfacción & Google Reviews
              </h2>
              <p className="text-xs text-neutral-400">
                Alinea tu perfil de Google Maps y el canal de contención de quejas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Banner de Enlace Público de Encuesta */}
        <div className="mb-6 p-4 rounded-xl bg-neutral-950 border border-amber-400/30">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-amber-400" aria-hidden="true" />
              <span className="text-xs font-semibold text-white uppercase tracking-wider">
                Enlace Público de Calificación (1 Toque)
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopiarEnlace}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-400/15 text-amber-400 hover:bg-amber-400/25 transition-colors min-h-[36px]"
              aria-label="Copiar enlace de encuesta"
            >
              {copiado ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                  <span className="text-emerald-400">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copiar Enlace</span>
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-neutral-400 truncate font-mono bg-black/40 p-2 rounded border border-neutral-800">
            {urlEncuesta}
          </p>
          <p className="text-[11px] text-neutral-500 mt-1.5">
            💡 Puedes generar códigos QR para cada mesa o incluir este enlace en tus tickets térmicos y mensajes de WhatsApp.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Enlace directo a Google Reviews */}
          <div>
            <label htmlFor="google-url-input" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
              Enlace de Reseñas de Google Maps / Google My Business
            </label>
            <div className="relative">
              <Input
                id="google-url-input"
                type="url"
                value={googleBusinessUrl}
                onChange={(e) => setGoogleBusinessUrl(e.target.value)}
                placeholder="https://g.page/r/.../review o https://search.google.com/local/writereview?placeid=..."
                className="w-full bg-neutral-950 border-neutral-800 text-sm text-white placeholder-neutral-500 focus:border-amber-400/80 pr-10"
              />
              {googleBusinessUrl && (
                <a
                  href={googleBusinessUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-amber-400"
                  title="Abrir enlace de Google en nueva pestaña"
                >
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                </a>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 mt-1">
              Cuando un cliente califique con 5 estrellas, se le invitará a dejar su reseña aquí para disparar tu reputación en Google.
            </p>
          </div>

          {/* Toggle Redirección automática */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-950 border border-neutral-800">
            <div className="pr-4">
              <p className="text-sm font-medium text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" aria-hidden="true" />
                <span>Invitar a Google Reviews en 5 estrellas</span>
              </p>
              <p className="text-xs text-neutral-400">
                Ofrece el botón destacado "Compartir en Google Maps" al enviar una calificación perfecta.
              </p>
            </div>
            <input
              type="checkbox"
              id="google-redirect-check"
              checked={habilitarRedireccionGoogle}
              onChange={(e) => setHabilitarRedireccionGoogle(e.target.checked)}
              className="w-5 h-5 accent-amber-400 cursor-pointer rounded"
            />
          </div>

          {/* Teléfono de atención de quejas */}
          <div>
            <label htmlFor="telefono-quejas-input" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
              WhatsApp para Atención Rápida de Quejas (Administrador)
            </label>
            <Input
              id="telefono-quejas-input"
              type="tel"
              value={telefonoAtencionQuejas}
              onChange={(e) => setTelefonoAtencionQuejas(e.target.value)}
              placeholder="Ej: 3001234567"
              className="w-full bg-neutral-950 border-neutral-800 text-sm text-white placeholder-neutral-500 focus:border-amber-400/80"
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              Si un cliente da 1 o 2 estrellas, verá un botón directo para escribirle a este WhatsApp y resolver el problema antes de que publique una queja pública.
            </p>
          </div>

          {/* Mensaje de agradecimiento 5 estrellas */}
          <div>
            <label htmlFor="msg-agradecimiento-input" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
              Mensaje de Agradecimiento (5 Estrellas)
            </label>
            <Textarea
              id="msg-agradecimiento-input"
              rows={2}
              value={mensajeAgradecimiento5Estrellas}
              onChange={(e) => setMensajeAgradecimiento5Estrellas(e.target.value)}
              placeholder="¡Muchísimas gracias por tu calificación! Nos alegra saber que disfrutaste tu comida."
              className="w-full bg-neutral-950 border-neutral-800 text-sm text-white placeholder-neutral-500 focus:border-amber-400/80"
            />
          </div>

          {/* Mensaje de disculpa en quejas */}
          <div>
            <label htmlFor="msg-disculpa-input" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
              Mensaje Empático de Contención (1-2 Estrellas)
            </label>
            <Textarea
              id="msg-disculpa-input"
              rows={2}
              value={mensajeDisculpaQueja}
              onChange={(e) => setMensajeDisculpaQueja(e.target.value)}
              placeholder="Lamentamos mucho que tu experiencia no haya sido óptima. Nuestro equipo ya fue notificado y queremos compensarte."
              className="w-full bg-neutral-950 border-neutral-800 text-sm text-white placeholder-neutral-500 focus:border-amber-400/80"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={guardando}
              className="min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={guardando}
              className="min-h-[44px]"
            >
              {guardando ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
