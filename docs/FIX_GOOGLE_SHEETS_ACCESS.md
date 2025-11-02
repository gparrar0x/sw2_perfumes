# 🔧 Fix: Google Sheets Access Error

## Problema Detectado

Error en producción:
```json
{
  "error": "Cannot access Google Sheet",
  "details": "Requested entity was not found.",
  "hint": "Verify that the Service Account has access to the spreadsheet. Share the sheet with: perfumes@online-catalogue-474601.iam.gserviceaccount.com"
}
```

## Causa

El Service Account de Google no tiene acceso al Google Sheet. Las variables de entorno están configuradas correctamente en Vercel, pero falta compartir el spreadsheet con el Service Account.

## Solución: Compartir Google Sheet con Service Account

### Paso 1: Identificar el Service Account Email

El email del Service Account es:
```
perfumes@online-catalogue-474601.iam.gserviceaccount.com
```

### Paso 2: Abrir el Google Sheet

1. Abre el Google Sheet que contiene los productos
2. Verifica que el Sheet ID sea: `1QRmpgsonxqDm7YqohqjwUyv4Fw5NkPeDz3OtgC8Qtmg`

### Paso 3: Compartir el Sheet

1. Haz clic en el botón **"Compartir"** (esquina superior derecha)
2. En el campo "Agregar personas o grupos", pega:
   ```
   perfumes@online-catalogue-474601.iam.gserviceaccount.com
   ```
3. Selecciona el permiso: **"Editor"** o **"Lector"** (recomendado: Editor para permitir actualizaciones de stock)
4. **Importante:** Desmarca la opción "Notificar a las personas" (no es necesario)
5. Haz clic en **"Compartir"**

### Paso 4: Verificar Acceso

Después de compartir, espera 1-2 minutos y prueba el endpoint:

```bash
curl https://sw-commerce-perfumes.vercel.app/api/get-sheets-data
```

Deberías recibir un JSON con los productos en lugar del error.

## Verificación Rápida

### Verificar Sheet ID en Vercel

```bash
cd /Users/gpublica/workspace/skywalking/projects/sw_commerce_perfumes
vercel env ls
```

Debe mostrar:
- `GOOGLE_SHEET_ID` configurado
- `GOOGLE_SERVICE_ACCOUNT_JSON` configurado

### Verificar que el Sheet está compartido

1. Abre el Google Sheet
2. Haz clic en "Compartir"
3. Busca en la lista: `perfumes@online-catalogue-474601.iam.gserviceaccount.com`
4. Debe aparecer con permisos de "Editor" o "Lector"

## Notas Importantes

- El Service Account es una cuenta especial de Google Cloud, no un email real
- No recibirás notificaciones cuando compartas con Service Accounts
- Los cambios de permisos pueden tardar 1-2 minutos en propagarse
- Si tienes múltiples sheets (interno y proveedor), comparte ambos con el mismo Service Account

## Troubleshooting

### Error persiste después de compartir

1. Verifica que el Sheet ID sea correcto:
   - URL del sheet: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`
   - Compara con `GOOGLE_SHEET_ID` en Vercel

2. Verifica que el Service Account email sea correcto:
   - Extrae el email del JSON del Service Account:
   ```bash
   echo $GOOGLE_SERVICE_ACCOUNT_JSON | jq -r '.client_email'
   ```

3. Espera 2-3 minutos y prueba de nuevo

### "Permission denied" en lugar de "not found"

- El Sheet ID es correcto pero los permisos son insuficientes
- Asegúrate de dar permisos de "Editor" al Service Account

## Referencias

- [Google Sheets API - Service Accounts](https://developers.google.com/identity/protocols/oauth2/service-account)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)

