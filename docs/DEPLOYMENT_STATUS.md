# 🚀 Deployment Status - sw_commerce_perfumes

> **Última actualización:** 2025-01-18
> **Status:** ⏸️ Pausado - Requiere configuración manual de env vars

---

## ✅ Completado

### 1. Documentación (100%)
- ✅ `VERCEL_DEPLOYMENT_PLAN.md` creado con plan completo en fases
- ✅ `.env.example` actualizado con documentación detallada
- ✅ `.gitignore` mejorado (env vars, editor files, OS files)

### 2. Proyecto Vercel (100%)
- ✅ Proyecto linkeado: `sw-commerce-perfumes`
- ✅ Project ID: `prj_wfFueUZJVOEW7GTCxHHiAzkQEIYi`
- ✅ Org: `team_l1WAWBvHvxQnLF4GokP8s4eA`
- ✅ Owner: `gparrar-3019`

### 3. Preview Deployment (100%)
- ✅ Preview URL: https://sw-commerce-perfumes-ctgw5c0pa-gparrar-3019s-projects.vercel.app
- ✅ Inspect Dashboard: https://vercel.com/gparrar-3019s-projects/sw-commerce-perfumes/Hk2qjbvZwJWwik6wuEv2hGtQwJjT
- ⚠️ **Nota:** Preview tiene Deployment Protection habilitada (requiere auth)

---

## ⏳ Próximos Pasos (Requiere Acción Manual)

### PASO 1: Configurar Environment Variables en Vercel Dashboard

**URL:** https://vercel.com/gparrar-3019s-projects/sw-commerce-perfumes/settings/environment-variables

**Variables a agregar:**

#### 1️⃣ GOOGLE_SHEET_ID
- **Nombre:** `GOOGLE_SHEET_ID`
- **Valor:** `1QRmpgsonxqDm7YqohqjwUyv4Fw5NkPeDz3OtgC8Qtmg`
- **Environments:** Production, Preview, Development
- **Tipo:** Plain Text

#### 2️⃣ GOOGLE_SHEET_PROVEEDOR_ID
- **Nombre:** `GOOGLE_SHEET_PROVEEDOR_ID`
- **Valor:** `17L9bWDJiGg8RPxnmlv3zwjWYLsiaTsuWvkx5kWBmUkc`
- **Environments:** Production, Preview, Development
- **Tipo:** Plain Text

#### 3️⃣ GOOGLE_SERVICE_ACCOUNT_JSON
- **Nombre:** `GOOGLE_SERVICE_ACCOUNT_JSON`
- **Valor:** (copiar desde `.env` local - JSON completo)
- **Environments:** Production, Preview, Development
- **Tipo:** Secret (marcar como sensitive)

**Comando para copiar el valor:**
```bash
cd /Users/gpublica/workspace/skywalking/projects/sw_commerce_perfumes
cat .env | grep GOOGLE_SERVICE_ACCOUNT_JSON | cut -d'=' -f2-
```

El valor debe ser el JSON completo que empieza con:
```json
{"type":"service_account","project_id":"online-catalogue-474601",...}
```

#### 4️⃣ MP_ACCESS_TOKEN (Test Mode)
- **Nombre:** `MP_ACCESS_TOKEN`
- **Valor:** `TEST-mercadopago-token-pendiente`
- **Environments:** Production, Preview, Development
- **Tipo:** Secret

**Nota:** Este es un placeholder temporal. Cuando tengas el token real de MercadoPago, actualizar este valor.

---

### PASO 2: Deploy a Producción

Una vez configuradas las env vars, ejecutar:

```bash
cd /Users/gpublica/workspace/skywalking/projects/sw_commerce_perfumes
vercel --prod --yes
```

**Output esperado:**
```
Deploying gparrar-3019s-projects/sw-commerce-perfumes
...
Production: https://sw-commerce-perfumes.vercel.app
```

---

### PASO 3: Validar Deployment

**Test 1 - Health Check:**
```bash
curl https://sw-commerce-perfumes.vercel.app/api/test-env | jq .
```

**Esperado:**
```json
{
  "envVarsPresent": {
    "GOOGLE_SHEET_ID": true,
    "GOOGLE_SHEET_PROVEEDOR_ID": true,
    "GOOGLE_SERVICE_ACCOUNT_JSON": true,
    "MP_ACCESS_TOKEN": true
  }
}
```

**Test 2 - Get Products:**
```bash
curl https://sw-commerce-perfumes.vercel.app/api/get-sheets-data | jq '.productos | length'
```

**Esperado:** Número > 0 (cantidad de productos en el catálogo)

**Test 3 - Frontend:**
Abrir en browser: https://sw-commerce-perfumes.vercel.app

**Esperado:**
- Catálogo de perfumes visible
- Imágenes cargando
- Precios en VES
- Botón "Comprar" funcional

---

### PASO 4: Actualizar GitHub Actions

Editar `.github/workflows/sync-catalog.yml`:

**Línea a cambiar:**
```yaml
# ANTES:
- name: Trigger Netlify Function
  run: |
    curl -X POST "${{ secrets.NETLIFY_SITE_URL }}/api/sync-supplier"

# DESPUÉS:
- name: Trigger Vercel Function
  run: |
    curl -X POST "${{ secrets.VERCEL_DEPLOYMENT_URL }}/api/sync-supplier" \
      -H "Content-Type: application/json" \
      -d '{"source": "github-actions"}'
```

