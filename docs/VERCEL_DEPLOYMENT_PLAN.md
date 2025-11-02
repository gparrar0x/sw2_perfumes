# Plan de Deployment: sw_commerce_perfumes → Vercel

> **Versión:** 1.0
> **Fecha:** 2025-01-18
> **Status:** 🚀 En ejecución
> **Tiempo estimado:** 40 minutos

---

## 📋 Contexto del Proyecto

### Arquitectura Actual
- **Frontend:** Static HTML/CSS/JS (JAMstack)
- **Backend:** 6 Vercel Serverless Functions (Node.js ES Modules)
- **Database:** Google Sheets API v4
- **Payments:** MercadoPago SDK (VES - Venezuela)
- **Automation:** GitHub Actions (cron jobs)

### Estado Pre-Deployment
- ✅ Código migrado de Netlify → Vercel
- ✅ Cuenta Vercel configurada + CLI instalado
- ✅ Credenciales Google Sheets disponibles
- ⚠️ MercadoPago en modo test (no producción)
- ⚠️ GitHub Actions apuntan a Netlify (pendiente actualizar)

---

## 🎯 Decisiones de Arquitectura

| Decisión | Opción Elegida | Rationale |
|----------|----------------|-----------|
| **Cron Strategy** | GitHub Actions | Gratis, ya configurado, evita upgrade a Pro ($20/mes) |
| **Domain** | *.vercel.app | Deploy rápido, configurar custom domain después si es necesario |
| **MercadoPago** | Test/Sandbox | Deploy funcional, migrar a prod cuando tengamos token real |
| **Vercel Plan** | Hobby (Free) | Suficiente para tráfico inicial, escalar a Pro si es necesario |

---

## 📦 Fase 1: Pre-Deploy Setup (5 min)

### 1.1 Verificar .gitignore
**Objetivo:** Evitar commitear secrets y archivos de Vercel

**Checklist:**
- [ ] `.vercel/` incluido
- [ ] `.env` y `.env.local` incluidos
- [ ] `node_modules/` incluido

**Comando:**
```bash
cd /Users/gpublica/workspace/skywalking/projects/sw_commerce_perfumes
cat .gitignore | grep -E '(\.vercel|\.env|node_modules)'
```

### 1.2 Crear .env.example
**Objetivo:** Documentar todas las env vars requeridas

**Variables críticas:**
```bash
# Google Sheets Integration
GOOGLE_SHEET_ID=<tu_sheet_interno_id>
GOOGLE_SHEET_PROVEEDOR_ID=17L9bWDJiGg8RPxnmlv3zwjWYLsiaTsuWvkx5kWBmUkc
GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"..."}'

# MercadoPago (usar credenciales de TEST para sandbox)
MP_ACCESS_TOKEN=TEST-1234567890-abcdef-ghijklmnop
MP_PUBLIC_KEY=TEST-abcdef12-3456-7890-abcd-ef1234567890

# Optional: Para debugging
NODE_ENV=production
```

**Archivo:** `.env.example`

---

## 🔐 Fase 2: Configuración de Environment Variables (5 min)

### 2.1 Agregar secrets a Vercel
**Método:** Vercel CLI (interactivo)

**Comandos:**
```bash
cd /Users/gpublica/workspace/skywalking/projects/sw_commerce_perfumes

# Agregar una por una
vercel env add GOOGLE_SHEET_ID
# Pegar valor cuando lo pida

vercel env add GOOGLE_SHEET_PROVEEDOR_ID
# Pegar: 17L9bWDJiGg8RPxnmlv3zwjWYLsiaTsuWvkx5kWBmUkc

vercel env add GOOGLE_SERVICE_ACCOUNT_JSON
# Pegar todo el JSON (en una línea o multilinea, Vercel lo acepta)

vercel env add MP_ACCESS_TOKEN
# Pegar token de TEST
```

**Ambientes a configurar:**
- [x] Production
- [x] Preview
- [x] Development (opcional, para testing local)

### 2.2 Verificar configuración
```bash
vercel env ls
# Debe listar todas las vars sin mostrar valores
```

