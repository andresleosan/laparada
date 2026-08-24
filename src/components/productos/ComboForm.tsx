import { useState } from 'react';
import { Combo, ComboItem, Jornada } from '../../types';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { FormModal } from './FormModal';
import { Trash2, Image as ImageIcon, Tag } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { ImageUploadModal } from './ImageUploadModal';

export interface ComboFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Combo, 'id'>) => Promise<void>;
  initialData?: Combo;
  loading?: boolean;
}

export const ComboForm: React.FC<ComboFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading = false,
}) => {
  const [nombre, setNombre] = useState(initialData?.nombre || '');
  const [descripcion, setDescripcion] = useState(initialData?.descripcion || '');
  const [categoria, setCategoria] = useState(initialData?.categoria || 'Combos');
  const [precioStr, setPrecioStr] = useState(
    initialData?.precioEspecial ? initialData.precioEspecial.toString() : ''
  );
  const [jornada, setJornada] = useState<Jornada>(initialData?.jornada || 'ambas');
  const [disponible, setDisponible] = useState(initialData?.disponible !== false);
  const [destacado, setDestacado] = useState(Boolean(initialData?.destacado));
  const [imagenUrl, setImagenUrl] = useState(initialData?.imagenUrl || '');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [items, setItems] = useState<ComboItem[]>(initialData?.items || []);
  const [newItemNombre, setNewItemNombre] = useState('');
  const [newItemCantidad, setNewItemCantidad] = useState('1');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddItem = () => {
    if (!newItemNombre.trim()) {
      setErrors({ ...errors, item: 'Nombre del item es requerido' });
      return;
    }
    const cantidad = Number(newItemCantidad) || 1;
    const newItem: ComboItem = {
      productoId: `temp_${Date.now()}`,
      cantidad,
      nombreSnapshot: newItemNombre.trim(),
    };
    setItems([...items, newItem]);
    setNewItemNombre('');
    setNewItemCantidad('1');
    setErrors({ ...errors, item: '' });
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleImageUpload = (imageUrl: string) => {
    setImagenUrl(imageUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!precioStr.trim()) newErrors.precio = 'El precio es requerido';
    if (isNaN(Number(precioStr))) newErrors.precio = 'El precio debe ser un número';
    if (items.length === 0) newErrors.items = 'El combo debe tener al menos 1 item';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const precioEspecial = Number(precioStr);
      const now = Timestamp.now();
      const data: Omit<Combo, 'id'> = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        categoria: categoria.trim() || 'Combos',
        precioEspecial,
        items,
        jornada,
        disponible,
        destacado,
        imagenUrl: imagenUrl || undefined,
        creadoEn: initialData?.creadoEn || now,
        actualizadoEn: now,
      };
      await onSubmit(data);
      // Limpiar form
      setNombre('');
      setDescripcion('');
      setCategoria('Combos');
      setPrecioStr('');
      setImagenUrl('');
      setJornada('ambas');
      setDisponible(true);
      setDestacado(false);
      setItems([]);
      setErrors({});
    } catch (err) {
      console.error('Error submitting form:', err);
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      title={initialData ? 'Editar Combo' : 'Crear Combo'}
      onClose={onClose}
      onSubmit={handleSubmit}
      loading={loading}
      submitLabel={initialData ? 'Actualizar' : 'Crear'}
    >
      <Input
        label="Nombre del Combo *"
        value={nombre}
        onChange={(e) => {
          setNombre(e.target.value);
          if (errors.nombre) setErrors({ ...errors, nombre: '' });
        }}
        placeholder="Ej: Combo Pareja, Combo Familiar..."
        error={errors.nombre}
      />

      <Input
        label="Categoría"
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
        placeholder="Ej: Combos, Promociones, Especiales..."
      />

      <Textarea
        label="Descripción"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Ej: 2 Perros + 1 Salchipapa + 2 Bebidas"
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
        placeholder="Ej: 38 (= $38.000)"
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
            Foto del Combo
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
              onClick={() => setImagenUrl('')}
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
      </div>

      {/* Items del Combo */}
      <div className="space-y-2 rounded-2xl bg-neutral-900/60 border border-neutral-800 p-3.5">
        <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
          <Tag size={13} className="text-amber-400" />
          Items que incluye el Combo
        </label>
        {errors.items && <p className="text-xs text-red-400">{errors.items}</p>}

        {/* Lista de items */}
        <div className="space-y-1.5">
          {items.length === 0 ? (
            <p className="text-xs text-neutral-500 py-1">Sin items agregados todavía</p>
          ) : (
            items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-xl bg-neutral-950 border border-neutral-800 px-3 py-1.5"
              >
                <span className="text-xs text-neutral-300 font-medium">
                  {item.nombreSnapshot} <span className="text-amber-400 font-bold">x{item.cantidad}</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="p-1 hover:bg-red-900/20 text-red-400 rounded-lg transition-colors"
                  aria-label="Eliminar item"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Agregar item */}
        <div className="flex gap-2 pt-1">
          <Input
            value={newItemNombre}
            onChange={(e) => setNewItemNombre(e.target.value)}
            placeholder="Ej: Tequeño, Gaseosa 1.5L..."
            className="flex-1 text-xs"
          />
          <Input
            type="number"
            min="1"
            value={newItemCantidad}
            onChange={(e) => setNewItemCantidad(e.target.value)}
            placeholder="Cant"
            className="w-16 text-xs"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddItem}
            className="px-3 py-1.5 text-xs font-bold"
          >
            +
          </Button>
        </div>
        {errors.item && <p className="text-xs text-red-400">{errors.item}</p>}
      </div>

      {/* Checkboxes de Estado y Destacado */}
      <div className="flex items-center gap-6 pt-1">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="disponible-combo"
            checked={disponible}
            onChange={(e) => setDisponible(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-neutral-600 bg-neutral-900 text-amber-500 accent-amber-500"
          />
          <label htmlFor="disponible-combo" className="text-xs font-semibold text-neutral-300 cursor-pointer">
            ✅ Disponible
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="destacado-combo"
            checked={destacado}
            onChange={(e) => setDestacado(e.target.checked)}
            className="h-4 w-4 cursor-pointer rounded border-neutral-600 bg-neutral-900 text-red-500 accent-red-500"
          />
          <label htmlFor="destacado-combo" className="text-xs font-semibold text-amber-400 flex items-center gap-1 cursor-pointer">
            ❤️ Destacado del Día (Tienda Web)
          </label>
        </div>
      </div>

      <ImageUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onImageUpload={handleImageUpload}
        nombreProducto={nombre}
        descripcionProducto={descripcion}
      />
    </FormModal>
  );
};
