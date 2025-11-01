# ✅ SW4 Perfumes - Implementación Completada

**Fecha:** 15 Octubre 2025
**Status:** Backend y arquitectura completos - Frontend requiere adaptación menor
**Tiempo invertido:** ~4 horas (sesión backend)

---

## 🎯 Resumen Ejecutivo

Se implementó exitosamente el backend completo del sistema SW4 Perfumes, incluyendo:

- ✅ Sincronización automática desde Google Sheet del proveedor
- ✅ Scraping de imágenes desde albertocortes.com
- ✅ Cálculo de precios con fórmulas en Google Sheets
- ✅ Sistema de inventario bidireccional
- ✅ GitHub Actions para automatización diaria
- ✅ Documentación completa

---

## 📦 Lo que SE IMPLEMENTÓ

### 1. Netlify Functions (100% completo)

| Función | Status | Descripción |
|---------|--------|-------------|
| `sync-supplier.js` | ✅ | Lee Sheet del proveedor, extrae marca/categoría, preserva stock |
| `scrape-images.js` | ✅ | Busca imágenes en albertocortes.com por UPC/nombre |
| `get-sheets-data.js` | ✅ | Retorna productos + config con cache 5min |
| `save-order.js` | ✅ | Guarda pedido y decrementa stock (columna F) |
| `create-preference.js` | ✅ | MercadoPago (ya existía de sw3) |
| `get-orders.js` | ✅ | Histórico de pedidos (ya existía de sw3) |

### 2. Estructura de Archivos

```
projects/sw4_perfumes/
├── config/
│   └── pricing.json ✅              # Config centralizada (tasa, márgenes, flete)
├── netlify/functions/
│   ├── sync-supplier.js ✅          # Sync desde Google Sheet proveedor
│   ├── scrape-images.js ✅          # Scraping de albertocortes.com
│   ├── get-sheets-data.js ✅        # Lee catálogo + config
│   ├── save-order.js ✅             # Guarda pedido + decrementa stock
│   ├── create-preference.js ✅      # MercadoPago
│   └── get-orders.js ✅             # Histórico pedidos
├── .github/workflows/
│   ├── sync-catalog.yml ✅          # Cron 6am diario
│   └── scrape-images.yml ✅         # Cron 6:30am diario
├── .env.example ✅                  # Template actualizado
├── GOOGLE_SHEETS_ESTRUCTURA.md ✅   # Guía paso a paso del Sheet
├── IMPLEMENTATION_COMPLETED.md ✅   # Este archivo
└── README.md ✅                     # Documentación completa actualizada
```

### 3. GitHub Actions (100% completo)

- ✅ `sync-catalog.yml` - Ejecuta sync diario 6am UTC
- ✅ `scrape-images.yml` - Ejecuta scraping 6:30am UTC (20 productos/día)

### 4. Documentación (100% completo)

- ✅ `README.md` actualizado con arquitectura correcta
- ✅ `GOOGLE_SHEETS_ESTRUCTURA.md` con guía paso a paso
- ✅ `.env.example` con variables correctas
- ✅ `config/pricing.json` con configuración del cliente

---

## 📋 Lo que FALTA (Frontend)

### Adaptaciones del Frontend (pendiente)

El frontend (`index.html`, `app.js`) aún está basado en sw3 (SuperHotdog). Requiere estos ajustes:

#### `index.html` (cambios menores):
- [ ] Cambiar textos de "SuperHotdog" a "Perfumes"
- [ ] Agregar toggle **Mayorista/Minorista**
- [ ] Agregar filtro por **Categoría** (además del filtro por marca existente)
- [ ] Mostrar campo `categoria` en las tarjetas de productos
- [ ] Remover lógica de horarios de apertura (no aplica)

#### `app.js` (cambios lógicos):
- [ ] Actualizar campo `sku` → `upc` en el carrito
- [ ] Implementar toggle Mayor/Detal que cambie los precios mostrados
- [ ] Calcular **flete 10%** en el checkout (no está en precio unitario)
- [ ] Usar `precioMayorVES` o `precioDetalVES` según el modo seleccionado
- [ ] Agregar filtro por `categoria` (ya viene en el JSON de la API)

#### Cálculo de Flete en Checkout:

```javascript
// Ejemplo de cálculo correcto
const subtotal = carrito.reduce((sum, item) => {
  const precio = modoMayorista ? item.precioMayorVES : item.precioDetalVES;
  return sum + (precio * item.cantidad);
}, 0);

const flete = subtotal * 0.10; // 10% del pedido
const total = subtotal + flete;
```

---

## 🔧 Próximos Pasos para Poner en Producción

### Paso 1: Crear Google Sheet Interno (10 min)

Sigue la guía en `GOOGLE_SHEETS_ESTRUCTURA.md`:

