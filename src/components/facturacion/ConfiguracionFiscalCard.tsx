import { useState } from 'react';
import { Building, Save } from 'lucide-react';
import type { ConfiguracionFiscal, RegimenFiscal } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { createToast } from '@/components/ui/Toast';

interface ConfiguracionFiscalCardProps {
  configuracion: ConfiguracionFiscal;
  onGuardar: (config: Partial<ConfiguracionFiscal>) => Promise<void>;
}

export function ConfiguracionFiscalCard({
  configuracion,
  onGuardar,
}: ConfiguracionFiscalCardProps) {
  const [form, setForm] = useState<ConfiguracionFiscal>({ ...configuracion });
  const [guardando, setGuardando] = useState(false);

  const handleRegimenChange = (nuevoRegimen: RegimenFiscal) => {
    let tarifaPorcentaje = 8;
    let tipoImpuesto: 'inc' | 'iva' | 'ninguno' = 'inc';
    let nombreTarifa = 'Impuesto Nacional al Consumo (INC 8%)';
    let responsabilidad = 'Responsable de Impuesto Nacional al Consumo (INC 8%)';

    if (nuevoRegimen === 'responsable_iva') {
      tarifaPorcentaje = 19;
      tipoImpuesto = 'iva';
      nombreTarifa = 'Impuesto al Valor Agregado (IVA 19%)';
      responsabilidad = 'Responsable de IVA (19% Régimen Común)';
    } else if (nuevoRegimen === 'no_responsable') {
      tarifaPorcentaje = 0;
      tipoImpuesto = 'ninguno';
      nombreTarifa = 'No sujeto / No responsable de IVA ni INC';
      responsabilidad = 'No responsable de IVA ni INC - Art. 499 E.T.';
    } else if (nuevoRegimen === 'regimen_simple') {
      tarifaPorcentaje = 8;
      tipoImpuesto = 'inc';
      nombreTarifa = 'INC 8% (Régimen Simple de Tributación)';
      responsabilidad = 'Contribuyente Régimen Simple de Tributación (RST)';
    }

    setForm({
      ...form,
      regimenFiscal: nuevoRegimen,
      responsabilidad,
      tarifaDefault: {
        tipo: tipoImpuesto,
        porcentaje: tarifaPorcentaje,
        nombre: nombreTarifa,
      },
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.razonSocial.trim()) {
      createToast('La razón social es obligatoria', 'error');
      return;
    }
    if (!form.nit.trim()) {
      createToast('El NIT o documento es obligatorio', 'error');
      return;
    }

    try {
      setGuardando(true);
      await onGuardar(form);
      createToast('Configuración fiscal actualizada exitosamente', 'success');
    } catch (err) {
      createToast(
        err instanceof Error ? err.message : 'Error al guardar configuración',
        'error'
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-6 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Building className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-white">
              Identidad Fiscal y Régimen Tributario
            </h3>
            <p className="text-xs text-neutral-400">
              Datos que aparecen en tickets térmicos y reportes oficiales DIAN
            </p>
          </div>
        </div>

        {/* Switch táctil habilitar POS */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.habilitado}
            onChange={(e) => setForm({ ...form, habilitado: e.target.checked })}
            className="sr-only"
          />
          <div
            className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${
              form.habilitado ? 'bg-amber-500' : 'bg-neutral-800'
            }`}
          >
            <div
              className={`h-5 w-5 rounded-full bg-white transition-transform ${
                form.habilitado ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
          <span className="text-xs font-semibold text-white">
            {form.habilitado ? 'POS Fiscal Activo' : 'Modo Ticket Estándar'}
          </span>
        </label>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-300">
              Razón Social (Titular o Empresa) *
            </label>
            <Input
              value={form.razonSocial}
              onChange={(e) => setForm({ ...form, razonSocial: e.target.value })}
              placeholder="Ej: COMERCIALIZADORA GASTRONÓMICA LA PARADA S.A.S."
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-300">
              Nombre Comercial / Establecimiento
            </label>
            <Input
              value={form.nombreComercial}
              onChange={(e) => setForm({ ...form, nombreComercial: e.target.value })}
              placeholder="Ej: LA PARADA COMIDA RÁPIDA"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-300">
              Tipo de Documento *
            </label>
            <select
              value={form.tipoDocumentoIdentidad}
              onChange={(e) =>
                setForm({
                  ...form,
                  tipoDocumentoIdentidad: e.target.value as 'NIT' | 'CC' | 'CE',
                })
              }
              className="w-full rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none min-h-[44px]"
            >
              <option value="NIT">NIT (Persona Jurídica / Natural)</option>
              <option value="CC">Cédula de Ciudadanía (CC)</option>
              <option value="CE">Cédula de Extranjería (CE)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-300">
              Número de Identificación (sin DV) *
            </label>
            <Input
              value={form.nit}
              onChange={(e) => setForm({ ...form, nit: e.target.value })}
              placeholder="Ej: 901.845.123"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-300">
              Dígito Verificación (DV)
            </label>
            <Input
              value={form.dv}
              onChange={(e) => setForm({ ...form, dv: e.target.value.slice(0, 1) })}
              placeholder="Ej: 5"
              maxLength={1}
            />
          </div>
        </div>

        {/* Régimen Fiscal Selector */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-neutral-300">
            Régimen Tributario e Impuesto Aplicable en Restaurante *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              {
                id: 'responsable_inc',
                titulo: 'INC (8%)',
                sub: 'Estándar restaurantes y comida rápida en Colombia',
                tarifa: '8% Impoconsumo',
              },
              {
                id: 'no_responsable',
                titulo: 'No Responsable',
                sub: 'Antiguo simplificado, personas naturales',
                tarifa: 'Tarifa 0%',
              },
              {
                id: 'regimen_simple',
                titulo: 'Régimen Simple (RST)',
                sub: 'Régimen Simple con cobro de INC 8%',
                tarifa: '8% INC',
              },
              {
                id: 'responsable_iva',
                titulo: 'IVA (19%)',
                sub: 'Régimen Común / Franquicias específicas',
                tarifa: '19% IVA',
              },
            ].map((reg) => (
              <button
                key={reg.id}
                type="button"
                onClick={() => handleRegimenChange(reg.id as RegimenFiscal)}
                className={`flex flex-col text-left rounded-xl border p-3 transition-colors min-h-[44px] ${
                  form.regimenFiscal === reg.id
                    ? 'border-amber-400 bg-amber-500/10 text-white'
                    : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">{reg.titulo}</span>
                  <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] font-mono text-amber-400">
                    {reg.tarifa}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-neutral-400">{reg.sub}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-300">
              Dirección Fiscal del Establecimiento *
            </label>
            <Input
              value={form.direccionFiscal}
              onChange={(e) => setForm({ ...form, direccionFiscal: e.target.value })}
              placeholder="Ej: Av. 0 # 10-20, Barrio La Playa"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-300">
              Municipio / Ciudad *
            </label>
            <Input
              value={form.municipio}
              onChange={(e) => setForm({ ...form, municipio: e.target.value })}
              placeholder="Cúcuta"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-300">
              Departamento *
            </label>
            <Input
              value={form.departamento}
              onChange={(e) => setForm({ ...form, departamento: e.target.value })}
              placeholder="Norte de Santander"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-300">
              Teléfono de Contacto Fiscal
            </label>
            <Input
              value={form.telefonoContacto}
              onChange={(e) => setForm({ ...form, telefonoContacto: e.target.value })}
              placeholder="310 123 4567"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-300">
              Correo Electrónico para Facturación
            </label>
            <Input
              type="email"
              value={form.correoFiscal || ''}
              onChange={(e) => setForm({ ...form, correoFiscal: e.target.value })}
              placeholder="facturacion@laparada.com"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-300">
            Leyenda Fiscal al Pie del Ticket
          </label>
          <Input
            value={form.leyendaFiscal || ''}
            onChange={(e) => setForm({ ...form, leyendaFiscal: e.target.value })}
            placeholder="Documento Equivalente Electrónico POS expedido conforme a resolución DIAN vigente"
          />
        </div>

        {/* Previsualización en vivo del encabezado del ticket */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-4">
          <span className="text-[11px] font-medium text-neutral-400">
            Previsualización del Encabezado en el Ticket POS:
          </span>
          <div className="mt-2 rounded-lg border border-neutral-800/80 bg-[#FBFBFA] p-3 text-center font-mono text-[11px] text-neutral-900 shadow-sm max-w-sm mx-auto">
            <p className="font-bold text-xs uppercase">{form.razonSocial || 'NOMBRE EMPRESA'}</p>
            {form.nombreComercial && (
              <p className="text-[10px] text-neutral-600 font-sans">{form.nombreComercial}</p>
            )}
            <p className="text-[10px]">
              {form.tipoDocumentoIdentidad}: {form.nit}-{form.dv || '0'}
            </p>
            <p className="text-[9px] text-neutral-600">{form.responsabilidad}</p>
            <p className="text-[10px]">
              {form.direccionFiscal}, {form.municipio} - {form.departamento}
            </p>
            <p className="text-[10px]">Tel: {form.telefonoContacto}</p>
            <div className="my-1 border-b border-dashed border-neutral-400" />
            <p className="font-bold text-black text-[11px]">
              DOC. EQUIVALENTE POS No. {form.resolucion.prefijo}-
              {String(form.resolucion.consecutivoActual).padStart(5, '0')}
            </p>
            <p className="text-[9px] text-neutral-600">
              Res. DIAN No. {form.resolucion.numeroResolucion}
            </p>
            <p className="text-[9px] text-neutral-600">
              Prefijo {form.resolucion.prefijo} del {form.resolucion.rangoInicial} al{' '}
              {form.resolucion.rangoFinal}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-neutral-800 pt-4">
          <Button
            type="submit"
            variant="primary"
            disabled={guardando}
            className="min-h-[44px] gap-2 font-bold px-6"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {guardando ? 'Guardando...' : 'Guardar Configuración Fiscal'}
          </Button>
        </div>
      </form>
    </div>
  );
}
