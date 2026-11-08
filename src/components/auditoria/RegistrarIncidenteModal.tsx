import React, { useId, useState } from 'react';
import {
  X,
  ShieldPlus,
  Lock,
  AlertCircle,
} from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { CATEGORIAS_AUDITORIA_CATALOGO } from '@/utils/auditoriaUtils';
import type {
  CategoriaEventoAuditoria,
  EntidadAuditoriaTipo,
  RegistrarEventoAuditoriaInput,
  SeveridadAuditoria,
} from '@/types';

interface RegistrarIncidenteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    input: Omit<RegistrarEventoAuditoriaInput, 'negocioId'>
  ) => Promise<string>;
}

const ENTIDAD_POR_CATEGORIA: Record<CategoriaEventoAuditoria, EntidadAuditoriaTipo> = {
  anulacion_venta: 'venta',
  cortesia_descuento: 'venta',
  merma_inventario: 'inventario',
  ajuste_inventario: 'inventario',
  cancelacion_comanda: 'comanda',
  descuadre_caja: 'caja',
  acceso_personal: 'personal',
};

export const RegistrarIncidenteModal: React.FC<RegistrarIncidenteModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const generatedId = useId();
  const titleId = `modal-registrar-incidente-${generatedId.replace(/:/g, '')}-title`;

  const [categoria, setCategoria] = useState<CategoriaEventoAuditoria>('cancelacion_comanda');
  const [severidad, setSeveridad] = useState<SeveridadAuditoria>('alta');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [motivo, setMotivo] = useState('');
  const [montoImpactoStr, setMontoImpactoStr] = useState('0');
  const [responsableNombre, setResponsableNombre] = useState('');
  const [referenciaId, setReferenciaId] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!titulo.trim()) {
      setErrorMsg('Ingresa un título descriptivo para el acta de auditoría.');
      return;
    }
    if (!motivo.trim()) {
      setErrorMsg('Debes especificar el motivo o justificación del evento.');
      return;
    }

    const monto = Math.max(0, Math.round(Number(montoImpactoStr) || 0));

    try {
      setGuardando(true);
      await onSubmit({
        categoria,
        severidad,
        titulo: titulo.trim(),
        descripcion:
          descripcion.trim() ||
          `Acta manual registrada en Centro de Auditoría (${CATEGORIAS_AUDITORIA_CATALOGO[categoria].label}).`,
        motivo: motivo.trim(),
        montoImpacto: monto,
        responsableNombre: responsableNombre.trim() || undefined,
        entidadTipo: ENTIDAD_POR_CATEGORIA[categoria],
        referenciaId: referenciaId.trim() || `acta_${Date.now().toString(36)}`,
        detallesForenses: {
          registroManual: true,
          fechaCapturaISO: new Date().toISOString(),
        },
      });
      setTitulo('');
      setDescripcion('');
      setMotivo('');
      setMontoImpactoStr('0');
      setReferenciaId('');
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudo guardar el registro en la bitácora.'
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      className="w-full max-w-xl bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-2xl shadow-2xl overflow-hidden my-6 mx-auto p-0"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/30 bg-gold-400/10 text-gold-400">
            <ShieldPlus className="h-5 w-5" />
          </div>
          <div>
            <h2 id={titleId} className="font-display text-lg font-bold text-white">
              Registrar Acta en Bitácora Inmutable
            </h2>
            <p className="text-xs text-neutral-400">
              Documenta incidentes operativos, comandas canceladas o novedades de turno
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal de registro de incidente"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
        <div className="flex items-center gap-2 rounded-xl border border-gold-400/30 bg-gold-400/10 px-3.5 py-2.5 text-xs text-gold-200">
          <Lock className="h-4 w-4 text-gold-400 shrink-0" />
          <span>
            Una vez firmado, este registro queda sellado en Firestore y no podrá ser editado ni eliminado.
          </span>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="incidente-categoria"
              className="block text-xs font-semibold text-neutral-300 mb-1.5"
            >
              Categoría del Evento *
            </label>
            <select
              id="incidente-categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value as CategoriaEventoAuditoria)}
              className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
            >
              {Object.values(CATEGORIAS_AUDITORIA_CATALOGO).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="incidente-severidad"
              className="block text-xs font-semibold text-neutral-300 mb-1.5"
            >
              Nivel de Severidad *
            </label>
            <select
              id="incidente-severidad"
              value={severidad}
              onChange={(e) => setSeveridad(e.target.value as SeveridadAuditoria)}
              className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
            >
              <option value="critica">🔴 Crítica</option>
              <option value="alta">🟠 Alta</option>
              <option value="media">🟡 Media</option>
              <option value="informativa">🟢 Informativa</option>
            </select>
          </div>
        </div>

        <div>
          <label
            htmlFor="incidente-titulo"
            className="block text-xs font-semibold text-neutral-300 mb-1.5"
          >
            Título del Evento / Novedad *
          </label>
          <input
            id="incidente-titulo"
            type="text"
            required
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: Comanda cancelada en Mesa 4 tras marchar a cocina"
            className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="incidente-motivo"
              className="block text-xs font-semibold text-neutral-300 mb-1.5"
            >
              Motivo / Justificación *
            </label>
            <input
              id="incidente-motivo"
              type="text"
              required
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej: Cliente se retiró antes de servir"
              className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="incidente-monto"
              className="block text-xs font-semibold text-neutral-300 mb-1.5"
            >
              Impacto Financiero ($ COP)
            </label>
            <input
              id="incidente-monto"
              type="number"
              min={0}
              step={500}
              value={montoImpactoStr}
              onChange={(e) => setMontoImpactoStr(e.target.value)}
              className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-sm text-white focus:border-gold-400 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label
              htmlFor="incidente-responsable"
              className="block text-xs font-semibold text-neutral-300 mb-1.5"
            >
              Operador / Involucrado (opcional)
            </label>
            <input
              id="incidente-responsable"
              type="text"
              value={responsableNombre}
              onChange={(e) => setResponsableNombre(e.target.value)}
              placeholder="Ej: Mesero Turno Noche"
              className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="incidente-referencia"
              className="block text-xs font-semibold text-neutral-300 mb-1.5"
            >
              Código / Referencia (opcional)
            </label>
            <input
              id="incidente-referencia"
              type="text"
              value={referenciaId}
              onChange={(e) => setReferenciaId(e.target.value)}
              placeholder="Ej: MESA-04 o K-018"
              className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="incidente-descripcion"
            className="block text-xs font-semibold text-neutral-300 mb-1.5"
          >
            Detalle Forense / Observaciones
          </label>
          <textarea
            id="incidente-descripcion"
            rows={3}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Describe qué ocurrió, qué insumos o platos se vieron afectados y qué medida se tomó..."
            className="w-full rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2 text-sm text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-gold-400 px-5 py-2 text-xs font-bold text-neutral-950 hover:bg-gold-300 disabled:opacity-50"
          >
            <Lock className="h-4 w-4" />
            <span>{guardando ? 'Sellando Acta...' : 'Sellar en Bitácora'}</span>
          </button>
        </div>
      </form>
    </StorefrontDialog>
  );
};
