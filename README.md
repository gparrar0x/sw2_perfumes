# SW4 - Sistema de Inventario y Catálogo de Perfumes

Sistema automatizado para gestión de inventario, sincronización de catálogo y ventas online de perfumes.

## 🚀 URLs de Deployment

- **Producción:** https://sw-commerce-perfumes.vercel.app (pendiente deploy final)
- **Preview:** https://sw-commerce-perfumes-ctgw5c0pa-gparrar-3019s-projects.vercel.app
- **Dashboard:** https://vercel.com/gparrar-3019s-projects/sw-commerce-perfumes
- **Local:** http://localhost:3000 (`npm run dev`)

## 🎯 Características

- ✅ **Sync automático desde Google Sheet del proveedor** (Excel de Alberto Cortés)
- ✅ **Scraping de imágenes** desde albertocortes.com
- ✅ **Cálculo automático de precios** (mayorista 4%, minorista 5%) con fórmulas en Sheets
- ✅ **Catálogo online** con filtros por marca, categoría y búsqueda
- ✅ **Gestión de inventario** bidireccional (preserva stock al actualizar precios)
- ✅ **Pagos con MercadoPago** (funciona en Venezuela)
- ✅ **Stock en tiempo real** decrementado automáticamente al vender
- ✅ **Flete 10% calculado en checkout** (no en precio unitario)
- ✅ **$0/mes infraestructura** (Vercel Hobby + Google Sheets + GitHub Actions gratis)

## 🏗️ Arquitectura

```
Google Sheet Proveedor (Source of Truth)
          ↓
GitHub Actions (cron 6am diario)
          ↓
Vercel Serverless Function (sync-supplier.js)
  - Lee Excel del proveedor
  - Extrae marca automáticamente
  - Detecta categoría (EDT/EDP/Cologne)
  - Preserva stock existente
          ↓
Google Sheet Interno (Productos)
  - Fórmulas calculan precios (H-K)
  - Tasa USD/VES configurable (201.22)
  - Márgenes: Mayor 4%, Detal 5%
          ↓
Vercel Function (scrape-images.js)
  - Busca imágenes en albertocortes.com
  - Por UPC o nombre
  - 10 productos por ejecución
          ↓
Frontend Web (index.html)
  - Catálogo con toggle Mayor/Detal
  - Filtros por marca y categoría
  - Carrito de compras
          ↓
MercadoPago Checkout
  - Flete 10% del subtotal
  - Pagos en Bolívares (VES)
          ↓
Webhook → save-order.js
  - Guarda en tab "Pedidos"
  - Decrementa stock en tab "Productos"
```

## 📋 Setup Rápido

### 1. Requisitos Previos

- Cuenta de Vercel (gratis)
- Google Cloud Project con Sheets API habilitado
- Service Account de Google
- Token de MercadoPago
- Google Sheet creado (ver `GOOGLE_SHEETS_SETUP.md`)

### 2. Desarrollo Local

```bash
# Instalar dependencias
npm install

# Copiar .env.example a .env y llenar credenciales
cp .env.example .env

# Editar .env con tus credenciales:
# GOOGLE_SHEET_ID=tu_sheet_id
# GOOGLE_SHEET_PROVEEDOR_ID=17L9bWDJiGg8RPxnmlv3zwjWYLsiaTsuWvkx5kWBmUkc
# GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account"...}
# MP_ACCESS_TOKEN=tu_token_mercadopago

# Iniciar servidor de desarrollo local
npm run dev
# → http://localhost:3000
```

**Nota:** El servidor custom (`dev-server.js`) simula el comportamiento de Vercel Functions localmente, cargando env vars desde `.env.local` o `.env`.

### 3. Deploy a Vercel

```bash
# Instalar Vercel CLI (si no lo tienes)
npm install -g vercel

# Login a Vercel
vercel login

# Deploy a preview
vercel

# Configurar env vars en Vercel Dashboard:
# https://vercel.com/<tu-user>/<proyecto>/settings/environment-variables
# Agregar las 4 variables:
# - GOOGLE_SHEET_ID
# - GOOGLE_SHEET_PROVEEDOR_ID
# - GOOGLE_SERVICE_ACCOUNT_JSON
# - MP_ACCESS_TOKEN

# Deploy a producción
vercel --prod
```

