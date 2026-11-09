import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Star,
  AlertTriangle,
  Send,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  Heart,
  Sparkles,
  ShoppingBag,
} from 'lucide-react';
import type {
  CanalSatisfaccion,
  TagSatisfaccionId,
  DimensionesEvaluacion,
  ConfiguracionSatisfaccion,
} from '@/types/satisfaccion';
import {
  TAGS_SATISFACCION_PREDEFINIDOS,
  getConfiguracionSatisfaccionDefault,
} from '@/utils/satisfaccionUtils';
import {
  guardarEncuestaSatisfaccion,
  getConfiguracionSatisfaccion,
} from '@/services/satisfaccionService';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';

const RATING_LABELS: Record<number, { label: string; emoji: string; color: string }> = {
  5: { label: '¡Increíble! Me encantó', emoji: '🤩', color: 'text-amber-400' },
  4: { label: 'Muy buena experiencia', emoji: '👍', color: 'text-amber-300' },
  3: { label: 'Regular / Podría mejorar', emoji: '😐', color: 'text-yellow-400' },
  2: { label: 'Mala experiencia', emoji: '🙁', color: 'text-orange-400' },
  1: { label: 'Muy mala / Decepcionado', emoji: '🚨', color: 'text-rose-500' },
};

export function EncuestaSatisfaccionPage() {
  const [searchParams] = useSearchParams();

  // Parámetros de la URL
  const negocioId = searchParams.get('negocio') || 'laparada';
  const canalParam = (searchParams.get('canal') as CanalSatisfaccion) || 'mostrador_pos';
  const ventaId = searchParams.get('venta') || searchParams.get('v') || '';
  const pedidoId = searchParams.get('pedido') || '';
  const mesaNombre = searchParams.get('mesa') || '';
  const clienteNombreParam = searchParams.get('cliente') || '';
  const clienteTelParam = searchParams.get('tel') || '';

  // Configuración del negocio
  const [config, setConfig] = useState<ConfiguracionSatisfaccion>(() =>
    getConfiguracionSatisfaccionDefault(negocioId)
  );

  // Estados del formulario
  const [calificacion, setCalificacion] = useState<number>(5);
  const [tagsSeleccionados, setTagsSeleccionados] = useState<TagSatisfaccionId[]>([]);
  const [comentario, setComentario] = useState('');
  const [nombre, setNombre] = useState(clienteNombreParam);
  const [telefono, setTelefono] = useState(clienteTelParam);

  // Dimensiones secundarias (opcionales)
  const [comida, setComida] = useState<number>(5);
  const [servicio, setServicio] = useState<number>(5);
  const [tiempo, setTiempo] = useState<number>(5);
  const [mostrarDimensiones, setMostrarDimensiones] = useState(false);

  // Estados de envío
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  // Cargar configuración de satisfacción del tenant
  useEffect(() => {
    getConfiguracionSatisfaccion(negocioId)
      .then((data) => setConfig(data))
      .catch((err) => console.warn('Error cargando config satisfaccion:', err));
  }, [negocioId]);

  // Si cambia la calificación, limpiar tags incompatibles o sugerir tags
  const handleSeleccionarEstrellas = (estrellas: number) => {
    setCalificacion(estrellas);
    setTagsSeleccionados([]);
    setComida(estrellas);
    setServicio(estrellas);
    setTiempo(estrellas);
  };

  const handleToggleTag = (tagId: TagSatisfaccionId) => {
    setTagsSeleccionados((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  // Filtrar tags disponibles según si la calificación es positiva (4-5) o constructiva (1-3)
  const tagsDisponibles = TAGS_SATISFACCION_PREDEFINIDOS.filter((t) =>
    calificacion >= 4 ? t.tipo === 'positivo' : t.tipo === 'constructivo'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (enviando || enviado) return;

    try {
      setEnviando(true);
      setErrorEnvio(null);

      const dimensiones: DimensionesEvaluacion = {
        comida,
        servicio,
        tiempo,
      };

      await guardarEncuestaSatisfaccion(negocioId, {
        calificacion,
        canal: canalParam,
        ventaId,
        pedidoId,
        mesaNombre,
        clienteNombre: nombre.trim(),
        clienteTelefono: telefono.trim(),
        tags: tagsSeleccionados,
        comentario: comentario.trim(),
        dimensiones,
        redirigidoGoogleReviews: false,
      });

      setEnviado(true);
    } catch (err) {
      console.error('Error al enviar encuesta de satisfacción:', err);
      setErrorEnvio('No pudimos enviar tu calificación. Por favor intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  // URL de WhatsApp para quejas o atención directa
  const getUrlWhatsAppQueja = () => {
    const rawTel = (config.telefonoAtencionQuejas || '3000000000').replace(/\D/g, '');
    const telNormalizado = rawTel.startsWith('57') ? rawTel : `57${rawTel}`;
    const texto =
      `Hola, acabo de calificar mi experiencia con ${calificacion} estrella(s) en La Parada` +
      (mesaNombre ? ` (${mesaNombre})` : '') +
      (ventaId ? ` (Pedido #${ventaId.slice(-6).toUpperCase()})` : '') +
      ` y me gustaría hablar con un encargado para resolver un inconveniente.`;
    return `https://wa.me/${telNormalizado}?text=${encodeURIComponent(texto)}`;
  };

  return (
    <div className="min-h-screen bg-base-dark text-white flex flex-col justify-between py-6 px-4 sm:px-6">
      {/* Contenedor Central */}
      <main className="w-full max-w-md mx-auto my-auto">
        {/* Encabezado Gastronómico */}
        <header className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/20 text-amber-400 mb-3 shadow-lg">
            <Sparkles className="w-7 h-7" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-black font-display tracking-tight text-white mb-1">
            {negocioId === 'laparada' ? 'LA PARADA' : 'Tu Experiencia'}
          </h1>
          <p className="text-sm text-neutral-400">
            {mesaNombre ? `Mesa: ${mesaNombre} · ` : ''}Tu opinión es fundamental para nosotros
          </p>
        </header>

        {/* Estado 1: Formulario Activo */}
        {!enviado ? (
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 shadow-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Selector Gigante de Estrellas */}
              <div className="text-center">
                <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
                  ¿Cómo calificarías tu experiencia?
                </label>

                <div
                  className="flex items-center justify-center gap-2 py-2"
                  role="radiogroup"
                  aria-label="Calificación en estrellas de 1 a 5"
                >
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= calificacion;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => handleSeleccionarEstrellas(star)}
                        className="p-2 sm:p-2.5 rounded-2xl hover:bg-neutral-800 active:scale-95 transition-all min-h-[52px] min-w-[52px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-amber-400"
                        role="radio"
                        aria-checked={calificacion === star}
                        aria-label={`${star} estrella${star > 1 ? 's' : ''}`}
                      >
                        <Star
                          className={`w-9 h-9 sm:w-10 sm:h-10 transition-colors ${
                            isFilled
                              ? 'fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(201,168,76,0.5)]'
                              : 'fill-neutral-800 text-neutral-700'
                          }`}
                          aria-hidden="true"
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Feedback dinámico según estrellas */}
                <div className="mt-2 text-sm font-semibold flex items-center justify-center gap-1.5">
                  <span className="text-xl" aria-hidden="true">
                    {RATING_LABELS[calificacion]?.emoji}
                  </span>
                  <span className={RATING_LABELS[calificacion]?.color}>
                    {RATING_LABELS[calificacion]?.label}
                  </span>
                </div>
              </div>

              {/* Tags táctiles a un toque */}
              <div>
                <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-2">
                  {calificacion >= 4 ? '¿Qué fue lo que más te gustó?' : '¿En qué podemos mejorar?'}
                </label>

                <div className="flex flex-wrap gap-2">
                  {tagsDisponibles.map((tag) => {
                    const isSelected = tagsSeleccionados.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleToggleTag(tag.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all min-h-[44px] ${
                          isSelected
                            ? calificacion >= 4
                              ? 'bg-amber-400 text-neutral-950 font-bold border-amber-400 shadow-md'
                              : 'bg-rose-600 text-white font-bold border-rose-500 shadow-md'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
                        }`}
                        aria-pressed={isSelected}
                      >
                        <span aria-hidden="true">{tag.icono}</span>
                        <span>{tag.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Desglose rápido de dimensiones (opcional/expandible) */}
              <div className="pt-2 border-t border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => setMostrarDimensiones(!mostrarDimensiones)}
                  className="w-full flex items-center justify-between text-xs text-neutral-400 hover:text-white py-1 transition-colors"
                >
                  <span>Evaluar Comida, Servicio y Rapidez (Opcional)</span>
                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${mostrarDimensiones ? 'rotate-90' : ''}`}
                    aria-hidden="true"
                  />
                </button>

                {mostrarDimensiones && (
                  <div className="mt-3 space-y-3 bg-neutral-950/60 p-3.5 rounded-2xl border border-neutral-800/60">
                    {/* Comida */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-300">🍔 Calidad de Comida:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setComida(s)}
                            className="p-1 min-h-[36px] min-w-[36px] flex items-center justify-center text-neutral-500 hover:text-amber-400"
                            aria-label={`${s} estrellas comida`}
                          >
                            <Star
                              className={`w-4 h-4 ${s <= comida ? 'fill-amber-400 text-amber-400' : ''}`}
                              aria-hidden="true"
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Servicio */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-300">👏 Atención y Servicio:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setServicio(s)}
                            className="p-1 min-h-[36px] min-w-[36px] flex items-center justify-center text-neutral-500 hover:text-amber-400"
                            aria-label={`${s} estrellas servicio`}
                          >
                            <Star
                              className={`w-4 h-4 ${s <= servicio ? 'fill-amber-400 text-amber-400' : ''}`}
                              aria-hidden="true"
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Rapidez */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-neutral-300">⚡ Tiempo de Entrega:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setTiempo(s)}
                            className="p-1 min-h-[36px] min-w-[36px] flex items-center justify-center text-neutral-500 hover:text-amber-400"
                            aria-label={`${s} estrellas rapidez`}
                          >
                            <Star
                              className={`w-4 h-4 ${s <= tiempo ? 'fill-amber-400 text-amber-400' : ''}`}
                              aria-hidden="true"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Comentario libre */}
              <div>
                <label htmlFor="comentario-encuesta" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1.5">
                  ¿Tienes algún comentario o sugerencia?
                </label>
                <Textarea
                  id="comentario-encuesta"
                  rows={2}
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Cuéntanos más sobre tu experiencia..."
                  className="w-full bg-neutral-950 border-neutral-800 text-sm text-white placeholder-neutral-500 focus:border-amber-400/80 rounded-xl"
                />
              </div>

              {/* Datos opcionales del cliente */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label htmlFor="nombre-encuesta" className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    Tu Nombre
                  </label>
                  <input
                    id="nombre-encuesta"
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Andrés"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-amber-400/80 min-h-[44px]"
                  />
                </div>
                <div>
                  <label htmlFor="tel-encuesta" className="block text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                    WhatsApp (Opcional)
                  </label>
                  <input
                    id="tel-encuesta"
                    type="tel"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="300 123 4567"
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-amber-400/80 min-h-[44px]"
                  />
                </div>
              </div>

              {errorEnvio && (
                <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                  {errorEnvio}
                </div>
              )}

              {/* Botón de Enviar */}
              <Button
                type="submit"
                variant="primary"
                disabled={enviando}
                className="w-full min-h-[50px] font-bold text-base shadow-xl flex items-center justify-center gap-2"
              >
                {enviando ? (
                  <span>Enviando...</span>
                ) : (
                  <>
                    <Send className="w-5 h-5" aria-hidden="true" />
                    <span>Enviar Calificación</span>
                  </>
                )}
              </Button>
            </form>
          </div>
        ) : (
          /* Estado 2: Pantalla de Agradecimiento y Bifurcación Viral / Contención */
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-6">
            {calificacion >= 4 ? (
              /* Caso 1: 4 o 5 Estrellas (Promotor / Cliente Satisfecho) */
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-400/10 border-2 border-amber-400 text-amber-400 shadow-xl animate-bounce">
                  <Heart className="w-10 h-10 fill-amber-400" aria-hidden="true" />
                </div>

                <div>
                  <h2 className="text-2xl font-black font-display text-white mb-2">
                    ¡Muchísimas Gracias!
                  </h2>
                  <p className="text-sm text-neutral-300">
                    {config.mensajeAgradecimiento5Estrellas ||
                      'Nos alegra muchísimo que hayas disfrutado tu comida. ¡Todo el equipo te lo agradece de corazón! 🍔✨'}
                  </p>
                </div>

                {/* Redirección / Botón a Google Reviews */}
                {config.googleBusinessUrl && config.habilitarRedireccionGoogle && (
                  <div className="p-5 rounded-2xl bg-neutral-950 border border-amber-400/40 shadow-inner space-y-3">
                    <div className="flex items-center justify-center gap-1 text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-5 h-5 fill-amber-400" aria-hidden="true" />
                      ))}
                    </div>
                    <p className="text-xs text-neutral-300 font-medium">
                      ¿Nos ayudas compartiendo tus 5 estrellas en Google Maps? ¡Significa el mundo para nuestro negocio local!
                    </p>

                    <a
                      href={config.googleBusinessUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-neutral-950 font-bold text-sm shadow-xl transition-all min-h-[48px]"
                    >
                      <span>Publicar Reseña en Google Maps</span>
                      <ExternalLink className="w-4 h-4" aria-hidden="true" />
                    </a>
                  </div>
                )}
              </>
            ) : (
              /* Caso 2: 1 a 3 Estrellas (Detractor o Queja - Crisis Containment) */
              <>
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-rose-500/15 border-2 border-rose-500 text-rose-400 shadow-xl">
                  <AlertTriangle className="w-10 h-10" aria-hidden="true" />
                </div>

                <div>
                  <h2 className="text-2xl font-black font-display text-white mb-2">
                    Lamentamos mucho el inconveniente
                  </h2>
                  <p className="text-sm text-neutral-300">
                    {config.mensajeDisculpaQueja ||
                      'Tu satisfacción es nuestra prioridad número uno. Ya notificamos a la administración para revisar lo sucedido.'}
                  </p>
                </div>

                {/* Botón directo de WhatsApp con el Administrador */}
                {config.telefonoAtencionQuejas && (
                  <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-500/30 shadow-inner space-y-3">
                    <p className="text-xs text-rose-200">
                      Queremos escucharte y solucionarlo ya mismo:
                    </p>

                    <a
                      href={getUrlWhatsAppQueja()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl transition-all min-h-[48px]"
                    >
                      <MessageCircle className="w-5 h-5" aria-hidden="true" />
                      <span>Hablar con el Administrador por WhatsApp</span>
                    </a>
                  </div>
                )}
              </>
            )}

            {/* Enlace de regreso a la tienda */}
            <div className="pt-2">
              <Link
                to="/tienda"
                className="inline-flex items-center justify-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors"
              >
                <ShoppingBag className="w-4 h-4" aria-hidden="true" />
                <span>Volver al Menú Digital</span>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Footer discreto */}
      <footer className="text-center text-xs text-neutral-600 mt-6">
        <p>Desarrollado para La Parada · Cúcuta, Colombia</p>
      </footer>
    </div>
  );
}
export default EncuestaSatisfaccionPage;
