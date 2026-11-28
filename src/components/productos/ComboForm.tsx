import { useEffect, useState } from 'react';
import {
  Combo,
  ComboItem,
  Control86Item,
  EspecialDelDiaConfig,
  GrupoEleccionCombo,
  Insumo,
  InsumoReceta,
  MovimientoKardex,
  Producto,
  type EstacionCocina,
} from '../../types';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Button } from '../ui/Button';
import { FormModal } from './FormModal';
import { CheckCircle2, Heart, Image as ImageIcon, Layers3, Tag, Trash2, X } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { ImageUploadModal } from './ImageUploadModal';
import { useCategorias } from '@/hooks/useCategorias';
import { useNegocio } from '@/context/NegocioContext';
import { useInventario } from '@/hooks/useInventario';
import { RecetaEditor } from './RecetaEditor';
import { RecetaEmpaqueEditor } from './RecetaEmpaqueEditor';
import { GruposEleccionComboEditor } from './GruposEleccionComboEditor';
import { EstacionTiempoSelector } from './EstacionTiempoSelector';
import { AlergenosDietaSelector } from './AlergenosDietaSelector';
import { EspecialDelDiaEditor } from '@/components/control86/EspecialDelDiaEditor';
import {
  sanitizarControl86,
  sanitizarEspecialDelDia,
} from '@/utils/control86Utils';
import { parseFiniteNumber, validatePositiveAmount } from '@/utils/adminInputValidation';
import { sanitizarGruposEleccionParaFirestore } from '@/utils/combosPersonalizablesUtils';
import { sanitizarTiempoPreparacion } from '@/utils/estacionesCocinaUtils';
import {
  construirPayloadPerfilDietetico,
  perfilFormDesdeFuente,
} from '@/utils/alergenosUtils';

export interface ComboFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Combo, 'id' | 'negocioId'>) => Promise<void>;
  initialData?: Combo;
  loading?: boolean;
  productos?: Producto[];
  insumos?: Insumo[];
  movimientosKardex?: MovimientoKardex[];
}

