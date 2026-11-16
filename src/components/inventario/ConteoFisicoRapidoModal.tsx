import { useState, useEffect, useMemo, useId, type FormEvent } from 'react';
import {
  X,
  ClipboardCheck,
  Search,
  Minus,
  Plus,
  RotateCcw,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type {
  Insumo,
  RegistrarConteoFisicoMasivoInput,
} from '@/types';
import {
  calcularLineaConteoFisico,
  calcularResumenConteoFisico,
  generarActaConteoWhatsApp,
} from '@/utils/ordenesCompraYConteoUtils';
import { isInventoryLowStock } from '@/utils/inventoryStock';
import { formatCOP } from '@/utils/formatCOP';

interface ConteoFisicoRapidoModalProps {
  isOpen: boolean;
  onClose: () => void;
  insumos: Insumo[];
  nombreNegocio?: string;
  onConfirmarConteo: (
    input: RegistrarConteoFisicoMasivoInput
  ) => Promise<{ ajustadosCount: number }>;
  onSuccess?: () => void;
}

type FiltroConteo = 'todos' | 'bajo_stock' | 'con_diferencia';

export function ConteoFisicoRapidoModal({
  isOpen,
  onClose,
  insumos,
  nombreNegocio = 'La Parada',
  onConfirmarConteo,
  onSuccess,
}: ConteoFisicoRapidoModalProps) {
  const generatedId = useId();
  const titleId = `modal-conteo-fisico-${generatedId.replace(/:/g, '')}-title`;

  const [conteos, setConteos] = useState<Record<string, number>>({});
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroConteo>('todos');
  const [notas, setNotas] = useState('');
  const [responsable, setResponsable] = useState('Administrador');
  const [guardando, setGuardando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorLocal(null);
    setBusqueda('');
    setFiltro('todos');
    setNotas('');

    const inicial: Record<string, number> = {};
    for (const ins of insumos) {
      inicial[ins.id] = typeof ins.stockActual === 'number' ? ins.stockActual : 0;
    }
    setConteos(inicial);
  }, [isOpen, insumos]);

  const lineasEvaluadas = useMemo(() => {
    return insumos.map((ins) => {
      const fisico =
        conteos[ins.id] !== undefined ? conteos[ins.id] : ins.stockActual || 0;
      return calcularLineaConteoFisico(ins, fisico);
    });
  }, [insumos, conteos]);

  const resumen = useMemo(
    () => calcularResumenConteoFisico(lineasEvaluadas),
    [lineasEvaluadas]
  );

  const lineasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return lineasEvaluadas.filter((linea) => {
      if (q && !linea.insumoNombre.toLowerCase().includes(q)) {
        return false;
      }
      if (filtro === 'con_diferencia' && linea.estadoDiferencia === 'exacto') {
        return false;
      }
      if (filtro === 'bajo_stock') {
        const ins = insumos.find((i) => i.id === linea.insumoId);
        if (!ins || !isInventoryLowStock(ins)) return false;
      }
      return true;
    });
  }, [lineasEvaluadas, busqueda, filtro, insumos]);

  if (!isOpen) return null;

  const handleActualizarFisico = (insumoId: string, nuevoValor: number) => {
    setConteos((prev) => ({
      ...prev,
      [insumoId]: Math.max(0, Number(nuevoValor.toFixed(4))),
    }));
  };

  const handleIgualarTodosAlSistema = () => {
    const copia: Record<string, number> = {};
    for (const ins of insumos) {
      copia[ins.id] = typeof ins.stockActual === 'number' ? ins.stockActual : 0;
    }
    setConteos(copia);
  };

  const handleCompartirActaWhatsApp = () => {
    const texto = generarActaConteoWhatsApp(
      resumen,
      lineasEvaluadas,
      nombreNegocio,
      responsable
    );
    const url = `https://wa.me/?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    const itemsConDiferencia = lineasEvaluadas
      .filter((l) => l.estadoDiferencia !== 'exacto')
      .map((l) => ({
        insumoId: l.insumoId,
        nuevoStockFisico: l.stockFisicoContado,
      }));

    if (itemsConDiferencia.length === 0) {
      onClose();
      return;
    }

    try {
      setGuardando(true);
      await onConfirmarConteo({
        items: itemsConDiferencia,
        motivo: 'conteo_fisico',
        notas: notas.trim() || 'Conteo físico rápido de bodega',
        responsable: responsable.trim() || 'Administrador',
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      setErrorLocal(
        err instanceof Error ? err.message : 'Error al aplicar el conteo físico'
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <StorefrontDialog
      onClose={onClose}
      onBackdropClick={onClose}
      labelledBy={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
    >
      <div className="relative w-full max-w-4xl rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
      {/* Cabecera */}
      <div className="p-4 sm:p-5 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-400/10 border border-gold-400/30 flex items-center justify-center text-gold-400">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div>
            <h2
              id={titleId}
              className="font-display font-bold text-lg sm:text-xl text-white"
            >
              Conteo Físico Rápido de Bodega
            </h2>
            <p className="text-xs text-neutral-400">
              Auditoría express de existencias reales vs sistema con ajuste en 1 clic al Kardex
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal de conteo físico"
          className="w-11 h-11 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
        {errorLocal && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs sm:text-sm font-medium">
            {errorLocal}
          </div>
        )}

        {/* KPIs del Conteo en Vivo */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 block">
              Cuadrados Exactos
            </span>
            <span className="font-display font-bold text-lg text-emerald-400">
              {resumen.exactosCount} / {resumen.totalInsumosEvaluados}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 block">
              Faltantes ({resumen.faltantesCount})
            </span>
            <span className="font-display font-bold text-lg text-rose-400">
              -{formatCOP(resumen.valorFaltantesCOP)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 block">
              Sobrantes ({resumen.sobrantesCount})
            </span>
            <span className="font-display font-bold text-lg text-sky-400">
              +{formatCOP(resumen.valorSobrantesCOP)}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800">
            <span className="text-[11px] uppercase tracking-wider text-neutral-400 block">
              Balance Neto
            </span>
            <span
              className={`font-display font-bold text-lg ${
                resumen.balanceNetoCOP < 0
                  ? 'text-rose-400'
                  : resumen.balanceNetoCOP > 0
                    ? 'text-emerald-400'
                    : 'text-white'
              }`}
            >
              {formatCOP(resumen.balanceNetoCOP)}
            </span>
          </div>
        </div>

        {/* Buscador y Filtros */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar insumo en bodega..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs sm:text-sm focus:border-gold-400 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(
              [
                ['todos', `Todos (${insumos.length})`],
                ['bajo_stock', 'Bajo Stock'],
                ['con_diferencia', `Con Diferencia (${resumen.insumosConDiferencia})`],
              ] as [FiltroConteo, string][]
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={filtro === key}
                onClick={() => setFiltro(key)}
                className={`h-11 px-3 rounded-xl text-xs font-semibold whitespace-nowrap border transition-colors ${
                  filtro === key
                    ? 'bg-gold-400 text-neutral-950 border-gold-400 font-bold'
                    : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {label}
              </button>
            ))}

            <button
              type="button"
              onClick={handleIgualarTodosAlSistema}
              title="Restaurar conteo igual al sistema"
              aria-label="Restaurar conteo igual al sistema"
              className="h-11 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reiniciar</span>
            </button>
          </div>
        </div>

        {/* Lista de Insumos para Conteo Táctil */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {lineasFiltradas.map((linea) => {
            const tieneDiff = linea.estadoDiferencia !== 'exacto';

            return (
              <div
                key={linea.insumoId}
                className={`p-3 rounded-xl border grid grid-cols-1 sm:grid-cols-12 gap-3 items-center transition-colors ${
                  linea.estadoDiferencia === 'faltante'
                    ? 'bg-rose-500/5 border-rose-500/30'
                    : linea.estadoDiferencia === 'sobrante'
                      ? 'bg-sky-500/5 border-sky-500/30'
                      : 'bg-neutral-950 border-neutral-800'
                }`}
              >
                <div className="sm:col-span-4">
                  <p className="font-display font-bold text-sm text-white">
                    {linea.insumoNombre}
                  </p>
                  <p className="text-xs text-neutral-400">
                    En sistema:{' '}
                    <strong className="text-neutral-200">
                      {linea.stockSistema} {linea.unidad}
                    </strong>
                  </p>
                </div>

                <div className="sm:col-span-5 flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-label={`Restar 1 a ${linea.insumoNombre}`}
                    onClick={() =>
                      handleActualizarFisico(
                        linea.insumoId,
                        Math.max(0, linea.stockFisicoContado - 1)
                      )
                    }
                    className="w-11 h-11 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 flex items-center justify-center shrink-0"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <input
                    type="number"
                    min="0"
                    step="any"
                    aria-label={`Stock físico contado de ${linea.insumoNombre}`}
                    value={linea.stockFisicoContado}
                    onChange={(e) =>
                      handleActualizarFisico(
                        linea.insumoId,
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full h-11 px-3 rounded-lg bg-neutral-900 border border-neutral-700 text-center text-white font-display font-bold text-sm focus:border-gold-400 focus:outline-none"
                  />

                  <button
                    type="button"
                    aria-label={`Sumar 1 a ${linea.insumoNombre}`}
                    onClick={() =>
                      handleActualizarFisico(
                        linea.insumoId,
                        linea.stockFisicoContado + 1
                      )
                    }
                    className="w-11 h-11 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700 flex items-center justify-center shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  {tieneDiff && (
                    <button
                      type="button"
                      onClick={() =>
                        handleActualizarFisico(linea.insumoId, linea.stockSistema)
                      }
                      className="h-11 px-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold shrink-0"
                      title="Igualar al stock en sistema"
                    >
                      = Sist.
                    </button>
                  )}
                </div>

                <div className="sm:col-span-3 flex sm:flex-col items-center sm:items-end justify-between">
                  {linea.estadoDiferencia === 'exacto' ? (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Exacto
                    </span>
                  ) : (
                    <>
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold ${
                          linea.estadoDiferencia === 'faltante'
                            ? 'text-rose-400'
                            : 'text-sky-400'
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {linea.diferencia > 0
                          ? `+${linea.diferencia}`
                          : linea.diferencia}{' '}
                        {linea.unidad}
                      </span>
                      {linea.costoUnitario > 0 && (
                        <span className="text-[11px] text-neutral-400 font-mono">
                          {formatCOP(linea.impactoValorCOP)}
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Responsable y Observaciones */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Responsable de Auditoría
            </label>
            <input
              type="text"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs sm:text-sm focus:border-gold-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
              Notas del Conteo Físico
            </label>
            <input
              type="text"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: Auditoría cierre de turno noche..."
              className="w-full h-11 px-3.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white text-xs sm:text-sm focus:border-gold-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Pie */}
        <div className="pt-4 border-t border-neutral-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCompartirActaWhatsApp}
            className="h-11 px-4 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Compartir Acta por WhatsApp</span>
          </button>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs sm:text-sm transition-colors"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="h-11 px-5 rounded-xl bg-gold-400 hover:bg-gold-500 text-neutral-950 font-black text-xs sm:text-sm flex items-center gap-2 transition-colors shadow-lg disabled:opacity-40"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>
                {guardando
                  ? 'Aplicando al Kardex...'
                  : resumen.insumosConDiferencia > 0
                    ? `Aplicar ${resumen.insumosConDiferencia} Ajustes al Kardex`
                    : 'Confirmar Bodega Cuadrada'}
              </span>
            </button>
          </div>
        </div>
      </form>
      </div>
    </StorefrontDialog>
  );
}