**Output esperado:**
```
Environment Variables for <proyecto>
  NAME                             VALUE       ENVIRONMENTS
  GOOGLE_SHEET_ID                  (set)       Production, Preview
  GOOGLE_SHEET_PROVEEDOR_ID        (set)       Production, Preview
  GOOGLE_SERVICE_ACCOUNT_JSON      (set)       Production, Preview
  MP_ACCESS_TOKEN                  (set)       Production, Preview
```

---

## 🧪 Fase 3: Deploy Preview (3 min)

### 3.1 Primer deploy a preview
**Objetivo:** Validar configuración sin afectar producción

**Comando:**
```bash
cd /Users/gpublica/workspace/skywalking/projects/sw_commerce_perfumes
vercel
```

**Preguntas interactivas esperadas:**
```
? Set up and deploy "~/workspace/skywalking/projects/sw_commerce_perfumes"? [Y/n] Y
? Which scope do you want to deploy to? <tu-username>
? Link to existing project? [y/N] N
? What's your project's name? sw-commerce-perfumes
? In which directory is your code located? ./
```

**Output esperado:**
```
🔗  Preview: https://sw-commerce-perfumes-<hash>.vercel.app
```

### 3.2 Test de endpoints críticos
**Objetivo:** Verificar que las functions funcionan

**Tests:**

1. **Test env vars (rápido):**
```bash
curl https://sw-commerce-perfumes-<hash>.vercel.app/api/test-env
```
**Esperado:** JSON con env vars (sin valores completos)

2. **Test Google Sheets:**
```bash
curl https://sw-commerce-perfumes-<hash>.vercel.app/api/get-sheets-data
```
**Esperado:** JSON con `productos: [...]`, `config: {...}`

3. **Test frontend:**
Abrir en browser: `https://sw-commerce-perfumes-<hash>.vercel.app`
**Esperado:** Catálogo de perfumes cargando

### 3.3 Debugging (si falla)
**Logs en tiempo real:**
```bash
vercel logs https://sw-commerce-perfumes-<hash>.vercel.app --follow
```

**Errores comunes:**
- ❌ `GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON` → Revisar formato
- ❌ `Request had insufficient authentication` → Service account sin permisos en Sheet
- ❌ `Cannot find module` → Dependencia faltante (correr `npm install`)

---

## 🔄 Fase 4: GitHub Actions Update (10 min)

### 4.1 Actualizar workflow de sincronización
**Archivo:** `.github/workflows/sync-catalog.yml`

**Cambios necesarios:**

**ANTES:**
```yaml
- name: Trigger Netlify Function
  run: |
    curl -X POST "${{ secrets.NETLIFY_SITE_URL }}/api/sync-supplier"
```

**DESPUÉS:**
```yaml
- name: Trigger Vercel Function
  run: |
    curl -X POST "${{ secrets.VERCEL_DEPLOYMENT_URL }}/api/sync-supplier" \
      -H "Content-Type: application/json" \
      -d '{"source": "github-actions"}'
```

### 4.2 Agregar secret en GitHub
**Pasos:**
1. Ir a: `https://github.com/<user>/<repo>/settings/secrets/actions`
2. Click **New repository secret**
3. Name: `VERCEL_DEPLOYMENT_URL`
4. Value: `https://sw-commerce-perfumes.vercel.app` (URL de producción, configurar en Fase 5)
5. **Add secret**

### 4.3 Test manual del workflow
**Opción A - Trigger manual:**
1. Ir a: `Actions` tab → `Sync Catalog` workflow
2. Click `Run workflow` → `Run workflow`
3. Monitorear logs

**Opción B - Trigger vía curl (local):**
```bash
# Simular lo que hará GitHub Actions
curl -X POST https://sw-commerce-perfumes-<hash>.vercel.app/api/sync-supplier \
  -H "Content-Type: application/json" \
  -d '{"source": "manual-test"}'
```

**Verificación:**
- [ ] Workflow completa sin errores
- [ ] Logs muestran "Sync completed successfully"
- [ ] Sheet interno actualizado con datos del proveedor

---

## 🚀 Fase 5: Production Deploy (5 min)

### 5.1 Deploy a producción
**Comando:**
```bash
cd /Users/gpublica/workspace/skywalking/projects/sw_commerce_perfumes
vercel --prod
```

**Output esperado:**
```
🔗  Production: https://sw-commerce-perfumes.vercel.app
```