export const ComboForm: React.FC<ComboFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading = false,
  productos = [],
  insumos: insumosProp,
  movimientosKardex = [],
}) => {
  const { negocioActual } = useNegocio();
  const { categorias } = useCategorias();
  const { insumos: insumosHook } = useInventario();
  const insumos = insumosProp || insumosHook;

  const [nombre, setNombre] = useState(initialData?.nombre || '');
  const [descripcion, setDescripcion] = useState(initialData?.descripcion || '');
  const [categoria, setCategoria] = useState(initialData?.categoria || 'Combos');
  const [precioStr, setPrecioStr] = useState(
    initialData?.precioEspecial ? initialData.precioEspecial.toString() : ''
  );
  const [costoReferenciaStr, setCostoReferenciaStr] = useState(
    typeof initialData?.costoReferencia === 'number' && initialData.costoReferencia > 0
      ? initialData.costoReferencia.toString()
      : ''
  );
  const [disponible, setDisponible] = useState(initialData?.disponible !== false);
  const [destacado, setDestacado] = useState(Boolean(initialData?.destacado));
  const [imagenUrl, setImagenUrl] = useState(initialData?.imagenUrl || '');
  const [receta, setReceta] = useState<InsumoReceta[]>(initialData?.receta || []);
  const [recetaEmpaque, setRecetaEmpaque] = useState<InsumoReceta[]>(
    initialData?.recetaEmpaque || []
  );
  const [esPersonalizable, setEsPersonalizable] = useState(
    Boolean(initialData?.esPersonalizable)
  );
  const [gruposEleccion, setGruposEleccion] = useState<GrupoEleccionCombo[]>(
    initialData?.gruposEleccion || []
  );
  const [estacionCocina, setEstacionCocina] = useState<EstacionCocina | undefined>(
    initialData?.estacionCocina
  );
  const [tiempoPreparacionStr, setTiempoPreparacionStr] = useState(
    typeof initialData?.tiempoPreparacionMin === 'number' && initialData.tiempoPreparacionMin > 0
      ? initialData.tiempoPreparacionMin.toString()
      : ''
  );
  const [perfilDietetico, setPerfilDietetico] = useState(() =>
    perfilFormDesdeFuente(initialData)
  );
  const [control86, setControl86] = useState<Control86Item>(() =>
    sanitizarControl86(initialData?.control86)
  );
  const [especialDelDia, setEspecialDelDia] = useState<EspecialDelDiaConfig>(() =>
    sanitizarEspecialDelDia(initialData?.especialDelDia)
  );
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [items, setItems] = useState<ComboItem[]>(initialData?.items || []);
  const [selectedProductoId, setSelectedProductoId] = useState('');
  const [newItemNombre, setNewItemNombre] = useState('');
  const [newItemCantidad, setNewItemCantidad] = useState('1');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setNombre(initialData?.nombre || '');
    setDescripcion(initialData?.descripcion || '');
    setCategoria(initialData?.categoria || 'Combos');
    setPrecioStr(initialData?.precioEspecial?.toString() || '');
    setCostoReferenciaStr(
      typeof initialData?.costoReferencia === 'number' && initialData.costoReferencia > 0
        ? initialData.costoReferencia.toString()
        : ''
    );
    setDisponible(initialData?.disponible !== false);
    setDestacado(Boolean(initialData?.destacado));
    setImagenUrl(initialData?.imagenUrl || '');
    setItems(initialData?.items || []);
    setReceta(initialData?.receta || []);
    setRecetaEmpaque(initialData?.recetaEmpaque || []);
    setEsPersonalizable(Boolean(initialData?.esPersonalizable));
    setGruposEleccion(initialData?.gruposEleccion || []);
    setEstacionCocina(initialData?.estacionCocina);
    setTiempoPreparacionStr(
      typeof initialData?.tiempoPreparacionMin === 'number' && initialData.tiempoPreparacionMin > 0
        ? initialData.tiempoPreparacionMin.toString()
        : ''
    );
    setPerfilDietetico(perfilFormDesdeFuente(initialData));
    setControl86(sanitizarControl86(initialData?.control86));
    setEspecialDelDia(sanitizarEspecialDelDia(initialData?.especialDelDia));
    setSelectedProductoId('');
    setNewItemNombre('');
    setNewItemCantidad('1');
    setErrors({});
  }, [initialData, isOpen]);

  const handleAddItem = () => {
    const matchedProduct = productos.find(
      (p) => p.id === selectedProductoId || p.nombre.toLowerCase().trim() === newItemNombre.toLowerCase().trim()
    );
    const resolvedName = matchedProduct ? matchedProduct.nombre : newItemNombre.trim();
    if (!resolvedName) {
      setErrors({ ...errors, item: 'Nombre del item es requerido' });
      return;
    }
    const cantidad = parseFiniteNumber(newItemCantidad);
    if (cantidad === null || cantidad <= 0 || !Number.isInteger(cantidad)) {
      setErrors({ ...errors, item: 'La cantidad debe ser un entero mayor a 0' });
      return;
    }
    const newItem: ComboItem = {
      productoId: matchedProduct?.id || `temp_${Date.now()}`,
      cantidad,
      nombreSnapshot: resolvedName,
    };
    setItems([...items, newItem]);
    setSelectedProductoId('');
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
    const precioError = validatePositiveAmount(precioStr);
    if (precioError) newErrors.precio = precioError;
    if (!esPersonalizable && items.length === 0) {
      newErrors.items = 'El combo debe tener al menos 1 item';
    } else if (esPersonalizable && items.length === 0 && gruposEleccion.length === 0) {
      newErrors.items = 'Agrega ítems fijos o al menos 1 grupo de elección';
    }
    if (esPersonalizable) {
      if (gruposEleccion.length === 0) {
        newErrors.gruposEleccion = 'Agrega al menos 1 grupo de elección o desactiva Arma tu Combo';
      } else if (gruposEleccion.some((g) => !g.nombre.trim() || g.opciones.length === 0)) {
        newErrors.gruposEleccion = 'Cada grupo de elección debe tener nombre y al menos 1 opción';
      }
    }
    const costoRefParsed = costoReferenciaStr.trim()
      ? parseFiniteNumber(costoReferenciaStr)
      : null;
    if (costoReferenciaStr.trim() && (costoRefParsed === null || costoRefParsed < 0)) {
      newErrors.costoReferencia = 'El costo de referencia debe ser un número mayor o igual a 0';
    }
    const tiempoPrepParsed = tiempoPreparacionStr.trim()
      ? sanitizarTiempoPreparacion(tiempoPreparacionStr)
      : undefined;
    if (tiempoPreparacionStr.trim() && tiempoPrepParsed === undefined) {
      newErrors.tiempoPreparacion = 'El tiempo objetivo debe estar entre 1 y 180 minutos';
    }
    const perfilRes = construirPayloadPerfilDietetico(
      perfilDietetico,
      Boolean(initialData?.infoNutricional)
    );
    if (perfilRes.error) {
      newErrors.perfilDietetico = perfilRes.error;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      const precioEspecial = parseFiniteNumber(precioStr) as number;
      const calculatedPrecioTotal = items.reduce((acc, item) => {
        const prod = productos.find(
          (p) => p.id === item.productoId || p.nombre.toLowerCase().trim() === item.nombreSnapshot.toLowerCase().trim()
        );
        return acc + (prod && Number.isFinite(prod.precio) ? prod.precio * item.cantidad : 0);
      }, 0);
      const now = Timestamp.now();
      const costoRefFinal =
        costoRefParsed !== null
          ? Math.round(costoRefParsed)
          : typeof initialData?.costoReferencia === 'number'
            ? 0
            : undefined;
      const gruposLimpios = esPersonalizable
        ? sanitizarGruposEleccionParaFirestore(gruposEleccion)
        : [];
      const incluirControl86 =
        control86.contadorActivo || control86.agotado86 || Boolean(initialData?.control86);
      const incluirEspecial =
        especialDelDia.activo || Boolean(initialData?.especialDelDia);
      const control86Limpio = sanitizarControl86({
        ...control86,
        agotado86: !disponible ? true : control86.agotado86,
      });
      const data: Omit<Combo, 'id' | 'negocioId'> = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        categoria: categoria.trim() || 'Combos',
        precioEspecial,
        ...(costoRefFinal !== undefined ? { costoReferencia: costoRefFinal } : {}),
        ...(calculatedPrecioTotal > precioEspecial
          ? { precioTotal: calculatedPrecioTotal }
          : initialData?.precioTotal && initialData.precioTotal > precioEspecial
            ? { precioTotal: initialData.precioTotal }
            : {}),
        items,
        receta: receta.length > 0 ? receta : undefined,
        recetaEmpaque: recetaEmpaque.length > 0 ? recetaEmpaque : undefined,
        esPersonalizable: esPersonalizable && gruposLimpios.length > 0,
        ...(esPersonalizable && gruposLimpios.length > 0
          ? { gruposEleccion: gruposLimpios }
          : initialData?.gruposEleccion
            ? { gruposEleccion: [] }
            : {}),
        disponible:
          control86Limpio.contadorActivo &&
          (control86Limpio.porcionesDisponibles ?? 0) <= 0 &&
          control86Limpio.auto86AlLlegarACero !== false
            ? false
            : disponible,
        destacado,
        imagenUrl: imagenUrl || undefined,
        ...(estacionCocina ? { estacionCocina } : {}),
        ...(tiempoPrepParsed !== undefined ? { tiempoPreparacionMin: tiempoPrepParsed } : {}),
        ...(perfilRes.payload ?? {}),
        ...(incluirControl86 ? { control86: control86Limpio } : {}),
        ...(incluirEspecial ? { especialDelDia: sanitizarEspecialDelDia(especialDelDia) } : {}),
        creadoEn: initialData?.creadoEn || now,
        actualizadoEn: now,
      };
      await onSubmit(data);
      // Limpiar form
      setNombre('');
      setDescripcion('');
      setCategoria('Combos');
      setPrecioStr('');
      setCostoReferenciaStr('');
      setImagenUrl('');
      setReceta([]);
      setRecetaEmpaque([]);
      setEsPersonalizable(false);
      setGruposEleccion([]);
      setEstacionCocina(undefined);
      setTiempoPreparacionStr('');
      setPerfilDietetico(perfilFormDesdeFuente());
      setControl86(sanitizarControl86());
      setEspecialDelDia(sanitizarEspecialDelDia());
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

      {/* Selector de Categoría */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
          <Tag size={14} className="text-amber-400" />
          Categoría del Combo
        </label>
        
        {/* Sugerencias Dinámicas de Categorías */}
        <div className="flex flex-wrap gap-1.5 pb-1 max-h-24 overflow-y-auto">
          <button
            type="button"
            onClick={() => setCategoria('Combos')}
            aria-pressed={categoria.toLowerCase().trim() === 'combos'}
            className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
              categoria.toLowerCase().trim() === 'combos'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-xs'
                : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
            }`}
          >
            <Layers3 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Combos</span>
          </button>
          {categorias.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategoria(cat.nombre)}
              aria-pressed={categoria.toLowerCase().trim() === cat.nombre.toLowerCase().trim()}
              className={`text-[11px] px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1 ${
                categoria.toLowerCase().trim() === cat.nombre.toLowerCase().trim()
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-xs'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
              }`}
            >
              {cat.icono ? (
                <span aria-hidden="true">{cat.icono}</span>
              ) : (
                <Tag className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              <span>{cat.nombre}</span>
            </button>
          ))}
        </div>

        <Input
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          placeholder="Escribe o selecciona una categoría (ej: Combos, Especiales...)"
        />
      </div>

      <Textarea
        label="Descripción"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Ej: 2 Perros + 1 Salchipapa + 2 Bebidas"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Precio en pesos (COP) *"
          type="number"
          min="1"
          step="500"
          value={precioStr}
          onChange={(e) => {
            setPrecioStr(e.target.value);
            if (errors.precio) setErrors({ ...errors, precio: '' });
          }}
          placeholder="Ej: 38000"
          error={errors.precio}
        />

        <Input
          label="Costo directo ref. (COP)"
          type="number"
          min="0"
          step="100"
          value={costoReferenciaStr}
          onChange={(e) => {
            setCostoReferenciaStr(e.target.value);
            if (errors.costoReferencia) setErrors({ ...errors, costoReferencia: '' });
          }}
          placeholder="Opcional si no usas receta"
          error={errors.costoReferencia}
        />
      </div>

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
              className="absolute right-2 top-2 grid h-11 w-11 place-items-center rounded-full bg-red-600 text-white shadow-lg transition-colors hover:bg-red-700"
              aria-label={`Quitar foto de ${nombre || 'combo'}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
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
          {imagenUrl ? 'Cambiar foto' : 'Cargar o tomar foto'}
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
        {productos.length > 0 && (
          <select
            value={selectedProductoId}
            onChange={(e) => {
              const id = e.target.value;
              setSelectedProductoId(id);
              const prod = productos.find((p) => p.id === id);
              if (prod) {
                setNewItemNombre(prod.nombre);
              }
            }}
            aria-label="Seleccionar producto del catálogo para el combo"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-neutral-200 focus:border-amber-500 focus:outline-none"
          >
            <option value="">Seleccionar producto del catálogo (o escribir abajo)...</option>
            {productos.map((prod) => (
              <option key={prod.id} value={prod.id}>
                {prod.nombre} (${prod.precio.toLocaleString('es-CO')})
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2 pt-1">
          <Input
            value={newItemNombre}
            onChange={(e) => {
              setNewItemNombre(e.target.value);
              setSelectedProductoId('');
            }}
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

      <GruposEleccionComboEditor
        esPersonalizable={esPersonalizable}
        onTogglePersonalizable={(activo) => {
          setEsPersonalizable(activo);
          if (errors.gruposEleccion) setErrors({ ...errors, gruposEleccion: '' });
        }}
        grupos={gruposEleccion}
        onChangeGrupos={(nuevosGrupos) => {
          setGruposEleccion(nuevosGrupos);
          if (errors.gruposEleccion) setErrors({ ...errors, gruposEleccion: '' });
        }}
        productos={productos}
        insumos={insumos}
        disabled={loading}
      />
      {errors.gruposEleccion && (
        <p className="text-xs text-red-400">{errors.gruposEleccion}</p>
      )}

      <RecetaEditor
        receta={receta}
        onChange={setReceta}
        insumos={insumos}
        disabled={loading}
        precioVenta={parseFiniteNumber(precioStr) ?? undefined}
        movimientosKardex={movimientosKardex}
        costoReferencia={parseFiniteNumber(costoReferenciaStr) ?? undefined}
        onAplicarPrecioSugerido={(nuevoPrecio) => {
          setPrecioStr(String(nuevoPrecio));
          if (errors.precio) setErrors({ ...errors, precio: '' });
        }}
      />

      <EstacionTiempoSelector
        estacionCocina={estacionCocina}
        onEstacionChange={setEstacionCocina}
        tiempoPreparacionStr={tiempoPreparacionStr}
        onTiempoChange={(val) => {
          setTiempoPreparacionStr(val);
          if (errors.tiempoPreparacion) setErrors({ ...errors, tiempoPreparacion: '' });
        }}
        errorTiempo={errors.tiempoPreparacion}
      />

      <AlergenosDietaSelector
        esCombo
        valor={perfilDietetico}
        onChange={(v) => {
          setPerfilDietetico(v);
          if (errors.perfilDietetico) setErrors({ ...errors, perfilDietetico: '' });
        }}
        error={errors.perfilDietetico}
      />

      <RecetaEmpaqueEditor
        recetaEmpaque={recetaEmpaque}
        onChange={setRecetaEmpaque}
        insumos={insumos}
        movimientosKardex={movimientosKardex}
        disabled={loading}
      />

      <EspecialDelDiaEditor
        control86={control86}
        onChangeControl86={setControl86}
        especialDelDia={especialDelDia}
        onChangeEspecialDelDia={setEspecialDelDia}
        disabled={loading}
      />

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
          <label htmlFor="disponible-combo" className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-neutral-300">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Disponible
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
          <label htmlFor="destacado-combo" className="flex cursor-pointer items-center gap-1 text-xs font-semibold text-amber-400">
            <Heart className="h-3.5 w-3.5" aria-hidden="true" /> Destacado en tienda
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
