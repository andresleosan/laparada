import { useState } from 'react';
import {
  CheckCircle2,
  ChefHat,
  Layers3,
  Package,
  Plus,
  Sparkles,
  Star,
  Trash2,
} from 'lucide-react';
import type {
  CategoriaGrupoEleccion,
  GrupoEleccionCombo,
  Insumo,
  InsumoReceta,
  OpcionEleccionCombo,
  Producto,
} from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCOP } from '@/utils/formatCOP';
import { parseFiniteNumber } from '@/utils/adminInputValidation';
import { crearGrupoDesdePlantilla } from '@/utils/combosPersonalizablesUtils';

export interface GruposEleccionComboEditorProps {
  esPersonalizable: boolean;
  onTogglePersonalizable: (activo: boolean) => void;
  grupos: GrupoEleccionCombo[];
  onChangeGrupos: (grupos: GrupoEleccionCombo[]) => void;
  productos: Producto[];
  insumos: Insumo[];
  disabled?: boolean;
}

interface DraftOpcionGrupo {
  nombre: string;
  productoId: string;
  insumoId: string;
  cantidadInsumo: string;
  recargoStr: string;
  error?: string;
}

const DEFAULT_DRAFT: DraftOpcionGrupo = {
  nombre: '',
  productoId: '',
  insumoId: '',
  cantidadInsumo: '0.03',
  recargoStr: '0',
};

const PLANTILLAS_RAPIDAS: Array<{
  categoria: CategoriaGrupoEleccion;
  etiqueta: string;
}> = [
  { categoria: 'bebida', etiqueta: '+ Bebida' },
  { categoria: 'acompanamiento', etiqueta: '+ Acompañamiento' },
  { categoria: 'salsa', etiqueta: '+ Salsas' },
  { categoria: 'otro', etiqueta: '+ Otro Grupo' },
];

