import type {
  EncuestaSatisfaccion,
  CanalSatisfaccion,
  TipoExperienciaNps,
  TagSatisfaccionId,
  TagSatisfaccionMeta,
  KpisSatisfaccion,
  FiltrosSatisfaccion,
  ConfiguracionSatisfaccion,
} from '@/types/satisfaccion';

/**
 * Catálogo predefinido de etiquetas de retroalimentación gastronómica
 */
export const TAGS_SATISFACCION_PREDEFINIDOS: TagSatisfaccionMeta[] = [
  // Elogios y puntos altos (4-5 estrellas)
  {
    id: 'sabor_increible',
    label: 'Sabor increíble',
    tipo: 'positivo',
    icono: '🔥',
  },
  {
    id: 'porciones_generosas',
    label: 'Porciones generosas',
    tipo: 'positivo',
    icono: '🍟',
  },
  {
    id: 'atencion_rapida',
    label: 'Atención rápida',
    tipo: 'positivo',
    icono: '⚡',
  },
  {
    id: 'comida_caliente',
    label: 'Comida bien caliente',
    tipo: 'positivo',
    icono: '♨️',
  },
  {
    id: 'excelente_servicio',
    label: 'Excelente servicio',
    tipo: 'positivo',
    icono: '👏',
  },
  {
    id: 'buen_empaque',
    label: 'Empaque impecable',
    tipo: 'positivo',
    icono: '📦',
  },

  // Puntos a mejorar y quejas (1-3 estrellas)
  {
    id: 'comida_fria',
    label: 'Comida fría',
    tipo: 'constructivo',
    icono: '🧊',
  },
  {
    id: 'demora_excesiva',
    label: 'Demora excesiva',
    tipo: 'constructivo',
    icono: '⏳',
  },
  {
    id: 'pedido_incompleto',
    label: 'Pedido incompleto',
    tipo: 'constructivo',
    icono: '⚠️',
  },
  {
    id: 'falto_salsas',
    label: 'Faltaron salsas o cubiertos',
    tipo: 'constructivo',
    icono: '🥫',
  },
  {
    id: 'mala_atencion',
    label: 'Mala atención del personal',
    tipo: 'constructivo',
    icono: '🙁',
  },
  {
    id: 'empaque_danado',
    label: 'Empaque derramado o dañado',
    tipo: 'constructivo',
    icono: '📦',
  },
];

export function getTagMeta(id: TagSatisfaccionId): TagSatisfaccionMeta | undefined {
  return TAGS_SATISFACCION_PREDEFINIDOS.find((t) => t.id === id);
}

/**
 * Clasifica el tipo NPS según la escala de 1 a 5 estrellas
 */
export function evaluarTipoNps(calificacion: number): TipoExperienciaNps {
  if (calificacion >= 4) return 'promotor';
  if (calificacion === 3) return 'pasivo';
  return 'detractor';
}

/**
 * Determina si una encuesta califica como queja operativa
 */
export function esEncuestaQueja(calificacion: number, tags: TagSatisfaccionId[] = []): boolean {
  if (calificacion <= 2) return true;
  const tagsCriticos: TagSatisfaccionId[] = [
    'comida_fria',
    'demora_excesiva',
    'pedido_incompleto',
    'falto_salsas',
    'mala_atencion',
    'empaque_danado',
  ];
  return tags.some((t) => tagsCriticos.includes(t)) && calificacion <= 3;
}

/**
 * Extrae una fecha segura en formato Date a partir de varios tipos
 */
