// src/components/productos/ProductoForm.tsx
import { useState } from 'react';
import { Producto, Jornada } from '../../types';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { FormModal } from './FormModal';
import { Timestamp } from 'firebase/firestore';
import { Image as ImageIcon, Tag, Sparkles } from 'lucide-react';
import { ImageUploadModal } from './ImageUploadModal';
import { useCategorias } from '@/hooks/useCategorias';
import { aplicarImagenACategoria } from '@/services/productosService';
import { useNegocio } from '@/context/NegocioContext';
import { createToast } from '../ui/Toast';

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
  const { negocioActual } = useNegocio();
  const { categorias } = useCategorias();
  const [nombre, setNombre] = useState(initialData?.nombre || '');
  const [descripcion, setDescripcion] = useState(initialData?.descripcion || '');
  const [categoria, setCategoria] = useState(initialData?.categoria || '');
  const [precioStr, setPrecioStr] = useState(
    initialData?.precio ? initialData.precio.toString() : ''
  );
  const [jornada, setJornada] = useState<Jornada>(initialData?.jornada || 'ambas');
  const [disponible, setDisponible] = useState(initialData?.disponible !== false);
  const [destacado, setDestacado] = useState(Boolean(initialData?.destacado));
  const [imagenUrl, setImagenUrl] = useState(initialData?.imagenUrl || '');
  const [aplicarATodaLaCategoria, setAplicarATodaLaCategoria] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleImageUpload = (imageUrl: string) => {
    setImagenUrl(imageUrl);
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
      const catTrimmed = categoria.trim() || undefined;
      const data: Omit<Producto, 'id'> = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        categoria: catTrimmed,
        precio,
        jornada,
        disponible,
        destacado,
        imagenUrl: imagenUrl || undefined,
        creadoEn: initialData?.creadoEn || now,
        actualizadoEn: now,
      };

      await onSubmit(data);

      // Si el usuario marcó aplicar esta foto como fondo uniforme para toda la categoría
      if (aplicarATodaLaCategoria && imagenUrl && catTrimmed) {
        try {
          const totalActualizados = await aplicarImagenACategoria(
            catTrimmed,
            imagenUrl,
            negocioActual.id
          );
          createToast(
            `🖼️ Fondo aplicado a ${totalActualizados} producto(s) de "${catTrimmed}"`,
            'success'
          );
        } catch (err) {
          console.error('Error aplicando imagen masiva:', err);
        }
      }

      // Limpiar form
      setNombre('');
      setDescripcion('');
      setCategoria('');
      setPrecioStr('');
      setImagenUrl('');
      setAplicarATodaLaCategoria(false);
      setJornada('ambas');
      setDisponible(true);
      setDestacado(false);
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
        label="Nombre del Producto *"
        value={nombre}
        onChange={(e) => {
          setNombre(e.target.value);
          if (errors.nombre) setErrors({ ...errors, nombre: '' });
        }}
        placeholder="Ej: Tequeño Tradicional, Hamburguesa Doble Carne..."
        error={errors.nombre}
      />

      {/* Selector de Categoría */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
          <Tag size={14} className="text-amber-400" />
          Categoría del Producto
        </label>
        
        {/* Sugerencias Dinámicas de Categorías del Negocio */}
        <div className="flex flex-wrap gap-1.5 pb-1 max-h-24 overflow-y-auto">
          {categorias.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoria(cat.nombre)}
              className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                categoria.toLowerCase().trim() === cat.nombre.toLowerCase().trim()
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-xs'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
              }`}
            >
              <span>{cat.icono || '🏷️'}</span>
              <span>{cat.nombre}</span>
            </button>
          ))}
        </div>

        <Input
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          placeholder="Escribe o selecciona una categoría (ej: Tequeños, Pancerotis...)"
        />
      </div>

      <Textarea
        label="Descripción / Relleno"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Ej: Relleno de queso costeño y bocadillo, tocineta y maíz, etc."
      />

      <Input
        label="Precio (en miles COP) *"
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
          { value: 'mañana', label: '🌅 Mañana/Tarde' },
          { value: 'noche', label: '🌙 Noche' },
          { value: 'ambas', label: '📅 Ambas Jornadas' },
        ]}
      >
        <option value="mañana">🌅 Mañana/Tarde</option>
        <option value="noche">🌙 Noche</option>
        <option value="ambas">📅 Ambas Jornadas</option>
      </Select>

      {/* Sección de Imagen */}
      <div className="space-y-3 rounded-2xl border border-amber-500/20 bg-neutral-900/60 p-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-amber-400 flex items-center gap-2">
            <ImageIcon size={16} />
            Foto del Producto
          </label>
        </div>

        {/* Preview de imagen */}
        {imagenUrl && (
          <div className="relative group rounded-xl overflow-hidden border border-amber-500/30">
            <img
              src={imagenUrl}
              alt={nombre}
              className="w-full h-36 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <button
              type="button"
              onClick={() => {
                setImagenUrl('');
                setAplicarATodaLaCategoria(false);
              }}
              className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition"
              title="Quitar foto"
            >
              ✕
            </button>
          </div>
        )}

        {/* Botón para cargar imagen */}
        <button
          type="button"
          onClick={() => setIsUploadModalOpen(true)}
          disabled={!nombre.trim()}
          className="w-full py-2.5 px-3 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed text-amber-400 font-medium rounded-xl flex items-center justify-center gap-2 transition text-xs border border-neutral-700 hover:border-amber-500/40"
        >
          <ImageIcon size={16} />
          {imagenUrl ? '📸 Cambiar Foto' : '📸 Cargar o Tomar Foto'}
        </button>

        {/* Opción para aplicar foto a toda la categoría (Fondo Uniforme estilo Carácter Burger) */}
        {imagenUrl && categoria.trim() && (
          <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl">
            <input
              type="checkbox"
              id="aplicar-categoria"
              checked={aplicarATodaLaCategoria}
              onChange={(e) => setAplicarATodaLaCategoria(e.target.checked)}
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-neutral-600 bg-neutral-900 text-amber-500 accent-amber-500 shrink-0"
            />
            <label
              htmlFor="aplicar-categoria"
              className="text-xs text-amber-300 font-medium cursor-pointer leading-tight"
            >
              <span className="font-bold flex items-center gap-1 text-amber-400">
                <Sparkles size={12} /> Fondo Unificado para "{categoria}":
              </span>
              Usar esta misma foto en todos los productos de esta categoría (estilo uniforme como Carácter Burger).
            </label>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6 pt-1">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="disponible"
            checked={disponible}
            onChange={(e) => setDisponible(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-neutral-600 bg-neutral-900 text-amber-500 accent-amber-500"
          />
          <label htmlFor="disponible" className="text-xs font-semibold text-neutral-300 cursor-pointer">
            ✅ Disponible
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="destacado"
            checked={destacado}
            onChange={(e) => setDestacado(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-neutral-600 bg-neutral-900 text-red-500 accent-red-500"
          />
          <label htmlFor="destacado" className="text-xs font-semibold text-amber-400 flex items-center gap-1 cursor-pointer">
            ❤️ Destacado del Día (Tienda Web)
          </label>
        </div>
      </div>

      <ImageUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onImageUpload={handleImageUpload}
        nombreProducto={nombre}
        negocioId={negocioActual.id}
        descripcionProducto={descripcion}
      />
    </FormModal>
  );
};