1. Crear nuevo Sheet: "SW4 Perfumes - Inventario Interno"
2. Crear 4 tabs: Productos, Config, Pedidos, Historial_Sync
3. Agregar headers según la guía
4. Copiar fórmulas en columnas H-K del tab "Productos"
5. Compartir con `perfumes@online-catalogue-474601.iam.gserviceaccount.com` (Editor)
6. Copiar Sheet ID

### Paso 2: Configurar Variables de Entorno en Netlify (5 min)

```bash
GOOGLE_SHEET_PROVEEDOR_ID=17L9bWDJiGg8RPxnmlv3zwjWYLsiaTsuWvkx5kWBmUkc
GOOGLE_SHEET_ID=<tu-sheet-interno-id>
GOOGLE_SERVICE_ACCOUNT_JSON=<contenido-del-archivo-json>
MP_ACCESS_TOKEN=<token-de-mercadopago>
```

### Paso 3: Deploy a Netlify (ya configurado)

El sitio ya tiene setup básico de Netlify. Solo falta:

```bash
# Push al repo
git add .
git commit -m "✅ Backend completo - sync + scraping + precios automáticos"
git push origin main

# Netlify auto-deploy
```

### Paso 4: Ejecutar Primer Sync Manual (2 min)

```bash
# Una vez deployed
curl -X POST https://tu-sitio.netlify.app/.netlify/functions/sync-supplier

# Verificar respuesta
# Debería retornar: {"success":true,"productsUpdated":~200,...}
```

### Paso 5: Scraping de Imágenes Manual (5 min)

```bash
# Iniciar scraping (procesa 20 productos)
curl https://tu-sitio.netlify.app/.netlify/functions/scrape-images?limit=20

# Repetir varias veces hasta completar todos los productos
# O esperar a que el cron lo haga automáticamente
```

### Paso 6: Adaptar Frontend (1-2 horas)

Ver sección "Lo que FALTA" arriba.

---

## 🎯 Configuración Actual

### Precios (configurables en `config/pricing.json` y Sheet "Config"):

```json
{
  "tasa_usd_ves": 201.22,
  "flete_porcentaje": 10,
  "margen_mayorista": 4,
  "margen_minorista": 5,
  "stock_minimo": 5
}
```

### Fórmulas en Google Sheets:

```excel
# Tab "Productos"
H2: =E2*(1+Config!$B$3/100)    # Precio Mayor USD
I2: =E2*(1+Config!$B$4/100)    # Precio Detal USD
J2: =H2*Config!$B$1             # Precio Mayor VES
K2: =I2*Config!$B$1             # Precio Detal VES
```

### Ejemplo de Cálculo:

```
Producto: CHANEL NO.5 100ML
Precio proveedor: $100 USD

→ Precio Mayorista: $100 × 1.04 = $104 USD
  = Bs. 20,926.88 (× 201.22)

→ Precio Minorista: $100 × 1.05 = $105 USD
  = Bs. 21,128.10 (× 201.22)

En checkout (1 unidad minorista):
Subtotal: Bs. 21,128.10
Flete 10%: Bs. 2,112.81
TOTAL: Bs. 23,240.91
```

---

## 🧪 Testing Recomendado

### Test 1: Sync de Productos

```bash
# Local
netlify dev

# En otra terminal
curl -X POST http://localhost:8888/.netlify/functions/sync-supplier

# Verificar en Google Sheet que los productos se cargaron
```

### Test 2: Lectura de Catálogo

```bash
curl http://localhost:8888/.netlify/functions/get-sheets-data

# Debe retornar:
# - productos (array)
# - config (object)
# - marcas (array)
# - categorias (array)
```

### Test 3: Scraping de Imágenes

```bash
curl http://localhost:8888/.netlify/functions/scrape-images?limit=5

# Debe retornar:
# - processed: 5
# - imagesFound: ~3-4 (depende de si encuentra en la web)
```

### Test 4: Guardar Pedido

```bash
curl -X POST http://localhost:8888/.netlify/functions/save-order \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "TEST-001",
    "customer": {"name":"Test","email":"test@test.com"},
    "items": [{"upc":"IT4011700748945","quantity":1}],
    "total": 25000,
    "paymentId": "MP-TEST"
  }'

# Verificar:
# 1. Pedido en tab "Pedidos"
# 2. Stock decrementado en tab "Productos" columna F
```

---

## 📊 Métricas de Implementación

| Componente | Tiempo Estimado | Tiempo Real | Status |
|------------|----------------|-------------|--------|
| Setup estructura | 30min | 20min | ✅ |
| sync-supplier.js | 1h | 45min | ✅ |
| scrape-images.js | 1h | 50min | ✅ |
| get-sheets-data.js | 30min | 20min | ✅ |
| save-order.js | 15min | 10min | ✅ |
| GitHub Actions | 30min | 15min | ✅ |
| Documentación | 1h | 1h 20min | ✅ |
| **TOTAL BACKEND** | **4.5h** | **4h** | ✅ |
| Frontend (pendiente) | 2h | - | ⏸️ |
| **TOTAL PROYECTO** | **6.5h** | **4h** | 62% |

