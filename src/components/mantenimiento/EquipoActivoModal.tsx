import React, { useEffect, useId, useState } from 'react';
import { Flame, ShieldAlert, Wrench, X } from 'lucide-react';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { Button } from '@/components/ui/Button';
import { createToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { useNegocio } from '@/context/NegocioContext';
import type {
  ActualizarEquipoMantenimientoInput,
  CategoriaEquipoMantenimiento,
  CrearEquipoMantenimientoInput,
  EquipoActivoMantenimiento,
  EstadoOperativoEquipo,
  TipoAgenteExtintor,
} from '@/types/mantenimiento';
import {
  CATEGORIA_EQUIPO_META,
  CATEGORIA_EQUIPO_ORDEN,
  ESTADO_OPERATIVO_EQUIPO_META,
  TIPO_AGENTE_EXTINTOR_META,
} from '@/utils/mantenimientoUtils';

export interface EquipoActivoModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipoEditar?: EquipoActivoMantenimiento | null;
  onCrear: (
    input: Omit<CrearEquipoMantenimientoInput, 'negocioId'>
  ) => Promise<EquipoActivoMantenimiento>;
  onActualizar: (
    equipoId: string,
    updates: ActualizarEquipoMantenimientoInput
  ) => Promise<void>;
}

const ESTADOS_EQUIPO: EstadoOperativoEquipo[] = [
  'operativo',
  'en_mantenimiento',
  'con_falla',
  'fuera_servicio',
];

const TIPOS_AGENTE: TipoAgenteExtintor[] = [
  'tipo_k',
  'multiproposito_abc',
  'co2',
  'solkaflam',
  'agua_presion',
];

