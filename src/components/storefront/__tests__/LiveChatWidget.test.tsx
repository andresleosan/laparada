import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { LiveChatWidget } from '../LiveChatWidget';

describe('LiveChatWidget con Sarin Bot', () => {
  it('renderiza el botón flotante con la identidad de Sarin Bot y estado en línea', () => {
    const html = renderToStaticMarkup(
      <LiveChatWidget negocioId="laparada" negocioNombre="La Parada Gourmet" />
    );

    expect(html).toContain('Sarin Bot');
    expect(html).toContain('En línea 24/7');
    expect(html).toContain('Abrir chat con Sarin Bot en La Parada Gourmet');
  });

  it('soporta locales aliados del marketplace con su propio nombre de tienda', () => {
    const html = renderToStaticMarkup(
      <LiveChatWidget negocioId="local-123" negocioNombre="Burger House" />
    );

    expect(html).toContain('Sarin Bot');
    expect(html).toContain('Abrir chat con Sarin Bot en Burger House');
  });
});

