# La Parada — Instrucciones para Agentes de Desarrollo

Guía de arquitectura, estándares de desarrollo y comandos operativos para el proyecto **La Parada**.

---

## 1. Visión General del Proyecto

**La Parada** es una plataforma integral de punto de venta (POS), catálogo público digital (storefront), gestión de domicilios/pedidos, control de inventario, cierres de caja y administración de staff, diseñada con arquitectura **multi-tenant** basada en Firebase.

---

## 2. Stack Tecnológico

- **Frontend:**
  - React 18 (`react`, `react-dom`)
  - Vite
  - TypeScript (modo estricto)
  - Tailwind CSS + Autoprefixer + PostCSS
  - Lucide React (iconografía)
  - Framer Motion (animaciones)
  - Recharts (gráficos y métricas)
- **Backend & Cloud (Firebase):**
  - Firebase SDK v11 (Auth, Cloud Firestore, Cloud Storage)
  - Firebase Cloud Functions v2 (TypeScript / Node.js en `firebase-functions/`)
  - Firebase Emulator Suite (para pruebas de reglas e integraciones)
- **Gestor de Paquetes:** `pnpm` (v11)
- **Testing & QA:** Vitest (`vitest run`), `@firebase/rules-unit-testing`, ESLint

---

## 3. Comandos Principales

```bash
# Desarrollo frontend
pnpm dev

# Compilación y verificación de tipos
pnpm build              # Compila el frontend (tsc && vite build)
pnpm build:functions    # Compila Cloud Functions
pnpm build:all          # Compila frontend y functions

# Pruebas y Linting
pnpm test               # Ejecuta suites unitarias con Vitest
pnpm test:rules         # Pruebas de reglas de seguridad en Firebase Emulator
pnpm lint               # ESLint con 0 warnings permitidos

# Utilidades
pnpm check:bundle       # Valida presupuesto de bundle de Vite
pnpm images:optimize    # Optimización de imágenes con Sharp
```

---

## 4. Estructura del Repositorio

```text
├── src/
│   ├── components/     # Componentes modulares (pos, storefront, domicilios, productos, etc.)
│   ├── context/        # React Contexts (AuthContext, NegocioContext)
│   ├── hooks/          # Custom hooks reutilizables
│   ├── pages/          # Vistas principales de la aplicación
│   ├── security/       # Validaciones y guardas de autorización
│   ├── services/       # Clientes de servicios Firebase y lógica de negocio
│   ├── types/          # Definiciones TypeScript de entidades y contratos
│   └── utils/          # Funciones utilitarias puras y testeables
├── firebase-functions/ # Backend Cloud Functions (pedidos públicos, staff, auth)
├── tests/              # Pruebas de integración, boundaries y reglas de seguridad
├── docs/               # Documentación y Decision Records (ADR)
├── scripts/            # Scripts de build, bundle check y optimización
├── firestore.rules     # Reglas declarativas de seguridad de Cloud Firestore
├── storage.rules       # Reglas de seguridad de Firebase Cloud Storage
└── firebase.json       # Configuración de hosting, functions y emuladores
```

---

## 5. Reglas Críticas de Arquitectura y Negocio

### 5.1 Aislamiento Multi-Tenant (`negocioId`)
- Todo documento, colección operativa o consulta debe estar estrictamente acotada por `negocioId` (ver [ADR-001](docs/adr/ADR-001-aislamiento-multitenant.md)).
- Jamás realizar consultas cross-tenant sin verificación explícita de permisos administrativos globales.

### 5.2 Modelo de Pagos Offline
- LaParada opera bajo un modelo de **pago offline** (efectivo, contra entrega, transferencias directas acordadas por WhatsApp).
- Plataformas de pago en línea (MercadoPago, Stripe, pasarelas externas) están expresamente excluidas del core operativo.

### 5.3 Límite Seguro para Pedidos Públicos (Public Order Boundary)
- El storefront público no debe escribir arbitrariamente totales ni alterar precios en Firestore.
- El recalculo, validación de stock y emisión del pedido deben transitar por validaciones backend/Cloud Functions para evitar manipulación desde el cliente.

### 5.4 Control de Roles y Autorización
- Roles soportados: `admin`, `cajero`, `cocinero`, `domiciliario`.
- Las mutaciones de staff y asignación de privilegios están restringidas y validadas mediante claims de autenticación y reglas de Firestore.

---

## 6. Pautas de Contribución y Calidad de Código

1. **TypeScript Estricto:** Evitar el uso de `any`; tipar todas las interfaces de datos y respuestas de servicio.
2. **Pruebas:** Cada nueva función utilitaria o cambio en la lógica de negocio debe contar con pruebas unitarias en `src/.../__tests__/` o `tests/`.
3. **Seguridad Primero:** Toda modificación a colecciones de base de datos requiere validar o actualizar `firestore.rules` y ejecutar `pnpm test:rules`.
4. **Preservación:** No eliminar documentación técnica ni alterar la estructura multi-tenant sin justificación técnica documentada.

