# 🔐 Seguridad del PIN Administrativo

## Información General

El PIN administrativo es una contraseña de 6 dígitos utilizada para confirmar operaciones sensibles como:

- ✋ Eliminar productos
- ✋ Eliminar gastos
- ✋ Eliminar ventas

## Características de Seguridad

### 1. **PIN Hasheado (SHA256)**

- El PIN **nunca** se almacena en texto plano en la base de datos
- Se convierte a hash SHA256 antes de guardarse
- El hash es irreversible, no se puede recuperar el PIN original

### 2. **Validación en Servidor (Cloud Functions)**

- La validación de PIN ocurre **solo en servidor**, no en el navegador
- El cliente envía el PIN a la Cloud Function segura
- El servidor verifica contra el hash almacenado

### 3. **Sin Exposición en GitHub**

- ✅ El PIN inicial está en `.env.local` (en `.gitignore`)
- ✅ No se hardcodea el PIN en el código
- ✅ Las claves de Firebase también están en `.env.local`
- ✅ Solo archivos `.example` se comparten en repositorio

### 4. **Comunicación Segura**

- Todas las llamadas usan HTTPS (Firebase Cloud Functions)
- El PIN se envía como `password` type en form (oculto)
- Las respuestas no incluyen el PIN en texto plano

## Cómo Cambiar el PIN

### Opción 1: Interfaz Web (Recomendado)

1. Ve a **"Más opciones"** (menú inferior)
2. Selecciona **"Seguridad Admin"**
3. Ingresa:
   - ✅ PIN actual (para verificar que eres el admin)
   - ✅ PIN nuevo (6 dígitos)
   - ✅ Confirmar PIN nuevo
4. Click en **"Cambiar PIN"**

El PIN se actualiza en la base de datos (hasheado) y toma efecto inmediatamente.

### Opción 2: Script de Inicialización (Primera Vez)

```bash
# Ejecutar una sola vez después de desplegar Cloud Functions
npm run init-admin-pin
```

Requiere:

- Variable de entorno `ADMIN_PIN_INITIAL` (default: <your-6-digit-pin>)
- Archivo `serviceAccountKey.json` en la carpeta `functions/`

## Estructura de Seguridad

```
┌─────────────────────────────────────────┐
│       Cliente (Navegador)               │
│  - Interfaz de cambio de PIN            │
│  - Inputs con type="password"           │
│  - Sin almacenar PIN localmente         │
└────────────┬────────────────────────────┘
             │ HTTPS
             ↓
┌─────────────────────────────────────────┐
│   Cloud Functions (Servidor Seguro)     │
│  - changeAdminPin()                     │
│  - verifyAdminPin()                     │
│  - Hashea PIN con SHA256                │
│  - Verifica contra BD                   │
└────────────┬────────────────────────────┘
             │ Seguro
             ↓
┌─────────────────────────────────────────┐
│    Firestore (Base de Datos)            │
│  config/admin                           │
│  {                                      │
│    pinHash: "a7f3...xyz",  // SHA256   │
│    createdAt: timestamp,                │
│    lastPinChange: timestamp             │
│  }                                      │
└─────────────────────────────────────────┘
```

## Variables de Entorno

### `.env.local` (Secreto - No Compartir)

```bash
VITE_ADMIN_PIN_INITIAL=<your-6-digit-pin>
VITE_FIREBASE_API_KEY=xyz...
VITE_FIREBASE_AUTH_DOMAIN=...
# ... otras claves Firebase
```

### `.env.local.example` (Público - En Git)

```bash
# Plantilla para configuración
VITE_ADMIN_PIN_INITIAL=<your-pin>
VITE_FIREBASE_API_KEY=<your-api-key>
# ... marcadores de ejemplo
```

## Checklist de Seguridad

- ✅ `.env.local` está en `.gitignore`
- ✅ `.env.local.example` está en git (sin secretos)
- ✅ PIN se hashea con SHA256 en Firestore
- ✅ Validación ocurre en Cloud Functions (servidor)
- ✅ No hay PIN hardcodeado en código fuente
- ✅ Claves de Firebase no están en git
- ✅ PIN se envia como `password` input (oculto)
- ✅ Cloud Functions requieren autenticación

## Recuperación si Olvidas el PIN

Si olvidas el PIN administrativo:

1. **Contacta al administrador principal** (quien tiene acceso a Firebase Console)
2. **En Firebase Console:**
   - Ve a Firestore
   - Ve a colección `config` → documento `admin`
   - Elimina el documento
3. **Ejecuta el script de inicialización:**
   ```bash
   npm run init-admin-pin
   ```
4. **El PIN se resetea** al valor en `ADMIN_PIN_INITIAL`

## Recomendaciones

🔒 **Buenas Prácticas:**

- Cambiar PIN regularmente
- No compartir PIN con personal no autorizado
- Usar un PIN que sea fácil de recordar pero difícil de adivinar
- No usar PINs como "000000", "123456", etc.

🚫 **Evitar:**

- Guardar PIN en archivos sin cifrar
- Compartir PIN por email o chat
- Usar PIN = Fecha de nacimiento
- Commitear `.env.local` a git

## Referencias

- **SHA256 Hashing:** https://nodejs.org/api/crypto.html
- **Firebase Cloud Functions:** https://firebase.google.com/docs/functions
- **Security Best Practices:** https://firebase.google.com/docs/database/security
