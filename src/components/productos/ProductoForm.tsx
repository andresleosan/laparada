import { useState } from 'react';
import { Producto, Jornada } from '../../types';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { FormModal } from './FormModal';
import { Timestamp } from 'firebase/firestore';
import { buscarImagenProducto } from '../../services/imageService';
import { Image as ImageIcon, Loader2 } from 'lucide-react';


export interface ProductoFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Producto, 'id'>) => Promise<void>;
  initialData?: Producto;
  loading?: boolean;
}

export const ProductoForm: React.FC<ProductoFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}) => {
  const [nombre, setNombre] = useState(initialData?.nombre || '');
  const [descripcion, setDescripcion] = useState(initialData?.descripcion || '');
  const [precioStr, setPrecioStr] = useState(
    initialData?.precio ? initialData.precio.toString() : ''
  );
  const [jornada, setJornada] = useState<Jornada>(initialData?.jornada || 'ambas');
  const [disponible, setDisponible] = useState(initialData?.disponible !== false);
  const [imagenUrl, setImagenUrl] = useState(initialData?.imagenUrl || '');
  const [searchingImage, setSearchingImage] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSearchImage = async () => {
    if (!nombre.trim()) {
      setErrors({ ...errors, nombre: 'Necesita ingresar un nombre primero' });
      return;
    }

    setSearchingImage(true);
    try {
      const url = await buscarImagenProducto(nombre);
      if (url) {
        setImagenUrl(url);
        console.log('✅ Imagen encontrada:', url);
      }
    } catch (err) {
      console.error('Error searching image:', err);
    } finally {
      setSearchingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!precioStr.trim()) newErrors.precio = 'El precio es requerido';
    if (isNaN(Number(precioStr))) newErrors.precio = 'El precio debe ser un número';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const precio = Number(precioStr);
      const now = Timestamp.now();
      const data: Omit<Producto, 'id'> = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        precio,
        jornada,
        disponible,
        imagenUrl: imagenUrl || undefined,
        creadoEn: initialData?.creadoEn || now,
        actualizadoEn: now,
      };
      await onSubmit(data);
      // Limpiar form
      setNombre('');
      setDescripcion('');
      setPrecioStr('');
      setImagenUrl('');
      setJornada('ambas');
      setDisponible(true);
      setErrors({});
    } catch (err) {
      console.error('Error submitting form:', err);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      title={initialData ? 'Editar Producto' : 'Crear Producto'}
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      submitLabel={initialData ? 'Actualizar' : 'Crear'}
    >
      <Input
        label="Nombre del Producto"
        value={nombre}
        onChange={(e) => {
          setNombre(e.target.value);
          if (errors.nombre) setErrors({ ...errors, nombre: '' });
        }}
        placeholder="Ej: Hamburguesa Clásica"
        error={errors.nombre}
      />

      <Textarea
        label="Descripción"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Ej: Hamburguesa con queso, lechuga y tomate"
      />

      <Input
        label="Precio (en miles COP)"
        type="number"
        step="0.5"
        value={precioStr}
        onChange={(e) => {
          setPrecioStr(e.target.value);
          if (errors.precio) setErrors({ ...errors, precio: '' });
        }}
        placeholder="Ej: 18 (= $18.000)"
        error={errors.precio}
      />

      <Select
        label="Jornada"
        value={jornada}
        onChange={(e) => setJornada(e.target.value as Jornada)}
        options={[
          { value: 'mañana', label: '🌅 Mañana' },
          { value: 'noche', label: '🌙 Noche' },
          { value: 'ambas', label: '📅 Ambas Jornadas' },
        ]}
      >
        <option value="mañana">🌅 Mañana</option>
        <option value="noche">🌙 Noche</option>
        <option value="ambas">📅 Ambas Jornadas</option>
      </Select>

      {/* Sección de Imagen */}
      <div className="space-y-3 rounded-lg border border-gold/20 bg-gold/5 p-4">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-gold flex items-center gap-2">
            <ImageIcon size={16} />
            Imagen del Producto
          </label>
        </div>

        {/* Preview de imagen */}
        {imagenUrl && (
          <div className="relative group rounded-lg overflow-hidden border border-gold/30">
            <img
              src={imagenUrl}
              alt={nombre}
              className="w-full h-40 object-cover"
              onError={(e) => {
                console.error('Error loading image');
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <button
              type="button"
              onClick={() => setImagenUrl('')}
              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
            >
              ✕
            </button>
          </div>
        )}

        {/* Botón para buscar automáticamente */}
        <button
          type="button"
          onClick={handleSearchImage}
          disabled={searchingImage || !nombre.trim()}
          className="w-full py-2 px-3 bg-gold/20 hover:bg-gold/30 disabled:opacity-50 disabled:cursor-not-allowed text-gold font-medium rounded-lg flex items-center justify-center gap-2 transition"
        >
          {searchingImage ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Buscando imagen...
            </>
          ) : (
            <>
              <ImageIcon size={16} />
              🔍 Buscar imagen automáticamente
            </>
          )}
        </button>

        {/* Input para URL manual */}
        <Input
          label="O pega aquí una URL de imagen"
          type="text"
          value={imagenUrl}
          onChange={(e) => setImagenUrl(e.target.value)}
          placeholder="https://ejemplo.com/imagen.jpg"
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="disponible"
          checked={disponible}
          onChange={(e) => setDisponible(e.target.checked)}
          className="h-4 w-4 cursor-pointer rounded border-neutral-600 bg-neutral-900 text-gold accent-gold"
        />
        <label htmlFor="disponible" className="text-sm font-medium text-neutral-300">
          ✅ Disponible
        </label>
      </div>
    </FormModal>
  );
};
