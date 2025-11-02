# Configuración de Variables de Entorno en Vercel

## ⚠️ Error Actual
El sitio en producción no puede cargar productos porque faltan las variables de entorno en Vercel.

## 🔧 Solución: Configurar Variables de Entorno

### Paso 1: Ir al Dashboard de Vercel
1. Abre https://vercel.com/dashboard
2. Selecciona el proyecto `sw-commerce-perfumes`
3. Ve a **Settings** → **Environment Variables**

### Paso 2: Agregar las siguientes variables

#### Variable 1: GOOGLE_SHEET_ID
- **Key:** `GOOGLE_SHEET_ID`
- **Value:** El ID de tu Google Sheet (ejemplo: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`)
- **Environments:** Production, Preview, Development

#### Variable 2: GOOGLE_SERVICE_ACCOUNT_JSON
- **Key:** `GOOGLE_SERVICE_ACCOUNT_JSON`
- **Value:** El JSON completo de tu Service Account de Google Cloud
  ```json
  {
    "type": "service_account",
    "project_id": "tu-proyecto",
    "private_key_id": "...",
    "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
    "client_email": "tu-cuenta@tu-proyecto.iam.gserviceaccount.com",
    "client_id": "...",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "..."
  }
  ```
- **Environments:** Production, Preview, Development

### Paso 3: Compartir el Google Sheet con la Service Account
1. Abre tu Google Sheet
2. Haz clic en **Share** (Compartir)
3. Agrega el email de la Service Account (ejemplo: `tu-cuenta@tu-proyecto.iam.gserviceaccount.com`)
4. Dale permisos de **Viewer** (Lector)

### Paso 4: Re-deployar
Después de agregar las variables:
1. Ve a **Deployments** en Vercel
2. Haz clic en el último deployment
3. Click en los 3 puntos ⋮
4. Selecciona **Redeploy**

## 🔍 Verificar que funcione
Una vez re-deployes, abre:
- https://sw-commerce-perfumes.vercel.app/api/get-sheets-data

Deberías ver un JSON con los productos.

## 📝 Notas
- Las variables de entorno NO se propagan automáticamente a deployments existentes
- Siempre debes re-deployar después de cambiar variables
- Los valores de las variables se encriptan en Vercel
