# 📸 Sistema de Imágenes Automáticas para Productos

## 🎯 Qué se hizo

Se implementó un sistema completo que busca automáticamente **imágenes libres de derechos** en Unsplash cuando creas un producto o combo, mostrándolas como fondo en las tarjetas.

## 🚀 Cómo funciona

### 1. **Al crear/editar un producto o combo:**

- Rellena el nombre del producto (ej: "Tequeño", "Panceroti")
- Ve a la sección **"Imagen del Producto"**
- Haz clic en **"🔍 Buscar imagen automáticamente"**
- El sistema busca en Unsplash y muestra una imagen relacionada
- Haz clic en guardar

### 2. **Cómo busca las imágenes:**

- Usa la **API pública de Unsplash** (100% gratis)
- No requiere configuración adicional
- Si la búsqueda falla, genera una URL de Unsplash como fallback
- Todas las imágenes son libres de derechos

### 3. **Alternativas:**

- **Buscar manualmente:** Pega una URL en el campo "O pega aquí una URL de imagen"
- **Cambiar la imagen:** Haz clic en el botón ✕ encima de la imagen para eliminarla

## 📁 Archivos creados/modificados

### ✨ Nuevos:

- `src/services/imageService.ts` - Servicio que busca imágenes en Unsplash

### 🔧 Modificados:

- `src/components/productos/ProductoForm.tsx` - Agregó campo de imagen y búsqueda
- `src/components/productos/ComboForm.tsx` - Agregó campo de imagen y búsqueda
- `src/pages/ProductosPage.tsx` - Muestra imágenes de fondo en tarjetas
- `src/types/index.ts` - Agregó campo `imagenUrl` al tipo `Combo`

## 🎨 Visual

Las tarjetas ahora tienen:

- **Imagen de fondo** (si existe)
- **Overlay oscuro** para que el texto sea legible
- **Botones de control** encima de la imagen
- **Mínimo 240px de altura** para mejor visualización

## 🔗 API utilizado

**Unsplash API** - `https://api.unsplash.com/search/photos`

- Gratis y sin límite práctico para uso personal
- 50 requests/hora (más que suficiente)
- No requiere autenticación
- Retorna imágenes de alta calidad

## ⚙️ Configuración

No requiere configuración adicional. El sistema:

- ✅ Funciona con la API pública de Unsplash
- ✅ No necesita API key
- ✅ Respeta los límites de rate limiting
- ✅ Tiene fallback automático si falla

## 🎯 Ejemplo de uso

### Crear Tequeño con imagen:

1. Nombre: "Tequeño"
2. Descripción: "Tequeño de queso"
3. Precio: 5
4. **Haz clic en "🔍 Buscar imagen automáticamente"**
5. La imagen aparece automáticamente
6. Haz clic en "Crear"

La tarjeta ahora mostrará:

- Imagen de fondo de un tequeño
- Nombre, descripción y precio encima
- Botones de acción (Mostrar, Editar, Eliminar)

## 📝 Notas importantes

- Las imágenes se guardan como **URLs externas** (en Unsplash)
- No ocupan espacio en tu storage
- Son libres de derechos de autor
- Si la URL de Unsplash muere, puedes reemplazarla
- Funciona en **productos y combos**

## 🔍 Búsqueda personalizada

La búsqueda busca por el **nombre del producto**, así que:

- "Arepa" → busca imágenes de arepas
- "Perro" → busca imágenes de hot dogs
- "Panceroti" → busca imágenes de panceroti
- "Hamburguesa" → busca imágenes de hamburguesas

Si la búsqueda no encuentra nada, usa el **fallback automático** que genera una URL genérica.