export function parseFechaEncuesta(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (
    typeof val === 'object' &&
    val !== null &&
    'toDate' in val &&
    typeof (val as { toDate: () => Date }).toDate === 'function'
  ) {
    return (val as { toDate: () => Date }).toDate();
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

/**
 * Calcula los KPIs ejecutivos y analíticos de Satisfacción y NPS
 */
export function calcularKpisSatisfaccion(encuestas: EncuestaSatisfaccion[]): KpisSatisfaccion {
  const total = encuestas.length;
  if (total === 0) {
    return {
      calificacionPromedio: 0,
      totalEncuestas: 0,
      promotoresCount: 0,
      pasivosCount: 0,
      detractoresCount: 0,
      indiceNps: 0,
      quejasPendientes: 0,
      quejasResueltas: 0,
      tasaCincoEstrellas: 0,
      promedioComida: 0,
      promedioServicio: 0,
      promedioTiempo: 0,
      promedioEmpaque: 0,
      topTagsPositivos: [],
      topTagsConstructivos: [],
    };
  }

  let sumaEstrellas = 0;
  let promotores = 0;
  let pasivos = 0;
  let detractores = 0;
  let cincoEstrellas = 0;
  let quejasPend = 0;
  let quejasRes = 0;

  let sumaComida = 0;
  let countComida = 0;
  let sumaServicio = 0;
  let countServicio = 0;
  let sumaTiempo = 0;
  let countTiempo = 0;
  let sumaEmpaque = 0;
  let countEmpaque = 0;

  const countTags: Record<TagSatisfaccionId, number> = {
    sabor_increible: 0,
    porciones_generosas: 0,
    atencion_rapida: 0,
    comida_caliente: 0,
    excelente_servicio: 0,
    buen_empaque: 0,
    comida_fria: 0,
    demora_excesiva: 0,
    pedido_incompleto: 0,
    falto_salsas: 0,
    mala_atencion: 0,
    empaque_danado: 0,
  };

  for (const e of encuestas) {
    const calif = Math.min(5, Math.max(1, e.calificacion || 1));
    sumaEstrellas += calif;
    if (calif === 5) cincoEstrellas++;

    const nps = e.tipoNps || evaluarTipoNps(calif);
    if (nps === 'promotor') promotores++;
    else if (nps === 'pasivo') pasivos++;
    else detractores++;

    if (e.esQueja) {
      if (e.estado === 'resuelta' || e.estado === 'archivada') {
        quejasRes++;
      } else {
        quejasPend++;
      }
    }

    if (e.dimensiones) {
      if (typeof e.dimensiones.comida === 'number' && e.dimensiones.comida > 0) {
        sumaComida += e.dimensiones.comida;
        countComida++;
      }
      if (typeof e.dimensiones.servicio === 'number' && e.dimensiones.servicio > 0) {
        sumaServicio += e.dimensiones.servicio;
        countServicio++;
      }
      if (typeof e.dimensiones.tiempo === 'number' && e.dimensiones.tiempo > 0) {
        sumaTiempo += e.dimensiones.tiempo;
        countTiempo++;
      }
      if (typeof e.dimensiones.empaque === 'number' && e.dimensiones.empaque > 0) {
        sumaEmpaque += e.dimensiones.empaque;
        countEmpaque++;
      }
    }

    if (Array.isArray(e.tags)) {
      for (const t of e.tags) {
        if (t in countTags) {
          countTags[t]++;
        }
      }
    }
  }

  // NPS = % Promotores - % Detractores (rango de -100 a +100)
  const pctPromotores = (promotores / total) * 100;
  const pctDetractores = (detractores / total) * 100;
  const indiceNps = Math.round(pctPromotores - pctDetractores);

  const topTagsPositivos = TAGS_SATISFACCION_PREDEFINIDOS
    .filter((t) => t.tipo === 'positivo' && countTags[t.id] > 0)
    .map((t) => ({ tag: t.id, label: t.label, count: countTags[t.id] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topTagsConstructivos = TAGS_SATISFACCION_PREDEFINIDOS
    .filter((t) => t.tipo === 'constructivo' && countTags[t.id] > 0)
    .map((t) => ({ tag: t.id, label: t.label, count: countTags[t.id] }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    calificacionPromedio: Number((sumaEstrellas / total).toFixed(1)),
    totalEncuestas: total,
    promotoresCount: promotores,
    pasivosCount: pasivos,
    detractoresCount: detractores,
    indiceNps,
    quejasPendientes: quejasPend,
    quejasResueltas: quejasRes,
    tasaCincoEstrellas: Math.round((cincoEstrellas / total) * 100),
    promedioComida: countComida > 0 ? Number((sumaComida / countComida).toFixed(1)) : 0,
    promedioServicio: countServicio > 0 ? Number((sumaServicio / countServicio).toFixed(1)) : 0,
    promedioTiempo: countTiempo > 0 ? Number((sumaTiempo / countTiempo).toFixed(1)) : 0,
    promedioEmpaque: countEmpaque > 0 ? Number((sumaEmpaque / countEmpaque).toFixed(1)) : 0,
    topTagsPositivos,
    topTagsConstructivos,
  };
}

/**
 * Filtra encuestas según criterios del panel administrativo
 */
export function filtrarEncuestas(
  encuestas: EncuestaSatisfaccion[],
  filtros: FiltrosSatisfaccion
): EncuestaSatisfaccion[] {
  return encuestas.filter((e) => {
    // Canal
    if (filtros.canal && filtros.canal !== 'todos') {
      if (e.canal !== filtros.canal) return false;
    }

    // Calificación
    if (filtros.calificacion && filtros.calificacion !== 'todas') {
      if (filtros.calificacion === '5' && e.calificacion !== 5) return false;
      if (filtros.calificacion === '4' && e.calificacion !== 4) return false;
      if (filtros.calificacion === '3' && e.calificacion !== 3) return false;
      if (filtros.calificacion === '1-2' && e.calificacion > 2) return false;
    }

    // Solo Quejas
    if (filtros.soloQuejas && !e.esQueja) {
      return false;
    }

    // Estado
    if (filtros.estado && filtros.estado !== 'todos') {
      if (e.estado !== filtros.estado) return false;
    }

    // Búsqueda textual
    if (filtros.busqueda && filtros.busqueda.trim()) {
      const q = filtros.busqueda.toLowerCase().trim();
      const matchCliente = (e.clienteNombre || '').toLowerCase().includes(q);
      const matchTel = (e.clienteTelefono || '').includes(q);
      const matchMesa = (e.mesaNombre || '').toLowerCase().includes(q);
      const matchMesero = (e.meseroNombre || '').toLowerCase().includes(q);
      const matchComentario = (e.comentario || '').toLowerCase().includes(q);
      const matchVenta = (e.ventaId || '').toLowerCase().includes(q);
      if (!matchCliente && !matchTel && !matchMesa && !matchMesero && !matchComentario && !matchVenta) {
        return false;
      }
    }

    // Fechas
    if (filtros.fechaDesde || filtros.fechaHasta) {
      const fechaEnc = parseFechaEncuesta(e.creadoEn).getTime();
      if (filtros.fechaDesde) {
        const d = new Date(filtros.fechaDesde).getTime();
        if (fechaEnc < d) return false;
      }
      if (filtros.fechaHasta) {
        const h = new Date(filtros.fechaHasta).getTime() + 86400000;
        if (fechaEnc >= h) return false;
      }
    }

    return true;
  });
}

/**
 * Genera la URL pública para enviar al comensal por WhatsApp, ticket térmico o código QR
 */
export function generarUrlEncuestaPublica(params: {
  baseUrl?: string;
  negocioId: string;
  ventaId?: string;
  pedidoId?: string;
  canal?: CanalSatisfaccion;
  mesaNombre?: string;
  clienteNombre?: string;
  clienteTelefono?: string;
}): string {
  const base = (params.baseUrl || window.location.origin).replace(/\/$/, '');
  const query = new URLSearchParams();

  query.set('negocio', params.negocioId);
  if (params.canal) query.set('canal', params.canal);
  if (params.ventaId) query.set('venta', params.ventaId);
  if (params.pedidoId) query.set('pedido', params.pedidoId);
  if (params.mesaNombre) query.set('mesa', params.mesaNombre);
  if (params.clienteNombre) query.set('cliente', params.clienteNombre);
  if (params.clienteTelefono) query.set('tel', params.clienteTelefono);

  return `${base}/calificar?${query.toString()}`;
}

/**
 * Genera el mensaje estructurado de WhatsApp para responder a una queja o dar seguimiento
 */
export function generarMensajeWhatsAppRespuestaQueja(params: {
  encuesta: EncuestaSatisfaccion;
  nombreNegocio?: string;
}): string {
  const { encuesta, nombreNegocio = 'La Parada' } = params;
  const nombre = encuesta.clienteNombre ? ` ${encuesta.clienteNombre}` : '';
  const pedido = encuesta.ventaId ? ` (Pedido #${encuesta.ventaId.slice(-6).toUpperCase()})` : '';
  const mesa = encuesta.mesaNombre ? ` en ${encuesta.mesaNombre}` : '';

  const tagsTexto = (encuesta.tags || [])
    .map((t) => {
      const meta = getTagMeta(t);
      return meta ? `• ${meta.label}` : '';
    })
    .filter(Boolean)
    .join('\n');

  return (
    `Hola${nombre}, te escribimos desde la administración de *${nombreNegocio}*${pedido}${mesa}. 🙏\n\n` +
    `Lamentamos sinceramente que tu experiencia no haya sido de 5 estrellas (calificación: ${'⭐'.repeat(encuesta.calificacion)}).\n` +
    (tagsTexto ? `Tomamos nota de tus comentarios:\n${tagsTexto}\n\n` : '\n') +
    (encuesta.comentario ? `Observación: _"${encuesta.comentario}"_\n\n` : '') +
    `Para nosotros tu satisfacción es lo más importante. Queremos recompensarte y asegurarnos de que tu próxima experiencia sea perfecta. ¿En qué podemos ayudarte de inmediato? 🍔❤️`
  );
}

/**
 * Genera el mensaje estructurado de WhatsApp para agradecer a un cliente satisfecho
 */
export function generarMensajeWhatsAppAgradecimiento(params: {
  encuesta: EncuestaSatisfaccion;
  nombreNegocio?: string;
  googleBusinessUrl?: string;
}): string {
  const { encuesta, nombreNegocio = 'La Parada', googleBusinessUrl } = params;
  const nombre = encuesta.clienteNombre ? ` ${encuesta.clienteNombre}` : '';

  return (
    `¡Hola${nombre}! Muchísimas gracias por tu calificación de ${'⭐'.repeat(encuesta.calificacion)} en *${nombreNegocio}*. 🤩🍟\n\n` +
    `Nos alegra enormemente saber que disfrutaste tu comida y atención. Todo el equipo te agradece tu confianza.\n\n` +
    (googleBusinessUrl
      ? `Nos ayudarías muchísimo compartiendo tu experiencia en Google Maps aquí: 👇\n${googleBusinessUrl}\n\n`
      : '') +
    `¡Te esperamos pronto de nuevo! 🍔🔥`
  );
}

/**
 * Genera el archivo contable y de calidad CSV con cabeceras y UTF-8 BOM
 */
export function generarEncuestasCsv(encuestas: EncuestaSatisfaccion[]): string {
  const cabeceras = [
    'ID Encuesta',
    'Fecha',
    'Hora',
    'Canal',
    'Estrellas',
    'NPS',
    'Es Queja',
    'Estado',
    'Cliente',
    'Telefono',
    'Mesa',
    'Venta / Pedido',
    'Comida (1-5)',
    'Servicio (1-5)',
    'Tiempo (1-5)',
    'Empaque (1-5)',
    'Etiquetas',
    'Comentario Comensal',
    'Redirigido Google Reviews',
    'Notas Internas',
  ];

  const filas = encuestas.map((e) => {
    const fecha = parseFechaEncuesta(e.creadoEn);
    const fechaStr = fecha.toISOString().slice(0, 10);
    const horaStr = fecha.toTimeString().slice(0, 8);
    const tagsStr = (e.tags || [])
      .map((t) => getTagMeta(t)?.label || t)
      .join('; ');

    const sanitizar = (str?: string) => `"${(str || '').replace(/"/g, '""')}"`;

    return [
      sanitizar(e.id),
      fechaStr,
      horaStr,
      e.canal,
      e.calificacion,
      e.tipoNps,
      e.esQueja ? 'SI' : 'NO',
      e.estado,
      sanitizar(e.clienteNombre || ''),
      sanitizar(e.clienteTelefono || ''),
      sanitizar(e.mesaNombre || ''),
      sanitizar(e.ventaId || e.pedidoId || ''),
      e.dimensiones?.comida || '',
      e.dimensiones?.servicio || '',
      e.dimensiones?.tiempo || '',
      e.dimensiones?.empaque || '',
      sanitizar(tagsStr),
      sanitizar(e.comentario || ''),
      e.redirigidoGoogleReviews ? 'SI' : 'NO',
      sanitizar(e.notasInternas || ''),
    ].join(',');
  });

  return `\uFEFF${cabeceras.join(',')}\n${filas.join('\n')}`;
}

/**
 * Dispara la descarga del archivo CSV en el navegador
 */
export function descargarEncuestasCsv(
  encuestas: EncuestaSatisfaccion[],
  nombreArchivo = 'encuestas_satisfaccion.csv'
): void {
  if (typeof document === 'undefined') return;
  const contenido = generarEncuestasCsv(encuestas);
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', nombreArchivo);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Obtiene la configuración por defecto para un nuevo tenant
 */
export function getConfiguracionSatisfaccionDefault(negocioId: string): ConfiguracionSatisfaccion {
  return {
    negocioId,
    googleBusinessUrl: '',
    telefonoAtencionQuejas: '',
    habilitarRedireccionGoogle: true,
    mensajeAgradecimiento5Estrellas:
      '¡Muchísimas gracias por tu calificación! Nos alegra saber que disfrutaste tu comida.',
    mensajeDisculpaQueja:
      'Lamentamos mucho que tu experiencia no haya sido óptima. Nuestro equipo ya fue notificado y queremos compensarte.',
  };
}
