// src/components/productos/ImageUploadModal.tsx
import { useState, useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { X, Camera, Upload, Loader2 } from 'lucide-react';
import { subirImagenProducto } from '../../services/storageService';

interface ImageUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageUpload: (imageUrl: string) => void;
  nombreProducto: string;
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
          facingMode: 'environment', // Cámara trasera en móviles
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError(
        'No se pudo acceder a la cámara. Verifica los permisos del navegador.'
      );
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

  // Tomar foto
  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    // Configurar canvas con las dimensiones del video
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    // Dibujar video en canvas
    context.drawImage(videoRef.current, 0, 0);

    // Convertir canvas a blob
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        setSelectedFile(blob);
        setPreview(canvasRef.current!.toDataURL('image/jpeg'));
        stopCamera();
        setMode('choose');
      }
    }, 'image/jpeg', 0.95);
  };

  // Manejar selección de archivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen válida');
      return;
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('La imagen no debe superar 5MB');
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Crear preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Subir imagen a Firebase
  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);

    try {
      const imageUrl = await subirImagenProducto(selectedFile, nombreProducto);
      onImageUpload(imageUrl);
      resetModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al subir la imagen');
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

  // Limpiar al cerrar
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
        <div className="flex items-center justify-between border-b border-neutral-700 pb-4">
          <h2 className="text-2xl font-bold text-white">Carga de Imagen</h2>
          <button
            onClick={resetModal}
            className="rounded-lg p-2 hover:bg-neutral-800 transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} className="text-neutral-400" />
          </button>
        </div>

        {/* Mensajes de error */}
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Modo selección inicial */}
        {mode === 'choose' && !preview && (
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="primary"
              className="w-full flex items-center justify-center gap-2 h-12"
              onClick={startCamera}
            >
              <Camera size={20} />
              📸 Tomar Foto
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="w-full flex items-center justify-center gap-2 h-12"
              onClick={() => {
                setMode('upload');
                fileInputRef.current?.click();
              }}
            >
              <Upload size={20} />
              📁 Subir Foto
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              capture={false}
            />
          </div>
        )}

        {/* Modo cámara */}
        {mode === 'camera' && !preview && (
          <div className="space-y-3">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg bg-black"
            />
            <canvas ref={canvasRef} className="hidden" />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCancel}
                disabled={uploading}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={takePhoto}
                disabled={uploading}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <Camera size={16} />
                Capturar
              </Button>
            </div>
          </div>
        )}

        {/* Preview de imagen */}
        {preview && (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden border border-gold/30">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-64 object-cover"
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setPreview(null);
                  setSelectedFile(null);
                  setMode('choose');
                }}
                disabled={uploading}
                className="flex-1"
              >
                Cambiar
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleUpload}
                disabled={uploading}
                loading={uploading}
                className="flex-1 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  'Guardar Imagen'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
