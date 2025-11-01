# Estructura de Google Sheets para SW4 Perfumes

## 🎯 Resumen

Necesitas crear **1 Google Sheet nuevo** con **4 tabs** (hojas).

Ya tienes el Sheet del proveedor (read-only): https://docs.google.com/spreadsheets/d/17L9bWDJiGg8RPxnmlv3zwjWYLsiaTsuWvkx5kWBmUkc

---

## 📊 Sheet Interno a Crear

### Paso 1: Crear nuevo Google Sheet

1. Ve a https://sheets.google.com
2. Crea nuevo Sheet
3. Renombra a: **"SW4 Perfumes - Inventario Interno"**
4. Copia el ID de la URL (lo necesitarás para `.env`)

### Paso 2: Compartir con Service Account

**Compartir el Sheet con este email (rol: Editor):**
```
perfumes@online-catalogue-474601.iam.gserviceaccount.com
```

---

## 📑 Tab 1: "Productos"

### Headers (Fila 1):

| A | B | C | D | E | F | G | H | I | J | K | L |
|---|---|---|---|---|---|---|---|---|---|---|---|
| UPC | Nombre | Marca | Categoria | Precio_USD_Base | Stock | Imagen_URL | Precio_Mayor_USD | Precio_Detal_USD | Precio_Mayor_VES | Precio_Detal_VES | Activo |

### Fórmulas (copiar en fila 2 y arrastrar hacia abajo):

```excel
H2: =E2*(1+Config!$B$3/100)
I2: =E2*(1+Config!$B$4/100)
J2: =H2*Config!$B$1
K2: =I2*Config!$B$1
L2: TRUE
```

### Descripción de columnas:

- **A - UPC**: Código único del proveedor (viene del Sheet del proveedor)
- **B - Nombre**: Descripción completa del producto (viene del Sheet del proveedor)
- **C - Marca**: Extraída automáticamente de la descripción
- **D - Categoria**: Auto-detectada (EDT, EDP, Cologne, etc.)
- **E - Precio_USD_Base**: Precio del proveedor (viene del Sheet del proveedor)
- **F - Stock**: Inventario actual (comienza en 0, se decrementa con ventas)
- **G - Imagen_URL**: URL de imagen (scraping de albertocortes.com)
- **H - Precio_Mayor_USD**: FÓRMULA - Precio mayorista en USD
- **I - Precio_Detal_USD**: FÓRMULA - Precio detal en USD
- **J - Precio_Mayor_VES**: FÓRMULA - Precio mayorista en Bolívares
- **K - Precio_Detal_VES**: FÓRMULA - Precio detal en Bolívares
- **L - Activo**: TRUE/FALSE para mostrar en catálogo online

---

## 📑 Tab 2: "Config"

### Estructura:

| A (Parámetro) | B (Valor) |
|---------------|-----------|
| tasa_usd_ves | 201.22 |
| flete_% | 10 |
| margen_mayor | 4 |
| margen_detal | 5 |
| stock_minimo | 5 |

**Importante:** Los nombres de la columna A deben ser EXACTOS para que las fórmulas funcionen.

---

## 📑 Tab 3: "Pedidos"

### Headers (Fila 1):

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| ID_Pedido | Fecha | Cliente_Nombre | Cliente_Email | Items_JSON | Total_VES | Metodo_Pago | Pago_ID |

### Ejemplo de fila (no agregar, se llena automáticamente):

```
SHD-20251015-001 | 2025-10-15T10:30:00Z | Juan Perez | juan@example.com | [{"sku":"123","qty":2}] | 50000 | mercadopago | MP-12345
```

---

## 📑 Tab 4: "Historial_Sync"

### Headers (Fila 1):

| A | B | C | D |
|---|---|---|---|
| Fecha | Productos_Actualizados | Imagenes_Agregadas | Errores |

### Ejemplo (se llena automáticamente por el cron):

```
2025-10-15T06:00:00Z | 198 | 42 | 0
```

---

## ✅ Checklist de Setup

- [ ] Crear nuevo Google Sheet
- [ ] Renombrar a "SW4 Perfumes - Inventario Interno"
- [ ] Crear tab "Productos" con headers A-L
- [ ] Agregar fórmulas en H2:K2
- [ ] Crear tab "Config" con parámetros
- [ ] Crear tab "Pedidos" con headers A-H
- [ ] Crear tab "Historial_Sync" con headers A-D
- [ ] Compartir con `perfumes@online-catalogue-474601.iam.gserviceaccount.com` (Editor)
- [ ] Copiar Sheet ID y agregarlo a `.env` como `GOOGLE_SHEET_ID`

---

## 🔧 Fórmulas Explicadas

### Precio Mayorista USD (columna H):
```
=E2*(1+Config!$B$3/100)
```
- E2 = Precio base del proveedor
- Config!$B$3 = Margen mayorista (4%)
- Resultado: $100 × 1.04 = $104

### Precio Detal USD (columna I):
```
=E2*(1+Config!$B$4/100)
```
- E2 = Precio base del proveedor
- Config!$B$4 = Margen detal (5%)
- Resultado: $100 × 1.05 = $105

### Precio Mayorista VES (columna J):
```
=H2*Config!$B$1
```
- H2 = Precio mayorista USD
- Config!$B$1 = Tasa USD/VES (201.22)
- Resultado: $104 × 201.22 = Bs. 20,926.88

### Precio Detal VES (columna K):
```
=I2*Config!$B$1
```
- I2 = Precio detal USD
- Config!$B$1 = Tasa USD/VES (201.22)
- Resultado: $105 × 201.22 = Bs. 21,128.10

---

## 📝 Notas Importantes

1. **Las fórmulas se actualizan automáticamente** cuando cambias la tasa o márgenes en tab "Config"
2. **No modifiques manualmente** las columnas H, I, J, K (son calculadas)
3. **Stock inicial** debe ser 0 en todos los productos
4. **Columna L (Activo)** permite ocultar productos sin eliminarlos
5. **El sync automático** actualizará columnas A, B, C, D, E desde el Sheet del proveedor

---

## 🚀 Después del Setup

Una vez creado el Sheet:

1. Copia el Sheet ID de la URL
2. Pégalo en `.env` como `GOOGLE_SHEET_ID=tu_id_aqui`
3. El primer sync poblará automáticamente los productos
4. Las imágenes se agregarán gradualmente via scraping

**Sheet del proveedor (source of truth):**
https://docs.google.com/spreadsheets/d/17L9bWDJiGg8RPxnmlv3zwjWYLsiaTsuWvkx5kWBmUkc

**Sheet interno (el que vas a crear):**
[Tu nuevo Sheet con 4 tabs]
