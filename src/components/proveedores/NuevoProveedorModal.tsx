import { useState, useEffect, useId, type FormEvent } from 'react';
import { X, Building2, Check } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import type { Proveedor, CategoriaProveedor } from '@/types/proveedor';
import { CATEGORIAS_PROVEEDOR_CONFIG } from '@/utils/proveedoresUtils';

interface NuevoProveedorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Proveedor, 'id' | 'negocioId' | 'creadoEn' | 'actualizadoEn'>) => Promise<unknown>;
  proveedorAEditar?: Proveedor | null;
  cargando?: boolean;
}

export function NuevoProveedorModal({
  isOpen,
  onClose,
  onSubmit,
  proveedorAEditar,
  cargando = false,
}: NuevoProveedorModalProps) {
  const generatedId = useId();
  const titleId = `modal-proveedor-${generatedId.replace(/:/g, '')}-title`;

  const [nombre, setNombre] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('Cúcuta');
  const [nit, setNit] = useState('');
  const [categoria, setCategoria] = useState<CategoriaProveedor>('carnes');
  const [diasCreditoHabitual, setDiasCreditoHabitual] = useState<number>(15);
  const [activo, setActivo] = useState(true);
  const [notas, setNotas] = useState('');
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  useEffect(() => {
    if (proveedorAEditar) {
      setNombre(proveedorAEditar.nombre || '');
      setContacto(proveedorAEditar.contacto || '');
      setTelefono(proveedorAEditar.telefono || '');
      setEmail(proveedorAEditar.email || '');
      setDireccion(proveedorAEditar.direccion || '');
      setCiudad(proveedorAEditar.ciudad || 'Cúcuta');
      setNit(proveedorAEditar.nit || '');
      setCategoria(proveedorAEditar.categoria || 'carnes');
      setDiasCreditoHabitual(proveedorAEditar.diasCreditoHabitual || 0);
      setActivo(proveedorAEditar.activo ?? true);
      setNotas(proveedorAEditar.notas || '');
    } else {
      setNombre('');
      setContacto('');
      setTelefono('');
      setEmail('');
      setDireccion('');
      setCiudad('Cúcuta');
      setNit('');
      setCategoria('carnes');
      setDiasCreditoHabitual(15);
      setActivo(true);
      setNotas('');
    }
    setErrorLocal(null);
  }, [proveedorAEditar, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorLocal(null);

    const nombreLimpio = nombre.trim();
    if (nombreLimpio.length < 2) {
      setErrorLocal('Ingresa el nombre o razón social del proveedor (mínimo 2 letras).');
      return;
    }

    const telLimpio = telefono.replace(/\D/g, '');
    if (telLimpio.length < 7) {
      setErrorLocal('Ingresa un número telefónico válido (mínimo 7 dígitos).');
      return;
    }

    try {
      await onSubmit({
        nombre: nombreLimpio,
        contacto: contacto.trim() || undefined,
        telefono: telLimpio,
        email: email.trim() || undefined,
        direccion: direccion.trim() || undefined,
        ciudad: ciudad.trim() || undefined,
        nit: nit.trim() || undefined,
        categoria,
        diasCreditoHabitual: Math.max(0, Math.round(Number(diasCreditoHabitual) || 0)),
        activo,
        notas: notas.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setErrorLocal(err instanceof Error ? err.message : 'Error al guardar el proveedor.');
    }
  };

  const opcionesDias = [0, 7, 15, 30, 45];

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      className="w-full max-w-lg bg-neutral-900 border border-neutral-800 text-neutral-100 rounded-2xl shadow-2xl overflow-hidden my-6 mx-auto p-0"
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gold-400/10 border border-gold-400/30 flex items-center justify-center text-gold-400">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 id={titleId} className="font-display font-bold text-lg text-white">
              {proveedorAEditar ? 'Editar Proveedor' : 'Nuevo Proveedor'}
            </h2>
            <p className="text-xs text-neutral-400">
              Registra los datos de contacto y condiciones comerciales
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal de proveedor"
          className="w-10 h-10 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
        {errorLocal && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {errorLocal}
          </div>
        )}

        {/* Nombre / Razón Social */}
        <div>
          <label htmlFor="prov-nombre" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
            Nombre / Razón Social <span className="text-gold-400">*</span>
          </label>
          <input
            id="prov-nombre"
            type="text"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: Carnes Santander SAS o Panadería La Floresta"
            className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:border-gold-400 focus:outline-none"
          />
        </div>

        {/* Contacto & NIT */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="prov-contacto" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
              Persona de Contacto
            </label>
            <input
              id="prov-contacto"
              type="text"
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              placeholder="Ej: Don Carlos o Asesor Juan"
              className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:border-gold-400 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="prov-nit" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
              NIT / Cédula
            </label>
            <input
              id="prov-nit"
              type="text"
              value={nit}
              onChange={(e) => setNit(e.target.value)}
              placeholder="Ej: 900.123.456-7"
              className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:border-gold-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Teléfono & Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="prov-telefono" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
              Teléfono / WhatsApp <span className="text-gold-400">*</span>
            </label>
            <input
              id="prov-telefono"
              type="tel"
              required
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej: 3123456789"
              className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:border-gold-400 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="prov-email" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
              Correo Electrónico
            </label>
            <input
              id="prov-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="proveedor@gmail.com"
              className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:border-gold-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Categoría de Materia Prima */}
        <div>
          <label htmlFor="prov-categoria" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
            Categoría de Suministro
          </label>
          <select
            id="prov-categoria"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaProveedor)}
            className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-gold-400 focus:outline-none"
          >
            {Object.entries(CATEGORIAS_PROVEEDOR_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>
        </div>

        {/* Plazo de Crédito Habitual */}
        <div>
          <label className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
            Plazo de Crédito Habitual
          </label>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {opcionesDias.map((dias) => (
              <button
                key={dias}
                type="button"
                onClick={() => setDiasCreditoHabitual(dias)}
                className={`h-9 px-3 rounded-lg text-xs font-semibold transition-all border ${
                  diasCreditoHabitual === dias
                    ? 'bg-gold-400 text-neutral-950 border-gold-400 shadow'
                    : 'bg-neutral-950 text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                {dias === 0 ? 'Contado (0d)' : `${dias} días`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">Días personalizados:</span>
            <input
              type="number"
              min="0"
              max="180"
              value={diasCreditoHabitual}
              onChange={(e) => setDiasCreditoHabitual(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-24 px-2.5 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white text-sm focus:border-gold-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Dirección y Ciudad */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label htmlFor="prov-dir" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
              Dirección
            </label>
            <input
              id="prov-dir"
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              placeholder="Ej: Av. 0 # 10-20 Barrio La Playa"
              className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:border-gold-400 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="prov-ciudad" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
              Ciudad
            </label>
            <input
              id="prov-ciudad"
              type="text"
              value={ciudad}
              onChange={(e) => setCiudad(e.target.value)}
              placeholder="Cúcuta"
              className="w-full px-3.5 py-2.5 rounded-lg bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:border-gold-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Notas */}
        <div>
          <label htmlFor="prov-notas" className="block text-xs font-semibold text-neutral-300 uppercase tracking-wider mb-1">
            Notas u Observaciones
          </label>
          <textarea
            id="prov-notas"
            rows={2}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Horarios de entrega, cuenta bancaria para transferencias, etc."
            className="w-full px-3.5 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-white placeholder-neutral-500 text-sm focus:border-gold-400 focus:outline-none resize-none"
          />
        </div>

        {/* Toggle Activo */}
        <div className="flex items-center gap-2 pt-1">
          <input
            id="prov-activo"
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            className="w-4 h-4 rounded border-neutral-800 bg-neutral-950 text-gold-400 focus:ring-gold-400"
          />
          <label htmlFor="prov-activo" className="text-xs text-neutral-300 font-medium">
            Proveedor activo (disponible para nuevas compras y facturas)
          </label>
        </div>

        {/* Botones de acción */}
        <div className="pt-4 border-t border-neutral-800 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-4 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium text-sm transition-colors"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={cargando}
            className="h-11 px-6 rounded-lg bg-gold-400 hover:bg-gold-500 text-neutral-950 font-bold text-sm transition-colors shadow disabled:opacity-50 flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{cargando ? 'Guardando...' : proveedorAEditar ? 'Guardar Cambios' : 'Registrar Proveedor'}</span>
          </button>
        </div>
      </form>
    </StorefrontDialog>
  );
}