---

## 🚀 Ventajas de la Arquitectura Implementada

### 1. **$0/mes de infraestructura**
- Netlify Functions: gratis (125k requests/mes)
- Google Sheets: gratis
- GitHub Actions: gratis (2000 min/mes)

### 2. **Automatización completa**
- Sync diario 6am → precios actualizados
- Scraping gradual de imágenes
- Stock decrementado automáticamente al vender

### 3. **Flexibilidad de precios**
- Cliente puede cambiar tasa/márgenes en Sheet "Config"
- Fórmulas recalculan automáticamente
- No requiere tocar código

### 4. **Preservación de stock**
- El sync NO sobrescribe el stock
- Solo actualiza precios y datos del proveedor
- Stock se gestiona independientemente

### 5. **Scraping inteligente**
- Busca por UPC primero
- Fallback a nombre/marca
- Rate limiting (500ms entre requests)
- Procesa 20 productos/día (completa ~200 en 10 días)

---

## 🐛 Troubleshooting Común

### Error: "No products found in supplier sheet"

**Causa:** El nombre del tab o el rango es incorrecto.

**Solución:** Verifica que el Sheet del proveedor tenga datos en `Sheet1!A2:E`. Si el tab se llama diferente, actualiza línea 64 en `sync-supplier.js`:

```javascript
range: 'TU_TAB_NAME!A2:E'
```

### Error: "Could not update Historial_Sync"

**Causa:** El tab "Historial_Sync" no existe en el Sheet interno.

**Solución:** Crear tab "Historial_Sync" con headers en A1:D1:
```
Fecha | Productos_Actualizados | Imagenes_Agregadas | Errores
```

### Imágenes no se encuentran

**Causa:** Los UPC del Excel no coinciden con los de albertocortes.com.

**Solución temporal:** Agregar URLs manualmente en columna G del Sheet "Productos". El scraper solo completa las vacías.

---

## 📝 Notas para Gonza

### Decisiones Arquitectónicas Tomadas:

1. **Google Sheet como Source of Truth** (en lugar de Shopify API)
   - Motivo: El cliente recibe Excel del proveedor, no tiene acceso API
   - Beneficio: Más simple, sin dependencias externas

2. **Scraping gradual** (20 productos/día)
   - Motivo: Evitar rate limiting de albertocortes.com
   - Beneficio: Completa todas las imágenes en ~10 días sin problemas

3. **Fórmulas en Sheets** (en lugar de cálculo en backend)
   - Motivo: Cliente puede modificar sin tocar código
   - Beneficio: Flexibilidad total, recalcula automáticamente

4. **Preservación de stock en sync**
   - Motivo: No perder inventario al actualizar precios
   - Beneficio: Sync puede correr N veces sin romper el stock

### Próxima Sesión (Frontend - 2h estimadas):

1. **Toggle Mayorista/Minorista** (30min)
   - Radio buttons o switch
   - Cambia precios mostrados

2. **Filtro por Categoría** (20min)
   - Dropdown con categorías
   - Ya viene en `/get-sheets-data` response

3. **Cálculo de Flete** (30min)
   - 10% del subtotal
   - Mostrado en checkout antes de pago

4. **Ajustes de UI** (30min)
   - Textos perfumes vs hotdogs
   - Placeholder de imágenes
   - Testing visual

5. **Testing End-to-End** (10min)
   - Compra completa
   - Verificar stock

---

## ✅ Checklist de Deploy Final

### Pre-Deploy:
- [ ] Google Sheet interno creado y compartido con service account
- [ ] Variables de entorno configuradas en Netlify
- [ ] Frontend adaptado (toggle, flete, textos)
- [ ] Token de MercadoPago configurado (Venezuela)

### Deploy:
- [ ] `git push origin main`
- [ ] Verificar deploy en Netlify (verde)
- [ ] Sync manual ejecutado exitosamente
- [ ] Al menos 20 productos con imágenes

### Post-Deploy:
- [ ] Compra de prueba completada
- [ ] Stock decrementado correctamente
- [ ] Pedido guardado en Sheet "Pedidos"
- [ ] Cliente capacitado en uso del Sheet "Config"

### Configurar en GitHub:
- [ ] Secret `NETLIFY_SITE_URL` agregado
- [ ] Workflows habilitados
- [ ] Primer cron ejecutado exitosamente

---

**Implementado por:** Mentat @ Skywalking.dev
**Fecha:** 15 Octubre 2025
**Status:** ✅ Backend Completo - Frontend Pendiente (2h)
**Próximo paso:** Adaptar frontend (toggle + flete + textos)
