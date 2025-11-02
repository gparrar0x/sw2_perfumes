# Vercel Deployment Guide - SW2 Perfumes

## Estado del Deploy
- **Migración completada:** ✅
- **Funciones convertidas:** 6/6
- **Frontend actualizado:** ✅
- **Configuración lista:** ✅

## Estructura del Proyecto

```
sw2_perfumes/
├── api/                           # Vercel Serverless Functions
│   ├── create-preference.js       # MercadoPago checkout
│   ├── get-orders.js             # Obtener pedidos
│   ├── get-sheets-data.js        # Cargar productos
│   ├── save-order.js             # Guardar pedidos
│   ├── scrape-images.js          # Scraping de imágenes
│   └── sync-supplier.js          # Sync con proveedor
├── assets/                        # CSS, JS, imágenes
├── index.html                     # Frontend principal
├── vercel.json                    # Configuración Vercel
└── package.json                   # Dependencias
```

## Variables de Entorno Necesarias

Configurar en Vercel Dashboard → Project Settings → Environment Variables:

### Google Sheets (REQUERIDAS)
```bash
GOOGLE_SHEET_ID=<tu_sheet_interno_id>
GOOGLE_SHEET_PROVEEDOR_ID=<tu_sheet_proveedor_id>
GOOGLE_SERVICE_ACCOUNT_JSON=<contenido_completo_del_json>
```

### MercadoPago (REQUERIDA)
```bash
MP_ACCESS_TOKEN=<tu_mercadopago_access_token>
```

### Opcional (para funciones legacy)
```bash
GOOGLE_API_KEY=<opcional_si_usas_api_key>
```

## Pasos para Deploy

### Opción 1: Deploy via CLI (Recomendado para primera vez)

```bash
# 1. Instalar Vercel CLI globalmente
npm install -g vercel

# 2. Navegar al proyecto
cd /Users/gpublica/workspace/skywalking/projects/sw2_perfumes

# 3. Login a Vercel
vercel login

# 4. Deploy (primera vez - setup)
vercel

# Responder:
# - Set up and deploy? Yes
# - Which scope? [tu cuenta]
# - Link to existing project? No
# - Project name? sw2-perfumes
# - In which directory? ./
# - Override settings? No

# 5. Configurar variables de entorno
vercel env add GOOGLE_SHEET_ID
vercel env add GOOGLE_SHEET_PROVEEDOR_ID
vercel env add GOOGLE_SERVICE_ACCOUNT_JSON
vercel env add MP_ACCESS_TOKEN

# 6. Deploy a producción
vercel --prod
```

### Opción 2: Deploy via Git (Recomendado para CI/CD)

```bash
# 1. Push a GitHub
git add .
git commit -m "Migración a Vercel completada"
git push origin main

# 2. En Vercel Dashboard:
# - New Project
# - Import Git Repository
# - Seleccionar sw2_perfumes
# - Framework Preset: Other
# - Build Command: (dejar vacío - es sitio estático)
# - Output Directory: ./
# - Install Command: npm install

# 3. Configurar Environment Variables en Vercel UI
# 4. Deploy automático al hacer push
```

### Opción 3: Deploy via Vercel UI

1. Ve a https://vercel.com/new
2. Import Git Repository o sube archivos
3. Configura variables de entorno
4. Deploy

## Funciones Serverless - Detalles

### `/api/get-sheets-data`
- **Método:** GET
- **Cache:** 5 minutos
- **Uso:** Cargar productos y configuración
- **Cron:** No

### `/api/create-preference`
- **Método:** POST
- **Uso:** Crear checkout MercadoPago
- **Timeout:** 30s

### `/api/save-order`
- **Método:** POST
- **Uso:** Guardar pedido + decrementar stock
- **Timeout:** 30s

### `/api/get-orders`
- **Método:** GET
- **Query params:** ?status=pendiente&limit=50
- **Uso:** Consultar pedidos

### `/api/scrape-images`
- **Método:** GET/POST
- **Query params:** ?limit=10&force=true
- **Uso:** Buscar imágenes de productos
- **Timeout:** 30s

### `/api/sync-supplier`
- **Método:** GET/POST
- **Cron:** Diario a las 2 AM (configurado en vercel.json)
- **Uso:** Sincronizar con sheet del proveedor

## Cron Jobs

Configurado en `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/sync-supplier",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Nota:** Los cron jobs requieren plan Vercel Pro o superior. Para plan gratuito, usar servicios externos como:
- GitHub Actions
- cron-job.org
- EasyCron

## CORS

Ya configurado en `vercel.json` para todas las rutas `/api/*`:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

## Seguridad

Headers de seguridad configurados:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

## Testing Post-Deploy

```bash
# 1. Verificar sitio estático
curl https://tu-proyecto.vercel.app

# 2. Test get-sheets-data
curl https://tu-proyecto.vercel.app/api/get-sheets-data

# 3. Test create-preference
curl -X POST https://tu-proyecto.vercel.app/api/create-preference \
  -H "Content-Type: application/json" \
  -d '{"items":[{"title":"Test","quantity":1,"unit_price":100}],"payer":{},"back_urls":{}}'

# 4. Test sync-supplier
curl https://tu-proyecto.vercel.app/api/sync-supplier
```

## Troubleshooting

### Error: "GOOGLE_SHEET_ID not configured"
→ Configurar variable de entorno en Vercel Dashboard

### Error: "Module not found: googleapis"
→ Verificar que `package.json` tenga `googleapis` en dependencies
→ Redeploy para reinstalar dependencias

### Error: "Cannot use import statement outside a module"
→ Verificar que `package.json` tenga `"type": "module"`
→ Ya está configurado ✅

### Cron no ejecuta
→ Verificar plan de Vercel (requiere Pro para cron)
→ Alternativa: usar GitHub Actions

### CORS errors
→ Verificar que `vercel.json` esté en la raíz
→ Headers ya configurados ✅

## Rollback

Si algo sale mal:

```bash
# Ver deployments anteriores
vercel ls

# Promover deployment anterior a producción
vercel promote <deployment-url>
```

## Monitoreo

- **Logs:** https://vercel.com/[tu-proyecto]/logs
- **Analytics:** https://vercel.com/[tu-proyecto]/analytics
- **Functions:** https://vercel.com/[tu-proyecto]/functions

## Diferencias con Netlify

| Feature | Netlify | Vercel |
|---------|---------|--------|
| Functions path | `/.netlify/functions/` | `/api/` |
| Function export | `exports.handler` | `export default function handler` |
| Cron jobs | Incluido gratis | Requiere Pro |
| Environment vars | Site settings | Project settings |
| Dev command | `netlify dev` | `vercel dev` |

## Costos

**Plan Hobby (Gratuito):**
- ✅ Bandwidth: 100GB/mes
- ✅ Serverless Functions: Incluidas
- ✅ Build minutes: Ilimitado
- ❌ Cron jobs: No incluidos
- ✅ Custom domains: Incluidos

**Plan Pro ($20/mes):**
- Todo lo anterior +
- ✅ Cron jobs
- ✅ Password protection
- ✅ Analytics avanzados

## Próximos Pasos

1. ✅ Migración completada
2. ⏳ **Deploy a Vercel** (siguiente paso)
3. ⏳ Configurar variables de entorno
4. ⏳ Testing en producción
5. ⏳ Configurar dominio custom (opcional)
6. ⏳ Setup monitoring

## Contacto

Si tienes problemas, revisar:
- Logs de Vercel
- Variables de entorno
- Google Sheets API habilitada
- Service Account con permisos correctos
