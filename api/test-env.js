// Test endpoint para verificar variables de entorno

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const envCheck = {
    GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID ? '✓ Set' : '✗ Missing',
    GOOGLE_SHEET_PROVEEDOR_ID: process.env.GOOGLE_SHEET_PROVEEDOR_ID ? '✓ Set' : '✗ Missing',
    GOOGLE_SERVICE_ACCOUNT_JSON: process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? '✓ Set' : '✗ Missing',
    MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN ? '✓ Set' : '✗ Missing',
  };

  let serviceAccountInfo = null;
  try {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      serviceAccountInfo = {
        type: sa.type,
        project_id: sa.project_id,
        client_email: sa.client_email,
        has_private_key: !!sa.private_key
      };
    }
  } catch (error) {
    serviceAccountInfo = { error: 'Invalid JSON: ' + error.message };
  }

  return res.status(200).json({
    environment: envCheck,
    serviceAccount: serviceAccountInfo,
    timestamp: new Date().toISOString()
  });
}
