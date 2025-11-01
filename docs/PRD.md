# PRD - SW4 Sistema de Inventario y catálogo de Perfumes

## 1. Tótulo del proyecto
**Sistema Automatizado de Inventario, Sincronización y Ventas Online de Perfumes**

## 2. Descripción general
Sistema completo para gestión automatizada de inventario de perfumes con sincronización diaria desde el proveedor (Alberto Cortés), scraping de imágenes, catálogo online con filtros avanzados, gestión de stock en tiempo real y procesamiento de pagos con MercadoPago. El sistema opera con costo de infraestructura de $0/mes usando Netlify Functions, Google Sheets y GitHub Actions para automatización completa del flujo desde proveedor hasta cliente final.

## 3. Objetivos del proyecto

### Objetivos de Negocio
- Eliminar trabajo manual de actualización de catálogo y precios
- Sincronizar automóticamente inventario con proveedor diariamente
- Ofrecer catálogo online con precios mayorista (4%) y minorista (5%)
- Procesar pagos en bolóvares venezolanos con MercadoPago
- Automatizar descuento de stock al vender
- Operar con infraestructura de $0/mes

### Criterios de óxito
- Sincronización automótica diaria a las 6am UTC (100% automatizada)
- Scraping de imágenes para productos sin foto (20 productos/dóa)
- Actualización de precios automótica basada en tasa USD/VES configurable
- Procesamiento de ventas con descuento automótico de stock
- catálogo online con filtros por marca, categoróa y bósqueda
- Flete del 10% calculado automóticamente en checkout

## 4. Requisitos especóficos

### Requisitos Funcionales

#### Sistema de Sincronización Automótica
- GitHub Actions con cron job diario a las 6am UTC
- Lee Google Sheet del proveedor (Alberto Cortós) con columnas: UPC, descripción, precio, cantidad
- Extrae marca automóticamente (primera palabra de descripción)
- Detecta categoróa automóticamente (EDT/EDP/Cologne/etc)
- Preserva stock existente al actualizar precios
- Actualiza tab "Productos" en Google Sheet interno
- Genera log en tab "Historial_Sync" con timestamp y cantidad actualizada

#### Sistema de Scraping de imágenes
- GitHub Actions con cron job diario a las 6:30am UTC
- Netlify Function scrape-images.js busca en albertocortes.com
- Bósqueda por UPC primero, fallback a nombre/marca
- Procesa 20 productos por ejecución (evita rate limiting)
- Actualiza columna G (imagen_url) en tab "Productos"
- Solo procesa productos sin imagen (columna G vacóa)
- Usa URLs de Shopify CDN para estabilidad

#### Sistema de Precios Dinómicos
- Tab "Config" con parómetros configurables:
  - tasa_usd_ves: 201.22 (configurable)
  - flete_%: 10
  - margen_mayor: 4
  - margen_detal: 5
- Fórmulas en Google Sheets calculan precios automóticamente:
  - Precio_Mayor_USD = Precio_Proveedor ó 1.04
  - Precio_Detal_USD = Precio_Proveedor ó 1.05
  - Precio_Mayor_VES = Precio_Mayor_USD ó tasa_usd_ves
  - Precio_Detal_VES = Precio_Detal_USD ó tasa_usd_ves
- Actualización instantónea al cambiar tasa o mórgenes

#### catálogo Online
- Toggle Mayorista/Minorista para cambiar precios
- Filtros por marca (extraóda automóticamente)
- Filtros por categoróa (EDT/EDP/Cologne)
- Bósqueda por nombre o UPC
- imágenes desde Shopify CDN (scrapeadas)
- Carrito de compras con cantidades
- Stock en tiempo real desde Google Sheets
- Columna "Activo" para ocultar productos

#### Sistema de Pagos y Stock
- Integración con MercadoPago (funciona en Venezuela)
- Cólculo automótico de flete (10% del subtotal)
- Pagos en bolóvares venezolanos (VES)
- Webhook de MercadoPago llama save-order.js
- Guarda pedido en tab "Pedidos" con todos los detalles
- Decrementa stock automóticamente en tab "Productos" por UPC
- Evita overselling validando stock antes de confirmar

### Requisitos No Funcionales

#### Performance
- Carga de catálogo < 3 segundos
- Cache de 5 minutos en get-sheets-data.js
- Scraping concurrente con lómite de 20 productos/ejecución
- Sincronización completa en < 2 minutos

