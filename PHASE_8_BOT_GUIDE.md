# Phase 8: WhatsApp Bot & Automation - Complete Guide

## 🚀 Overview

Phase 8 implements a complete WhatsApp business automation system that:

- Processes customer messages automatically
- Generates dynamic menus from database
- Converts messages to orders
- Tracks delivery status in real-time
- Manages order lifecycle with expiration

## 📦 New Collections

### `bot_queue`

Stores pending messages for processing

```firestore
{
  mensajeId: string,
  numeroOrigen: string,
  contenido: string,
  estado: "pendiente" | "procesado" | "error",
  creadoEn: Timestamp,
  proximoReintento: Timestamp,
  intentos: number,
  accionRealizada?: string,
  razonError?: string
}
```

### `ordenes_pendientes`

Stores orders being built by customers

```firestore
{
  numeroCliente: string,
  items: Array<{productoId: string, cantidad: number}>,
  estado: "pendiente" | "confirmada" | "expirada",
  creadoEn: Timestamp,
  actualizadoEn: Timestamp,
  expiraEn: Timestamp,
  ventaId?: string
}
```

### `cache/menu_actual`

Caches generated menu for fast access

```firestore
{
  menuProductos: string,
  menuCombos: string,
  actualizadoEn: Timestamp,
  validoHasta: Timestamp
}
```

## 🤖 Bot Services

### 1. **whatsappBotService.ts**

Core messaging engine

**Functions:**

- `enviarMensajeWhatsApp()` - Send message via WhatsApp Business API
- `enviarAutoRespuesta()` - Send templated auto-responses
- `registrarMensajeEnQueue()` - Queue incoming message for processing
- `obtenerMensajesPendientes()` - Get messages to process
- `marcarMensajeProcesado()` - Mark as processed
- `reintenrarMensajeEnQueue()` - Retry failed messages
- `obtenerEstadisticasBot()` - Bot usage metrics

**Templates:**

- `BIENVENIDA` - Welcome message with options
- `MENU_DISPONIBLE` - Product menu
- `CONFIRMAR_ORDEN` - Order confirmation
- `ORDEN_EN_CAMINO` - Delivery in progress
- `ORDEN_ENTREGADA` - Delivery complete
- `PAGO_PENDIENTE` - Payment pending
- `SOPORTE` - Support contact
- `ERROR_COMANDO` - Unknown command

### 2. **menuGenerationService.ts**

Dynamic menu generation from database

**Functions:**

- `generarMenuDeProductos()` - Create product menu
- `generarMenuCombo()` - Create combo menu
- `obtenerProductoPorNumero()` - Fetch product by menu number
- `generarIndiceMenu()` - Create menu index
- `buscarProductoPorNombre()` - Search products
- `verificarDisponibilidad()` - Check product availability
- `actualizarCacheMenu()` - Update menu cache
- `obtenerMenuDelCache()` - Get cached menu

**Features:**

- Automatic menu generation (up to 50 products + 20 combos)
- Emoji formatting for WhatsApp
- Price formatting in COP
- Product search by name
- 24-hour cache for performance

### 3. **orderProcessingService.ts**

Convert messages to orders

**Functions:**

- `parsearComandoOrden()` - Parse user intent from message
- `crearOrdenPendiente()` - Create/update pending order
- `obtenerOrdenPendiente()` - Get user's pending order
- `generarResumenOrden()` - Create order summary
- `confirmarOrden()` - Convert pending order to sale
- `procesarMensajePorBot()` - Main message processor
- `obtenerEstadisticasOrdenes()` - Order statistics

**Message Formats:**

- Numbers: `1 2 3` - Add products
- Quantity: `1x2` - Product 1 x 2 units
- Search: `búsqueda: arroz` - Search for "arroz"
- Confirm: `confirmar` - Confirm order
- Menu: `menú` - View menu

**Order Lifecycle:**

```
pendiente → items added → resumen shown → confirmar → confirmed
```

### 4. **deliveryTrackingService.ts**

Automatic delivery status updates

**Functions:**

- `notificarEstadoEntrega()` - Send delivery status update
- `actualizarProgresoEntrega()` - Auto-update long deliveries
- `obtenerEstadisticasEntregas()` - Daily delivery metrics
- `generarReporteEntregasDelDia()` - Daily delivery report

**Delivery Status Flow:**

```
confirmado → en_preparacion → listo → en_camino → entregado
                                        ↓
                                    en_camino_retrasado
```

**Automatic Notifications:**

- ✅ Order confirmed
- 👨‍🍳 Being prepared
- 📦 Ready for delivery
- 🚗 In transit (with driver details)
- ✅ Delivered

### 5. **messageProcessorScheduler.ts**

Scheduled processing of messages and orders

**Cloud Functions:**

#### `procesarMensajesBot` (every 2 minutes)

- Process queued messages
- Detect user intent (menu, order, tracking, support)
- Auto-respond based on intent
- Handle order creation/confirmation

