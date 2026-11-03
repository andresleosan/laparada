import QRCode from 'qrcode';

export interface PosterOptions {
  negocioNombre: string;
  urlTienda: string;
  ciudad?: string;
  telefono?: string;
}

/**
 * Genera un Data URL con el código QR para el enlace proporcionado
 */
export async function generateQRCodeDataUrl(
  text: string,
  options?: QRCode.QRCodeToDataURLOptions
): Promise<string> {
  const defaultOptions: QRCode.QRCodeToDataURLOptions = {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 512,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
    ...options,
  };
  return QRCode.toDataURL(text, defaultOptions);
}

/**
 * Dibuja un rectángulo con esquinas redondeadas en el contexto Canvas
 */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

/**
 * Carga una imagen a partir de un Data URL o URL pública
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

/**
 * Genera un Blob PNG de alta resolución (1200×1600 px) listo para imprimir
 * y colocar en mesas, mostrador o afiches del restaurante.
 */
export async function generatePosterBlob(options: PosterOptions): Promise<Blob> {
  if (typeof document === 'undefined') {
    throw new Error('generatePosterBlob requiere un entorno de navegador con document y canvas');
  }

  const qrDataUrl = await generateQRCodeDataUrl(options.urlTienda, {
    width: 600,
    margin: 1,
    errorCorrectionLevel: 'H',
  });

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1600;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo inicializar el contexto 2D del Canvas');
  }

  // 1. Fondo Oscuro Gastronómico
  const bgGradient = ctx.createLinearGradient(0, 0, 0, 1600);
  bgGradient.addColorStop(0, '#0a0a0a');
  bgGradient.addColorStop(0.5, '#14110e');
  bgGradient.addColorStop(1, '#050505');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, 1200, 1600);

  // 2. Borde decorativo dorado
  ctx.strokeStyle = '#c9a84c';
  ctx.lineWidth = 4;
  roundRect(ctx, 40, 40, 1120, 1520, 32);
  ctx.stroke();

  // Borde interior fino
  ctx.strokeStyle = 'rgba(201, 168, 76, 0.3)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, 52, 52, 1096, 1496, 24);
  ctx.stroke();

  // 3. Kicker superior
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '6px';
  ctx.fillText('¡ESCANEÁ Y PIDÉ EN LÍNEA!', 600, 150);

  // 4. Nombre del Negocio (tipografía Syne / sans-serif prominente)
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 68px sans-serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '1px';
  const nombreLimpio = options.negocioNombre.trim();
  ctx.fillText(nombreLimpio, 600, 245);

  // 5. Subtítulo / Ciudad
  ctx.fillStyle = '#a3a3a3';
  ctx.font = '500 28px sans-serif';
  const ubicacion = options.ciudad ? `Punto físico en ${options.ciudad} • Domicilios directos` : 'Menú digital directo a tu mesa';
  ctx.fillText(ubicacion, 600, 300);

  // 6. Tarjeta blanca central para el Código QR
  const cardX = 260;
  const cardY = 370;
  const cardSize = 680;
  ctx.save();
  ctx.shadowColor = 'rgba(201, 168, 76, 0.35)';
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 15;
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, cardX, cardY, cardSize, cardSize, 36);
  ctx.fill();
  ctx.restore();

  // Borde interior de la tarjeta QR
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
  ctx.lineWidth = 3;
  roundRect(ctx, cardX, cardY, cardSize, cardSize, 36);
  ctx.stroke();

  // 7. Cargar y dibujar el Código QR centrado
  try {
    const qrImage = await loadImage(qrDataUrl);
    const qrSize = 580;
    const qrOffset = (cardSize - qrSize) / 2;
    ctx.drawImage(qrImage, cardX + qrOffset, cardY + qrOffset, qrSize, qrSize);
  } catch (error) {
    console.error('Error dibujando QR en canvas:', error);
  }

  // 8. Instrucción directa para el comensal
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 36px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Apunta la cámara de tu celular aquí', 600, 1140);

  ctx.fillStyle = '#e5e5e5';
  ctx.font = '400 26px sans-serif';
  ctx.fillText('Consulta la carta con precios reales y haz tu pedido sin esperar', 600, 1190);

  // 9. Métodos de pago offline y WhatsApp
  ctx.fillStyle = '#a3a3a3';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('💵 Efectivo  •  📲 Transferencias directas  •  💬 Atención por WhatsApp', 600, 1260);

  // 10. Enlace URL impreso legible
  ctx.fillStyle = '#c9a84c';
  ctx.font = '600 24px monospace';
  ctx.fillText(options.urlTienda, 600, 1340);

  // 11. Footer del afiche
  ctx.fillStyle = 'rgba(163, 163, 163, 0.6)';
  ctx.font = '500 20px sans-serif';
  ctx.fillText('Impulsado por La Parada SaaS • laparada.co', 600, 1490);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('No se pudo exportar el afiche a imagen Blob'));
      }
    }, 'image/png');
  });
}

/**
 * Dispara la descarga en el navegador de un archivo Blob
 */
export function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

