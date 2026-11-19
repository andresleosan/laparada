import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Gift,
  Plus,
  QrCode,
  Search,
  ShieldAlert,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useNegocio } from '@/context/NegocioContext';
import { useBonos } from '@/hooks/useBonos';
import { useClientes } from '@/hooks/useClientes';
import type {
  BonoPrepago,
  CambiarEstadoBonoInput,
  EmitirBonoInput,
  EstadoEfectivoBono,
  RecargarBonoInput,
  TipoBonoPrepago,
} from '@/types';
import {
  BonoCard,
  EmitirBonoModal,
  HistorialBonoModal,
  RecargarBonoModal,
  TarjetaBonoQrModal,
} from '@/components/bonos';
import {
  filtrarFilasBonos,
  generarCsvAuditoriaBonos,
  generarCsvMovimientosBonos,
  generarMensajeBonoWhatsApp,
  generarUrlWhatsAppBono,
  getBadgeEstadoBono,
  getEtiquetaTipoBono,
  parseFechaBono,
} from '@/utils/bonosUtils';
import { formatCOP } from '@/utils/formatCOP';
import { createToast } from '@/components/ui/Toast';

type TabBonos = 'bonos' | 'auditoria' | 'movimientos';
type FiltroTipo = TipoBonoPrepago | 'todos';
type FiltroEstado = EstadoEfectivoBono | 'todos' | 'con_saldo';

