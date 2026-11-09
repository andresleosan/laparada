import { useState } from 'react';
import { BookOpen, RotateCcw, X } from 'lucide-react';
import type { MapeoPlanCuentasPUC } from '@/types/contabilidad';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createToast } from '@/components/ui/Toast';
import { getMapeoPucDefault } from '@/utils/contabilidadUtils';

interface ParametrosPucModalProps {
  isOpen: boolean;
  onClose: () => void;
  mapeoActual: MapeoPlanCuentasPUC;
  onGuardar: (nuevoMapeo: Partial<MapeoPlanCuentasPUC>) => Promise<void>;
}

export function ParametrosPucModal({
  isOpen,
  onClose,
  mapeoActual,
  onGuardar,
}: ParametrosPucModalProps) {
  const [formData, setFormData] = useState<MapeoPlanCuentasPUC>(mapeoActual);
  const [guardando, setGuardando] = useState(false);

  if (!isOpen) return null;

  const handleChange = (campo: keyof MapeoPlanCuentasPUC, valor: string) => {
    setFormData((prev) => ({
      ...prev,
      [campo]: valor.trim(),
    }));
  };

  const handleRestablecerDefaults = () => {
    setFormData(getMapeoPucDefault());
    createToast('Valores restaurados al Plan Único de Cuentas (PUC) estándar', 'info');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setGuardando(true);
      await onGuardar(formData);
      createToast('Plan de Cuentas PUC actualizado correctamente', 'success');
      onClose();
    } catch (err) {
      console.error('Error al guardar PUC:', err);
      createToast('Error al actualizar las cuentas contables.', 'error');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-400/10 text-gold-400 border border-gold-400/20">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white font-display">
                Parametrización del Plan de Cuentas (PUC)
              </h3>
              <p className="text-xs text-neutral-400">
                Códigos contables para interfaces automáticas con Siigo, World Office y Helisa.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar modal de parametrización contable"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 110505 Caja */}
            <div>
              <label className="text-neutral-300 font-semibold block mb-1">
                Cuenta Caja General (Efectivo):
              </label>
              <Input
                type="text"
                value={formData.cuentaCaja}
                onChange={(e) => handleChange('cuentaCaja', e.target.value)}
                placeholder="110505"
                required
                className="bg-neutral-950 font-mono text-xs border-neutral-800"
              />
              <span className="text-[10px] text-neutral-500 mt-0.5 block">Recaudos en mostrador</span>
            </div>

            {/* 111005 Bancos */}
            <div>
              <label className="text-neutral-300 font-semibold block mb-1">
                Cuenta Bancos / Canales Digitales:
              </label>
              <Input
                type="text"
                value={formData.cuentaBancos}
                onChange={(e) => handleChange('cuentaBancos', e.target.value)}
                placeholder="111005"
                required
                className="bg-neutral-950 font-mono text-xs border-neutral-800"
              />
              <span className="text-[10px] text-neutral-500 mt-0.5 block">Transferencias Nequi / Daviplata</span>
            </div>

            {/* 414005 Ingresos */}
            <div>
              <label className="text-neutral-300 font-semibold block mb-1">
                Cuenta Ingresos Operacionales (Restaurante):
              </label>
              <Input
                type="text"
                value={formData.cuentaIngresosRestaurante}
                onChange={(e) => handleChange('cuentaIngresosRestaurante', e.target.value)}
                placeholder="414005"
                required
                className="bg-neutral-950 font-mono text-xs border-neutral-800"
              />
              <span className="text-[10px] text-neutral-500 mt-0.5 block">Crédito por base neta facturada</span>
            </div>

            {/* 249501 Impoconsumo */}
            <div>
              <label className="text-neutral-300 font-semibold block mb-1">
                Cuenta Impoconsumo por Pagar (INC 8%):
              </label>
              <Input
                type="text"
                value={formData.cuentaImpoconsumoPorPagar}
                onChange={(e) => handleChange('cuentaImpoconsumoPorPagar', e.target.value)}
                placeholder="249501"
                required
                className="bg-neutral-950 font-mono text-xs border-neutral-800"
              />
              <span className="text-[10px] text-neutral-500 mt-0.5 block">Pasivo fiscal generado DIAN</span>
            </div>

            {/* 240801 IVA */}
            <div>
              <label className="text-neutral-300 font-semibold block mb-1">
                Cuenta IVA por Pagar (19% si aplica):
              </label>
              <Input
                type="text"
                value={formData.cuentaIvaPorPagar}
                onChange={(e) => handleChange('cuentaIvaPorPagar', e.target.value)}
                placeholder="240801"
                required
                className="bg-neutral-950 font-mono text-xs border-neutral-800"
              />
              <span className="text-[10px] text-neutral-500 mt-0.5 block">Licores gravados en Formulario 300</span>
            </div>

            {/* 417505 Descuentos */}
            <div>
              <label className="text-neutral-300 font-semibold block mb-1">
                Cuenta Descuentos y Cortesías:
              </label>
              <Input
                type="text"
                value={formData.cuentaDescuentosVentas}
                onChange={(e) => handleChange('cuentaDescuentosVentas', e.target.value)}
                placeholder="417505"
                required
                className="bg-neutral-950 font-mono text-xs border-neutral-800"
              />
              <span className="text-[10px] text-neutral-500 mt-0.5 block">Débito por cortesías comerciales</span>
            </div>

            {/* 233525 Propinas */}
            <div>
              <label className="text-neutral-300 font-semibold block mb-1">
                Cuenta Propinas por Distribuir:
              </label>
              <Input
                type="text"
                value={formData.cuentaPropinasPorPagar}
                onChange={(e) => handleChange('cuentaPropinasPorPagar', e.target.value)}
                placeholder="233525"
                required
                className="bg-neutral-950 font-mono text-xs border-neutral-800"
              />
              <span className="text-[10px] text-neutral-500 mt-0.5 block">Pasivo laboral de propinas</span>
            </div>

            {/* 513505 Gastos Insumos */}
            <div>
              <label className="text-neutral-300 font-semibold block mb-1">
                Cuenta Gastos de Operación / Insumos:
              </label>
              <Input
                type="text"
                value={formData.cuentaGastosInsumos}
                onChange={(e) => handleChange('cuentaGastosInsumos', e.target.value)}
                placeholder="513505"
                required
                className="bg-neutral-950 font-mono text-xs border-neutral-800"
              />
              <span className="text-[10px] text-neutral-500 mt-0.5 block">Egresos registrados en caja</span>
            </div>

            {/* Centro de costos */}
            <div>
              <label className="text-neutral-300 font-semibold block mb-1">
                Centro de Costos Predeterminado:
              </label>
              <Input
                type="text"
                value={formData.centroCostosDefault}
                onChange={(e) => handleChange('centroCostosDefault', e.target.value)}
                placeholder="001"
                required
                className="bg-neutral-950 font-mono text-xs border-neutral-800"
              />
              <span className="text-[10px] text-neutral-500 mt-0.5 block">Código de sede o local</span>
            </div>

            {/* NIT Genérico */}
            <div>
              <label className="text-neutral-300 font-semibold block mb-1">
                NIT Tercero Genérico (Consumidor Final):
              </label>
              <Input
                type="text"
                value={formData.nitClienteGenerico}
                onChange={(e) => handleChange('nitClienteGenerico', e.target.value)}
                placeholder="222222222222"
                required
                className="bg-neutral-950 font-mono text-xs border-neutral-800"
              />
              <span className="text-[10px] text-neutral-500 mt-0.5 block">Estándar DIAN para mostrador</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-neutral-800">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleRestablecerDefaults}
              className="text-xs min-h-[44px] flex items-center gap-1.5 text-neutral-400 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restablecer Códigos Estándar</span>
            </Button>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onClose}
                className="text-xs min-h-[44px]"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={guardando}
                className="text-xs min-h-[44px] px-4 font-semibold"
              >
                {guardando ? 'Guardando...' : 'Guardar Cuentas'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