### 5.2 Configurar Vercel Project Settings (opcional)
**Dashboard:** `https://vercel.com/<user>/sw-commerce-perfumes/settings`

**Ajustes recomendados:**
- **General:**
  - Build & Development Settings → verificar `outputDirectory: .`
  - Root Directory: `./` (default)

- **Domains:**
  - Default: `sw-commerce-perfumes.vercel.app` ✅
  - Custom: Agregar después si es necesario

- **Functions:**
  - Region: `iad1` (US East, más cercano a Venezuela)
  - Max Duration: 30s (ya configurado en vercel.json)

- **Environment Variables:**
  - Revisar que todas estén en "Production" ✅

### 5.3 Documentar URL final
**Actualizar este documento:**
```markdown
## 🌐 Deployment URLs

- **Production:** https://sw-commerce-perfumes.vercel.app
- **Preview (latest):** https://sw-commerce-perfumes-git-main-<user>.vercel.app
- **Dashboard:** https://vercel.com/<user>/sw-commerce-perfumes
```

---

## ✅ Fase 6: Post-Deploy Validation (10 min)

### 6.1 Test completo de flujo (E2E)

**Test 1: Catálogo de productos**
```bash
# 1. Obtener productos
curl https://sw-commerce-perfumes.vercel.app/api/get-sheets-data | jq '.productos | length'
# Esperado: número > 0

# 2. Verificar estructura
curl https://sw-commerce-perfumes.vercel.app/api/get-sheets-data | jq '.productos[0]'
# Esperado: objeto con keys: upc, descripcion, precio, cantidad, etc.
```

**Test 2: Sincronización manual**
```bash
# Trigger sync
curl -X POST https://sw-commerce-perfumes.vercel.app/api/sync-supplier \
  -H "Content-Type: application/json" \
  -d '{"source": "manual-validation"}'

# Verificar respuesta
# Esperado: {"success": true, "updated": X, "timestamp": "..."}
```

**Test 3: Creación de orden (simulada)**
```bash
curl -X POST https://sw-commerce-perfumes.vercel.app/api/create-preference \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "id": "TEST001",
        "title": "Test Perfume",
        "quantity": 1,
        "unit_price": 10
      }
    ]
  }'

# Esperado: {"id": "mp-preference-id", "init_point": "https://..."}
```

**Test 4: Frontend completo**
1. Abrir: `https://sw-commerce-perfumes.vercel.app`
2. ✅ Catálogo carga
3. ✅ Imágenes se muestran (o placeholders)
4. ✅ Precios en VES visibles
5. ✅ Botón "Comprar" funciona (abre checkout MP test)

### 6.2 Configurar Vercel Analytics (opcional)
**Pasos:**
1. Dashboard → `Analytics` tab
2. Enable **Web Analytics** (gratis en plan Hobby)
3. Agregar snippet automático (Vercel lo inyecta)

**Métricas disponibles:**
- Page views
- Unique visitors
- Top pages
- Referrers
- Devices

### 6.3 Setup de monitoring básico
**Crear `/api/health.js` (nuevo endpoint):**
```javascript
export default async function handler(req, res) {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    env: {
      googleSheets: !!process.env.GOOGLE_SHEET_ID,
      mercadopago: !!process.env.MP_ACCESS_TOKEN,
      serviceAccount: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON
    }
  };

  res.status(200).json(checks);
}
```

**Configurar uptime monitor:**
- Servicio: https://uptimerobot.com (gratis)
- URL a monitorear: `https://sw-commerce-perfumes.vercel.app/api/health`
- Interval: 5 minutos
- Alerta: Email si down > 2 minutos

---

## 📝 Fase 7: Documentación Final (5 min)

### 7.1 Actualizar README.md
**Agregar sección:**

```markdown
## 🚀 Deployment

**Production URL:** https://sw-commerce-perfumes.vercel.app

### Stack
- Frontend: Static HTML/CSS/JS
- Backend: Vercel Serverless Functions
- Database: Google Sheets API
- Payments: MercadoPago (VES)
- Automation: GitHub Actions (daily sync 2am UTC)

### Deploy Manual
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Environment Variables
Ver `.env.example` para lista completa.

**Críticas:**
- `GOOGLE_SHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `MP_ACCESS_TOKEN`
```

### 7.2 Crear DEPLOYMENT_LOG.md
**Objetivo:** Historia de deployments para debugging

```markdown
# Deployment Log