#### `limpiarOrdenesExpiradas` (every 1 hour)

- Delete orders older than 30 minutes
- Notify customers of expiration

#### `reintenrarMensajesEnError` (every 5 minutes)

- Retry failed messages (max 3 attempts)
- Re-queue for processing

## 🔄 Message Processing Flow

```
1. Webhook receives message
   ↓
2. Register in bot_queue (estado: pendiente)
   ↓
3. Scheduled processor (every 2 min)
   ↓
4. Parse message intent
   ↓
5. Route to appropriate handler:
   - Saludo → Enviar bienvenida
   - Menú → Enviar menú
   - Número → Agregar a orden
   - Confirmar → Crear venta
   - Rastrear → Enviar estado
   - Soporte → Crear ticket
   ↓
6. Send auto-response
   ↓
7. Update estado: procesado
   ↓
8. If error → proximoReintento (+5 min)
```

## 📊 Order Processing Flow

```
User sends "1 2 3" (product IDs)
   ↓
Detect: tipo=item, items=[1,2,3]
   ↓
Search for existing pending order
   ↓
If exists: Agregar items
If new: Crear orden_pendiente
   ↓
Calcular total
   ↓
Enviar resumen con total
   ↓
Usuario responde "confirmar"
   ↓
Crear venta en collection
   ↓
Marcar orden_pendiente como confirmada
   ↓
Enviar confirmación al cliente
```

## 🛠️ Configuration

### Environment Variables (functions/.env)

```bash
# WhatsApp Business API
WHATSAPP_BUSINESS_PHONE_ID=123456789
WHATSAPP_ACCESS_TOKEN=EAABaBAOL...
WHATSAPP_WEBHOOK_TOKEN=secure_token_123

# Firebase (automatic)
FIREBASE_PROJECT_ID=your-project
```

### Firestore Rules Updates

```firestore
// ordenes_pendientes: admin + system functions
match /ordenes_pendientes/{ordenId} {
  allow read, create, update, delete: if isAuth() && request.auth.token.admin == true;
}

// bot_queue: system functions only
match /bot_queue/{queueId} {
  allow read, create, update: if isAuth() && request.auth.token.admin == true;
}

// cache: system functions only
match /cache/{doc} {
  allow read: if true;
  allow write: if false; // Only Cloud Functions
}
```

## 📈 Metrics & Analytics

### Bot Statistics

- Total messages received
- Messages processed successfully
- Messages with errors
- Total orders created
- Success rate

### Order Statistics

- Pending orders
- Confirmed orders
- Orders by time of day
- Average order value
- Popular products

### Delivery Statistics

- Deliveries today
- Average delivery time
- On-time delivery rate
- Revenue in transit
- Revenue delivered

## 🧪 Testing

### Local Testing

1. **Test message parsing:**

```javascript
const { parsearComandoOrden } = require("./orderProcessingService");

// Test cases
parsearComandoOrden("1 2 3"); // items: [1,2,3]
parsearComandoOrden("1x2"); // cantidad items
parsearComandoOrden("búsqueda: arroz"); // search
parsearComandoOrden("confirmar"); // confirm
```

2. **Test menu generation:**

```javascript
const menu = await generarMenuDeProductos(5);
console.log(menu);
```

3. **Test order processing:**

```javascript
const result = await procesarMensajePorBot("+573001234567", "1 2");
console.log(result); // {accion, respuesta}
```

### Manual Testing via WhatsApp

1. Send message to business number
2. Check `bot_queue` collection in Firestore
3. Verify processor ran (check logs)
4. Confirm message was processed

## 🔍 Monitoring

### Logs Location

- Firebase Console → Functions → Logs
- Filter by function name: `procesarMensajesBot`

### Common Issues

| Issue                   | Solution                              |
| ----------------------- | ------------------------------------- |
| Messages not processing | Check scheduled function is enabled   |
| Menu not showing        | Verify products exist in BD           |
| Orders not saving       | Check Firestore rules permissions     |
| WhatsApp not sending    | Verify API credentials in .env        |
| Slow processing         | Increase scheduled function frequency |

## 🚀 Deployment

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:procesarMensajesBot

# View logs
firebase functions:log --follow

# View specific function logs
firebase functions:log procesarMensajesBot
```

## 📋 Next Steps (Phase 9)

- [ ] AI/LLM integration for smarter responses
- [ ] Customer satisfaction surveys
- [ ] Promo code processing
- [ ] Loyalty program integration
- [ ] Multi-language support
- [ ] Payment link generation
- [ ] Analytics dashboard

## 📞 Support Commands

Users can trigger:

- `hola` - Welcome message
- `menú` - View menu
- `1 2 3` - Add items
- `confirmar` - Confirm order
- `rastrear` - Track delivery
- `soporte` - Contact support
- `mi orden` - View current order
- `búsqueda: [term]` - Search products
