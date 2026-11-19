import type {
  ConfiguracionHorariosNegocio,
  DiaSemanaHorario,
  EstadoOperativoManual,
  HorarioDiaNegocio,
  ResultadoDisponibilidadNegocio,
} from '@/types/negocio';

export const DEFAULT_ZONA_HORARIA = 'America/Bogota';

export const DIAS_SEMANA_ORDEN: DiaSemanaHorario[] = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
];

export const DIAS_SEMANA_LABELS: Record<DiaSemanaHorario, string> = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo',
};

const WEEKDAY_EN_TO_DIA: Record<string, DiaSemanaHorario> = {
  Mon: 'lunes',
  Tue: 'martes',
  Wed: 'miercoles',
  Thu: 'jueves',
  Fri: 'viernes',
  Sat: 'sabado',
  Sun: 'domingo',
};

const HORARIO_HHMM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function esHoraValidaHHMM(valor: string): boolean {
  return HORARIO_HHMM_REGEX.test(valor.trim());
}

export function parsearMinutosHHMM(valor: string): number | null {
  const match = HORARIO_HHMM_REGEX.exec(valor.trim());
  if (!match) return null;
  const horas = Number(match[1]);
  const minutos = Number(match[2]);
  return horas * 60 + minutos;
}

export function validarHorarioDia(apertura: string, cierre: string): string | null {
  if (!esHoraValidaHHMM(apertura)) {
    return 'La hora de apertura debe tener formato HH:mm (24h).';
  }
  if (!esHoraValidaHHMM(cierre)) {
    return 'La hora de cierre debe tener formato HH:mm (24h).';
  }
  if (apertura.trim() === cierre.trim()) {
    return 'La hora de apertura y cierre no pueden ser iguales.';
  }
  return null;
}

export function formatearHora12h(valor: string): string {
  const minutosTotales = parsearMinutosHHMM(valor);
  if (minutosTotales === null) return valor;
  const horas24 = Math.floor(minutosTotales / 60);
  const mins = minutosTotales % 60;
  const sufijo = horas24 >= 12 ? 'p. m.' : 'a. m.';
  const horas12 = horas24 % 12 === 0 ? 12 : horas24 % 12;
  return `${horas12}:${String(mins).padStart(2, '0')} ${sufijo}`;
}

export function crearConfigHorariosDefault(): ConfiguracionHorariosNegocio {
  const dias = {} as Record<DiaSemanaHorario, HorarioDiaNegocio>;
  for (const dia of DIAS_SEMANA_ORDEN) {
    dias[dia] = {
      activo: true,
      apertura: '16:00',
      cierre: '23:30',
    };
  }
  return {
    zonaHoraria: DEFAULT_ZONA_HORARIA,
    dias,
    estadoManual: 'automatico',
    pausaHastaMs: null,
    motivoCierreOPausa: '',
  };
}

export function obtenerFechaEnZonaHoraria(
  nowMs: number = Date.now(),
  zonaHoraria: string = DEFAULT_ZONA_HORARIA
): { dia: DiaSemanaHorario; diaIndex: number; minutosDia: number } {
  const tz = zonaHoraria && zonaHoraria.trim() ? zonaHoraria.trim() : DEFAULT_ZONA_HORARIA;
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(nowMs));
  } catch {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: DEFAULT_ZONA_HORARIA,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(nowMs));
  }

  const weekdayStr = parts.find((p) => p.type === 'weekday')?.value ?? 'Mon';
  const hourRaw = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minuteRaw = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  const hour = hourRaw === 24 ? 0 : hourRaw;
  const dia = WEEKDAY_EN_TO_DIA[weekdayStr] ?? 'lunes';
  const diaIndex = DIAS_SEMANA_ORDEN.indexOf(dia);

  return {
    dia,
    diaIndex: diaIndex >= 0 ? diaIndex : 0,
    minutosDia: hour * 60 + minuteRaw,
  };
}

