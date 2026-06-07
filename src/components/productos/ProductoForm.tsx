import React, { useState } from 'react';
import { Producto, Jornada } from '../../types';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Select } from '../ui/Select';
import { FormModal } from './FormModal';
import { parseCOP } from '../../utils/formatCOP';

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
    initialData?.precio ? (initialData.precio / 1000).toString() : ''
  );
  const [jornada, setJornada] = useState<Jornada>(initialData?.jornada || 'ambas');
  const [disponible, setDisponible] = useState(initialData?.disponible !== false);
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      const precio = Number(precioStr) * 1000; // Convertir a centavos COP
      const data: Omit<Producto, 'id'> = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        precio,
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
    </FormModal>
  );
};
