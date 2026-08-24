// src/components/productos/ImageUploadModal.tsx
import { useState, useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  X,
  Camera,
  Upload,
  Loader2,
  Check,
  Flame,
  Info,
} from 'lucide-react';
import { subirImagenProducto } from '../../services/storageService';
import { createToast } from '../ui/Toast';

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
}) => {
  const [mode, setMode] = useState<'choose' | 'camera' | 'upload'>('choose');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<Blob | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <Modal isOpen={isOpen} onClose={resetModal} closeButton size="md">
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-700/80 pb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-display font-black text-white">
              Cargar Foto de Producto
            </h2>
            <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md font-semibold">
              {nombreProducto || 'Item'}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Opción 1: Subir Foto */}
            <button
              type="button"
              onClick={() => {
                setMode('upload');
                fileInputRef.current?.click();
              }}
              className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/50 text-left transition-all hover:scale-[1.02] active:scale-98 group shadow-md"
            >
              <div className="w-12 h-12 rounded-xl bg-neutral-800 text-neutral-300 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-amber-500/20 group-hover:text-amber-400 transition-all">
                <Upload size={24} />
              </div>
              <h3 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                Subir Archivo
              </h3>
              <p className="text-xs text-neutral-400 mt-1 leading-snug">
                Elige una foto desde tu galería, móvil o computador.
              </p>
            </button>

            {/* Opción 2: Tomar Foto */}
            <button
              type="button"
              onClick={startCamera}
              className="p-5 rounded-2xl bg-neutral-900/90 border border-neutral-800 hover:border-amber-500/50 text-left transition-all hover:scale-[1.02] active:scale-98 group shadow-md"
            >
              <div className="w-12 h-12 rounded-xl bg-neutral-800 text-neutral-300 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-amber-500/20 group-hover:text-amber-400 transition-all">
                <Camera size={24} />
              </div>
              <h3 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                Tomar Foto
              </h3>
              <p className="text-xs text-neutral-400 mt-1 leading-snug">
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
                className="flex-1 flex items-center justify-center gap-2 text-xs font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                <Camera size={16} />
                Capturar Foto
              </Button>
            </div>
          </div>
        )}

        {/* Vista Previa de la Imagen Seleccionada */}
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
                  Foto seleccionada
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
                  setMode('choose');
                }}
                disabled={uploading}
                className="flex-1 text-xs"
              >
                Cambiar imagen
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={handleUpload}
                disabled={uploading}
                loading={uploading}
                className="flex-1 flex items-center justify-center gap-2 text-xs font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400 shadow-lg shadow-amber-500/20"
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

export default ImageUploadModal;
