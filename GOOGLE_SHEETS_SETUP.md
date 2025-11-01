# 📊 Google Sheets Setup - SW4 Perfumes

Guía completa para configurar el Google Sheet del sistema de inventario.

## 🎯 Estructura General

El Google Sheet debe tener **3 tabs (pestañas)**:
1. **Productos** - Catálogo sincronizado desde Shopify
2. **Pedidos** - Registro de ventas
3. **Config** - Configuración de precios y márgenes

---

## Tab 1: Productos

**Rango:** A1:K (Headers en fila 1, datos desde fila 2)

| Col | Campo | Tipo | Fuente | Ejemplo |
|-----|-------|------|--------|---------|
| A | SKU | Text | Sync | `AC-12345` |
| B | Nombre | Text | Sync | `Chanel No.5 100ml` |
| C | Marca | Text | Sync | `Chanel` |
| D | Precio_USD | Number | Sync | `100` |
| E | Stock_Propio | Number | Manual/Decrementado | `25` |
| F | Imagen_URL | URL | Sync | `https://cdn.shopify.com/...` |
| G | Fecha_Sync | DateTime | Sync | `2025-10-13T10:30:00Z` |
| H | Precio_Mayor_USD | **FORMULA** | Calculado | `134.50` |
| I | Precio_Detal_USD | **FORMULA** | Calculado | `157.50` |
| J | Precio_Mayor_VES | **FORMULA** | Calculado | `4,909.25` |
| K | Precio_Detal_VES | **FORMULA** | Calculado | `5,748.75` |

### 📝 Headers (Fila 1)

```
A1: SKU
B1: Nombre
C1: Marca
D1: Precio_USD
E1: Stock_Propio
F1: Imagen_URL
G1: Fecha_Sync
H1: Precio_Mayor_USD
I1: Precio_Detal_USD
J1: Precio_Mayor_VES
K1: Precio_Detal_VES
```

### 🔢 Fórmulas (Copiar a TODA la columna desde fila 2)

**Columna H (Precio_Mayor_USD):**
```excel
=(D2+Config!$B$2)*(1+Config!$B$3/100)
```
Explicación: `(Precio USD + Flete) * (1 + Margen Mayor%/100)`

**Columna I (Precio_Detal_USD):**
```excel
=(D2+Config!$B$2)*(1+Config!$B$4/100)
```
Explicación: `(Precio USD + Flete) * (1 + Margen Detal%/100)`

**Columna J (Precio_Mayor_VES):**
```excel
=H2*Config!$B$1
```
Explicación: `Precio Mayor USD * Tasa USD/VES`

**Columna K (Precio_Detal_VES):**
```excel
=I2*Config!$B$1
```
Explicación: `Precio Detal USD * Tasa USD/VES`

### ⚙️ Cómo aplicar las fórmulas

1. En H2, pega la fórmula: `=(D2+Config!$B$2)*(1+Config!$B$3/100)`
2. Selecciona H2 y arrastra hacia abajo para copiar a todas las filas
3. Repite para columnas I, J, K

**Nota:** Las referencias con `$` (como `Config!$B$2`) son absolutas y no cambiarán al copiar.

### 📦 Ejemplo de datos (Fila 2)

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| AC-001 | Chanel No.5 100ml | Chanel | 100 | 25 | https://... | 2025-10-13T10:30:00Z | =FORMULA | =FORMULA | =FORMULA | =FORMULA |

Con Config: `tasa=36.5`, `flete=5`, `margen_mayor=30`, `margen_detal=50`

Resultados calculados:
- H2: `134.50` USD (100+5) * 1.30
- I2: `157.50` USD (100+5) * 1.50
- J2: `4,909.25` VES (134.50 * 36.5)
- K2: `5,748.75` VES (157.50 * 36.5)

---

## Tab 2: Pedidos

**Rango:** A1:H (Headers en fila 1, datos desde fila 2)

| Col | Campo | Tipo | Descripción | Ejemplo |
|-----|-------|------|-------------|---------|
| A | ID_Pedido | Text | Único por pedido | `PF-20251013-001` |
| B | Fecha | DateTime | ISO timestamp | `2025-10-13T15:30:00.000Z` |
| C | Cliente_Nombre | Text | Nombre completo | `Juan Pérez` |
| D | Cliente_Email | Text | Email del cliente | `juan@example.com` |
| E | Items_JSON | Text | JSON string de productos | `[{"sku":"AC-001","qty":2}]` |
| F | Total | Number | Total del pedido | `9818.50` |
| G | Metodo_Pago | Text | Siempre "mercadopago" | `mercadopago` |
| H | Pago_ID | Text | ID de transacción MP | `123456789` |

### 📝 Headers (Fila 1)

```
A1: ID_Pedido
B1: Fecha
C1: Cliente_Nombre
D1: Cliente_Email
E1: Items_JSON
F1: Total
G1: Metodo_Pago
H1: Pago_ID
```

### 📦 Ejemplo de datos (Fila 2)

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| PF-20251013-001 | 2025-10-13T15:30:00.000Z | Juan Pérez | juan@example.com | [{"sku":"AC-001","quantity":2,"price":4909.25}] | 9818.50 | mercadopago | 123456789 |

**Nota:** Esta tab se llena automáticamente por `save-order.js`. No necesitas editar manualmente.

---

## Tab 3: Config

**Rango:** A1:B (Sin headers, datos desde fila 1)