**Documentación completa:** Ver `docs/VERCEL_DEPLOYMENT_PLAN.md` y `docs/DEPLOYMENT_STATUS.md`

### 4. Configurar GitHub Actions

1. Ve a tu repo en GitHub → Settings → Secrets and variables → Actions
2. Agregar secret: `VERCEL_DEPLOYMENT_URL` con valor `https://sw-commerce-perfumes.vercel.app`
3. Los workflows en `.github/workflows/` se ejecutarán automáticamente

## 📊 Estructura de Google Sheets

Ver `GOOGLE_SHEETS_SETUP.md` para detalles completos.

**Tabs requeridos:**
- `Productos` (A:L) - Catálogo con precios calculados + columna Activo
- `Pedidos` (A:H) - Registro de ventas
- `Config` (A:B) - Configuración de márgenes y tasa (tasa_usd_ves: 201.22, flete_%: 10, margen_mayor: 4, margen_detal: 5)
- `Historial_Sync` (A:D) - Log de sincronizaciones

**Google Sheet del Proveedor** (read-only):
- ID: `17L9bWDJiGg8RPxnmlv3zwjWYLsiaTsuWvkx5kWBmUkc`
- Columnas: UPC, Long description, Price-1, Qty Order, Total

## 🔧 Vercel Serverless Functions

| Function | URL | Descripción |
|----------|-----|-------------|
| `sync-supplier.js` | `/api/sync-supplier` | Sincroniza productos desde Google Sheet del proveedor |
| `scrape-images.js` | `/api/scrape-images` | Busca imágenes en albertocortes.com por UPC/nombre |
| `get-sheets-data.js` | `/api/get-sheets-data` | Lee catálogo y config (cache 5min) |
| `save-order.js` | `/api/save-order` | Guarda pedido y decrementa stock |
| `create-preference.js` | `/api/create-preference` | Crea preferencia de pago MP |
| `get-orders.js` | `/api/get-orders` | Lee histórico de pedidos |
| `test-env.js` | `/api/test-env` | Verifica env vars (desarrollo) |

## 🧪 Testing

### Test local

```bash
# Iniciar servidor de desarrollo
npm run dev

# En otra terminal:

# 1. Verificar env vars
curl http://localhost:3000/api/test-env | jq .

# 2. Test de catálogo
curl http://localhost:3000/api/get-sheets-data | jq '.productos | length'

# 3. Sync manual
curl -X POST http://localhost:3000/api/sync-supplier -H "Content-Type: application/json"

# 4. Scraping de imágenes
curl http://localhost:3000/api/scrape-images?limit=5 | jq .
```

### Test del frontend local

1. Abre `http://localhost:3000` en el navegador
2. Deberías ver el catálogo de perfumes
3. Probar filtros por marca y búsqueda
4. Probar agregar al carrito

### Test en producción

```bash
# Reemplazar con tu URL de Vercel
VERCEL_URL="https://sw-commerce-perfumes.vercel.app"

# Test APIs
curl $VERCEL_URL/api/test-env | jq .
curl $VERCEL_URL/api/get-sheets-data | jq '.productos | length'
```

## 🚀 Flujo de Trabajo

### Sync Automático Diario

**6:00am UTC - Sync de Productos:**
1. GitHub Actions ejecuta cron
2. Llama a `/api/sync-supplier`
3. Lee Google Sheet del proveedor (columnas A-C: UPC, descripción, precio)
4. Extrae marca (primera palabra de la descripción)
5. Detecta categoría (EDT/EDP/Cologne/etc)
6. Preserva stock existente (no lo sobrescribe)
7. Actualiza tab "Productos" (columnas A-G) en Sheet interno
8. Las fórmulas recalculan precios automáticamente (columnas H-K)

**6:30am UTC - Scraping de Imágenes:**
1. GitHub Actions ejecuta segundo cron
2. Llama a `/api/scrape-images?limit=20`
3. Busca productos sin imagen (columna G vacía)
4. Para cada uno, busca en albertocortes.com por UPC
5. Si no encuentra, busca por nombre/marca
6. Actualiza columna G con URL de Shopify CDN
7. Procesa 20 productos por ejecución (evita rate limiting)

### Proceso de Venta

