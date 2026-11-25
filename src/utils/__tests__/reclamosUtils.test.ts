import { describe, expect, it } from 'vitest';
import type { Timestamp } from 'firebase/firestore';
import type { ReclamoPqrs } from '@/types/reclamo';
import {
  calcularResumenReclamos,
  construirUrlWhatsAppReclamo,
  evaluarReclamos,
  evaluarSlaReclamo,
  filtrarReclamos,
  generarCodigoRadicadoReclamo,
  generarCsvReclamos,
  generarResumenReclamosWhatsApp,
  obtenerSlaObjetivoMin,
  sanitizarMontoReclamoCOP,
} from '../reclamosUtils';

const tsBase = new Date('2026-11-24T17:00:00Z');

function buildReclamo(overrides: Partial<ReclamoPqrs> = {}): ReclamoPqrs {
  return {
    id: 'rec-1',
    negocioId: 'laparada',
    codigoRadicado: 'PQR-20261124-001',
    tipo: 'garantia_pedido',
    canal: 'domicilio',
    causaRaiz: 'demora_entrega',
    prioridad: 'alta',
    estado: 'abierto',
    slaObjetivoMin: 60,
    clienteNombre: 'Juliana Morales',
    clienteTelefono: '3112223344',
    direccionEntrega: 'Av 1 # 12-40',
    barrioEntrega: 'Caobos',
    montoPedidoCOP: 38000,
    descripcion: 'El domicilio superó los 55 minutos de espera y llegó frío.',
    fechaIso: '2026-11-24',
    creadoEn: tsBase as unknown as Timestamp,
    actualizadoEn: tsBase as unknown as Timestamp,
    registradoPor: 'Cajero Turno',
    ...overrides,
  };
}

describe('reclamosUtils', () => {
  it('sanitiza montos COP, genera radicados y resuelve SLA por prioridad', () => {
    expect(sanitizarMontoReclamoCOP(-1200)).toBe(0);
    expect(sanitizarMontoReclamoCOP(Number.NaN)).toBe(0);
    expect(sanitizarMontoReclamoCOP(15499.6)).toBe(15500);

    expect(obtenerSlaObjetivoMin('critica')).toBe(30);
    expect(obtenerSlaObjetivoMin('alta')).toBe(60);
    expect(obtenerSlaObjetivoMin('media')).toBe(240);
    expect(obtenerSlaObjetivoMin('baja')).toBe(1440);

    expect(generarCodigoRadicadoReclamo('2026-11-24', 0)).toBe('PQR-20261124-001');
    expect(generarCodigoRadicadoReclamo('2026-11-24', 14)).toBe('PQR-20261124-015');
  });

  it('evalúa semáforo SLA en vivo, ordena urgentes y consolida KPIs y causas raíz', () => {
    const ahoraMs = tsBase.getTime() + 75 * 60000; // +75 minutos

    const vencidoCritico = buildReclamo({
      id: 'rec-vencido',
      codigoRadicado: 'PQR-20261124-001',
      prioridad: 'critica',
      slaObjetivoMin: 30,
      causaRaiz: 'pedido_incompleto',
      canal: 'domicilio',
    });

    const porVencer = buildReclamo({
      id: 'rec-por-vencer',
      codigoRadicado: 'PQR-20261124-002',
      prioridad: 'alta',
      slaObjetivoMin: 90,
      estado: 'en_gestion',
      causaRaiz: 'pedido_incompleto',
      canal: 'whatsapp',
    });

    const resueltoBono = buildReclamo({
      id: 'rec-resuelto',
      codigoRadicado: 'PQR-20261124-003',
      prioridad: 'media',
      slaObjetivoMin: 240,
      estado: 'resuelto',
      causaRaiz: 'empaque_derrame',
      canal: 'domicilio',
      tipoResolucion: 'bono_cortesia',
      montoCompensacionCOP: 15000,
      bonoCortesiaCodigo: 'VAL-2026-XYZ',
      tiempoResolucionMin: 40,
      cumplioSla: true,
    });

    const evalPorVencer = evaluarSlaReclamo(porVencer, ahoraMs);
    expect(evalPorVencer.semaforoSla).toBe('por_vencer');
    expect(evalPorVencer.minutosTranscurridos).toBe(75);

    const evaluados = evaluarReclamos(
      [resueltoBono, porVencer, vencidoCritico],
      ahoraMs
    );
    expect(evaluados.map((e) => e.reclamo.id)).toEqual([
      'rec-vencido',
      'rec-por-vencer',
      'rec-resuelto',
    ]);

    const resumen = calcularResumenReclamos(evaluados, 100, '2026-11-24');
    expect(resumen.totalReclamos).toBe(3);
    expect(resumen.activosCount).toBe(2);
    expect(resumen.resueltosCount).toBe(1);
    expect(resumen.slaVencidosCount).toBe(1);
    expect(resumen.slaPorVencerCount).toBe(1);
    expect(resumen.criticosAbiertosCount).toBe(1);
    expect(resumen.tasaCumplimientoSlaPct).toBe(100);
    expect(resumen.tiempoPromedioResolucionMin).toBe(40);
    expect(resumen.tasaReclamosSobrePedidosPct).toBe(3);
    expect(resumen.costoCompensacionesMesCOP).toBe(15000);
    expect(resumen.bonosCortesiaEmitidosCount).toBe(1);
    expect(resumen.causaRaizPrincipal?.causaRaiz).toBe('pedido_incompleto');
    expect(resumen.causaRaizPrincipal?.cantidad).toBe(2);
    expect(resumen.estadoGlobal).toBe('critico');

    const filtrados = filtrarReclamos(evaluados, {
      busqueda: 'VAL-2026-XYZ',
      tipo: 'todos',
      canal: 'todos',
      causaRaiz: 'todos',
      prioridad: 'todos',
      estado: 'todos',
      semaforoSla: 'todos',
    });
    expect(filtrados).toHaveLength(1);
    expect(filtrados[0].reclamo.id).toBe('rec-resuelto');
  });

  it('construye enlaces de WhatsApp, resumen ejecutivo y CSV seguro contra fórmulas', () => {
    const resuelto = buildReclamo({
      id: 'rec-wa',
      clienteNombre: '=CMD("calc") Juliana',
      clienteTelefono: '3112223344',
      estado: 'resuelto',
      tipoResolucion: 'bono_cortesia',
      montoCompensacionCOP: 20000,
      bonoCortesiaCodigo: 'BON-9988',
      resolucionNotas: '+Vale emitido por demora',
    });

    const urlRes = construirUrlWhatsAppReclamo(resuelto, 'La Parada', 'resolucion');
    expect(urlRes).toContain('https://wa.me/573112223344?text=');
    expect(decodeURIComponent(urlRes)).toContain('BON-9988');
    expect(decodeURIComponent(urlRes)).toContain('PQR-20261124-001');

    const sinTelefono = buildReclamo({ clienteTelefono: '' });
    expect(construirUrlWhatsAppReclamo(sinTelefono, 'La Parada', 'acuse')).toMatch(
      /^https:\/\/wa\.me\/\?text=/
    );

    const evaluados = evaluarReclamos([resuelto]);
    const csv = generarCsvReclamos(evaluados, 'La Parada');
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain("'=CMD");
    expect(csv).toContain("'+Vale emitido");

    const resumen = calcularResumenReclamos(evaluados, 50, '2026-11-24');
    const waResumen = decodeURIComponent(
      generarResumenReclamosWhatsApp('La Parada', resumen)
    );
    expect(waResumen).toContain('REPORTE PQRS & GARANTÍAS');
    expect(waResumen).toContain('LA PARADA');
  });
});