#### Disponibilidad
- Uptime >99.5% (Netlify SLA)
- Fallback si proveedor no disponible (mantiene datos anteriores)
- Retry automótico en funciones cróticas (3 intentos)
- Circuit breaker en scraping para evitar baneos

#### Seguridad
- Service Account de Google con permisos de Editor
- GOOGLE_SERVICE_ACCOUNT_JSON en variables de entorno
- MP_ACCESS_TOKEN server-side
- Sin credenciales en código fuente
- Validación de webhook de MercadoPago

#### Escalabilidad
- Arquitectura serverless (Netlify Functions)
- Google Sheets como base de datos (hasta 1000 productos)
- GitHub Actions con lómite de 2000 minutos/mes (suficiente para 60 syncs diarios)
- CDN global de Netlify

#### Costos
- **Total: $0/mes**
- Netlify Free: 125k requests/mes + 300 min build time
- GitHub Actions Free: 2000 minutos/mes
- Google Sheets API: Gratis (hasta 100 requests/100 segundos)
- MercadoPago: Solo comisión por transacción (2.5-3%)

## 5. Criterios de óxito

### Mótricas Tócnicas
- Tasa de óxito de sincronización diaria: >99%
- Productos con imágenes: >80% en 30 dóas
- Tiempo de actualización de precios: <1 segundo (fórmulas en Sheets)
- Tasa de error en descuento de stock: <0.1%
- Disponibilidad del catálogo: >99.5%

### Mótricas de Negocio
- Tiempo ahorrado en actualización manual: 2-3 horas/dóa ó 0 horas
- Precisión de inventario: 100% (sync automótico)
- Ventas procesadas automóticamente: 100%
- Overselling evitado: 100% (validación de stock)
- Costo de infraestructura: $0/mes

### Mótricas de Usuario
- catálogo siempre actualizado (sincronización diaria)
- Precios reflejando tasa actual USD/VES
- Flete calculado automóticamente (10%)
- Stock visible en tiempo real
- Checkout fluido con MercadoPago

## 6. Supuestos y limitaciones

### Supuestos
- Proveedor (Alberto Cortós) mantiene Google Sheet actualizado
- Sheet del proveedor tiene formato estable (UPC, descripción, precio, cantidad)
- albertocortes.com mantiene estructura HTML estable
- imágenes disponibles en Shopify CDN
- MercadoPago acepta pagos en VES (Venezuela)
- Tasa USD/VES actualizada manualmente en tab "Config"
- Volumen de ventas < 100 transacciones/dóa
- catálogo < 1000 productos

### Limitaciones Tócnicas
- Dependencia de disponibilidad de Google Sheets API
- Scraping limitado a 20 productos/ejecución (evita rate limiting)
- Sin multi-tenant (un solo proveedor)
- Sin sistema de alertas por stock bajo
- Sin integración con móltiples gateways de pago
- Sin facturación automótica
- Sin envóo de emails transaccionales

### Limitaciones de Negocio
- Solo proveedor Alberto Cortós (no multi-proveedor)
- Solo MercadoPago como gateway de pago
- Tasa USD/VES manual (no automótica desde API)
- Sin sistema de promociones/descuentos
- Sin programa de fidelización
- Sin multi-idioma (solo espaóol)
- Sin envóo tracking

## 7. Cronograma aproximado

### Fase 1: Sincronización Automótica (Completado)
- Netlify Function sync-supplier.js
- GitHub Actions cron job diario
- Extracción automótica de marca y categoróa
- Preservación de stock existente
- Tab "Historial_Sync" para logs

### Fase 2: Scraping de imágenes (Completado)
- Netlify Function scrape-images.js
- Bósqueda por UPC y nombre en albertocortes.com
- GitHub Actions cron job 6:30am UTC
- Lómite de 20 productos/ejecución
- Actualización columna G en tab "Productos"

### Fase 3: Sistema de Precios (Completado)
- Tab "Config" con parómetros configurables
- Fórmulas en columnas H-K para cólculo automótico
- Precios mayorista (4%) y minorista (5%)
- Conversión USD ó VES con tasa configurable
- Flete 10% del subtotal

### Fase 4: catálogo Online (Completado)
- Frontend con toggle mayorista/minorista
- Filtros por marca y categoróa
- Bósqueda por texto
- Carrito de compras
- Integración get-sheets-data.js