export function GruposEleccionComboEditor({
  esPersonalizable,
  onTogglePersonalizable,
  grupos,
  onChangeGrupos,
  productos,
  insumos,
  disabled = false,
}: GruposEleccionComboEditorProps) {
  const [drafts, setDrafts] = useState<Record<string, DraftOpcionGrupo>>({});

  const getDraft = (grupoId: string): DraftOpcionGrupo => drafts[grupoId] || DEFAULT_DRAFT;

  const updateDraft = (grupoId: string, patch: Partial<DraftOpcionGrupo>) => {
    setDrafts((prev) => ({
      ...prev,
      [grupoId]: {
        ...(prev[grupoId] || DEFAULT_DRAFT),
        ...patch,
      },
    }));
  };

  const handleAgregarPlantilla = (categoria: CategoriaGrupoEleccion) => {
    const nuevoGrupo = crearGrupoDesdePlantilla(categoria, productos, insumos);
    if (!esPersonalizable) {
      onTogglePersonalizable(true);
    }
    onChangeGrupos([...grupos, nuevoGrupo]);
  };

  const handleActualizarGrupo = (grupoId: string, patch: Partial<GrupoEleccionCombo>) => {
    onChangeGrupos(
      grupos.map((g) => (g.id === grupoId ? { ...g, ...patch } : g))
    );
  };

  const handleEliminarGrupo = (grupoId: string) => {
    onChangeGrupos(grupos.filter((g) => g.id !== grupoId));
  };

  const handleAgregarOpcion = (grupoId: string) => {
    const draft = getDraft(grupoId);
    const nombreFinal = draft.nombre.trim();
    if (!nombreFinal) {
      updateDraft(grupoId, { error: 'Escribe el nombre de la opción o elige un producto' });
      return;
    }

    const recargoParsed = draft.recargoStr.trim() ? parseFiniteNumber(draft.recargoStr) : 0;
    if (recargoParsed === null || recargoParsed < 0) {
      updateDraft(grupoId, { error: 'El recargo debe ser mayor o igual a 0' });
      return;
    }

    let recetaExtra: InsumoReceta[] | undefined;
    if (draft.insumoId) {
      const insumoSel = insumos.find((i) => i.id === draft.insumoId);
      const cantInsumo = parseFiniteNumber(draft.cantidadInsumo);
      if (cantInsumo === null || cantInsumo <= 0) {
        updateDraft(grupoId, { error: 'La cantidad de insumo debe ser mayor a 0' });
        return;
      }
      if (insumoSel) {
        recetaExtra = [
          {
            insumoId: insumoSel.id,
            nombreSnapshot: insumoSel.nombre,
            cantidad: Number(cantInsumo.toFixed(4)),
            unidadSnapshot: insumoSel.unidad || 'unidades',
          },
        ];
      }
    }

    const nuevaOpcion: OpcionEleccionCombo = {
      id: `opc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      nombre: nombreFinal,
      recargoCOP: Math.round(recargoParsed),
      disponible: true,
      porDefecto: false,
      ...(draft.productoId ? { productoId: draft.productoId, cantidadProducto: 1 } : {}),
      ...(recetaExtra ? { recetaExtra } : {}),
    };

    onChangeGrupos(
      grupos.map((g) =>
        g.id === grupoId ? { ...g, opciones: [...g.opciones, nuevaOpcion] } : g
      )
    );
    setDrafts((prev) => ({ ...prev, [grupoId]: DEFAULT_DRAFT }));
  };

  const handleTogglePorDefecto = (grupoId: string, opcionId: string) => {
    onChangeGrupos(
      grupos.map((grupo) => {
        if (grupo.id !== grupoId) return grupo;
        const esUnica = (grupo.maxSelecciones || 1) <= 1;
        return {
          ...grupo,
          opciones: grupo.opciones.map((op) => {
            if (op.id === opcionId) {
              return { ...op, porDefecto: !op.porDefecto };
            }
            return esUnica ? { ...op, porDefecto: false } : op;
          }),
        };
      })
    );
  };

  const handleEliminarOpcion = (grupoId: string, opcionId: string) => {
    onChangeGrupos(
      grupos.map((g) =>
        g.id === grupoId
          ? { ...g, opciones: g.opciones.filter((op) => op.id !== opcionId) }
          : g
      )
    );
  };

  return (
    <div className="space-y-4 rounded-2xl border border-[#C9A84C]/30 bg-neutral-950/90 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[#C9A84C]" aria-hidden="true" />
          <div>
            <h4 className="text-sm font-bold text-white">
              Arma tu Combo (Grupos de Elección)
            </h4>
            <p className="text-xs text-neutral-400">
              Permite elegir bebida, acompañamiento o salsas descontando el escandallo real de cada opción.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() => onTogglePersonalizable(!esPersonalizable)}
          aria-pressed={esPersonalizable}
          className={`min-h-[44px] shrink-0 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
            esPersonalizable
              ? 'border-[#C9A84C] bg-[#C9A84C] text-neutral-950 shadow-md'
              : 'border-neutral-700 bg-neutral-900 text-neutral-300 hover:border-neutral-500'
          }`}
        >
          {esPersonalizable ? 'Personalizable: Activo' : 'Activar Arma tu Combo'}
        </button>
      </div>

      {/* Botones rápidos de plantillas */}
      <div className="space-y-1.5">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          Plantillas rápidas de grupos:
        </span>
        <div className="flex flex-wrap gap-2">
          {PLANTILLAS_RAPIDAS.map((tpl) => (
            <button
              key={tpl.categoria}
              type="button"
              disabled={disabled}
              onClick={() => handleAgregarPlantilla(tpl.categoria)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-amber-500/35 bg-neutral-900 px-3 py-2 text-xs font-bold text-amber-300 transition-colors hover:border-amber-400 hover:bg-amber-500/15 disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{tpl.etiqueta}</span>
            </button>
          ))}
        </div>
      </div>

      {esPersonalizable && grupos.length === 0 && (
        <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-950/15 p-3 text-center text-xs text-amber-200">
          Agrega al menos un grupo usando las plantillas de arriba (Bebida, Acompañamiento o Salsas).
        </div>
      )}

      {esPersonalizable && grupos.length > 0 && (
        <div className="space-y-4">
          {grupos.map((grupo, idx) => {
            const draft = getDraft(grupo.id);
            return (
              <section
                key={grupo.id}
                aria-label={`Grupo ${grupo.nombre}`}
                className="space-y-3 rounded-xl border border-neutral-800 bg-neutral-900/70 p-3.5"
              >
                {/* Cabecera del grupo */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 grid grid-cols-1 gap-2 sm:grid-cols-12">
                    <div className="sm:col-span-6">
                      <Input
                        label={`Grupo #${idx + 1}`}
                        value={grupo.nombre}
                        onChange={(e) =>
                          handleActualizarGrupo(grupo.id, { nombre: e.target.value })
                        }
                        disabled={disabled}
                        placeholder="Ej: Elige tu Bebida"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Input
                        label="Mín."
                        type="number"
                        min={grupo.obligatorio ? 1 : 0}
                        max={10}
                        value={String(grupo.minSelecciones)}
                        onChange={(e) => {
                          const minVal = Math.max(0, Math.round(Number(e.target.value) || 0));
                          handleActualizarGrupo(grupo.id, {
                            minSelecciones: grupo.obligatorio ? Math.max(1, minVal) : minVal,
                            maxSelecciones: Math.max(grupo.maxSelecciones, minVal || 1),
                          });
                        }}
                        disabled={disabled}
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <Input
                        label="Máx."
                        type="number"
                        min={1}
                        max={10}
                        value={String(grupo.maxSelecciones)}
                        onChange={(e) => {
                          const maxVal = Math.max(1, Math.round(Number(e.target.value) || 1));
                          handleActualizarGrupo(grupo.id, {
                            maxSelecciones: maxVal,
                            minSelecciones: Math.min(grupo.minSelecciones, maxVal),
                          });
                        }}
                        disabled={disabled}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEliminarGrupo(grupo.id)}
                    disabled={disabled}
                    aria-label={`Eliminar grupo ${grupo.nombre}`}
                    className="mt-6 grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 transition-colors hover:border-red-500/40 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                {/* Tipo obligatorio */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-xs font-semibold text-neutral-300">
                    <input
                      type="checkbox"
                      checked={grupo.obligatorio}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        handleActualizarGrupo(grupo.id, {
                          obligatorio: checked,
                          minSelecciones: checked ? Math.max(1, grupo.minSelecciones) : 0,
                        });
                      }}
                      disabled={disabled}
                      className="h-4 w-4 rounded border-neutral-600 bg-neutral-900 accent-amber-500"
                    />
                    <span>Elección obligatoria</span>
                  </label>

                  <span className="inline-flex items-center gap-1 rounded-full border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-[11px] text-neutral-400">
                    <Layers3 className="h-3 w-3 text-[#C9A84C]" aria-hidden="true" />
                    {grupo.opciones.length} {grupo.opciones.length === 1 ? 'opción' : 'opciones'}
                  </span>
                </div>

                {/* Lista de opciones del grupo */}
                {grupo.opciones.length > 0 && (
                  <ul className="space-y-1.5">
                    {grupo.opciones.map((opcion) => {
                      const prodVinculado = opcion.productoId
                        ? productos.find((p) => p.id === opcion.productoId)
                        : undefined;
                      return (
                        <li
                          key={opcion.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs"
                        >
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-white">{opcion.nombre}</span>
                              {opcion.recargoCOP > 0 ? (
                                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-300">
                                  +{formatCOP(opcion.recargoCOP)}
                                </span>
                              ) : (
                                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
                                  Incluido
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400">
                              {prodVinculado && (
                                <span className="inline-flex items-center gap-1 text-sky-300">
                                  <Package className="h-3 w-3" aria-hidden="true" />
                                  Producto: {prodVinculado.nombre}
                                </span>
                              )}
                              {opcion.recetaExtra && opcion.recetaExtra.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-[#C9A84C]">
                                  <ChefHat className="h-3 w-3" aria-hidden="true" />
                                  {opcion.recetaExtra
                                    .map((r) => `${r.cantidad} ${r.unidadSnapshot || ''} ${r.nombreSnapshot}`)
                                    .join(', ')}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleTogglePorDefecto(grupo.id, opcion.id)}
                              disabled={disabled}
                              aria-pressed={Boolean(opcion.porDefecto)}
                              aria-label={`Marcar ${opcion.nombre} como opción por defecto en ${grupo.nombre}`}
                              className={`inline-flex min-h-[44px] items-center gap-1 rounded-lg border px-2.5 text-[11px] font-semibold transition-colors ${
                                opcion.porDefecto
                                  ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                                  : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                              }`}
                            >
                              {opcion.porDefecto ? (
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              ) : (
                                <Star className="h-3.5 w-3.5" aria-hidden="true" />
                              )}
                              <span>Defecto</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEliminarOpcion(grupo.id, opcion.id)}
                              disabled={disabled}
                              aria-label={`Eliminar opción ${opcion.nombre} de ${grupo.nombre}`}
                              className="grid h-11 w-11 place-items-center rounded-lg border border-neutral-800 bg-neutral-900 text-neutral-400 transition-colors hover:border-red-500/40 hover:text-red-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {/* Agregar nueva opción al grupo */}
                <div className="space-y-2 rounded-xl border border-dashed border-neutral-800 bg-neutral-950/70 p-2.5">
                  <span className="block text-[11px] font-semibold text-neutral-400">
                    Agregar opción a {grupo.nombre}
                  </span>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {productos.length > 0 && (
                      <select
                        value={draft.productoId}
                        onChange={(e) => {
                          const prodId = e.target.value;
                          const prod = productos.find((p) => p.id === prodId);
                          updateDraft(grupo.id, {
                            productoId: prodId,
                            nombre: prod ? prod.nombre : draft.nombre,
                            error: undefined,
                          });
                        }}
                        disabled={disabled}
                        aria-label={`Vincular producto del catálogo en ${grupo.nombre}`}
                        className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 text-xs text-neutral-200 focus:border-amber-500 focus:outline-none"
                      >
                        <option value="">Vincular producto (opcional)...</option>
                        {productos.map((prod) => (
                          <option key={prod.id} value={prod.id}>
                            {prod.nombre}
                          </option>
                        ))}
                      </select>
                    )}

                    {insumos.length > 0 && (
                      <div className="flex gap-1.5">
                        <select
                          value={draft.insumoId}
                          onChange={(e) => {
                            const insId = e.target.value;
                            const ins = insumos.find((i) => i.id === insId);
                            updateDraft(grupo.id, {
                              insumoId: insId,
                              nombre: !draft.nombre && ins ? ins.nombre : draft.nombre,
                              error: undefined,
                            });
                          }}
                          disabled={disabled}
                          aria-label={`Vincular insumo directo en ${grupo.nombre}`}
                          className="min-h-[44px] flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-2.5 py-2 text-xs text-neutral-200 focus:border-amber-500 focus:outline-none"
                        >
                          <option value="">Insumo directo (opcional)...</option>
                          {insumos.map((ins) => (
                            <option key={ins.id} value={ins.id}>
                              {ins.nombre} ({ins.unidad})
                            </option>
                          ))}
                        </select>
                        {draft.insumoId && (
                          <input
                            type="number"
                            step="any"
                            min="0.001"
                            value={draft.cantidadInsumo}
                            onChange={(e) =>
                              updateDraft(grupo.id, {
                                cantidadInsumo: e.target.value,
                                error: undefined,
                              })
                            }
                            aria-label="Cantidad de insumo por opción"
                            placeholder="Cant"
                            className="min-h-[44px] w-20 rounded-xl border border-neutral-700 bg-neutral-950 px-2 text-xs text-white focus:border-amber-500 focus:outline-none"
                          />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={draft.nombre}
                      onChange={(e) =>
                        updateDraft(grupo.id, { nombre: e.target.value, error: undefined })
                      }
                      disabled={disabled}
                      placeholder="Nombre opción (ej: Coca-Cola 400ml, Salsa Ajo)"
                      aria-label={`Nombre de nueva opción en ${grupo.nombre}`}
                      className="min-h-[44px] flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={draft.recargoStr}
                      onChange={(e) =>
                        updateDraft(grupo.id, { recargoStr: e.target.value, error: undefined })
                      }
                      disabled={disabled}
                      placeholder="Recargo $"
                      aria-label={`Recargo en COP para opción en ${grupo.nombre}`}
                      className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-xs text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none sm:w-28"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => handleAgregarOpcion(grupo.id)}
                      disabled={disabled}
                      className="min-h-[44px] shrink-0 px-3 text-xs font-bold"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                      Añadir opción
                    </Button>
                  </div>

                  {draft.error && <p className="text-xs text-red-400">{draft.error}</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
