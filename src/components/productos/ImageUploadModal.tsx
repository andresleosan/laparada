// src/components/productos/ImageUploadModal.tsx
import { useState, useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  X,
  Camera,
  Upload,
  Sparkles,
  Loader2,
  Key,
  RefreshCw,
  Check,
  Flame,
  Info,
} from 'lucide-react';
import { subirImagenProducto } from '../../services/storageService';
import {
  generarImagenConNanoBanana,
  construirPromptGastronomico,
  getGeminiApiKey,
  setGeminiApiKey,
} from '../../services/geminiImageService';
import { createToast } from '../ui/Toast';
import { useNegocio } from '@/context/NegocioContext';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageUpload: (imageUrl: string) => void;
  nombreProducto: string;
  descripcionProducto?: string;
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onImageUpload,
  nombreProducto,
  descripcionProducto = '',
}) => {
  const { puedeUsarNanoBanana } = useNegocio();
  const [mode, setMode] = useState<'choose' | 'camera' | 'upload' | 'ai'>('choose');
  const [uploading, setUploading] = useState(false);
  const [generandoIA, setGenerandoIA] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<Blob | null>(null);

  // Estados específicos de Nano Banana (IA)
  const [apiKeyInput, setApiKeyInput] = useState(getGeminiApiKey());
  const [guardarApiKey, setGuardarApiKey] = useState(true);
  const [mostrarConfigApiKey, setMostrarConfigApiKey] = useState(!getGeminiApiKey());
  const [estiloGastronomico, setEstiloGastronomico] = useState<'estudio' | 'parrilla' | 'rustico' | 'street'>('estudio');
  const [customPrompt, setCustomPrompt] = useState('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inicializar o actualizar prompt cuando cambia el producto o estilo
  useEffect(() => {
    if (nombreProducto) {
      const p = construirPromptGastronomico({
        nombre: nombreProducto,
        descripcion: descripcionProducto,
        estilo: estiloGastronomico,
      });
      setCustomPrompt(p);
    }
  }, [nombreProducto, descripcionProducto, estiloGastronomico]);

  // Iniciar cámara
  const startCamera = async () => {
    setMode('camera');
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('No se pudo acceder a la cámara. Verifica los permisos del navegador.');
      setMode('choose');
      console.error('Error al acceder a la cámara:', err);
    }
  };

  // Detener cámara
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
    }
  };

  // Tomar foto con cámara
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    context.drawImage(videoRef.current, 0, 0);

    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          setSelectedFile(blob);
          setPreview(canvasRef.current!.toDataURL('image/jpeg'));
          stopCamera();
          setMode('choose');
        }
      },
      'image/jpeg',
      0.95
    );
  };

  // Manejar selección de archivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen válida');
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('La imagen no debe superar 5MB');
      return;
    }

    setError(null);
    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Generar con Nano Banana (Google Imagen 3)
  const handleGenerarConNanoBanana = async () => {
    const key = apiKeyInput.trim() || getGeminiApiKey();
    if (!key) {
      setError('Por favor ingresa tu API Key de Google AI Studio para usar Nano Banana.');
      setMostrarConfigApiKey(true);
      return;
    }

    if (guardarApiKey) {
      setGeminiApiKey(key);
    }

    setGenerandoIA(true);
    setError(null);

    try {
      const promptToUse = customPrompt.trim() || construirPromptGastronomico({
        nombre: nombreProducto,
        descripcion: descripcionProducto,
        estilo: estiloGastronomico,
      });

      const { dataUrl, blob } = await generarImagenConNanoBanana(promptToUse, key);
      setPreview(dataUrl);
      setSelectedFile(blob);
      createToast('✨ ¡Fotografía gastronómica generada con éxito!', 'success');
    } catch (err: any) {
      console.error('Error generando foto con Nano Banana:', err);
      setError(err?.message || 'Error al generar la imagen con Nano Banana');
      createToast('Error en la generación de imagen', 'error');
    } finally {
      setGenerandoIA(false);
    }
  };

  // Subir imagen a Firebase y asociar al producto
  const handleUpload = async () => {
    if (!selectedFile && !preview) return;

    setUploading(true);
    setError(null);

    try {
      let finalUrl = preview || '';
      if (selectedFile) {
        finalUrl = await subirImagenProducto(selectedFile, nombreProducto);
      }
      onImageUpload(finalUrl);
      createToast('✅ Foto guardada y asociada al producto', 'success');
      resetModal();
    } catch (err) {
      console.warn('Fallo upload a Firebase Storage, usando DataUrl:', err);
      if (preview) {
        onImageUpload(preview);
        resetModal();
      } else {
        setError(err instanceof Error ? err.message : 'Error al subir la imagen');
      }
    } finally {
      setUploading(false);
    }
  };

  // Cancelar
  const handleCancel = () => {
    if (mode === 'camera') {
      stopCamera();
    }
    resetModal();
  };

  // Reiniciar modal
  const resetModal = () => {
    setMode('choose');
    setPreview(null);
    setSelectedFile(null);
    setError(null);
    setGenerandoIA(false);
    stopCamera();
    onClose();
  };

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (isOpen) {
        stopCamera();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={resetModal} closeButton size="lg">
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-700/80 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-display font-black text-white">
              Cargar Foto de Producto
            </h2>
            <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md font-semibold">
              {nombreProducto || 'Nuevo Item'}
            </span>
          </div>
          <button
            onClick={resetModal}
            className="rounded-lg p-1.5 text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mensajes de error */}
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-xs leading-relaxed flex items-start gap-2">
            <Info size={16} className="text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Modo Selección Inicial */}
        {mode === 'choose' && !preview && (
          <div
            className={`grid grid-cols-1 ${
              puedeUsarNanoBanana ? 'sm:grid-cols-3' : 'sm:grid-cols-2'
            } gap-3`}
          >
            {/* Opción 1: Nano Banana IA (Exclusivo Super Admin / La Parada) */}
            {puedeUsarNanoBanana && (
              <button
                type="button"
                onClick={() => setMode('ai')}
                className="p-4 rounded-2xl bg-gradient-to-b from-amber-500/20 to-neutral-900 border border-amber-500/40 hover:border-amber-400 text-left transition-all hover:scale-[1.02] active:scale-98 group shadow-lg"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Sparkles size={20} className="text-yellow-400 animate-pulse" />
                </div>
                <h3 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                  Nano Banana (IA)
                </h3>
                <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                  Crea una foto de estudio gastronómico hiperrealista en 1 clic.
                </p>
              </button>
            )}

            {/* Opción 2: Subir Foto */}
            <button
              type="button"
              onClick={() => {
                setMode('upload');
                fileInputRef.current?.click();
              }}
              className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 hover:border-neutral-600 text-left transition-all hover:scale-[1.02] active:scale-98 group shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-neutral-800 text-neutral-300 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Upload size={20} />
              </div>
              <h3 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                Subir Archivo
              </h3>
              <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                Elige una foto desde tu galería, móvil o computador.
              </p>
            </button>

            {/* Opción 3: Tomar Foto */}
            <button
              type="button"
              onClick={startCamera}
              className="p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800 hover:border-neutral-600 text-left transition-all hover:scale-[1.02] active:scale-98 group shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-neutral-800 text-neutral-300 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Camera size={20} />
              </div>
              <h3 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                Tomar Foto
              </h3>
              <p className="text-[11px] text-neutral-400 mt-1 leading-snug">
                Abre la cámara de tu dispositivo al instante.
              </p>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {/* Modo Nano Banana (IA) */}
        {mode === 'ai' && !preview && (
          <div className="space-y-4 bg-neutral-950/80 p-4 rounded-2xl border border-amber-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-amber-400" />
                <span className="font-bold text-sm text-white">Generador Fotográfico Nano Banana</span>
              </div>
              <button
                type="button"
                onClick={() => setMostrarConfigApiKey(!mostrarConfigApiKey)}
                className="text-xs text-neutral-400 hover:text-amber-300 flex items-center gap-1"
                title="Configurar Google AI Studio API Key"
              >
                <Key size={13} />
                <span>{apiKeyInput ? 'API Key configurada' : 'Configurar API Key'}</span>
              </button>
            </div>

            {/* Configuración de API Key si no está configurada o se desea cambiar */}
            {mostrarConfigApiKey && (
              <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 space-y-2 text-xs">
                <label className="text-neutral-300 font-semibold block">
                  Google AI Studio API Key (Nano Banana / Gemini):
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="flex-1 px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-700 text-white text-xs focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (apiKeyInput.trim()) {
                        setGeminiApiKey(apiKeyInput.trim());
                        createToast('API Key guardada con éxito', 'success');
                        setMostrarConfigApiKey(false);
                      }
                    }}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg text-xs"
                  >
                    Guardar
                  </button>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                  <input
                    type="checkbox"
                    id="recordar-key"
                    checked={guardarApiKey}
                    onChange={(e) => setGuardarApiKey(e.target.checked)}
                    className="rounded border-neutral-700 bg-neutral-950 text-amber-500 accent-amber-500"
                  />
                  <label htmlFor="recordar-key" className="cursor-pointer">
                    Recordar en este navegador
                  </label>
                </div>
              </div>
            )}

            {/* Selector de Estilo Gastronómico */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-neutral-300">Estilo de Presentación:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'estudio', label: '📸 Estudio Top', icon: '✨' },
                  { id: 'parrilla', label: '🔥 A la Parrilla', icon: '🥩' },
                  { id: 'rustico', label: '🪵 Tabla Rústica', icon: '🥪' },
                  { id: 'street', label: '🍔 Street Food', icon: '🌃' },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setEstiloGastronomico(st.id as any)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-medium border flex items-center justify-center gap-1.5 transition-all ${
                      estiloGastronomico === st.id
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-md'
                        : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                    }`}
                  >
                    <span>{st.icon}</span>
                    <span>{st.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt editable opcional */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <label className="font-semibold text-neutral-300">Prompt gastronómico optimizado:</label>
                <button
                  type="button"
                  onClick={() => {
                    const p = construirPromptGastronomico({
                      nombre: nombreProducto,
                      descripcion: descripcionProducto,
                      estilo: estiloGastronomico,
                    });
                    setCustomPrompt(p);
                  }}
                  className="text-[11px] text-amber-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw size={11} /> Regenerar prompt
                </button>
              </div>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs focus:outline-none focus:border-amber-500/50 leading-relaxed font-mono resize-none"
              />
            </div>

            {/* Acciones */}
            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setMode('choose')}
                disabled={generandoIA}
                className="flex-1 text-xs"
              >
                Volver
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleGenerarConNanoBanana}
                disabled={generandoIA || !nombreProducto.trim()}
                loading={generandoIA}
                className="flex-1 text-xs font-bold bg-gradient-to-r from-amber-400 to-yellow-500 text-neutral-950 flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
              >
                {generandoIA ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Cocinando foto con IA...
                  </>
                ) : (
                  <>
                    <Sparkles size={15} />
                    Generar Foto con Nano Banana
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Modo Cámara */}
        {mode === 'camera' && !preview && (
          <div className="space-y-3">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-2xl bg-black aspect-video object-cover border border-neutral-800"
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
                disabled={uploading}
                className="flex-1 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={takePhoto}
                disabled={uploading}
                className="flex-1 flex items-center justify-center gap-2 text-xs font-bold"
              >
                <Camera size={16} />
                Capturar
              </Button>
            </div>
          </div>
        )}

        {/* Vista Previa de la Imagen Generada o Seleccionada */}
        {preview && (
          <div className="space-y-3 animate-in fade-in duration-300">
            <div className="relative rounded-2xl overflow-hidden border border-amber-500/40 shadow-2xl bg-neutral-950 group">
              <img
                src={preview}
                alt="Preview plato"
                className="w-full h-72 sm:h-80 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                <span className="font-bold flex items-center gap-1 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
                  <Flame size={14} className="text-amber-400" />
                  {nombreProducto}
                </span>
                <span className="text-[11px] text-neutral-300 bg-emerald-500/30 backdrop-blur-md px-2 py-0.5 rounded-md border border-emerald-500/40 font-semibold">
                  Lista para tu menú
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setPreview(null);
                  setSelectedFile(null);
                  setMode(mode === 'ai' ? 'ai' : 'choose');
                }}
                disabled={uploading}
                className="flex-1 text-xs"
              >
                {mode === 'ai' ? '🔄 Generar otra versión' : 'Cambiar imagen'}
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={handleUpload}
                disabled={uploading}
                loading={uploading}
                className="flex-1 flex items-center justify-center gap-2 text-xs font-bold bg-gradient-to-r from-amber-400 to-yellow-500 text-neutral-950 shadow-lg shadow-amber-500/20"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    Usar esta Foto
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
