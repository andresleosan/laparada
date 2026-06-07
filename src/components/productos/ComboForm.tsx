import React, { useState } from 'react';
import { Combo, ItemVenta, Jornada } from '../../types';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { FormModal } from './FormModal';
import { Trash2 } from 'lucide-react';

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
  const [precioStr, setPrecioStr] = useState(
    initialData?.precio ? (initialData.precio / 1000).toString() : ''
  );
  const [jornada, setJornada] = useState<Jornada>(initialData?.jornada || 'ambas');
  const [disponible, setDisponible] = useState(initialData?.disponible !== false);
  const [items, setItems] = useState<ItemVenta[]>(initialData?.items || []);
  const [newItemNombre, setNewItemNombre] = useState('');
  const [newItemCantidad, setNewItemCantidad] = useState('1');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleAddItem = () => {
    if (!newItemNombre.trim()) {
      setErrors({ ...errors, item: 'Nombre del item es requerido' });
      return;
    }
    const cantidad = Number(newItemCantidad) || 1;
    const newItem: ItemVenta = {
      nombre: newItemNombre.trim(),
      cantidad,
      tipo: 'producto',
      productoId: `temp_${Date.now()}`,
      precio: 0, // Precio será calculado después
      subtotal: 0,
    };
    setItems([...items, newItem]);
    setNewItemNombre('');
    setNewItemCantidad('1');
    setErrors({ ...errors, item: '' });
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
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
      const precio = Number(precioStr) * 1000; // Convertir a centavos COP
      const data: Omit<Combo, 'id'> = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        precio,
        items,
        jornada,
        disponible,
      };
      await onSubmit(data);
      // Limpiar form
      setNombre('');
      setDescripcion('');
      setPrecioStr('');
      setJornada('ambas');
      setDisponible(true);
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
        label="Nombre del Combo"
        value={nombre}
        onChange={(e) => {
          setNombre(e.target.value);
          if (errors.nombre) setErrors({ ...errors, nombre: '' });
        }}
        placeholder="Ej: Combo Pareja"
        error={errors.nombre}
      />

      <Textarea
        label="Descripción"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Ej: 2 Perros + 1 Salchipapa + 2 Bebidas"
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
        placeholder="Ej: 38 (= $38.000)"
        error={errors.precio}
      />

      <Select
        label="Jornada"
        value={jornada}
        onChange={(e) => setJornada(e.target.value as Jornada)}
      >
        <option value="mañana">🌅 Mañana</option>
        <option value="noche">🌙 Noche</option>
        <option value="ambas">📅 Ambas Jornadas</option>
      </Select>

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

      {/* Items del combo */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-gold">Items del Combo</label>
        {errors.items && <p className="text-xs text-red-400">{errors.items}</p>}

        {/* Lista de items */}
        <div className="space-y-2 rounded-lg bg-neutral-900/50 p-3">
          {items.length === 0 ? (
            <p className="text-sm text-neutral-400">Sin items agregados</p>
          ) : (
            items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded bg-neutral-800 px-2 py-1"
              >
                <span className="text-sm text-neutral-300">
                  {item.nombre} x{item.cantidad}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveItem(idx)}
                  className="p-1 hover:bg-red-900/20 rounded transition-colors"
                  aria-label="Eliminar item"
                >
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Agregar item */}
        <div className="flex gap-2">
          <Input
            value={newItemNombre}
            onChange={(e) => setNewItemNombre(e.target.value)}
            placeholder="Nombre del item"
            className="flex-1 text-sm"
          />
          <Input
            type="number"
            min="1"
            value={newItemCantidad}
            onChange={(e) => setNewItemCantidad(e.target.value)}
            placeholder="Cant"
            className="w-16 text-sm"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddItem}
            className="px-3 py-2 text-sm"
          >
            +
          </Button>
        </div>
        {errors.item && <p className="text-xs text-red-400">{errors.item}</p>}
      </div>
    </FormModal>
  );
};
