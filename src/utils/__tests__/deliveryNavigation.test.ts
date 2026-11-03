import { describe, expect, it } from 'vitest';
import {
  buildGoogleMapsUrl,
  buildPhoneCallUrl,
  buildWazeUrl,
  buildWhatsAppContactUrl,
  cleanPhoneNumber,
} from '../deliveryNavigation';

describe('deliveryNavigation utils', () => {
  it('limpia números telefónicos extrayendo solo dígitos', () => {
    expect(cleanPhoneNumber('+57 (310) 123-4567')).toBe('573101234567');
    expect(cleanPhoneNumber('300 987 6543')).toBe('3009876543');
    expect(cleanPhoneNumber('')).toBe('');
  });

  it('construye la URL de búsqueda en Google Maps incluyendo dirección y barrio', () => {
    const url = buildGoogleMapsUrl('Calle 10 # 5-20', 'El Guaimaral', 'Cúcuta');
    expect(url).toContain('https://www.google.com/maps/search/?api=1&query=');
    expect(url).toContain(encodeURIComponent('Calle 10 # 5-20, Barrio El Guaimaral, Cúcuta'));
  });

  it('construye la URL de navegación guiada en Waze', () => {
    const url = buildWazeUrl('Av 0 # 12-40', 'La Playa');
    expect(url).toContain('https://waze.com/ul?q=');
    expect(url).toContain('&navigate=yes');
    expect(url).toContain(encodeURIComponent('Av 0 # 12-40, Barrio La Playa, Cúcuta'));
  });

  it('construye el enlace tel: para llamada rápida', () => {
    expect(buildPhoneCallUrl('312-345-6789')).toBe('tel:3123456789');
  });

  it('construye el enlace wa.me para contacto directo con prefijo internacional +57', () => {
    const url = buildWhatsAppContactUrl('3151234567', 'La Parada', 'Carlos Gómez');
    expect(url).toContain('https://wa.me/573151234567?text=');
    expect(decodeURIComponent(url)).toContain('¡Hola Carlos Gómez! Soy tu domiciliario de *La Parada*');
  });
});
