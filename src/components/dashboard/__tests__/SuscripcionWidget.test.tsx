import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SuscripcionWidget } from '../SuscripcionWidget';
import { Negocio } from '@/types/negocio';
import { Timestamp } from 'firebase/firestore';

describe('SuscripcionWidget', () => {
  it('renderiza la tarjeta de suscripción SaaS con cuota de IA y vigencia para un local activo', () => {
    const negocioTest: Negocio = {
      id: 'local-test',
      nombre: 'El Punto Burguer',
      slug: 'el-punto',
      propietarioEmail: 'carlos@elpunto.com',
      propietarioNombre: 'Carlos Pérez',
      telefono: '3001234567',
      estado: 'activo',
      plan: 'prueba_3d',
      planId: 'prueba_3d',
      cuotaRespuestasIA: 300,
      respuestasIAUsadas: 45,
      suscripcionVenceEn: {
        toMillis: () => Date.now() + 2 * 24 * 60 * 60 * 1000,
      } as unknown as Timestamp,
      creadoEn: { seconds: 123 } as Timestamp,
    };

    const html = renderToStaticMarkup(<SuscripcionWidget negocio={negocioTest} />);

    expect(html).toContain('Suscripción SaaS &amp; IA');
    expect(html).toContain('Prueba 3 días');
    expect(html).toContain('Respuestas Sarin IA');
    expect(html).toContain('45 / 300');
    expect(html).toContain('Renovar o Recargar por WhatsApp');
  });

  it('indica acceso permanente para La Parada insignia', () => {
    const laParada: Negocio = {
      id: 'laparada',
      nombre: 'La Parada',
      slug: 'la-parada',
      propietarioEmail: 'andres.san1404@gmail.com',
      propietarioNombre: 'Andrés Sánchez',
      telefono: '3001234567',
      estado: 'activo',
      plan: 'enterprise',
      planId: 'enterprise',
      cuotaRespuestasIA: 100000,
      respuestasIAUsadas: 120,
      creadoEn: { seconds: 123 } as Timestamp,
    };

    const html = renderToStaticMarkup(<SuscripcionWidget negocio={laParada} />);

    expect(html).toContain('Acceso Permanente');
    expect(html).toContain('Insignia');
    expect(html).not.toContain('Renovar o Recargar por WhatsApp');
  });
});