function calcularProximaAperturaTexto(
  config: ConfiguracionHorariosNegocio,
  diaIndex: number,
  minutosDia: number
): string | undefined {
  const diaActual = DIAS_SEMANA_ORDEN[diaIndex];
  const horarioHoy = config.dias[diaActual];

  if (horarioHoy?.activo) {
    const aperturaMin = parsearMinutosHHMM(horarioHoy.apertura);
    if (aperturaMin !== null && minutosDia < aperturaMin) {
      return `Hoy a las ${formatearHora12h(horarioHoy.apertura)}`;
    }
  }

  for (let offset = 1; offset <= 7; offset += 1) {
    const nextDia = DIAS_SEMANA_ORDEN[(diaIndex + offset) % 7];
    const horarioNext = config.dias[nextDia];
    if (horarioNext?.activo && esHoraValidaHHMM(horarioNext.apertura)) {
      const horaTxt = formatearHora12h(horarioNext.apertura);
      if (offset === 1) {
        return `Mañana (${DIAS_SEMANA_LABELS[nextDia]}) a las ${horaTxt}`;
      }
      return `El ${DIAS_SEMANA_LABELS[nextDia]} a las ${horaTxt}`;
    }
  }

  return undefined;
}

export function sanitizarConfigHorarios(raw: unknown): ConfiguracionHorariosNegocio | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const obj = raw as Record<string, unknown>;
  if (!obj.dias || typeof obj.dias !== 'object' || Array.isArray(obj.dias)) {
    return null;
  }

  const rawDias = obj.dias as Record<string, unknown>;
  const dias = {} as Record<DiaSemanaHorario, HorarioDiaNegocio>;
  const base = crearConfigHorariosDefault();

  for (const dia of DIAS_SEMANA_ORDEN) {
    const rawDia = rawDias[dia];
    if (rawDia && typeof rawDia === 'object' && !Array.isArray(rawDia)) {
      const d = rawDia as Record<string, unknown>;
      const apertura =
        typeof d.apertura === 'string' && esHoraValidaHHMM(d.apertura)
          ? d.apertura.trim()
          : base.dias[dia].apertura;
      const cierre =
        typeof d.cierre === 'string' && esHoraValidaHHMM(d.cierre)
          ? d.cierre.trim()
          : base.dias[dia].cierre;
      dias[dia] = {
        activo: typeof d.activo === 'boolean' ? d.activo : true,
        apertura,
        cierre,
      };
    } else {
      dias[dia] = base.dias[dia];
    }
  }

  const estadosValidos: EstadoOperativoManual[] = [
    'automatico',
    'abierto_forzado',
    'cerrado_manual',
    'pausa_cocina',
  ];
  const estadoManual = estadosValidos.includes(obj.estadoManual as EstadoOperativoManual)
    ? (obj.estadoManual as EstadoOperativoManual)
    : 'automatico';

  const pausaHastaMs =
    typeof obj.pausaHastaMs === 'number' && Number.isFinite(obj.pausaHastaMs) && obj.pausaHastaMs > 0
      ? obj.pausaHastaMs
      : null;

  const motivoCierreOPausa =
    typeof obj.motivoCierreOPausa === 'string' ? obj.motivoCierreOPausa.trim().slice(0, 140) : '';

  const zonaHoraria =
    typeof obj.zonaHoraria === 'string' && obj.zonaHoraria.trim()
      ? obj.zonaHoraria.trim()
      : DEFAULT_ZONA_HORARIA;

  return {
    zonaHoraria,
    dias,
    estadoManual,
    pausaHastaMs,
    motivoCierreOPausa,
  };
}

