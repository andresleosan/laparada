// src/components/productos/ImageUploadModal.tsx
import { useState, useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  Camera,
  Upload,
  Loader2,
  Check,
  Flame,
  Info,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { subirImagenProducto } from '../../services/storageService';
import {
  componerImagenSobreMesa,
  removerFondoProducto,
} from '../../services/imageBackgroundService';
import { createToast } from '../ui/Toast';
import { useNegocio } from '@/context/NegocioContext';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageUpload: (imageUrl: string) => void;
  nombreProducto: string;
  negocioId: string;
  descripcionProducto?: string;
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  isOpen,
  onClose,
  onImageUpload,
  nombreProducto,
  negocioId,
}) => {
  const { puedeUsarNanoBanana } = useNegocio();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<Blob | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [processingBackground, setProcessingBackground] = useState(false);
  const [backgroundApplied, setBackgroundApplied] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Iniciar cámara
  const startCamera = async () => {
    setError(null);
    setIsCameraActive(true);
    setPreview(null);
    setSelectedFile(null);
    setBackgroundApplied(false);

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
      setIsCameraActive(false);
      console.error('Error al acceder a la cámara:', err);
    }
  };

  // Detener cámara
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Tomar foto con cámara
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth || 1280;
    canvasRef.current.height = videoRef.current.videoHeight || 720;

    context.drawImage(videoRef.current, 0, 0);

    canvasRef.current.toBlob(
      (blob) => {
        if (blob) {
          setSelectedFile(blob);
          setPreview(canvasRef.current!.toDataURL('image/jpeg'));
          stopCamera();
        }
      },
      'image/jpeg',
      0.95
    );
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen válida (PNG, JPG, JPEG, WEBP)');
      return;
    }

    const maxSize = 6 * 1024 * 1024; // Límite de la callable de edición
    if (file.size > maxSize) {
      setError('La imagen no debe superar 6MB');
      return;
    }

    setError(null);
    setSelectedFile(file);
    setBackgroundApplied(false);

    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Manejar selección de archivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplyTableBackground = async () => {
    if (!puedeUsarNanoBanana) {
      setError('Tu perfil no tiene habilitada la edición automática de fondos.');
      return;
    }
    if (!selectedFile || processingBackground || backgroundApplied) return;

    setProcessingBackground(true);
    setError(null);
    try {
      const transparentProduct = await removerFondoProducto(selectedFile);
      const composedImage = await componerImagenSobreMesa(transparentProduct);
      const composedPreview = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('No se pudo preparar la vista previa final'));
        reader.readAsDataURL(composedImage);
      });

      setSelectedFile(composedImage);
      setPreview(composedPreview);
      setBackgroundApplied(true);
      createToast('Fondo de mesa aplicado. Revisa la vista previa antes de guardar.', 'success');
    } catch (err) {
      console.error('No se pudo aplicar el fondo de mesa:', err);
      setError(err instanceof Error ? err.message : 'No se pudo editar la foto');
    } finally {
      setProcessingBackground(false);
    }
  };

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
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
        finalUrl = await subirImagenProducto(selectedFile, nombreProducto, negocioId);
      }
      onImageUpload(finalUrl);
      createToast('Foto asociada al producto exitosamente', 'success');
      resetModal();
    } catch (err) {
      console.error('Fallo al subir la foto a Firebase Storage:', err);
      setError(err instanceof Error ? err.message : 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  // Reiniciar modal
  const resetModal = () => {
    setPreview(null);
    setSelectedFile(null);
    setError(null);
    setIsDragging(false);
    setBackgroundApplied(false);
    stopCamera();
    onClose();
  };

  // Limpiar al desmontar o cerrar
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setPreview(null);
      setSelectedFile(null);
      setError(null);
      setBackgroundApplied(false);
      setProcessingBackground(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={resetModal} closeButton size="md" labelledBy="image-upload-modal-title">
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <h2 id="image-upload-modal-title" className="text-lg font-display font-bold text-white">
              Cargar Foto de Producto
            </h2>
            <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-md font-semibold">
              {nombreProducto || 'Plato'}
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Selecciona una foto de tu dispositivo o tómala con la cámara
          </p>
        </div>

        {/* Mensajes de error */}
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-xl text-red-200 text-xs leading-relaxed flex items-start gap-2">
            <Info size={16} className="text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Vista de Opciones (Cuando no hay cámara activa ni preview) */}
        {!isCameraActive && !preview && (
          <div className="space-y-3">
            {/* Zona Drag & Drop / Click para Subir */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2 ${
                isDragging
                  ? 'border-amber-400 bg-amber-500/10 scale-[1.01]'
                  : 'border-neutral-700 hover:border-amber-400/80 bg-neutral-900/80 hover:bg-neutral-900'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-md">
                <Upload size={24} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white">
                  Haz clic para subir o arrastra tu foto aquí
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Archivos JPG, PNG, WEBP de hasta 6MB
                </p>
              </div>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-neutral-800" />
              <span className="flex-shrink mx-3 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                o también
              </span>
              <div className="flex-grow border-t border-neutral-800" />
            </div>

            {/* Botón Tomar Foto con Cámara */}
            <button
              type="button"
              onClick={startCamera}
              className="w-full p-4 rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-amber-500/50 flex items-center justify-center gap-3 transition-all hover:bg-neutral-850 active:scale-98 group shadow-md"
            >
              <div className="w-10 h-10 rounded-xl bg-neutral-800 text-neutral-300 flex items-center justify-center group-hover:bg-amber-500/20 group-hover:text-amber-400 transition-colors">
                <Camera size={20} />
              </div>
              <div className="text-left">
                <h4 className="font-bold text-xs text-white group-hover:text-amber-400 transition-colors">
                  Tomar Foto con la Cámara
                </h4>
                <p className="text-[11px] text-neutral-400">
                  Abre la cámara de tu móvil o computador
                </p>
              </div>
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

        {/* 2. Modo Cámara Activa */}
        {isCameraActive && !preview && (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-black border border-neutral-800">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full aspect-video object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={stopCamera}
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

        {/* 3. Vista Previa de la Imagen Seleccionada */}
        {preview && (
          <div className="space-y-3 animate-in fade-in duration-200">
            <div data-admin-media="true" className="relative rounded-2xl overflow-hidden border border-amber-500/40 shadow-2xl bg-neutral-950">
              <img
                src={preview}
                alt="Preview plato"
                className="w-full h-64 sm:h-72 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                <span className="font-bold flex items-center gap-1.5 bg-black/70 backdrop-blur-md px-3 py-1 rounded-xl border border-white/10 text-xs">
                  <Flame size={14} className="text-amber-400" />
                  {nombreProducto || 'Plato'}
                </span>
                <span className="text-[11px] text-emerald-300 bg-emerald-500/20 backdrop-blur-md px-2.5 py-1 rounded-lg border border-emerald-500/40 font-bold">
                  ✓ Foto lista
                </span>
              </div>
            </div>

            {puedeUsarNanoBanana && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3">
              <div className="flex items-start gap-2">
                <Sparkles size={16} className="mt-0.5 shrink-0 text-amber-400" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-amber-200">
                    {backgroundApplied ? 'Vista previa con fondo de mesa' : 'Mejora la presentación de tu producto'}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-400">
                    {backgroundApplied
                      ? 'El producto ya está centrado sobre la mesa. Puedes usar esta foto o elegir otra.'
                      : 'Quitaremos el fondo actual y centraremos el producto sobre madera con mantel a cuadros.'}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={handleApplyTableBackground}
                disabled={uploading || processingBackground || backgroundApplied}
                loading={processingBackground}
                className="mt-3 w-full border border-amber-500/30 bg-neutral-800 text-xs font-bold text-amber-300 hover:bg-neutral-700"
              >
                {processingBackground ? 'Procesando foto...' : backgroundApplied ? 'Fondo de mesa aplicado' : 'Aplicar fondo de mesa'}
              </Button>
            </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setPreview(null);
                  setSelectedFile(null);
                  setBackgroundApplied(false);
                  setIsCameraActive(false);
                }}
                disabled={uploading || processingBackground}
                className="flex-1 text-xs flex items-center justify-center gap-1.5"
              >
                <RefreshCw size={14} />
                <span>Elegir otra</span>
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={handleUpload}
                disabled={uploading || processingBackground}
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

        {/* Footer si no hay preview */}
        {!preview && !isCameraActive && (
          <div className="border-t border-neutral-800 pt-3 flex justify-end">
            <Button variant="secondary" onClick={resetModal} className="text-xs">
              Cancelar
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ImageUploadModal;