## 2025-01-18 - Initial Vercel Deploy
- **Deployed by:** Gonza
- **Version:** v1.0.0
- **Commit:** <hash>
- **Status:** ✅ Successful
- **Production URL:** https://sw-commerce-perfumes.vercel.app
- **Environment:** Production
- **Environment Variables:** 4 configured
- **Tests:** All passed
- **Issues:** None

### Configuration
- Vercel Plan: Hobby (Free)
- Region: iad1 (US East)
- Node Version: 18.x
- Cron Jobs: GitHub Actions (gratis)

### Post-Deploy Actions
- [x] Configured env vars
- [x] Updated GitHub Actions
- [x] Validated API endpoints
- [x] Tested frontend
- [ ] Custom domain (pendiente)
- [ ] Production MercadoPago token (pendiente)
```

---

## 🔧 Troubleshooting

### Problema: "Function timeout after 30s"
**Causa:** Sincronización de Sheet proveedor muy largo

**Solución:**
```json
// vercel.json
{
  "functions": {
    "api/sync-supplier.js": { "maxDuration": 60 }
  }
}
```
⚠️ Requiere Vercel Pro para >30s

### Problema: "Google Sheets API quota exceeded"
**Causa:** Demasiadas requests al Sheet

**Solución:**
1. Implementar cache Redis (Vercel KV)
2. Reducir frecuencia de sync (2am diario es suficiente)
3. Usar batch requests

### Problema: GitHub Actions falla con "404 Not Found"
**Causa:** `VERCEL_DEPLOYMENT_URL` incorrecto

**Solución:**
```bash
# Verificar URL exacta
vercel ls

# Actualizar secret en GitHub
# URL debe incluir https:// y sin trailing slash
# Correcto: https://sw-commerce-perfumes.vercel.app
# Incorrecto: https://sw-commerce-perfumes.vercel.app/
```

### Problema: MercadoPago checkout no funciona
**Causa:** Public key hardcodeada en `assets/script.js`

**Solución temporal:**
```javascript
// assets/script.js línea 2
const MP_PUBLIC_KEY = 'TEST-abc123'; // Usar token de test
```

**Solución definitiva:**
Crear `/api/get-mp-config.js`:
```javascript
export default async function handler(req, res) {
  res.json({ publicKey: process.env.MP_PUBLIC_KEY });
}
```

Actualizar frontend:
```javascript
// Cargar dinámicamente
fetch('/api/get-mp-config')
  .then(r => r.json())
  .then(({publicKey}) => {
    const mp = new MercadoPago(publicKey);
  });
```

---

## 📊 Checklist Final

### Pre-Deploy
- [x] .gitignore actualizado
- [x] .env.example creado
- [x] Credenciales Google Sheets listas
- [x] MercadoPago en modo test configurado

### Deploy
- [ ] Environment variables configuradas en Vercel
- [ ] Preview deploy successful
- [ ] API endpoints testeados
- [ ] Production deploy completado
- [ ] URL de producción documentada

### Post-Deploy
- [ ] GitHub Actions actualizado
- [ ] Workflow de sync testeado
- [ ] Frontend validado (catálogo carga)
- [ ] Checkout de prueba funciona
- [ ] Vercel Analytics habilitado (opcional)
- [ ] Uptime monitor configurado (opcional)
- [ ] README actualizado
- [ ] DEPLOYMENT_LOG.md creado

### Pendientes (Post-Launch)
- [ ] Obtener MercadoPago production token
- [ ] Configurar dominio custom (opcional)
- [ ] Setup Redis cache para Google Sheets (si hay performance issues)
- [ ] Implementar rate limiting en APIs públicas
- [ ] Agregar Google Analytics / Meta Pixel

---

## 🌐 Deployment URLs

**Production:** `<pendiente - completar en Fase 5>`
**Preview (latest):** `<pendiente - completar en Fase 3>`
**Dashboard:** `<pendiente - completar en Fase 5>`

---

## 📞 Contacto

**Deployed by:** Gonza @ Skywalking.dev
**Support:** Ver GitHub Issues o contactar via Linear

---

**Status:** 🚀 Plan aprobado - En ejecución
**Última actualización:** 2025-01-18 (creación inicial)