export function evaluarDisponibilidadNegocio(
  configRaw?: ConfiguracionHorariosNegocio | null,
  nowMs: number = Date.now()
): ResultadoDisponibilidadNegocio {
  const config = sanitizarConfigHorarios(configRaw);
  const { dia, diaIndex, minutosDia } = obtenerFechaEnZonaHoraria(
    nowMs,
    config?.zonaHoraria ?? DEFAULT_ZONA_HORARIA
  );

  if (!config) {
    return {
      disponible: true,
      estado: 'abierto',
      motivo: 'Disponible para recibir pedidos.',
      fuente: 'sin_restriccion',
      diaActual: dia,
    };
  }

  const horarioHoy = config.dias[dia];
  const motivoCustom = config.motivoCierreOPausa?.trim() || '';
  const proximaAperturaTexto = calcularProximaAperturaTexto(config, diaIndex, minutosDia);

  if (config.estadoManual === 'abierto_forzado') {
    return {
      disponible: true,
      estado: 'abierto',
      motivo: 'Local abierto en modo manual.',
      fuente: 'abierto_forzado',
      diaActual: dia,
      horarioHoy,
    };
  }

  if (config.estadoManual === 'cerrado_manual') {
    return {
      disponible: false,
      estado: 'cerrado',
      motivo:
        motivoCustom ||
        (proximaAperturaTexto
          ? `Cerrado temporalmente. Próxima apertura: ${proximaAperturaTexto}.`
          : 'El local se encuentra cerrado temporalmente.'),
      fuente: 'cerrado_manual',
      diaActual: dia,
      horarioHoy,
      proximaAperturaTexto,
    };
  }

  if (config.estadoManual === 'pausa_cocina') {
    if (typeof config.pausaHastaMs === 'number') {
      if (nowMs < config.pausaHastaMs) {
        const minutosRestantesPausa = Math.max(
          1,
          Math.ceil((config.pausaHastaMs - nowMs) / 60_000)
        );
        return {
          disponible: false,
          estado: 'pausa_cocina',
          motivo:
            motivoCustom ||
            `Cocina en pausa temporal por alta demanda (aprox. ${minutosRestantesPausa} min).`,
          fuente: 'pausa_cocina',
          diaActual: dia,
          horarioHoy,
          minutosRestantesPausa,
        };
      }
      // Si la pausa temporal expiró, continúa a evaluación automática de horario
    } else {
      return {
        disponible: false,
        estado: 'pausa_cocina',
        motivo:
          motivoCustom ||
          'Cocina en pausa temporal para atender pedidos en curso. Volvemos en breve.',
        fuente: 'pausa_cocina',
        diaActual: dia,
        horarioHoy,
      };
    }
  }

  // Verificar si venimos de un turno nocturno del día anterior que cruza medianoche
  const ayerDia = DIAS_SEMANA_ORDEN[(diaIndex + 6) % 7];
  const horarioAyer = config.dias[ayerDia];
  if (horarioAyer?.activo) {
    const ayerAp = parsearMinutosHHMM(horarioAyer.apertura);
    const ayerCi = parsearMinutosHHMM(horarioAyer.cierre);
    if (ayerAp !== null && ayerCi !== null && ayerCi < ayerAp && minutosDia < ayerCi) {
      return {
        disponible: true,
        estado: 'abierto',
        motivo: `Abierto hasta las ${formatearHora12h(horarioAyer.cierre)}.`,
        fuente: 'horario',
        diaActual: dia,
        horarioHoy: horarioAyer,
      };
    }
  }

  // Verificar franja de hoy
  if (horarioHoy?.activo) {
    const aperturaMin = parsearMinutosHHMM(horarioHoy.apertura);
    const cierreMin = parsearMinutosHHMM(horarioHoy.cierre);
    if (aperturaMin !== null && cierreMin !== null) {
      const abiertoHoy =
        aperturaMin < cierreMin
          ? minutosDia >= aperturaMin && minutosDia < cierreMin
          : minutosDia >= aperturaMin;

      if (abiertoHoy) {
        return {
          disponible: true,
          estado: 'abierto',
          motivo: `Abierto hoy hasta las ${formatearHora12h(horarioHoy.cierre)}.`,
          fuente: 'horario',
          diaActual: dia,
          horarioHoy,
        };
      }
    }
  }

  const motivoCerrado = proximaAperturaTexto
    ? `Estamos cerrados en este momento. Próxima apertura: ${proximaAperturaTexto}.`
    : 'El local se encuentra cerrado en este momento.';

  return {
    disponible: false,
    estado: 'cerrado',
    motivo: motivoCerrado,
    fuente: 'horario',
    diaActual: dia,
    horarioHoy,
    proximaAperturaTexto,
  };
}

export function formatearResumenHorariosWhatsApp(
  configRaw?: ConfiguracionHorariosNegocio | null
): string {
  const config = sanitizarConfigHorarios(configRaw);
  if (!config) {
    return 'Atendemos todos los días según disponibilidad del local.';
  }
  return DIAS_SEMANA_ORDEN.map((dia) => {
    const h = config.dias[dia];
    const label = DIAS_SEMANA_LABELS[dia];
    if (!h.activo) {
      return `• ${label}: Cerrado`;
    }
    return `• ${label}: ${formatearHora12h(h.apertura)} – ${formatearHora12h(h.cierre)}`;
  }).join('\n');
}
