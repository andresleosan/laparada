import { useEffect, useId, useMemo, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ChefHat,
  Clock,
  Layers,
  Plus,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createToast } from '@/components/ui/Toast';
import type {
  CategoriaSubReceta,
  GuardarSubRecetaInput,
  Insumo,
  InsumoReceta,
  MovimientoKardex,
  PlantillaSubRecetaSugerida,
} from '@/types';
import { parseFiniteNumber } from '@/utils/adminInputValidation';
import { formatCOP } from '@/utils/formatCOP';
import { calcularCostoReceta, construirMapaCostosInsumos } from '@/utils/ingenieriaMenuUtils';
import {
  CATEGORIAS_SUB_RECETA,
  PLANTILLAS_SUB_RECETAS_LA_PARADA,
  validarConfiguracionSubReceta,
} from '@/utils/produccionCocinaUtils';

export interface SubRecetaFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  insumosPrimarios: Insumo[];
  movimientosKardex?: MovimientoKardex[];
  initialSubReceta?: Insumo | null;
  onGuardar: (data: GuardarSubRecetaInput) => Promise<unknown>;
  onSuccess?: () => void;
}

const UNIDADES_SALIDA = ['litros', 'kg', 'gramos', 'porciones', 'unidades'];

export function SubRecetaFormModal({
  isOpen,
  onClose,
  insumosPrimarios,
  movimientosKardex = [],
  initialSubReceta = null,
  onGuardar,
  onSuccess,
}: SubRecetaFormModalProps) {
  const generatedId = useId();
  const titleId = `sub-receta-modal-${generatedId.replace(/:/g, '')}-title`;

  const [nombre, setNombre] = useState('');
  const [categoriaSubReceta, setCategoriaSubReceta] = useState<CategoriaSubReceta>('salsas_casa');
  const [unidad, setUnidad] = useState('litros');
  const [rendimientoLoteStr, setRendimientoLoteStr] = useState('5');
  const [stockMinimoStr, setStockMinimoStr] = useState('2');
  const [stockInicialStr, setStockInicialStr] = useState('0');
  const [tiempoPrepStr, setTiempoPrepStr] = useState('30');
  const [vidaUtilStr, setVidaUtilStr] = useState('48');
  const [instrucciones, setInstrucciones] = useState('');
  const [recetaInsumos, setRecetaInsumos] = useState<InsumoReceta[]>([]);

  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [cantidadIngStr, setCantidadIngStr] = useState('1');
  const [plantillaHint, setPlantillaHint] = useState<string | null>(null);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrorForm(null);
    setPlantillaHint(null);
    setSelectedInsumoId('');
    setCantidadIngStr('1');

    if (initialSubReceta) {
      setNombre(initialSubReceta.nombre || '');
      setCategoriaSubReceta(initialSubReceta.categoriaSubReceta || 'salsas_casa');
      setUnidad(initialSubReceta.unidad || 'litros');
      setRendimientoLoteStr(String(initialSubReceta.rendimientoLote ?? 1));
      setStockMinimoStr(String(initialSubReceta.stockMinimo ?? 1));
      setStockInicialStr(String(initialSubReceta.stockActual ?? 0));
      setTiempoPrepStr(
        initialSubReceta.tiempoPreparacionMin ? String(initialSubReceta.tiempoPreparacionMin) : '30'
      );
      setVidaUtilStr(
        initialSubReceta.vidaUtilHoras ? String(initialSubReceta.vidaUtilHoras) : '48'
      );
      setInstrucciones(initialSubReceta.instruccionesPreparacion || '');
      setRecetaInsumos(
        Array.isArray(initialSubReceta.recetaInsumos)
          ? initialSubReceta.recetaInsumos.map((r) => ({ ...r }))
          : []
      );
    } else {
      setNombre('');
      setCategoriaSubReceta('salsas_casa');
      setUnidad('litros');
      setRendimientoLoteStr('5');
      setStockMinimoStr('2');
      setStockInicialStr('0');
      setTiempoPrepStr('30');
      setVidaUtilStr('48');
      setInstrucciones('');
      setRecetaInsumos([]);
    }
  }, [isOpen, initialSubReceta]);

  const insumosDisponiblesParaAgregar = useMemo(
    () => insumosPrimarios.filter((ins) => ins.id !== initialSubReceta?.id),
    [insumosPrimarios, initialSubReceta?.id]
  );

  const selectedInsumo = useMemo(
    () => insumosDisponiblesParaAgregar.find((i) => i.id === selectedInsumoId) || null,
    [insumosDisponiblesParaAgregar, selectedInsumoId]
  );

  const previewCosteo = useMemo(() => {
    const mapInsumos = new Map(insumosPrimarios.map((i) => [i.id, i]));
    const costosMap = construirMapaCostosInsumos(insumosPrimarios, movimientosKardex);
    const res = calcularCostoReceta(recetaInsumos, mapInsumos, costosMap);
    const rendimiento = parseFiniteNumber(rendimientoLoteStr);
    const costoUnitarioEstimado =
      rendimiento && rendimiento > 0 && res.costoTotalCOP > 0
        ? Math.round(res.costoTotalCOP / rendimiento)
        : 0;

    return {
      costoLoteCOP: res.costoTotalCOP,
      costoUnitarioEstimado,
      costeoIncompleto: res.costeoIncompleto,
      insumosSinCosto: res.insumosSinCosto,
      subtotalPorId: new Map(res.desglose.map((d) => [d.insumoId, d.subtotalCostoCOP])),
    };
  }, [recetaInsumos, insumosPrimarios, movimientosKardex, rendimientoLoteStr]);

  if (!isOpen) return null;

  const handleAplicarPlantilla = (plantilla: PlantillaSubRecetaSugerida) => {
    setNombre(plantilla.nombre);
    setCategoriaSubReceta(plantilla.categoriaSubReceta);
    setUnidad(plantilla.unidad);
    setRendimientoLoteStr(String(plantilla.rendimientoLote));
    setStockMinimoStr(String(plantilla.stockMinimo));
    setTiempoPrepStr(String(plantilla.tiempoPreparacionMin));
    setVidaUtilStr(String(plantilla.vidaUtilHoras));
    setInstrucciones(plantilla.instruccionesPreparacion);

    const ingredientesVinculados: InsumoReceta[] = [];
    const faltantesSugeridos: string[] = [];

    for (const sug of plantilla.ingredientesSugeridos) {
      const clave = sug.nombreSugerido.toLowerCase().split(' ')[0];
      const match = insumosDisponiblesParaAgregar.find(
        (ins) =>
          ins.nombre.toLowerCase().includes(sug.nombreSugerido.toLowerCase()) ||
          ins.nombre.toLowerCase().includes(clave)
      );
      if (match && !ingredientesVinculados.some((v) => v.insumoId === match.id)) {
        ingredientesVinculados.push({
          insumoId: match.id,
          nombreSnapshot: match.nombre,
          cantidad: sug.cantidad,
          unidadSnapshot: match.unidad || sug.unidad,
        });
      } else {
        faltantesSugeridos.push(`${sug.nombreSugerido} (${sug.cantidad} ${sug.unidad})`);
      }
    }

    setRecetaInsumos(ingredientesVinculados);
    if (faltantesSugeridos.length > 0) {
      setPlantillaHint(
        `Sugerencia de fórmula: vincula en bodega ${faltantesSugeridos.join(', ')}.`
      );
    } else {
      setPlantillaHint('Plantilla aplicada con ingredientes de bodega vinculados.');
    }
    setErrorForm(null);
  };

  const handleAgregarIngrediente = () => {
    if (!selectedInsumo) {
      setErrorForm('Selecciona un insumo primario de bodega para añadir a la fórmula.');
      return;
    }
    const cant = parseFiniteNumber(cantidadIngStr);
    if (cant === null || cant <= 0) {
      setErrorForm('La cantidad por lote debe ser mayor a 0.');
      return;
    }

    const yaExiste = recetaInsumos.some((r) => r.insumoId === selectedInsumo.id);
    if (yaExiste) {
      setRecetaInsumos((prev) =>
        prev.map((r) =>
          r.insumoId === selectedInsumo.id
            ? { ...r, cantidad: Number((r.cantidad + cant).toFixed(4)) }
            : r
        )
      );
    } else {
      setRecetaInsumos((prev) => [
        ...prev,
        {
          insumoId: selectedInsumo.id,
          nombreSnapshot: selectedInsumo.nombre,
          cantidad: Number(cant.toFixed(4)),
          unidadSnapshot: selectedInsumo.unidad || 'unid',
        },
      ]);
    }

    setSelectedInsumoId('');
    setCantidadIngStr('1');
    setErrorForm(null);
  };

  const handleActualizarCantidadIng = (insumoId: string, valorStr: string) => {
    const val = parseFiniteNumber(valorStr);
    if (val === null || val <= 0) return;
    setRecetaInsumos((prev) =>
      prev.map((r) => (r.insumoId === insumoId ? { ...r, cantidad: Number(val.toFixed(4)) } : r))
    );
  };

  const handleEliminarIng = (insumoId: string) => {
    setRecetaInsumos((prev) => prev.filter((r) => r.insumoId !== insumoId));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const rendimiento = parseFiniteNumber(rendimientoLoteStr) ?? 0;
    const stockMinimo = parseFiniteNumber(stockMinimoStr) ?? 0;
    const stockActual = parseFiniteNumber(stockInicialStr) ?? 0;
    const tiempoPrep = parseFiniteNumber(tiempoPrepStr) ?? undefined;
    const vidaUtil = parseFiniteNumber(vidaUtilStr) ?? undefined;

    const payload: GuardarSubRecetaInput = {
      ...(initialSubReceta?.id ? { id: initialSubReceta.id } : {}),
      nombre: nombre.trim(),
      categoriaSubReceta,
      unidad: unidad.trim(),
      rendimientoLote: rendimiento,
      stockMinimo,
      ...(!initialSubReceta ? { stockActual } : {}),
      recetaInsumos,
      instruccionesPreparacion: instrucciones.trim() || undefined,
      tiempoPreparacionMin: tiempoPrep && tiempoPrep > 0 ? Math.round(tiempoPrep) : undefined,
      vidaUtilHoras: vidaUtil && vidaUtil > 0 ? Math.round(vidaUtil) : undefined,
      costoUnitario:
        previewCosteo.costoUnitarioEstimado > 0 ? previewCosteo.costoUnitarioEstimado : undefined,
    };

    const validacion = validarConfiguracionSubReceta(payload);
    if (!validacion.valida) {
      setErrorForm(validacion.errores[0]);
      return;
    }

    setGuardando(true);
    setErrorForm(null);
    try {
      await onGuardar(payload);
      createToast(
        initialSubReceta
          ? 'Preparación base actualizada correctamente'
          : 'Preparación base creada en bodega',
        'success'
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'No pudimos guardar la sub-receta';
      setErrorForm(msg);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={() => {
        if (!guardando) onClose();
      }}
      onBackdropClick={() => {
        if (!guardando) onClose();
      }}
      canClose={!guardando}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm overflow-y-auto"
    >
      <div className="my-auto w-full max-w-3xl rounded-2xl border border-neutral-800 bg-[#0A0A0A] text-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-900/90 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#C9A84C]/40 bg-[#C9A84C]/15 text-[#E5C158]">
              <ChefHat className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-white">
                {initialSubReceta
                  ? `Editar Sub-Receta: ${initialSubReceta.nombre}`
                  : 'Nueva Sub-Receta / Preparación Base'}
              </h2>
              <p className="text-xs text-neutral-400">
                Define qué insumos primarios se convierten en un lote preparado listo para escandallo
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar modal de sub-receta"
            className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[82vh] overflow-y-auto p-5 space-y-5">
          {/* Plantillas rápidas (solo al crear) */}
          {!initialSubReceta && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3.5 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#E5C158]">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>Plantillas rápidas de cocina La Parada</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PLANTILLAS_SUB_RECETAS_LA_PARADA.map((plantilla) => (
                  <button
                    key={plantilla.id}
                    type="button"
                    onClick={() => handleAplicarPlantilla(plantilla)}
                    className="min-h-[44px] flex items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 text-left text-xs hover:border-[#C9A84C]/60 hover:bg-neutral-900 transition-colors"
                  >
                    <span className="font-semibold text-neutral-100 truncate">
                      {plantilla.nombre}
                    </span>
                    <span className="shrink-0 rounded bg-[#C9A84C]/15 px-2 py-0.5 text-[10px] font-bold text-[#E5C158]">
                      {plantilla.rendimientoLote} {plantilla.unidad}
                    </span>
                  </button>
                ))}
              </div>
              {plantillaHint && (
                <p className="text-[11px] text-amber-300 leading-relaxed">{plantillaHint}</p>
              )}
            </div>
          )}

          {/* Datos principales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nombre de la Preparación Base *"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Salsa de Ajo de la Casa"
              required
            />

            <div className="space-y-2">
              <label
                htmlFor="subreceta-categoria"
                className="block text-sm font-medium text-neutral-50"
              >
                Categoría de Cocina
              </label>
              <select
                id="subreceta-categoria"
                value={categoriaSubReceta}
                onChange={(e) => setCategoriaSubReceta(e.target.value as CategoriaSubReceta)}
                className="w-full min-h-[48px] rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:ring-2 focus:ring-gold-400"
              >
                {CATEGORIAS_SUB_RECETA.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.emoji} {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Rendimiento, Unidad y Alertas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Input
              label="Rendimiento por Lote *"
              type="number"
              step="any"
              min="0.01"
              value={rendimientoLoteStr}
              onChange={(e) => setRendimientoLoteStr(e.target.value)}
              placeholder="5"
              required
            />

            <div className="space-y-2">
              <label
                htmlFor="subreceta-unidad"
                className="block text-sm font-medium text-neutral-50"
              >
                Unidad Salida *
              </label>
              <select
                id="subreceta-unidad"
                value={UNIDADES_SALIDA.includes(unidad) ? unidad : 'otro'}
                onChange={(e) => {
                  if (e.target.value !== 'otro') setUnidad(e.target.value);
                }}
                className="w-full min-h-[48px] rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-50 focus:outline-none focus:ring-2 focus:ring-gold-400"
              >
                {UNIDADES_SALIDA.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Alerta Mínima"
              type="number"
              step="any"
              min="0"
              value={stockMinimoStr}
              onChange={(e) => setStockMinimoStr(e.target.value)}
              placeholder="2"
            />

            {!initialSubReceta ? (
              <Input
                label="Stock Inicial"
                type="number"
                step="any"
                min="0"
                value={stockInicialStr}
                onChange={(e) => setStockInicialStr(e.target.value)}
                placeholder="0"
              />
            ) : (
              <div className="space-y-2">
                <span className="block text-sm font-medium text-neutral-50">Stock Actual</span>
                <div className="flex min-h-[48px] items-center rounded-lg border border-neutral-800 bg-neutral-900 px-3 text-sm font-bold text-gold-400">
                  {initialSubReceta.stockActual} {unidad}
                </div>
              </div>
            )}
          </div>

          {/* Tiempos e Instrucciones */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Tiempo Prep. (min)"
              type="number"
              min="1"
              value={tiempoPrepStr}
              onChange={(e) => setTiempoPrepStr(e.target.value)}
              placeholder="30"
            />
            <Input
              label="Vida Útil (horas)"
              type="number"
              min="1"
              value={vidaUtilStr}
              onChange={(e) => setVidaUtilStr(e.target.value)}
              placeholder="48"
            />
            <div className="space-y-2">
              <span className="block text-sm font-medium text-neutral-50">Costo Est. por {unidad}</span>
              <div className="flex min-h-[48px] items-center gap-2 rounded-lg border border-[#C9A84C]/30 bg-[#C9A84C]/10 px-3 text-sm font-mono font-bold text-[#E5C158]">
                <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>
                  {previewCosteo.costoUnitarioEstimado > 0
                    ? `${formatCOP(previewCosteo.costoUnitarioEstimado)} / ${unidad}`
                    : 'Pendiente de costo'}
                </span>
              </div>
            </div>
          </div>

          {/* Fórmula de Insumos Primarios */}
          <div className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-[#C9A84C]" aria-hidden="true" />
                <h3 className="text-sm font-bold text-white">
                  Insumos Primarios por 1 Lote ({rendimientoLoteStr || '1'} {unidad})
                </h3>
              </div>
              {previewCosteo.costoLoteCOP > 0 && (
                <span className="rounded-full border border-[#C9A84C]/40 bg-[#C9A84C]/15 px-3 py-1 text-xs font-mono font-bold text-[#E5C158]">
                  Costo Lote: {formatCOP(previewCosteo.costoLoteCOP)}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-7 space-y-1.5">
                <label
                  htmlFor="select-insumo-primario-subreceta"
                  className="block text-xs font-medium text-neutral-300"
                >
                  Insumo Primario en Bodega
                </label>
                <select
                  id="select-insumo-primario-subreceta"
                  value={selectedInsumoId}
                  onChange={(e) => {
                    setSelectedInsumoId(e.target.value);
                    setErrorForm(null);
                  }}
                  disabled={insumosDisponiblesParaAgregar.length === 0}
                  className="w-full min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm text-neutral-100 focus:border-[#C9A84C] focus:outline-none"
                >
                  <option value="">
                    {insumosDisponiblesParaAgregar.length === 0
                      ? 'Crea insumos primarios primero'
                      : '-- Seleccionar insumo primario --'}
                  </option>
                  {insumosDisponiblesParaAgregar.map((ins) => (
                    <option key={ins.id} value={ins.id}>
                      {ins.nombre} ({ins.stockActual} {ins.unidad})
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-3">
                <Input
                  label={`Cant. (${selectedInsumo?.unidad || 'unid'})`}
                  type="number"
                  step="any"
                  min="0.001"
                  value={cantidadIngStr}
                  onChange={(e) => setCantidadIngStr(e.target.value)}
                  disabled={!selectedInsumoId}
                  className="min-h-[44px] py-2"
                />
              </div>

              <div className="sm:col-span-2 flex items-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAgregarIngrediente}
                  disabled={!selectedInsumoId}
                  className="w-full min-h-[44px] border border-[#C9A84C]/40 text-[#E5C158] hover:bg-[#C9A84C]/15"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Añadir</span>
                </Button>
              </div>
            </div>

            {recetaInsumos.length === 0 ? (
              <div className="rounded-lg border border-dashed border-neutral-800 p-4 text-center text-xs text-neutral-400">
                Agrega los insumos primarios que consume 1 tanda de preparación.
              </div>
            ) : (
              <ul className="divide-y divide-neutral-800 rounded-lg border border-neutral-800 bg-neutral-950/70">
                {recetaInsumos.map((ing) => {
                  const live = insumosPrimarios.find((i) => i.id === ing.insumoId);
                  const subtotal = previewCosteo.subtotalPorId.get(ing.insumoId) ?? 0;
                  return (
                    <li
                      key={ing.insumoId}
                      className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white truncate">
                          {live?.nombre || ing.nombreSnapshot}
                        </p>
                        <p className="text-xs text-neutral-400">
                          En bodega: {live?.stockActual ?? 0} {live?.unidad || ing.unidadSnapshot}
                          {subtotal > 0 && (
                            <span className="ml-2 font-mono text-[#E5C158]">
                              · {formatCOP(subtotal)} / lote
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="any"
                          min="0.001"
                          aria-label={`Cantidad por lote de ${ing.nombreSnapshot}`}
                          value={ing.cantidad}
                          onChange={(e) => handleActualizarCantidadIng(ing.insumoId, e.target.value)}
                          className="w-24 min-h-[44px] rounded-lg border border-neutral-700 bg-neutral-900 px-2.5 py-1.5 text-right text-sm font-mono text-white focus:border-[#C9A84C] focus:outline-none"
                        />
                        <span className="text-xs text-neutral-400 w-14 truncate">
                          {live?.unidad || ing.unidadSnapshot}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleEliminarIng(ing.insumoId)}
                          aria-label={`Quitar ${ing.nombreSnapshot} de la fórmula`}
                          className="grid h-11 w-11 place-items-center rounded-lg text-neutral-400 hover:bg-red-950/40 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {previewCosteo.costeoIncompleto && (
              <p className="text-[11px] text-amber-300">
                Faltan costos en bodega/Kardex para: {previewCosteo.insumosSinCosto.join(', ')}.
              </p>
            )}
          </div>

          {/* Procedimiento de cocina */}
          <div className="space-y-2">
            <label
              htmlFor="subreceta-instrucciones"
              className="block text-sm font-medium text-neutral-50"
            >
              Procedimiento Estandarizado de Cocina (Opcional)
            </label>
            <textarea
              id="subreceta-instrucciones"
              rows={2}
              value={instrucciones}
              onChange={(e) => setInstrucciones(e.target.value)}
              placeholder="Ej: Cocinar a fuego lento 40 min, enfriar en abatidor y empacar en porciones de 500 g."
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2.5 text-sm text-neutral-50 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-gold-400"
            />
          </div>

          {errorForm && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-950/40 px-3.5 py-2.5 text-xs text-red-300"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorForm}</span>
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 border-t border-neutral-800 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={guardando}
              className="min-h-[44px]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={guardando}
              disabled={guardando}
              className="min-h-[44px] font-bold"
            >
              <ChefHat className="h-4 w-4" aria-hidden="true" />
              <span>
                {initialSubReceta ? 'Actualizar Sub-Receta' : 'Guardar Sub-Receta'}
              </span>
            </Button>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