**Agregar GitHub Secret:**
1. Ir a: https://github.com/<tu-repo>/settings/secrets/actions
2. New repository secret
3. Name: `VERCEL_DEPLOYMENT_URL`
4. Value: `https://sw-commerce-perfumes.vercel.app`
5. Add secret

---

## 📊 Checklist de Deployment

### Pre-Deploy
- [x] .gitignore actualizado
- [x] .env.example creado
- [x] Credenciales Google Sheets listas
- [x] Proyecto Vercel linkeado
- [x] Preview deployment exitoso

### Deploy
- [ ] Environment variables configuradas en Vercel Dashboard (4 vars)
- [ ] Production deploy completado (`vercel --prod`)
- [ ] URL de producción documentada
- [ ] DNS apuntando (si dominio custom)

### Post-Deploy
- [ ] API endpoints testeados (`/api/test-env`, `/api/get-sheets-data`)
- [ ] Frontend validado (catálogo carga correctamente)
- [ ] GitHub Actions actualizado (Netlify → Vercel)
- [ ] GitHub Secret `VERCEL_DEPLOYMENT_URL` configurado
- [ ] Workflow de sync testeado manualmente
- [ ] README actualizado con URL de producción

### Opcional
- [ ] Vercel Analytics habilitado
- [ ] Uptime monitoring configurado (UptimeRobot)
- [ ] Custom domain configurado
- [ ] MercadoPago production token (reemplazar placeholder)

---

## 🔧 Comandos Útiles

### Deployment
```bash
# Preview
vercel

# Preview (force rebuild)
vercel --force

# Production
vercel --prod

# Production (force)
vercel --prod --force
```

### Logs
```bash
# Ver logs del último deployment
vercel logs <deployment-url>

# Ver logs en tiempo real
vercel logs <deployment-url> --follow

# Ver logs de producción
vercel logs sw-commerce-perfumes.vercel.app
```

### Environment Variables
```bash
# Listar env vars
vercel env ls

# Agregar env var (interactivo)
vercel env add <NAME>

# Remover env var
vercel env rm <NAME> production
```

### Project Info
```bash
# Ver info del proyecto
vercel inspect

# Listar deployments
vercel ls

# Cambiar configuración
vercel project
```

---

## 🐛 Troubleshooting

### Error: "Google Sheets API authentication failed"
**Causa:** Service Account JSON inválido o sin permisos

**Solución:**
1. Verificar que el JSON esté completo (empieza con `{"type":"service_account"`)
2. Confirmar que el Service Account tiene permisos en ambos Sheets:
   - Sheet Interno (`1QRmpgsonxqDm7YqohqjwUyv4Fw5NkPeDz3OtgC8Qtmg`): Editor
   - Sheet Proveedor (`17L9bWDJiGg8RPxnmlv3zwjWYLsiaTsuWvkx5kWBmUkc`): Viewer

**Test local:**
```bash
cd /Users/gpublica/workspace/skywalking/projects/sw_commerce_perfumes
node api/test-env.js
```

### Error: "Cannot find module 'googleapis'"
**Causa:** Dependencies no instaladas

**Solución:**
```bash
npm install
vercel --prod --force
```

### Preview deployment requiere autenticación
**Causa:** Deployment Protection habilitada por defecto

**Soluciones:**
- **A) Deshabilitar:** Settings → Deployment Protection → Desmarcar "Vercel Authentication"
- **B) Ignorar:** Deployar directo a producción (`vercel --prod`)
- **C) Bypass token:** Ver docs de Vercel Protection Bypass

### MercadoPago checkout no funciona
**Causa:** Public key hardcodeada en `assets/script.js` es placeholder

**Solución temporal:**
Editar `assets/script.js` línea 2:
```javascript
const MP_PUBLIC_KEY = 'TEST-abc123...'; // Token de test
```

**Solución definitiva:**
Crear endpoint `/api/get-mp-config` que retorne la public key desde env var.

---

## 📞 URLs Importantes

- **Project Dashboard:** https://vercel.com/gparrar-3019s-projects/sw-commerce-perfumes
- **Settings:** https://vercel.com/gparrar-3019s-projects/sw-commerce-perfumes/settings
- **Env Vars:** https://vercel.com/gparrar-3019s-projects/sw-commerce-perfumes/settings/environment-variables
- **Deployments:** https://vercel.com/gparrar-3019s-projects/sw-commerce-perfumes/deployments
- **Analytics:** https://vercel.com/gparrar-3019s-projects/sw-commerce-perfumes/analytics

---

## 📝 Notas

### Costos
- **Plan actual:** Hobby (Free)
- **Límites:** 100GB bandwidth/mes, 100 deployments/día, functions timeout 10s
- **Cron jobs:** No disponible en plan gratuito (usar GitHub Actions)

### Consideraciones
- El cron job de sincronización se mantiene en GitHub Actions (gratis)
- Las functions timeout están configuradas a 30s en `vercel.json`
- El plan gratuito es suficiente para tráfico inicial estimado

### Próximos Pasos (Post-Launch)
1. Monitorear uso de bandwidth y functions (Vercel Dashboard)
2. Obtener MercadoPago production token
3. Configurar dominio custom (opcional)
4. Evaluar upgrade a Pro si cron jobs nativos son necesarios ($20/mes)

---

**Status Final:** Listo para deployment a producción (pending env vars config)
