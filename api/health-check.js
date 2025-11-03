// Health check endpoint para diagnosticar problemas en producción
// URL: /api/health-check

export default async function handler(req, res) {
  const checks = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    checks: {}
  };

  // Check 1: Variables de entorno
  checks.checks.environmentVariables = {
    GOOGLE_SHEET_ID: !!process.env.GOOGLE_SHEET_ID,
    GOOGLE_SERVICE_ACCOUNT_JSON: !!process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    GOOGLE_SERVICE_ACCOUNT_KEY: !!process.env.GOOGLE_SERVICE_ACCOUNT_KEY,
    hasAnyServiceAccount: !!(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_KEY)
  };

  // Check 2: Validar formato de credenciales (sin exponer datos sensibles)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      const credentials = JSON.parse(serviceAccountJson);
      checks.checks.credentialsFormat = {
        valid: true,
        hasClientEmail: !!credentials.client_email,
        hasPrivateKey: !!credentials.private_key,
        clientEmail: credentials.client_email || 'missing'
      };
    } catch (error) {
      checks.checks.credentialsFormat = {
        valid: false,
        error: error.message
      };
    }
  } else {
    checks.checks.credentialsFormat = {
      valid: false,
      error: 'No service account JSON found'
    };
  }

  // Check 3: Intentar acceso al Sheet (si las credenciales están configuradas)
  if (checks.checks.environmentVariables.GOOGLE_SHEET_ID && checks.checks.credentialsFormat.valid) {
    try {
      const { google } = await import('googleapis');
      const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
      const credentials = JSON.parse(serviceAccountJson);
      
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });

      const sheets = google.sheets({ version: 'v4', auth });
      
      // Intentar leer solo la primera fila para verificar acceso
      const testResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.GOOGLE_SHEET_ID,
        range: 'Productos!A1:I1',
      });

      checks.checks.sheetAccess = {
        success: true,
        canRead: true,
        headersFound: !!(testResponse.data.values && testResponse.data.values.length > 0)
      };
    } catch (error) {
      checks.checks.sheetAccess = {
        success: false,
        error: error.message,
        code: error.code,
        hint: error.message.includes('not found') 
          ? 'Sheet not found or Service Account does not have access'
          : 'Check credentials and permissions'
      };
    }
  } else {
    checks.checks.sheetAccess = {
      success: false,
      error: 'Cannot test: missing GOOGLE_SHEET_ID or invalid credentials'
    };
  }

  // Determinar estado general
  const allChecksPass = 
    checks.checks.environmentVariables.GOOGLE_SHEET_ID &&
    checks.checks.environmentVariables.hasAnyServiceAccount &&
    checks.checks.credentialsFormat.valid &&
    checks.checks.sheetAccess.success;

  const status = allChecksPass ? 200 : 503;
  
  return res.status(status).json({
    ...checks,
    status: allChecksPass ? 'healthy' : 'unhealthy',
    summary: {
      envVarsConfigured: checks.checks.environmentVariables.GOOGLE_SHEET_ID && checks.checks.environmentVariables.hasAnyServiceAccount,
      credentialsValid: checks.checks.credentialsFormat.valid,
      sheetAccessible: checks.checks.sheetAccess.success
    }
  });
}