export function BonosPage() {
  const { negocioActual, usuarioNegocio } = useNegocio();
  const {
    movimientos,
    filasAuditoria,
    metricas,
    loading,
    error,
    emitirBono,
    recargarBono,
    cambiarEstado,
  } = useBonos(negocioActual.id);
  const { clientes } = useClientes(negocioActual.id);

  const [tab, setTab] = useState<TabBonos>('bonos');
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('todos');
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>('todos');

  const [modalEmitirOpen, setModalEmitirOpen] = useState(false);
  const [bonoParaQr, setBonoParaQr] = useState<BonoPrepago | null>(null);
  const [bonoParaRecarga, setBonoParaRecarga] = useState<BonoPrepago | null>(null);
  const [bonoParaHistorial, setBonoParaHistorial] = useState<BonoPrepago | null>(null);
  const [procesando, setProcesando] = useState(false);

  const responsableNombre =
    usuarioNegocio?.nombre || usuarioNegocio?.email || 'Administrador';

  const filasFiltradas = useMemo(
    () =>
      filtrarFilasBonos(filasAuditoria, {
        busqueda,
        tipo: filtroTipo,
        estado: filtroEstado,
      }),
    [filasAuditoria, busqueda, filtroTipo, filtroEstado]
  );

  const filasConAlertaVigencia = useMemo(
    () =>
      filasAuditoria.filter(
        ({ evaluacion, bono }) =>
          evaluacion.estadoEfectivo === 'por_vencer' ||
          (evaluacion.estadoEfectivo === 'vencido' && bono.saldoActual > 0)
      ),
    [filasAuditoria]
  );

  const movimientosFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();
    if (!term) return movimientos;
    return movimientos.filter((m) =>
      [
        m.bonoCodigo,
        m.titularNombre,
        m.codigoComprobante,
        m.notas || '',
        m.mesaNombre || '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [movimientos, busqueda]);

  // Cuadre contable de saldos
  const saldoTeoricoCargadoMenosRedimido = Math.max(
    0,
    metricas.totalCargadoHistorico - metricas.totalRedimidoHistorico
  );
  const saldoContableObservado =
    metricas.saldoCirculanteActivo +
    metricas.saldoVencidoNoRedimido +
    metricas.saldoBloqueadoOAnulado;
  const diferenciaCuadreSaldos = saldoContableObservado - saldoTeoricoCargadoMenosRedimido;

  const handleEmitirBono = async (input: EmitirBonoInput) => {
    setProcesando(true);
    try {
      const res = await emitirBono({
        ...input,
        responsableNombre,
      });
      setModalEmitirOpen(false);
      setBonoParaQr(res.bono);
      createToast(
        `${getEtiquetaTipoBono(res.bono.tipo)} ${res.bono.codigo} emitido por ${formatCOP(res.bono.montoInicial)}`,
        'success'
      );
    } finally {
      setProcesando(false);
    }
  };

  const handleConfirmarRecarga = async (input: RecargarBonoInput) => {
    setProcesando(true);
    try {
      const res = await recargarBono({
        ...input,
        responsableNombre,
      });
      createToast(
        `Recarga de ${formatCOP(res.movimiento.monto)} aplicada a ${res.bono.codigo}`,
        'success'
      );
      return res;
    } finally {
      setProcesando(false);
    }
  };

  const handleCambiarEstado = async (input: CambiarEstadoBonoInput) => {
    setProcesando(true);
    try {
      const res = await cambiarEstado({
        ...input,
        responsableNombre,
      });
      if (bonoParaHistorial?.id === res.bono.id) {
        setBonoParaHistorial(res.bono);
      }
      createToast(`Estado actualizado para ${res.bono.codigo}`, 'success');
    } finally {
      setProcesando(false);
    }
  };

  const handleCompartirWhatsApp = (bono: BonoPrepago) => {
    const msg = generarMensajeBonoWhatsApp(bono, negocioActual.nombre || 'La Parada');
    const url = generarUrlWhatsAppBono(bono.titularTelefono, msg);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleExportarCsv = () => {
    if (tab === 'movimientos') {
      if (movimientosFiltrados.length === 0) {
        createToast('No hay movimientos para exportar', 'info');
        return;
      }
      const csv = generarCsvMovimientosBonos(movimientosFiltrados);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `movimientos_bonos_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      createToast(`Libro CSV (${movimientosFiltrados.length} movimientos) descargado`, 'success');
      return;
    }

    if (filasFiltradas.length === 0) {
      createToast('No hay bonos en el filtro actual para exportar', 'info');
      return;
    }
    const csv = generarCsvAuditoriaBonos(filasFiltradas);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria_bonos_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    createToast(`Auditoría CSV (${filasFiltradas.length} bonos) descargada`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-gold-400/20 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-gold-400 border border-gold-400/30">
              {negocioActual.nombre || 'La Parada'}
            </span>
            <span className="rounded-full bg-emerald-500/15 text-emerald-400 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border border-emerald-500/30">
              Prepago & Vales 100% Offline
            </span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-white mt-1">
            Bonos de Regalo, Prepago & Vales
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Emisión con código QR único, carga en efectivo o transferencia, redención en POS/Mesas y auditoría de vigencia.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportarCsv}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800 px-3.5 text-xs font-bold text-neutral-200 hover:bg-neutral-700 transition-colors"
          >
            <Download className="h-4 w-4 text-gold-400" aria-hidden="true" />
            Exportar Auditoría CSV
          </button>

          <button
            type="button"
            onClick={() => setModalEmitirOpen(true)}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-gold-400 px-4 text-xs font-black text-base-dark hover:bg-gold-500 transition-all shadow-lg shadow-gold-400/10"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Emitir Bono / Tarjeta QR
          </button>
        </div>
      </div>

      {/* 4 KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Saldo Circulante Activo
            </span>
            <Wallet className="h-4 w-4 text-emerald-400" aria-hidden="true" />
          </div>
          <p className="font-display text-2xl font-black text-emerald-400">
            {formatCOP(metricas.saldoCirculanteActivo)}
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">
            {metricas.bonosActivosConSaldo} vigentes de {metricas.totalBonosEmitidos} emitidos
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Recaudo del Mes
            </span>
            <TrendingUp className="h-4 w-4 text-gold-400" aria-hidden="true" />
          </div>
          <p className="font-display text-2xl font-black text-gold-400">
            {formatCOP(metricas.recaudadoMesTotal)}
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">
            Efec: {formatCOP(metricas.recaudadoMesEfectivo)} · Transf:{' '}
            {formatCOP(metricas.recaudadoMesTransferencia)}
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Redimido y Tasa de Uso
            </span>
            <Gift className="h-4 w-4 text-sky-400" aria-hidden="true" />
          </div>
          <p className="font-display text-2xl font-black text-white">
            {formatCOP(metricas.totalRedimidoHistorico)}
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">
            Tasa de redención: {metricas.tasaRedencionPorcentaje}% del cargado
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Vigencia & Saldo Vencido
            </span>
            <AlertTriangle
              className={`h-4 w-4 ${
                metricas.bonosPorVencer > 0 || metricas.bonosVencidosConSaldo > 0
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
              aria-hidden="true"
            />
          </div>
          <p
            className={`font-display text-2xl font-black ${
              metricas.saldoVencidoNoRedimido > 0 ? 'text-red-400' : 'text-amber-300'
            }`}
          >
            {formatCOP(metricas.saldoVencidoNoRedimido)}
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">
            {metricas.bonosPorVencer} por vencer · {metricas.bonosVencidosConSaldo} vencido(s)
          </p>
        </div>
      </div>

      {/* Pestañas */}
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-800 pb-3">
        <button
          type="button"
          aria-pressed={tab === 'bonos'}
          onClick={() => setTab('bonos')}
          className={`min-h-[44px] inline-flex items-center gap-2 rounded-xl px-4 text-xs font-bold transition-colors ${
            tab === 'bonos'
              ? 'bg-gold-400 text-base-dark'
              : 'border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white'
          }`}
        >
          <QrCode className="h-4 w-4" aria-hidden="true" />
          Bonos y Tarjetas ({filasAuditoria.length})
        </button>

        <button
          type="button"
          aria-pressed={tab === 'auditoria'}
          onClick={() => setTab('auditoria')}
          className={`min-h-[44px] inline-flex items-center gap-2 rounded-xl px-4 text-xs font-bold transition-colors ${
            tab === 'auditoria'
              ? 'bg-amber-400 text-base-dark'
              : 'border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white'
          }`}
        >
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          Vigencia y Auditoría de Saldos ({filasConAlertaVigencia.length})
        </button>

        <button
          type="button"
          aria-pressed={tab === 'movimientos'}
          onClick={() => setTab('movimientos')}
          className={`min-h-[44px] inline-flex items-center gap-2 rounded-xl px-4 text-xs font-bold transition-colors ${
            tab === 'movimientos'
              ? 'bg-gold-400 text-base-dark'
              : 'border border-neutral-800 bg-neutral-900 text-neutral-300 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
          Libro de Movimientos ({movimientos.length})
        </button>
      </div>

      {/* Buscador y filtros */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar código QR, titular, teléfono o comprador..."
            aria-label="Buscar bonos y tarjetas prepago"
            className="min-h-[44px] w-full rounded-xl border border-neutral-800 bg-neutral-900 pl-10 pr-4 text-sm text-white placeholder-neutral-500 focus:border-gold-400 focus:outline-none"
          />
        </div>

        {tab === 'bonos' && (
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'todos', label: 'Todos los tipos' },
                { id: 'bono_regalo', label: 'Bonos Regalo' },
                { id: 'tarjeta_prepago', label: 'Tarjetas Prepago' },
                { id: 'vale_consumo', label: 'Vales' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                aria-pressed={filtroTipo === opt.id}
                onClick={() => setFiltroTipo(opt.id)}
                className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold transition-colors ${
                  filtroTipo === opt.id
                    ? 'border-gold-400 bg-gold-400/20 text-gold-300'
                    : 'border-neutral-800 bg-neutral-900 text-neutral-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as FiltroEstado)}
              aria-label="Filtrar bonos por estado"
              className="min-h-[44px] rounded-xl border border-neutral-800 bg-neutral-900 px-3 text-xs font-bold text-neutral-200 focus:border-gold-400 focus:outline-none"
            >
              <option value="todos">Todos los estados</option>
              <option value="con_saldo">Con Saldo (&gt; $0)</option>
              <option value="activo">Activos</option>
              <option value="por_vencer">Por Vencer (≤ 7d)</option>
              <option value="vencido">Vencidos</option>
              <option value="agotado">Agotados ($0)</option>
              <option value="bloqueado">Bloqueados</option>
              <option value="anulado">Anulados</option>
            </select>
          </div>
        )}
      </div>

      {/* Estado de error */}
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/40 bg-red-950/30 p-4 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      {/* Contenido por pestaña */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900/60"
            />
          ))}
        </div>
      ) : tab === 'bonos' ? (
        filasFiltradas.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/50 p-10 text-center space-y-3">
            <Gift className="mx-auto h-10 w-10 text-neutral-600" aria-hidden="true" />
            <h2 className="font-display text-lg font-bold text-white">
              {filasAuditoria.length === 0
                ? 'Aún no hay bonos ni tarjetas prepago emitidas'
                : 'Ningún bono coincide con los filtros'}
            </h2>
            <p className="text-xs text-neutral-400 max-w-md mx-auto">
              Emite bonos de regalo digitales con código QR único, tarjetas prepago recargables en efectivo o transferencia y vales de consumo para redimir en POS y Salón.
            </p>
            <button
              type="button"
              onClick={() => setModalEmitirOpen(true)}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-gold-400 px-4 text-xs font-black text-base-dark hover:bg-gold-500"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Emitir Primer Bono
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filasFiltradas.map((fila) => (
              <BonoCard
                key={fila.bono.id}
                fila={fila}
                onVerQr={() => setBonoParaQr(fila.bono)}
                onRecargar={() => setBonoParaRecarga(fila.bono)}
                onVerHistorial={() => setBonoParaHistorial(fila.bono)}
                onCompartirWhatsApp={() => handleCompartirWhatsApp(fila.bono)}
                onToggleBloqueo={() => {
                  void handleCambiarEstado({
                    bonoId: fila.bono.id,
                    accion: fila.bono.estado === 'bloqueado' ? 'desbloquear' : 'bloquear',
                    motivo:
                      fila.bono.estado === 'bloqueado'
                        ? 'Reactivación desde panel de bonos'
                        : 'Bloqueo preventivo desde panel de bonos',
                  });
                }}
              />
            ))}
          </div>
        )
      ) : tab === 'auditoria' ? (
        <div className="space-y-4">
          {/* Cuadre contable global */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/90 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-black text-white">
                Conciliación y Cuadre Contable de Saldos
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                  diferenciaCuadreSaldos === 0
                    ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                    : 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {diferenciaCuadreSaldos === 0
                  ? 'Cuadre Exacto ($0 diferencia)'
                  : `Diferencia: ${formatCOP(diferenciaCuadreSaldos)}`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                <span className="text-neutral-500 block">Total Cargado</span>
                <strong className="font-display text-base text-white">
                  {formatCOP(metricas.totalCargadoHistorico)}
                </strong>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                <span className="text-neutral-500 block">Total Redimido</span>
                <strong className="font-display text-base text-gold-400">
                  -{formatCOP(metricas.totalRedimidoHistorico)}
                </strong>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                <span className="text-neutral-500 block">Circulante Activo</span>
                <strong className="font-display text-base text-emerald-400">
                  {formatCOP(metricas.saldoCirculanteActivo)}
                </strong>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                <span className="text-neutral-500 block">Vencido No Redimido</span>
                <strong className="font-display text-base text-red-400">
                  {formatCOP(metricas.saldoVencidoNoRedimido)}
                </strong>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-3">
                <span className="text-neutral-500 block">Bloqueado / Anulado</span>
                <strong className="font-display text-base text-neutral-300">
                  {formatCOP(metricas.saldoBloqueadoOAnulado)}
                </strong>
              </div>
            </div>
          </div>

          {filasConAlertaVigencia.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-8 text-center space-y-2">
              <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-400" aria-hidden="true" />
              <h3 className="font-display text-base font-bold text-white">
                Sin alertas de vigencia ni saldos vencidos pendientes
              </h3>
              <p className="text-xs text-neutral-400">
                Todos los bonos con saldo tienen vigencia holgada o sin vencimiento.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filasConAlertaVigencia.map(({ bono, evaluacion }) => {
                const badge = getBadgeEstadoBono(evaluacion.estadoEfectivo);
                return (
                  <div
                    key={bono.id}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-neutral-800 bg-neutral-900/90 p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-black text-gold-400">
                          {bono.codigo}
                        </span>
                        <span className="text-sm font-bold text-white">
                          {bono.titularNombre}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${badge.badgeCls}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-xs text-neutral-400">
                        Saldo: <strong className="text-white">{formatCOP(bono.saldoActual)}</strong> ·{' '}
                        {evaluacion.estaVencido
                          ? `Venció hace ${evaluacion.diasVencido} día(s)`
                          : `Vence en ${evaluacion.diasParaVencer} día(s)`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={procesando}
                        onClick={() =>
                          void handleCambiarEstado({
                            bonoId: bono.id,
                            accion: 'extender_vigencia',
                            nuevaVigenciaDias: 30,
                          })
                        }
                        className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 px-3 text-xs font-bold text-emerald-300 hover:bg-emerald-900/40"
                      >
                        <CalendarClock className="h-4 w-4" aria-hidden="true" />
                        Extender +30d
                      </button>
                      <button
                        type="button"
                        onClick={() => setBonoParaHistorial(bono)}
                        className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-neutral-700 bg-neutral-800 px-3 text-xs font-bold text-neutral-200 hover:bg-neutral-700"
                      >
                        Ver Auditoría
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : movimientosFiltrados.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/50 p-10 text-center text-sm text-neutral-400">
          No hay movimientos registrados en el libro de bonos todavía.
        </div>
      ) : (
        <div className="space-y-2">
          {movimientosFiltrados.map((mov) => {
            const esEntrada = mov.tipo === 'emision' || mov.tipo === 'recarga';
            const esRedencion = mov.tipo === 'redencion';
            const fecha = parseFechaBono(mov.fecha);

            return (
              <div
                key={mov.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900/90 p-3.5"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${
                      esEntrada
                        ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                        : esRedencion
                          ? 'border-amber-500/30 bg-amber-500/15 text-amber-400'
                          : 'border-neutral-700 bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    {esEntrada ? (
                      <ArrowDownLeft className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black text-gold-400">
                        {mov.bonoCodigo}
                      </span>
                      <span className="text-sm font-bold text-white truncate">
                        {mov.titularNombre}
                      </span>
                      <span className="font-mono text-[10px] rounded bg-neutral-800 px-1.5 py-0.5 text-neutral-300">
                        {mov.codigoComprobante}
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400">
                      <span className="capitalize">{mov.tipo.replace('_', ' ')}</span>
                      {mov.metodoPago ? ` · ${mov.metodoPago}` : ''}
                      {mov.mesaNombre ? ` · ${mov.mesaNombre}` : ''}
                      {fecha
                        ? ` · ${fecha.toLocaleString('es-CO', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}`
                        : ''}
                      {mov.referenciaTransferencia ? ` · Ref: ${mov.referenciaTransferencia}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={`font-display text-base font-black ${
                      esEntrada
                        ? 'text-emerald-400'
                        : esRedencion
                          ? 'text-amber-300'
                          : 'text-neutral-300'
                    }`}
                  >
                    {esEntrada ? '+' : esRedencion ? '-' : ''}
                    {formatCOP(mov.monto)}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    Saldo: {formatCOP(mov.saldoResultante)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modales */}
      <EmitirBonoModal
        isOpen={modalEmitirOpen}
        clientes={clientes}
        guardando={procesando}
        onClose={() => setModalEmitirOpen(false)}
        onEmitir={handleEmitirBono}
      />

      <TarjetaBonoQrModal
        isOpen={Boolean(bonoParaQr)}
        bono={bonoParaQr}
        negocioNombre={negocioActual.nombre || 'La Parada'}
        onClose={() => setBonoParaQr(null)}
      />

      <RecargarBonoModal
        isOpen={Boolean(bonoParaRecarga)}
        bono={bonoParaRecarga}
        negocioNombre={negocioActual.nombre || 'La Parada'}
        guardando={procesando}
        onClose={() => setBonoParaRecarga(null)}
        onConfirmarRecarga={handleConfirmarRecarga}
      />

      <HistorialBonoModal
        isOpen={Boolean(bonoParaHistorial)}
        bono={bonoParaHistorial}
        movimientos={movimientos}
        procesando={procesando}
        onClose={() => setBonoParaHistorial(null)}
        onCambiarEstado={handleCambiarEstado}
      />
    </div>
  );
}