1. Cliente navega catálogo en el sitio web
2. Selecciona modo: **Mayorista** o **Minorista** (toggle)
3. Filtra por marca o categoría
4. Agrega productos al carrito
5. Click en "Pagar" → se calcula **Flete 10%** del subtotal
6. `create-preference` crea preferencia MP con total + flete
7. Cliente paga en MercadoPago (en Bolívares VES)
8. Webhook de MP llama a `save-order`
9. Se guarda pedido en tab "Pedidos"
10. Se decrementa stock en tab "Productos" columna F (por UPC)

## 📝 Modificar Precios

Para cambiar tasa de cambio o márgenes:

1. Abre el Google Sheet interno
2. Ve al tab "Config"
3. Modifica los valores:
   - `tasa_usd_ves`: **201.22** (Bolívares por dólar)
   - `flete_%`: **10** (Porcentaje del pedido, aplicado en checkout)
   - `margen_mayor`: **4** (Margen mayorista %)
   - `margen_detal`: **5** (Margen minorista %)

Las fórmulas recalcularán automáticamente todos los precios.

**Ejemplo de cálculo:**
```
Precio proveedor: $100 USD
Margen mayorista 4%:  $100 × 1.04 = $104 USD → Bs. 20,926.88
Margen minorista 5%:  $100 × 1.05 = $105 USD → Bs. 21,128.10

En checkout con 1 producto minorista:
Subtotal: Bs. 21,128.10
Flete 10%: Bs. 2,112.81
Total: Bs. 23,240.91
```

## 🐛 Troubleshooting

### Error: "GOOGLE_SHEET_ID not configured"

1. Verifica que `.env` o `.env.local` tenga `GOOGLE_SHEET_ID` correcto
2. En Vercel: Settings → Environment Variables (https://vercel.com/.../settings/environment-variables)
3. Asegúrate de que el Sheet ID sea el correcto (desde la URL del Sheet)

### Error: "Service account not found"

1. Verifica que `GOOGLE_SERVICE_ACCOUNT_JSON` esté completo
2. Debe ser un JSON válido (usa `JSON.parse()` para validar)
3. Verifica que el Service Account tenga permisos de Editor en el Sheet

### No se sincronizan productos

1. Verifica que `GOOGLE_SHEET_PROVEEDOR_ID` esté configurado correctamente
2. Verifica que el Sheet del proveedor tenga productos en `Sheet1!A2:E`
3. Revisa logs en Vercel: Dashboard → Deployments → (click deployment) → Functions
4. Ejecuta sync manual para ver errores:
   ```bash
   curl -X POST https://sw-commerce-perfumes.vercel.app/api/sync-supplier
   ```

### Imágenes no aparecen

1. Verifica que `albertocortes.com` esté accesible
2. Ejecuta scraping manual:
   ```bash
   curl https://sw-commerce-perfumes.vercel.app/api/scrape-images?limit=5
   ```
3. Revisa logs de Vercel para ver qué productos no se encontraron
4. Puedes forzar re-scraping con `?force=true`

### Stock no se decrementa

1. Verifica que los **UPC** del pedido coincidan con columna A en "Productos"
2. Revisa logs de `save-order` en Vercel Dashboard → Functions
3. Verifica permisos del Service Account (debe ser Editor, no solo Viewer)
4. El stock está en **columna F**, no en E

## 📚 Documentación Adicional

- `docs/VERCEL_DEPLOYMENT_PLAN.md` - Plan completo de deployment a Vercel (7 fases)
- `docs/DEPLOYMENT_STATUS.md` - Estado actual + próximos pasos + checklist
- `GOOGLE_SHEETS_SETUP.md` - Guía detallada del setup de Google Sheets
- `.env.example` - Template de variables de entorno
- `docs/PRD.md` - Product Requirements Document
- `dev-server.js` - Servidor de desarrollo local custom (simula Vercel)

## 🤝 Soporte

Para dudas o problemas:
- GitHub Issues
- Email: Gonza @ Skywalking.dev

---

**Hecho con ❤️ por Skywalking.dev** 🚀

**Stack:** Vercel Serverless Functions + Google Sheets API + Web Scraping + MercadoPago + GitHub Actions

**Configuración actual:**
- Tasa: 201.22 VES/USD
- Flete: 10% del pedido
- Margen Mayorista: 4%
- Margen Minorista: 5%
- Proveedor: Alberto Cortés (Excel en Google Sheets)