| Row | A (Parametro) | B (Valor) | Descripción |
|-----|---------------|-----------|-------------|
| 1 | `tasa_usd_ves` | `36.5` | Tasa de cambio USD → VES |
| 2 | `flete_usd` | `5` | Costo de flete por producto (USD) |
| 3 | `margen_mayor_%` | `30` | Margen de ganancia mayorista (%) |
| 4 | `margen_detal_%` | `50` | Margen de ganancia detallista (%) |
| 5 | `stock_minimo` | `5` | Stock mínimo para alertas |

### 📝 Configuración exacta

**IMPORTANTE:** Los nombres en columna A deben ser EXACTOS (con guiones bajos y caracteres especiales).

```
A1: tasa_usd_ves       B1: 36.5
A2: flete_usd          B2: 5
A3: margen_mayor_%     B3: 30
A4: margen_detal_%     B4: 50
A5: stock_minimo       B5: 5
```

### 💡 Cómo modificar precios

**Para actualizar la tasa de cambio:**
1. Ve al tab "Config"
2. Modifica B1 (ej: de `36.5` a `37.0`)
3. ✅ Los precios en "Productos" se recalculan automáticamente

**Para cambiar márgenes:**
1. Modifica B3 (margen mayorista) o B4 (margen detallista)
2. ✅ Los precios se actualizan en toda la columna

---

## 🔧 Setup Inicial Paso a Paso

### 1. Crear el Google Sheet

1. Ve a [sheets.google.com](https://sheets.google.com)
2. Crea una nueva hoja
3. Rename la hoja a "SW4 - Perfumes Inventory"

### 2. Crear las 3 tabs

1. Rename el tab por defecto a "Productos"
2. Click en **+** abajo a la izquierda para agregar tab
3. Nombrar el nuevo tab "Pedidos"
4. Agregar otro tab y nombrar "Config"

### 3. Configurar tab "Productos"

1. Ve al tab "Productos"
2. En A1:K1, pega los headers:
   ```
   SKU | Nombre | Marca | Precio_USD | Stock_Propio | Imagen_URL | Fecha_Sync | Precio_Mayor_USD | Precio_Detal_USD | Precio_Mayor_VES | Precio_Detal_VES
   ```
3. **NO agregues datos aún** (el sync los llenará automáticamente)
4. Pega las fórmulas en H2, I2, J2, K2 (ver sección "Fórmulas" arriba)
5. Selecciona H2:K2 y arrastra hacia abajo hasta fila 300 (para tener las fórmulas listas)

### 4. Configurar tab "Pedidos"

1. Ve al tab "Pedidos"
2. En A1:H1, pega los headers:
   ```
   ID_Pedido | Fecha | Cliente_Nombre | Cliente_Email | Items_JSON | Total | Metodo_Pago | Pago_ID
   ```
3. Listo, este tab se llenará automáticamente con cada venta

### 5. Configurar tab "Config"

1. Ve al tab "Config"
2. Pega exactamente:
   ```
   A1: tasa_usd_ves       B1: 36.5
   A2: flete_usd          B2: 5
   A3: margen_mayor_%     B3: 30
   A4: margen_detal_%     B4: 50
   A5: stock_minimo       B5: 5
   ```
3. **IMPORTANTE:** Verifica que los nombres en A sean exactos (con guiones bajos)

### 6. Obtener el Sheet ID

1. Copia la URL de tu Google Sheet
2. Formato: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/edit`
3. Extrae el `{SHEET_ID}` (es una cadena larga alfanumérica)
4. Ejemplo: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`
5. Guárdalo en tu `.env` como `GOOGLE_SHEET_ID`

### 7. Compartir con Service Account

1. Ve al archivo JSON de tu Service Account
2. Busca el campo `client_email` (ej: `sw4-perfumes@project.iam.gserviceaccount.com`)
3. En tu Google Sheet, click en **Share** (Compartir)
4. Pega el email del Service Account
5. Dale permisos de **Editor** (no Viewer, debe poder escribir)
6. Click en **Send** (no marques "Notify people")

---

## ✅ Verificación Final

Antes de ejecutar el primer sync, verifica:

- [ ] Sheet tiene exactamente 3 tabs: "Productos", "Pedidos", "Config"
- [ ] Tab "Productos" tiene headers A1:K1 correctos
- [ ] Fórmulas en H2:K2 apuntando a `Config!$B$1`, `Config!$B$2`, etc.
- [ ] Tab "Config" tiene los 5 parámetros con nombres exactos
- [ ] Service Account tiene permisos de **Editor** en el Sheet
- [ ] El `GOOGLE_SHEET_ID` en `.env` es correcto

---

## 🧪 Test del Setup

```bash
# Ejecutar sync manual
curl -X POST http://localhost:8888/.netlify/functions/sync-supplier

# Verificar en Google Sheets:
# 1. Tab "Productos" debe tener ~200 filas con datos de Shopify
# 2. Columnas H, I, J, K deben tener precios calculados automáticamente
```

---

## 🐛 Troubleshooting

### Las fórmulas muestran `#REF!`

- Las referencias a `Config!$B$1` están rotas
- Verifica que el tab se llame exactamente "Config" (sin espacios)
- Verifica que Config tenga datos en B1, B2, B3, B4

### El sync no escribe datos

- Verifica que el Service Account tenga permisos de **Editor**
- Verifica que el `GOOGLE_SHEET_ID` sea correcto
- Revisa logs de Netlify Functions

### Los precios calculados son incorrectos

- Verifica que los valores en Config!B1:B4 sean números (no texto)
- Verifica que las fórmulas en H2:K2 sean correctas
- Arrastra las fórmulas hacia abajo a todas las filas

---

## 📞 Soporte

Si tienes dudas, consulta el `README.md` o contacta a Gonza @ Skywalking.dev

---

**Hecho con ❤️ por Skywalking.dev** 🚀
