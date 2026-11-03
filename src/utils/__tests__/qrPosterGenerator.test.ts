import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  generateQRCodeDataUrl,
  generatePosterBlob,
  triggerBlobDownload,
} from '../qrPosterGenerator';

describe('qrPosterGenerator', () => {
  let originalDocument: typeof globalThis.document | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    originalDocument = globalThis.document;
  });

  afterEach(() => {
    if (originalDocument) {
      globalThis.document = originalDocument;
    } else {
      delete (globalThis as unknown as { document?: unknown }).document;
    }
  });

  it('genera un Data URL válido para el enlace público', async () => {
    const dataUrl = await generateQRCodeDataUrl('https://laparada.co/tienda/el-punto');
    expect(dataUrl).toContain('data:image/png;base64,');
  });

  it('lanza un error explícito si se llama generatePosterBlob en un entorno sin document', async () => {
    delete (globalThis as unknown as { document?: unknown }).document;
    await expect(
      generatePosterBlob({
        negocioNombre: 'Test',
        urlTienda: 'https://laparada.co/tienda/test',
      })
    ).rejects.toThrow('generatePosterBlob requiere un entorno de navegador con document y canvas');
  });

  it('genera un blob de imagen para el afiche impreso cuando document y canvas están disponibles', async () => {
    const mockContext = {
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      closePath: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      fillText: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      drawImage: vi.fn(),
    };

    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => mockContext),
      toBlob: vi.fn((callback: (blob: Blob | null) => void) => {
        callback(new Blob(['mock-png-data'], { type: 'image/png' }));
      }),
    };

    // Mock minimal document
    (globalThis as unknown as { document: unknown }).document = {
      createElement: vi.fn((tag: string) => {
        if (tag === 'canvas') return mockCanvas;
        return {};
      }),
    };

    // Mock Image constructor in globalThis
    (globalThis as unknown as { Image: unknown }).Image = class {
      crossOrigin = '';
      private _src = '';
      onload: (() => void) | null = null;
      onerror: ((err: unknown) => void) | null = null;

      get src() {
        return this._src;
      }

      set src(val: string) {
        this._src = val;
        queueMicrotask(() => {
          if (this.onload) this.onload();
        });
      }
    };

    const blob = await generatePosterBlob({
      negocioNombre: 'El Punto Burger',
      urlTienda: 'https://laparada.co/tienda/el-punto-burger',
      ciudad: 'Cúcuta',
    });

    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
  });

  it('dispara la descarga de archivo creando un link temporal', () => {
    const clickSpy = vi.fn();
    const appendChildSpy = vi.fn();
    const removeChildSpy = vi.fn();

    const mockLink = {
      href: '',
      download: '',
      click: clickSpy,
    };

    (globalThis as unknown as { document: unknown }).document = {
      createElement: vi.fn(() => mockLink),
      body: {
        appendChild: appendChildSpy,
        removeChild: removeChildSpy,
      },
    };

    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    globalThis.URL.revokeObjectURL = vi.fn();

    const blob = new Blob(['contenido'], { type: 'image/png' });
    triggerBlobDownload(blob, 'afiche-test.png');

    expect(clickSpy).toHaveBeenCalled();
    expect(mockLink.download).toBe('afiche-test.png');
    expect(appendChildSpy).toHaveBeenCalledWith(mockLink);
    expect(removeChildSpy).toHaveBeenCalledWith(mockLink);
  });
});
