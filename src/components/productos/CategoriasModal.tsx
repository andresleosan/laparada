// src/components/productos/CategoriasModal.tsx
import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { createToast } from '../ui/Toast';
import { useCategorias } from '@/hooks/useCategorias';
import type { CategoriaProducto } from '@/types';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Loader2,
  Sparkles,
  RotateCcw,
} from 'lucide-react';

interface CategoriasModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMOJIS_RECOMENDADOS = [
  '🥟', '🍔', '🌭', '🍟', '🫓', '🥪', '🍗', '🥤', '🍰', '🥩',
  '🍕', '🌮', '🥗', '☕', '🍦', '🍩', '🍳', '🥓', '🍣', '🏷️',
];

export function CategoriasModal({ isOpen, onClose }: CategoriasModalProps) {
  const {
    categorias,
    loading,
    agregarCategoria,
    editarCategoria,
    borrarCategoria,
    restaurarSugeridas,
  } = useCategorias();

  // Estados del Formulario (Crear / Editar)
  const [modoEdicion, setModoEdicion] = useState(false);
  const [categoriaEditandoId, setCategoriaEditandoId] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [icono, setIcono] = useState('🥟');
  const [descripcion, setDescripcion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [restaurando, setRestaurando] = useState(false);

  // Estados de eliminación
  const [eliminandoId, setEliminandoId] = useState<string | null>(null);

  const resetForm = () => {
    setModoEdicion(false);
    setCategoriaEditandoId(null);
    setNombre('');
    setIcono('🥟');
    setDescripcion('');
  };

  const handleIniciarCreacion = () => {
    resetForm();
    setModoEdicion(true);
  };

  const handleIniciarEdicion = (cat: CategoriaProducto) => {
    setCategoriaEditandoId(cat.id);
    setNombre(cat.nombre);
    setIcono(cat.icono || '🏷️');
    setDescripcion(cat.descripcion || '');
    setModoEdicion(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      createToast('El nombre de la categoría es obligatorio', 'error');
      return;
    }

    setGuardando(true);
    try {
      if (categoriaEditandoId && !categoriaEditandoId.startsWith('default-')) {
        // Actualizar existente en Firestore
        await editarCategoria(categoriaEditandoId, {
          nombre: nombre.trim(),
          icono: icono.trim() || '🏷️',
          descripcion: descripcion.trim(),
        });
        createToast('✅ Categoría actualizada exitosamente', 'success');
      } else {
        // Crear nueva en Firestore
        await agregarCategoria({
          nombre: nombre.trim(),
          icono: icono.trim() || '🏷️',
          descripcion: descripcion.trim(),
          activo: true,
          orden: (categorias.length + 1) * 10,
        });
        createToast('🎉 Categoría guardada exitosamente', 'success');
      }
      resetForm();
    } catch (err: any) {
      console.error('Error al guardar categoría:', err);
      createToast(err?.message || 'Error al guardar categoría', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: string, nombreCat: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar la categoría "${nombreCat}"?`)) {
      return;
    }

    setEliminandoId(id);
    try {
      if (!id.startsWith('default-')) {
        await borrarCategoria(id);
      }
      createToast('🗑️ Categoría eliminada', 'success');
      if (categoriaEditandoId === id) resetForm();
    } catch (err) {
      console.error('Error al eliminar categoría:', err);
      createToast('Error al eliminar categoría', 'error');
    } finally {
      setEliminandoId(null);
    }
  };

  const handleRestaurar = async () => {
    setRestaurando(true);
    try {
      await restaurarSugeridas();
      createToast('✨ Categorías sugeridas cargadas exitosamente', 'success');
    } catch (err) {
      console.error('Error al restaurar categorías:', err);
      createToast('Error al restaurar categorías', 'error');
    } finally {
      setRestaurando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} closeButton size="lg">
      <div className="w-full space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <Tag size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white font-display">
                Gestión de Categorías
              </h2>
              <p className="text-xs text-neutral-400">
                Organiza tus tequeños, pancerotis, hamburguesas y más
              </p>
            </div>
          </div>

          {!modoEdicion && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={handleRestaurar}
                loading={restaurando}
                disabled={restaurando}
                className="text-xs font-semibold border border-neutral-700 hover:border-amber-400 text-neutral-300 hover:text-amber-400 flex items-center gap-1.5"
                title="Cargar categorías recomendadas por defecto"
              >
                <RotateCcw size={14} className="text-amber-400" />
                <span>Restaurar Sugeridas</span>
              </Button>

              <Button
                variant="primary"
                onClick={handleIniciarCreacion}
                className="text-xs font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400 flex items-center gap-1.5 shadow-md"
              >
                <Plus size={15} />
                <span>Nueva Categoría</span>
              </Button>
            </div>
          )}
        </div>

        {/* Formulario de Creación / Edición */}
        {modoEdicion && (
          <form
            onSubmit={handleSubmit}
            className="p-4 rounded-2xl bg-neutral-900 border border-amber-500/30 space-y-3 animate-in fade-in duration-200"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <h3 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Sparkles size={14} />
                {categoriaEditandoId ? 'Editar Categoría' : 'Crear Nueva Categoría'}
              </h3>
              <button
                type="button"
                onClick={resetForm}
                className="p-1 rounded-lg text-neutral-400 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-3">
                <Input
                  label="Nombre de la Categoría *"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Tequeños, Pancerotis, Hamburguesas..."
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Ícono / Emoji
                </label>
                <input
                  type="text"
                  value={icono}
                  onChange={(e) => setIcono(e.target.value)}
                  className="w-full text-center text-lg p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white focus:border-amber-400 focus:outline-none"
                  placeholder="🥟"
                  maxLength={4}
                />
              </div>
            </div>

            {/* Selector de Emojis Rápidos */}
            <div className="space-y-1">
              <span className="text-[11px] text-neutral-400 block font-medium">
                Selecciona un emoji sugerido:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS_RECOMENDADOS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setIcono(em)}
                    className={`w-8 h-8 rounded-lg text-base flex items-center justify-center border transition-all ${
                      icono === em
                        ? 'bg-amber-500/20 border-amber-400 scale-110'
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>

            <Textarea
              label="Descripción (Opcional)"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Variedades de queso, bocadillo, jamón..."
              rows={2}
            />

            <div className="flex gap-2 pt-1">
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
                disabled={guardando}
                className="flex-1 text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={guardando}
                disabled={guardando || !nombre.trim()}
                className="flex-1 text-xs font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400"
              >
                <Check size={14} />
                <span>{categoriaEditandoId ? 'Guardar Cambios' : 'Crear Categoría'}</span>
              </Button>
            </div>
          </form>
        )}

        {/* Lista de Categorías Existentes */}
        <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
          {loading && categorias.length === 0 ? (
            <div className="py-8 text-center text-neutral-400">
              <Loader2 size={24} className="animate-spin mx-auto mb-2 text-amber-400" />
              <span className="text-xs">Cargando categorías...</span>
            </div>
          ) : categorias.length === 0 ? (
            <div className="p-8 text-center bg-neutral-900/60 rounded-2xl border border-neutral-800 text-neutral-400 space-y-3">
              <Tag size={32} className="mx-auto text-neutral-600 mb-1" />
              <p className="text-xs font-bold text-white">No tienes categorías registradas</p>
              <p className="text-[11px] text-neutral-500">
                Haz clic en "Restaurar Sugeridas" para cargar el listado completo automáticamente.
              </p>
              <Button
                variant="primary"
                onClick={handleRestaurar}
                loading={restaurando}
                className="text-xs font-bold bg-amber-500 text-neutral-950 hover:bg-amber-400 mx-auto"
              >
                <Sparkles size={14} />
                <span>Cargar Categorías Sugeridas</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {categorias.map((cat) => (
                <div
                  key={cat.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                    categoriaEditandoId === cat.id
                      ? 'bg-amber-500/10 border-amber-400/80 shadow-md'
                      : 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="text-2xl p-2 rounded-xl bg-neutral-950 border border-neutral-800 shrink-0">
                      {cat.icono || '🏷️'}
                    </span>
                    <div className="truncate">
                      <h4 className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                        <span>{cat.nombre}</span>
                      </h4>
                      {cat.descripcion && (
                        <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                          {cat.descripcion}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleIniciarEdicion(cat)}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-amber-400 hover:bg-neutral-800 transition-colors"
                      title="Editar categoría"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleEliminar(cat.id, cat.nombre)}
                      disabled={eliminandoId === cat.id}
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Eliminar categoría"
                    >
                      {eliminandoId === cat.id ? (
                        <Loader2 size={15} className="animate-spin text-red-400" />
                      ) : (
                        <Trash2 size={15} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-800 pt-3 flex justify-end">
          <Button variant="secondary" onClick={onClose} className="text-xs">
            Cerrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default CategoriasModal;