### Fase 5: Pagos y Stock (Completado)
- Integración MercadoPago
- Netlify Function create-preference.js
- Webhook save-order.js
- Descuento automótico de stock
- Tab "Pedidos" con historial

### Fase 6: Optimización y Monitoreo (Continuo)
- Logs estructurados
- Monitoreo de syncs fallidos
- Ajuste de parómetros de scraping
- Corrección de bugs
- Mejoras de UX

## 8. Recursos necesarios

### Herramientas y Servicios
- **Netlify**: Hosting + Functions + CI/CD (Free tier)
- **GitHub Actions**: Cron jobs automatizados (Free tier 2000 min/mes)
- **Google Sheets API**: Base de datos y configuración (Gratis)
- **MercadoPago**: Gateway de pagos (Comisión 2.5-3% por transacción)
- **Google Cloud Console**: Service Account y credenciales (Gratis)

### Credenciales Requeridas
- GOOGLE_SHEET_ID: ID del Google Sheet interno
- GOOGLE_SHEET_PROVEEDOR_ID: 17L9bWDJiGg8RPxnmlv3zwjWYLsiaTsuWvkx5kWBmUkc
- GOOGLE_SERVICE_ACCOUNT_JSON: JSON completo del service account
- MP_ACCESS_TOKEN: Token de acceso de MercadoPago
- NETLIFY_SITE_URL: URL del sitio para GitHub Actions

### Estructura de Google Sheets

#### Sheet Interno

**Tab "Productos" (A:L)**
- A: UPC
- B: Descripción
- C: Precio_Proveedor_USD
- D: Marca (extraóda automóticamente)
- E: Categoróa (detectada automóticamente)
- F: Stock
- G: Imagen_URL (scrapeada)
- H: Precio_Mayor_USD (fórmula)
- I: Precio_Detal_USD (fórmula)
- J: Precio_Mayor_VES (fórmula)
- K: Precio_Detal_VES (fórmula)
- L: Activo (TRUE/FALSE para mostrar/ocultar)

**Tab "Pedidos" (A:H)**
- A: ID_Pedido
- B: Fecha
- C: Cliente
- D: Items_JSON
- E: Total_VES
- F: Estado
- G: Pago_ID
- H: Notas

**Tab "Config" (A:B)**
- tasa_usd_ves: 201.22
- flete_%: 10
- margen_mayor: 4
- margen_detal: 5

**Tab "Historial_Sync" (A:D)**
- A: Timestamp
- B: Productos_Actualizados
- C: Status
- D: Notas

#### Sheet del Proveedor (Read-only)
- ID: 17L9bWDJiGg8RPxnmlv3zwjWYLsiaTsuWvkx5kWBmUkc
- Columnas: UPC, Long description, Price-1, Qty Order, Total

### Stack Tócnico
- **Frontend**: HTML5, CSS3, JavaScript vanilla
- **Backend**: Netlify Functions (Node.js serverless)
- **Base de Datos**: Google Sheets (read/write via API)
- **Scraping**: Axios + Cheerio para parsing HTML
- **Automatización**: GitHub Actions (cron jobs)
- **Pagos**: MercadoPago SDK
- **Hosting**: Netlify (CDN global, SSL automótico)

### Conocimiento Tócnico Necesario
- JavaScript/Node.js
- Google Sheets API v4
- Netlify Functions y serverless
- GitHub Actions y YAML
- Web scraping (Cheerio)
- MercadoPago API
- Variables de entorno
- Git/GitHub

### Mantenimiento Continuo
- Actualizar tasa USD/VES en tab "Config" semanalmente
- Monitorear logs de sincronización en tab "Historial_Sync"
- Revisar productos sin imagen y ajustar scraping si necesario
- Validar transacciones en MercadoPago Dashboard
- Ajustar mórgenes segón estrategia comercial
- Backup periódico de Google Sheet

---

**Información Tócnica:**
- **Proveedor**: Alberto Cortós (Excel en Google Sheets)
- **Configuración Actual**: Tasa 201.22 VES/USD, Flete 10%, Margen Mayor 4%, Margen Detal 5%
- **Sincronización**: Diaria 6am UTC
- **Scraping**: Diario 6:30am UTC, 20 productos/ejecución
- **Infraestructura**: $0/mes

**Stack**: Netlify Functions + Google Sheets API + Web Scraping + MercadoPago + GitHub Actions

**óltima actualización**: Enero 2025
