# Phase 7: Environment Variables Configuration

## Cloud Functions - Firebase (.env para functions/)

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx (o sk_test_xxxxx para desarrollo)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx (obtener de Stripe Dashboard > Webhooks)

# MercadoPago Configuration
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxxxxxxxxx
MERCADOPAGO_WEBHOOK_SECRET=xxxxxxxxxxxxx (opcional)

# WhatsApp Configuration
WHATSAPP_WEBHOOK_TOKEN=any_secure_random_token_you_choose
WHATSAPP_BUSINESS_PHONE_ID=xxxxxxxxxxx (ID de teléfono de negocio de WhatsApp)
WHATSAPP_BUSINESS_ACCOUNT_ID=xxxxxxxxxxx

# Firebase Admin SDK (automático en Cloud Functions)
# FIREBASE_PROJECT_ID=your-project-id
# FIREBASE_DATABASE_URL=https://your-project-id.firebaseio.com
```

## Obteniendo las credenciales:

### Stripe

1. Ir a https://dashboard.stripe.com/apikeys
2. Copiar "Secret key" (comienza con `sk_test_` o `sk_live_`)
3. Ir a Developers > Webhooks
4. Crear nuevo endpoint: `https://your-function-url/stripeWebhook`
5. Copiar "Signing secret"

### MercadoPago

1. Ir a https://www.mercadopago.com/developers/es/reference/oauth/_oauth_token/post
2. Generar Access Token con:
   - Client ID y Client Secret
3. Copiar el Access Token generado

### WhatsApp

1. Ir a https://developers.facebook.com
2. Crear aplicación de WhatsApp Business
3. Ir a Configuration > Webhooks
4. Generar token seguro (cualquier string seguro)
5. URL: `https://your-function-url/whatsappWebhook`
6. Obtener Phone ID y Business Account ID

## Deployment a Firebase

```bash
# En la carpeta functions/
firebase deploy --only functions

# Verificar logs
firebase functions:log

# Ver variables de entorno
firebase functions:config:get
```

## URLs de Webhooks en Producción

Después de deploy, las URLs serán:

- Stripe: `https://us-central1-{project-id}.cloudfunctions.net/stripeWebhook`
- MercadoPago: `https://us-central1-{project-id}.cloudfunctions.net/mercadopagoWebhook`
- WhatsApp: `https://us-central1-{project-id}.cloudfunctions.net/whatsappWebhook`

## Verificación de Webhooks

Para verificar que los webhooks están funcionando:

```bash
# Verificar logs en tiempo real
firebase functions:log --follow

# Monitoreo de errores
firebase functions:log | grep ERROR
```

## Testing Local

Para testear Cloud Functions localmente:

```bash
# En la carpeta functions/
npm install -g firebase-tools

# Iniciar emulator
firebase emulators:start

# En otra terminal, hacer peticiones de prueba
curl -X POST http://localhost:5001/{project-id}/us-central1/stripeWebhook \
  -H "Content-Type: application/json" \
  -d '{"type":"payment_intent.succeeded","data":{"object":{"id":"pi_xxx","metadata":{"transactionId":"trans_123"}}}}'
```

## Requerimientos de Firestore Rules

Las reglas ya están configuradas en `firestore.rules`:

- Transacciones de pago: solo admin
- Sesiones de pago: solo admin
- Mensajes WhatsApp: solo admin + Cloud Functions
- Verificar con `firebase deploy --only firestore:rules`

## Monitoreo en Producción

### Cloud Functions Monitoring

- Console: https://console.firebase.google.com/functions
- Ver logs: Firebase Console > Functions > Logs
- Alertas: Cloud Monitoring

### Firestore Security

- Verificar en Firebase Console > Firestore > Rules
- Test con Firebase Console > Firestore > Simular lectura/escritura

## Troubleshooting

### Webhook no recibe eventos

- [ ] Verificar URL es pública y accesible
- [ ] Revisar logs de Cloud Functions
- [ ] Verificar token/signature de webhook
- [ ] Comprobar transacciones en dashboard de pasarela

### Error 403 en webhooks

- [ ] Token de verificación incorrecta
- [ ] Firestore rules bloqueando Cloud Functions
- [ ] Permisos de IAM insuficientes

### Mensajes no se entregan

- [ ] Verificar credenciales de WhatsApp Business API
- [ ] Revisar límites de rate límiting de Meta
- [ ] Comprobar número de teléfono está verificado
