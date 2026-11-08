// src/components/promociones/NuevaPromocionModal.tsx
import { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Flame,
  Gift,
  Sparkles,
  Tag,
  Ticket,
  X,
} from 'lucide-react';
import type {
  CanalPromocion,
  CrearPromocionInput,
  Promocion,
  TipoDescuentoPromocion,
  TipoPromocion,
} from '@/types/promocion';
import type { CategoriaProducto, Producto } from '@/types';
import { StorefrontDialog } from '@/components/storefront/StorefrontDialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { DIAS_SEMANA_LABELS } from '@/utils/promocionesUtils';

interface NuevaPromocionModalProps {
  isOpen: boolean;
  promocionEditar?: Promocion | null;
  categorias: CategoriaProducto[];
  productos?: Producto[];
  onGuardar: (datos: Omit<CrearPromocionInput, 'negocioId'>) => Promise<void>;
  onClose: () => void;
}

export function NuevaPromocionModal({
  isOpen,
  promocionEditar,
  categorias,
  productos: _productos,
  onGuardar,
  onClose,
}: NuevaPromocionModalProps) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState<TipoPromocion>('happy_hour');
  const [canales, setCanales] = useState<CanalPromocion[]>(['todos']);
  const [tipoDescuento, setTipoDescuento] = useState<TipoDescuentoPromocion>('porcentaje');
  const [valorDescuento, setValorDescuento] = useState<number>(20);
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5]); // Lun - Vie por defecto
  const [horaInicio, setHoraInicio] = useState('17:00');
  const [horaFin, setHoraFin] = useState('20:00');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [codigoCupon, setCodigoCupon] = useState('');
  const [limiteUsos, setLimiteUsos] = useState<string>('');
  const [montoMinimoSubtotal, setMontoMinimoSubtotal] = useState<string>('');
  const [topeDescuentoMaximoCOP, setTopeDescuentoMaximoCOP] = useState<string>('');
  const [categoriaIds, setCategoriaIds] = useState<string[]>([]);
  const [productoIds, setProductoIds] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (promocionEditar) {
      setNombre(promocionEditar.nombre);
      setDescripcion(promocionEditar.descripcion || '');
      setTipo(promocionEditar.tipo);
      setCanales(promocionEditar.canales || ['todos']);
      setTipoDescuento(promocionEditar.tipoDescuento);
      setValorDescuento(promocionEditar.valorDescuento);
      setDiasSemana(promocionEditar.diasSemana || []);
      setHoraInicio(promocionEditar.horaInicio || '');
      setHoraFin(promocionEditar.horaFin || '');
      setFechaInicio(promocionEditar.fechaInicio || '');
      setFechaFin(promocionEditar.fechaFin || '');
      setCodigoCupon(promocionEditar.codigoCupon || '');
      setLimiteUsos(promocionEditar.limiteUsos ? String(promocionEditar.limiteUsos) : '');
      setMontoMinimoSubtotal(promocionEditar.montoMinimoSubtotal ? String(promocionEditar.montoMinimoSubtotal) : '');
      setTopeDescuentoMaximoCOP(promocionEditar.topeDescuentoMaximoCOP ? String(promocionEditar.topeDescuentoMaximoCOP) : '');
      setCategoriaIds(promocionEditar.categoriaIds || []);
      setProductoIds(promocionEditar.productoIds || []);
    } else {
      // Valores por defecto para nueva promo
      setNombre('');
      setDescripcion('');
      setTipo('happy_hour');
      setCanales(['todos']);
      setTipoDescuento('porcentaje');
      setValorDescuento(20);
      setDiasSemana([1, 2, 3, 4, 5]);
      setHoraInicio('17:00');
      setHoraFin('20:00');
      setFechaInicio('');
      setFechaFin('');
      setCodigoCupon('');
      setLimiteUsos('');
      setMontoMinimoSubtotal('');
      setTopeDescuentoMaximoCOP('');
      setCategoriaIds([]);
      setProductoIds([]);
    }
  }, [promocionEditar, isOpen]);

  // Si cambia a 2x1, forzar tipo de descuento a 'dos_por_uno'
  const handleCambioTipo = (nuevoTipo: TipoPromocion) => {
    setTipo(nuevoTipo);
    if (nuevoTipo === 'dos_por_uno') {
      setTipoDescuento('dos_por_uno');
      setValorDescuento(100);
      if (!nombre) setNombre('2x1 Especial');
    } else if (nuevoTipo === 'happy_hour') {
      setTipoDescuento('porcentaje');
      setValorDescuento(20);
      setHoraInicio('17:00');
      setHoraFin('20:00');
      if (!nombre) setNombre('Happy Hour Tardeo');
    } else if (nuevoTipo === 'cupon_descuento') {
      if (!codigoCupon) generarCodigoAleatorio();
      if (!nombre) setNombre('Cupón Descuento VIP');
    }
  };

  const generarCodigoAleatorio = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codigo = 'PARADA';
    for (let i = 0; i < 4; i++) {
      codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCodigoCupon(codigo);
  };

  const toggleDia = (dia: number) => {
    if (diasSemana.includes(dia)) {
      setDiasSemana(diasSemana.filter((d) => d !== dia));
    } else {
      setDiasSemana([...diasSemana, dia].sort((a, b) => a - b));
    }
  };

  const seleccionarTodosLosDias = () => {
    if (diasSemana.length === 7) {
      setDiasSemana([]);
    } else {
      setDiasSemana([0, 1, 2, 3, 4, 5, 6]);
    }
  };

  const toggleCategoria = (catId: string) => {
    if (categoriaIds.includes(catId)) {
      setCategoriaIds(categoriaIds.filter((id) => id !== catId));
    } else {
      setCategoriaIds([...categoriaIds, catId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setGuardando(true);
    try {
      await onGuardar({
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        tipo,
        canales,
        tipoDescuento: tipo === 'dos_por_uno' ? 'dos_por_uno' : tipoDescuento,
        valorDescuento: tipo === 'dos_por_uno' ? 100 : Number(valorDescuento) || 0,
        diasSemana,
        horaInicio: horaInicio || undefined,
        horaFin: horaFin || undefined,
        fechaInicio: fechaInicio || undefined,
        fechaFin: fechaFin || undefined,
        codigoCupon: tipo === 'cupon_descuento' ? codigoCupon.trim().toUpperCase() : undefined,
        limiteUsos: limiteUsos ? Number(limiteUsos) : undefined,
        montoMinimoSubtotal: montoMinimoSubtotal ? Number(montoMinimoSubtotal) : undefined,
        topeDescuentoMaximoCOP: topeDescuentoMaximoCOP ? Number(topeDescuentoMaximoCOP) : undefined,
        categoriaIds,
        productoIds,
        activo: promocionEditar ? promocionEditar.activo : true,
      });
      onClose();
    } catch {
      // El toast de error se maneja en el hook
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <StorefrontDialog
      labelledBy="modal-promocion-title"
      onClose={onClose}
      onBackdropClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
    >
      <div className="relative max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-neutral-800">
          <div>
            <h2 id="modal-promocion-title" className="text-lg font-bold text-white">
              {promocionEditar ? 'Editar Promoción' : 'Nueva Promoción Comercial'}
            </h2>
            <p className="text-xs text-neutral-400">
              Configura reglas dinámicas de Happy Hour, 2x1 o cupones digitales con código QR.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 text-neutral-200">
        {/* 1. Selector de Tipo de Promoción */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Tipo de Campaña Promocional
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'happy_hour', label: 'Happy Hour', icon: Flame, desc: 'Horario específico' },
              { id: 'dos_por_uno', label: '2x1 Especial', icon: Gift, desc: 'Lleva 2 paga 1' },
              { id: 'descuento_categoria', label: '% Categoría', icon: Tag, desc: 'En hamburguesas, etc.' },
              { id: 'cupon_descuento', label: 'Cupón QR', icon: Ticket, desc: 'Código digital' },
            ].map((t) => {
              const Icon = t.icon;
              const seleccionado = tipo === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleCambioTipo(t.id as TipoPromocion)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center transition min-h-[58px] ${
                    seleccionado
                      ? 'border-gold-400 bg-gold-500/10 text-white'
                      : 'border-neutral-800 bg-neutral-900/60 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                  }`}
                >
                  <Icon className={`h-5 w-5 mb-1 ${seleccionado ? 'text-gold-400' : 'text-neutral-400'}`} />
                  <span className="text-xs font-bold">{t.label}</span>
                  <span className="text-[10px] text-neutral-400">{t.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Datos Generales: Nombre y Descripción */}
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label htmlFor="promo-nombre" className="block text-xs font-semibold text-neutral-300 mb-1">
              Nombre de la Promoción *
            </label>
            <Input
              id="promo-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Happy Hour Cervezas 2x1 o Viernes 20% OFF"
              required
            />
          </div>

          <div>
            <label htmlFor="promo-desc" className="block text-xs font-semibold text-neutral-300 mb-1">
              Descripción o Mensaje Atractivo (Opcional)
            </label>
            <Input
              id="promo-desc"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Válido de 5 a 8 PM en todas nuestras cervezas artesanales"
            />
          </div>
        </div>

        {/* 3. Canales Permitidos */}
        <div>
          <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
            Canales de Aplicación
          </label>
          <div className="flex flex-wrap gap-2">
            {[
              { val: 'todos', label: 'Todos los Canales (POS + Web)' },
              { val: 'pos', label: 'Solo Mostrador POS' },
              { val: 'storefront', label: 'Solo Tienda Web' },
            ].map((c) => (
              <button
                key={c.val}
                type="button"
                onClick={() => setCanales([c.val as CanalPromocion])}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition ${
                  canales.includes(c.val as CanalPromocion)
                    ? 'border-gold-400 bg-gold-500/10 text-gold-300'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Configuración del Descuento */}
        {tipo !== 'dos_por_uno' && (
          <div className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-neutral-300">Tipo de Descuento</span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setTipoDescuento('porcentaje')}
                  className={`px-2.5 py-1 text-xs rounded font-medium border transition ${
                    tipoDescuento === 'porcentaje'
                      ? 'border-gold-400 bg-gold-400 text-black font-bold'
                      : 'border-neutral-700 bg-neutral-800 text-neutral-300'
                  }`}
                >
                  % Porcentaje
                </button>
                <button
                  type="button"
                  onClick={() => setTipoDescuento('monto_fijo')}
                  className={`px-2.5 py-1 text-xs rounded font-medium border transition ${
                    tipoDescuento === 'monto_fijo'
                      ? 'border-gold-400 bg-gold-400 text-black font-bold'
                      : 'border-neutral-700 bg-neutral-800 text-neutral-300'
                  }`}
                >
                  $ Monto Fijo (COP)
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="promo-valor" className="block text-xs font-semibold text-neutral-300 mb-1">
                  {tipoDescuento === 'porcentaje' ? 'Porcentaje de descuento (%)' : 'Valor del descuento (COP)'}
                </label>
                <Input
                  id="promo-valor"
                  type="number"
                  min="1"
                  max={tipoDescuento === 'porcentaje' ? '100' : '500000'}
                  value={valorDescuento}
                  onChange={(e) => setValorDescuento(Number(e.target.value))}
                  required
                />
              </div>

              <div>
                <label htmlFor="promo-tope" className="block text-xs font-semibold text-neutral-300 mb-1">
                  Tope Máximo de Descuento COP (Opcional)
                </label>
                <Input
                  id="promo-tope"
                  type="number"
                  placeholder="Ej: 20000"
                  value={topeDescuentoMaximoCOP}
                  onChange={(e) => setTopeDescuentoMaximoCOP(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. Si es Cupón Digital: Código y Límite de Usos */}
        {tipo === 'cupon_descuento' && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <Ticket className="h-4 w-4" /> Parámetros del Cupón Digital
              </span>
              <button
                type="button"
                onClick={generarCodigoAleatorio}
                className="text-xs text-emerald-400 hover:text-emerald-300 underline flex items-center gap-1"
              >
                <Sparkles className="h-3 w-3" /> Generar Código
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="promo-codigo" className="block text-xs font-semibold text-neutral-300 mb-1">
                  Código del Cupón *
                </label>
                <Input
                  id="promo-codigo"
                  value={codigoCupon}
                  onChange={(e) => setCodigoCupon(e.target.value.toUpperCase())}
                  placeholder="Ej: PARADA20"
                  className="font-mono uppercase font-bold tracking-wider"
                  required
                />
              </div>

              <div>
                <label htmlFor="promo-limite-usos" className="block text-xs font-semibold text-neutral-300 mb-1">
                  Límite de Canjes Totales (Opcional)
                </label>
                <Input
                  id="promo-limite-usos"
                  type="number"
                  min="1"
                  placeholder="Ej: 50 cupones"
                  value={limiteUsos}
                  onChange={(e) => setLimiteUsos(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* 6. Horarios y Días de la Semana */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" /> Días de la Semana
            </label>
            <button
              type="button"
              onClick={seleccionarTodosLosDias}
              className="text-xs text-gold-400 hover:underline"
            >
              {diasSemana.length === 7 ? 'Deseleccionar todos' : 'Todos los días'}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {DIAS_SEMANA_LABELS.map((d) => {
              const activo = diasSemana.includes(d.dia);
              return (
                <button
                  key={d.dia}
                  type="button"
                  onClick={() => toggleDia(d.dia)}
                  className={`h-9 w-9 rounded-full text-xs font-bold flex items-center justify-center transition border ${
                    activo
                      ? 'border-gold-400 bg-gold-400 text-black shadow-sm'
                      : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                  }`}
                  aria-pressed={activo}
                  aria-label={d.fullLabel}
                >
                  {d.label}
                </button>
              );
            })}
          </div>

          {/* Franja Horaria */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div>
              <label htmlFor="promo-hora-inicio" className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-400" /> Hora de Inicio
              </label>
              <Input
                id="promo-hora-inicio"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="promo-hora-fin" className="block text-xs font-semibold text-neutral-300 mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3 text-amber-400" /> Hora de Fin
              </label>
              <Input
                id="promo-hora-fin"
                type="time"
                value={horaFin}
                onChange={(e) => setHoraFin(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 7. Categorías Aplicables (para Happy Hour, 2x1 o Categoría OFF) */}
        {categorias.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" /> Categorías que Aplican (Opcional)
            </label>
            <p className="text-[11px] text-neutral-400">
              Si no seleccionas ninguna, aplicará a todo el catálogo.
            </p>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 border border-neutral-800 rounded-md bg-neutral-950/40">
              {categorias.map((cat) => {
                const seleccionada = categoriaIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategoria(cat.id)}
                    className={`px-2.5 py-1 rounded text-xs font-medium border transition ${
                      seleccionada
                        ? 'border-purple-400 bg-purple-500/20 text-purple-300'
                        : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                    }`}
                  >
                    {cat.nombre}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 8. Compra Mínima */}
        <div>
          <label htmlFor="promo-compra-minima" className="block text-xs font-semibold text-neutral-300 mb-1">
            Monto Mínimo de Compra COP (Opcional)
          </label>
          <Input
            id="promo-compra-minima"
            type="number"
            placeholder="Ej: 30000"
            value={montoMinimoSubtotal}
            onChange={(e) => setMontoMinimoSubtotal(e.target.value)}
          />
        </div>

        {/* Botones de Envío */}
        <div className="pt-3 border-t border-neutral-800 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={guardando}
            className="text-neutral-400 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={guardando}
            disabled={guardando || !nombre.trim()}
            className="bg-gold-400 text-black hover:bg-gold-500 font-bold px-6"
          >
            {promocionEditar ? 'Guardar Cambios' : 'Crear Promoción'}
          </Button>
        </div>
      </form>
      </div>
    </StorefrontDialog>
  );
}