export function EquipoActivoModal({
  isOpen,
  onClose,
  equipoEditar,
  onCrear,
  onActualizar,
}: EquipoActivoModalProps) {
  const generatedId = useId();
  const titleId = `equipo-activo-modal-${generatedId.replace(/:/g, '')}-title`;

  let creadoPorDefault = 'Administrador';
  try {
    const authCtx = useAuth();
    creadoPorDefault =
      authCtx.user?.displayName || authCtx.user?.email || 'Administrador';
  } catch {
    // Fallback seguro en pruebas aisladas
  }
  try {
    const negCtx = useNegocio();
    if (negCtx.usuarioNegocio?.nombre) {
      creadoPorDefault = negCtx.usuarioNegocio.nombre;
    }
  } catch {
    // Fallback seguro
  }

  const [codigoActivo, setCodigoActivo] = useState('');
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState<CategoriaEquipoMantenimiento>('coccion');
  const [ubicacion, setUbicacion] = useState('Cocina');
  const [estadoOperativo, setEstadoOperativo] =
    useState<EstadoOperativoEquipo>('operativo');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [numeroSerie, setNumeroSerie] = useState('');
  const [fechaCompraIso, setFechaCompraIso] = useState('');
  const [garantiaHastaIso, setGarantiaHastaIso] = useState('');
  const [frecuenciaPreventivoDias, setFrecuenciaPreventivoDias] = useState('90');
  const [ultimoMantenimientoIso, setUltimoMantenimientoIso] = useState('');
  const [proximoMantenimientoIso, setProximoMantenimientoIso] = useState('');
  const [tipoAgenteExtintor, setTipoAgenteExtintor] =
    useState<TipoAgenteExtintor>('tipo_k');
  const [capacidadExtintor, setCapacidadExtintor] = useState('6 Litros');
  const [fechaRecargaVenceIso, setFechaRecargaVenceIso] = useState('');
  const [fechaPruebaHidrostaticaIso, setFechaPruebaHidrostaticaIso] = useState('');
  const [certificadoGasVenceIso, setCertificadoGasVenceIso] = useState('');
  const [empresaCertificadora, setEmpresaCertificadora] = useState('');
  const [proveedorTecnico, setProveedorTecnico] = useState('');
  const [telefonoTecnico, setTelefonoTecnico] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (equipoEditar) {
      setCodigoActivo(equipoEditar.codigoActivo || '');
      setNombre(equipoEditar.nombre || '');
      setCategoria(equipoEditar.categoria);
      setUbicacion(equipoEditar.ubicacion || 'Cocina');
      setEstadoOperativo(equipoEditar.estadoOperativo || 'operativo');
      setMarca(equipoEditar.marca || '');
      setModelo(equipoEditar.modelo || '');
      setNumeroSerie(equipoEditar.numeroSerie || '');
      setFechaCompraIso(equipoEditar.fechaCompraIso || '');
      setGarantiaHastaIso(equipoEditar.garantiaHastaIso || '');
      setFrecuenciaPreventivoDias(
        String(equipoEditar.frecuenciaPreventivoDias || 90)
      );
      setUltimoMantenimientoIso(equipoEditar.ultimoMantenimientoIso || '');
      setProximoMantenimientoIso(equipoEditar.proximoMantenimientoIso || '');
      setTipoAgenteExtintor(equipoEditar.tipoAgenteExtintor || 'tipo_k');
      setCapacidadExtintor(equipoEditar.capacidadExtintor || '');
      setFechaRecargaVenceIso(equipoEditar.fechaRecargaVenceIso || '');
      setFechaPruebaHidrostaticaIso(equipoEditar.fechaPruebaHidrostaticaIso || '');
      setCertificadoGasVenceIso(equipoEditar.certificadoGasVenceIso || '');
      setEmpresaCertificadora(equipoEditar.empresaCertificadora || '');
      setProveedorTecnico(equipoEditar.proveedorTecnico || '');
      setTelefonoTecnico(equipoEditar.telefonoTecnico || '');
      setNotas(equipoEditar.notas || '');
      return;
    }

    setCodigoActivo('');
    setNombre('');
    setCategoria('coccion');
    setUbicacion('Cocina');
    setEstadoOperativo('operativo');
    setMarca('');
    setModelo('');
    setNumeroSerie('');
    setFechaCompraIso('');
    setGarantiaHastaIso('');
    setFrecuenciaPreventivoDias('90');
    setUltimoMantenimientoIso('');
    setProximoMantenimientoIso('');
    setTipoAgenteExtintor('tipo_k');
    setCapacidadExtintor('6 Litros');
    setFechaRecargaVenceIso('');
    setFechaPruebaHidrostaticaIso('');
    setCertificadoGasVenceIso('');
    setEmpresaCertificadora('');
    setProveedorTecnico('');
    setTelefonoTecnico('');
    setNotas('');
  }, [isOpen, equipoEditar]);

  if (!isOpen) return null;

  const handleCategoriaChange = (cat: CategoriaEquipoMantenimiento) => {
    setCategoria(cat);
    if (!equipoEditar) {
      setFrecuenciaPreventivoDias(
        String(CATEGORIA_EQUIPO_META[cat]?.frecuenciaSugeridaDias ?? 90)
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombreLimpio = nombre.trim();
    if (nombreLimpio.length < 2) {
      createToast('Ingresa el nombre del equipo o activo', 'error');
      return;
    }

    const freq = Number(frecuenciaPreventivoDias);
    if (!Number.isFinite(freq) || freq < 1 || freq > 3650) {
      createToast('La frecuencia preventiva debe estar entre 1 y 3650 días', 'error');
      return;
    }

    try {
      setGuardando(true);
      const basePayload = {
        ...(codigoActivo.trim() ? { codigoActivo: codigoActivo.trim() } : {}),
        nombre: nombreLimpio,
        categoria,
        ubicacion: ubicacion.trim() || 'Cocina',
        estadoOperativo,
        frecuenciaPreventivoDias: Math.round(freq),
        ...(marca.trim() ? { marca: marca.trim() } : {}),
        ...(modelo.trim() ? { modelo: modelo.trim() } : {}),
        ...(numeroSerie.trim() ? { numeroSerie: numeroSerie.trim() } : {}),
        ...(fechaCompraIso ? { fechaCompraIso } : {}),
        ...(garantiaHastaIso ? { garantiaHastaIso } : {}),
        ...(ultimoMantenimientoIso ? { ultimoMantenimientoIso } : {}),
        ...(proximoMantenimientoIso ? { proximoMantenimientoIso } : {}),
        ...(categoria === 'extintor'
          ? {
              tipoAgenteExtintor,
              ...(capacidadExtintor.trim()
                ? { capacidadExtintor: capacidadExtintor.trim() }
                : {}),
              ...(fechaRecargaVenceIso ? { fechaRecargaVenceIso } : {}),
              ...(fechaPruebaHidrostaticaIso ? { fechaPruebaHidrostaticaIso } : {}),
            }
          : {}),
        ...(categoria === 'red_gas'
          ? {
              ...(certificadoGasVenceIso ? { certificadoGasVenceIso } : {}),
              ...(empresaCertificadora.trim()
                ? { empresaCertificadora: empresaCertificadora.trim() }
                : {}),
            }
          : {}),
        ...(proveedorTecnico.trim()
          ? { proveedorTecnico: proveedorTecnico.trim() }
          : {}),
        ...(telefonoTecnico.trim()
          ? { telefonoTecnico: telefonoTecnico.trim() }
          : {}),
        ...(notas.trim() ? { notas: notas.trim() } : {}),
      };

      if (equipoEditar) {
        await onActualizar(equipoEditar.id, basePayload);
        createToast(`Hoja de vida actualizada: ${nombreLimpio}`, 'success');
      } else {
        await onCrear({
          ...basePayload,
          creadoPor: creadoPorDefault,
        });
        createToast(`Activo registrado: ${nombreLimpio}`, 'success');
      }
      onClose();
    } catch (err) {
      createToast(
        err instanceof Error ? err.message : 'No se pudo guardar el equipo',
        'error'
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <StorefrontDialog
      labelledBy={titleId}
      onClose={onClose}
      onBackdropClick={() => {
        if (!guardando) onClose();
      }}
      canClose={!guardando}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-2xl max-h-[92dvh] overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 text-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/30 bg-gold-400/10 text-gold-400">
              <Wrench className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold text-white">
                {equipoEditar ? 'Editar Hoja de Vida del Activo' : 'Nuevo Equipo / Activo'}
              </h2>
              <p className="text-xs text-neutral-400">
                Cocina, refrigeración, extintores y red de gas
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={guardando}
            aria-label="Cerrar modal de equipo"
            className="grid h-11 w-11 place-items-center rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label
                htmlFor="eq-nombre"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Nombre del equipo / activo *
              </label>
              <input
                id="eq-nombre"
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Freidora Industrial #1, Extintor Tipo K"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="eq-codigo"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Código (opcional)
              </label>
              <input
                id="eq-codigo"
                type="text"
                value={codigoActivo}
                onChange={(e) => setCodigoActivo(e.target.value.toUpperCase())}
                placeholder="Auto (ej: COC-001)"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 font-mono text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor="eq-categoria"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Categoría
              </label>
              <select
                id="eq-categoria"
                value={categoria}
                onChange={(e) =>
                  handleCategoriaChange(e.target.value as CategoriaEquipoMantenimiento)
                }
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              >
                {CATEGORIA_EQUIPO_ORDEN.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORIA_EQUIPO_META[cat].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="eq-ubicacion"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Ubicación física *
              </label>
              <input
                id="eq-ubicacion"
                type="text"
                required
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
                placeholder="Ej: Línea de fritura"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="eq-estado"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Estado operativo
              </label>
              <select
                id="eq-estado"
                value={estadoOperativo}
                onChange={(e) =>
                  setEstadoOperativo(e.target.value as EstadoOperativoEquipo)
                }
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              >
                {ESTADOS_EQUIPO.map((est) => (
                  <option key={est} value={est}>
                    {ESTADO_OPERATIVO_EQUIPO_META[est].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor="eq-marca"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Marca
              </label>
              <input
                id="eq-marca"
                type="text"
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
                placeholder="Ej: Haceb, Pallomaro"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="eq-modelo"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Modelo
              </label>
              <input
                id="eq-modelo"
                type="text"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                placeholder="Ej: FR-20L"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="eq-serie"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Número de serie
              </label>
              <input
                id="eq-serie"
                type="text"
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
                placeholder="S/N"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 font-mono text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label
                htmlFor="eq-frecuencia"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Frecuencia preventiva (días)
              </label>
              <input
                id="eq-frecuencia"
                type="number"
                min={1}
                max={3650}
                required
                value={frecuenciaPreventivoDias}
                onChange={(e) => setFrecuenciaPreventivoDias(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="eq-ultimo"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Último mantenimiento
              </label>
              <input
                id="eq-ultimo"
                type="date"
                value={ultimoMantenimientoIso}
                onChange={(e) => setUltimoMantenimientoIso(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="eq-proximo"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Próximo mantenimiento
              </label>
              <input
                id="eq-proximo"
                type="date"
                value={proximoMantenimientoIso}
                onChange={(e) => setProximoMantenimientoIso(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
          </div>

          {categoria === 'extintor' && (
            <div className="space-y-3 rounded-xl border border-red-500/30 bg-red-950/20 p-3.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-300">
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                <span>Control Normativo de Extintor (Bomberos / INVIMA)</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="eq-agente-extintor"
                    className="mb-1 block text-xs font-semibold text-neutral-300"
                  >
                    Tipo de agente
                  </label>
                  <select
                    id="eq-agente-extintor"
                    value={tipoAgenteExtintor}
                    onChange={(e) =>
                      setTipoAgenteExtintor(e.target.value as TipoAgenteExtintor)
                    }
                    className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                  >
                    {TIPOS_AGENTE.map((ag) => (
                      <option key={ag} value={ag}>
                        {TIPO_AGENTE_EXTINTOR_META[ag].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="eq-capacidad-extintor"
                    className="mb-1 block text-xs font-semibold text-neutral-300"
                  >
                    Capacidad
                  </label>
                  <input
                    id="eq-capacidad-extintor"
                    type="text"
                    value={capacidadExtintor}
                    onChange={(e) => setCapacidadExtintor(e.target.value)}
                    placeholder="Ej: 6 Litros / 10 lb"
                    className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="eq-recarga-extintor"
                    className="mb-1 block text-xs font-semibold text-neutral-300"
                  >
                    Vence recarga anual
                  </label>
                  <input
                    id="eq-recarga-extintor"
                    type="date"
                    value={fechaRecargaVenceIso}
                    onChange={(e) => setFechaRecargaVenceIso(e.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="eq-hidrostatica"
                    className="mb-1 block text-xs font-semibold text-neutral-300"
                  >
                    Vence prueba hidrostática
                  </label>
                  <input
                    id="eq-hidrostatica"
                    type="date"
                    value={fechaPruebaHidrostaticaIso}
                    onChange={(e) => setFechaPruebaHidrostaticaIso(e.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {categoria === 'red_gas' && (
            <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-950/20 p-3.5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                <Flame className="h-4 w-4" aria-hidden="true" />
                <span>Certificación de Red de Gas / Válvulas</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="eq-cert-gas"
                    className="mb-1 block text-xs font-semibold text-neutral-300"
                  >
                    Vence revisión / certificado gas
                  </label>
                  <input
                    id="eq-cert-gas"
                    type="date"
                    value={certificadoGasVenceIso}
                    onChange={(e) => setCertificadoGasVenceIso(e.target.value)}
                    className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="eq-certificadora-gas"
                    className="mb-1 block text-xs font-semibold text-neutral-300"
                  >
                    Empresa certificadora / Gases
                  </label>
                  <input
                    id="eq-certificadora-gas"
                    type="text"
                    value={empresaCertificadora}
                    onChange={(e) => setEmpresaCertificadora(e.target.value)}
                    placeholder="Ej: Gases del Oriente / ONAC"
                    className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="eq-compra"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Fecha de compra
              </label>
              <input
                id="eq-compra"
                type="date"
                value={fechaCompraIso}
                onChange={(e) => setFechaCompraIso(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="eq-garantia"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Garantía hasta
              </label>
              <input
                id="eq-garantia"
                type="date"
                value={garantiaHastaIso}
                onChange={(e) => setGarantiaHastaIso(e.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="eq-tecnico"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Proveedor / Técnico habitual
              </label>
              <input
                id="eq-tecnico"
                type="text"
                value={proveedorTecnico}
                onChange={(e) => setProveedorTecnico(e.target.value)}
                placeholder="Ej: Refrigeración Norte"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="eq-tel-tecnico"
                className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
              >
                Teléfono técnico
              </label>
              <input
                id="eq-tel-tecnico"
                type="tel"
                value={telefonoTecnico}
                onChange={(e) => setTelefonoTecnico(e.target.value)}
                placeholder="3001234567"
                className="min-h-[44px] w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-sm text-white focus:border-gold-400 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="eq-notas"
              className="mb-1 block text-xs font-bold uppercase tracking-wider text-neutral-300"
            >
              Notas técnicas / recomendaciones
            </label>
            <textarea
              id="eq-notas"
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Especificaciones eléctricas, presión de gas, repuestos frecuentes..."
              className="w-full rounded-xl border border-neutral-700 bg-neutral-950 p-3 text-sm text-white focus:border-gold-400 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-neutral-800 pt-4">
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
              className="min-h-[44px]"
            >
              {equipoEditar ? 'Guardar Cambios' : 'Registrar Activo'}
            </Button>
          </div>
        </form>
      </div>
    </StorefrontDialog>
  );
}
