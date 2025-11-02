// Vercel Function para leer productos y configuración desde Google Sheets
// URL: /api/get-sheets-data

import { google } from 'googleapis';

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 'public, max-age=300'); // Cache 5 minutos

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Validar variables de entorno
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    const SERVICE_ACCOUNT_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (!SHEET_ID) {
      console.error('❌ GOOGLE_SHEET_ID not configured');
      return res.status(500).json({
        error: 'GOOGLE_SHEET_ID not configured',
        details: 'Missing environment variable GOOGLE_SHEET_ID'
      });
    }

    if (!SERVICE_ACCOUNT_JSON) {
      console.error('❌ GOOGLE_SERVICE_ACCOUNT_JSON not configured');
      return res.status(500).json({
        error: 'GOOGLE_SERVICE_ACCOUNT_JSON not configured',
        details: 'Missing environment variable GOOGLE_SERVICE_ACCOUNT_JSON'
      });
    }

    // Parsear credenciales
    let credentials;
    try {
      credentials = JSON.parse(SERVICE_ACCOUNT_JSON);
    } catch (parseError) {
      console.error('❌ Error parsing GOOGLE_SERVICE_ACCOUNT_JSON:', parseError);
      return res.status(500).json({
        error: 'Invalid GOOGLE_SERVICE_ACCOUNT_JSON format',
        details: parseError.message
      });
    }

    // Validar que las credenciales tengan los campos necesarios
    if (!credentials.client_email || !credentials.private_key) {
      console.error('❌ Invalid credentials structure');
      return res.status(500).json({
        error: 'Invalid credentials structure',
        details: 'Missing client_email or private_key in service account JSON'
      });
    }

    console.log(`📊 Attempting to access Google Sheet: ${SHEET_ID}`);
    console.log(`📧 Service Account Email: ${credentials.client_email}`);

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Verificar acceso al spreadsheet primero
    try {
      await sheets.spreadsheets.get({
        spreadsheetId: SHEET_ID,
      });
      console.log('✅ Successfully accessed spreadsheet');
    } catch (accessError) {
      console.error('❌ Cannot access spreadsheet:', accessError.message);
      return res.status(500).json({
        error: 'Cannot access Google Sheet',
        details: accessError.message,
        hint: 'Verify that the Service Account has access to the spreadsheet. Share the sheet with: ' + credentials.client_email
      });
    }

    // Leer productos (A:L incluye precios calculados + Activo)
    console.log('📖 Reading productos from range: Productos!A2:L');
    const productosResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Productos!A2:L',
    });

    // Leer configuración
    console.log('📖 Reading config from range: Config!A1:B10');
    const configResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Config!A1:B10',
    });

    const productosRaw = productosResponse.data.values || [];
    const configRaw = configResponse.data.values || [];

    // Transform productos a JSON
    const productos = productosRaw
      .filter(row => row[0]) // Solo filas con UPC
      .filter(row => {
        // Filtrar por columna L (Activo) - si existe y es FALSE, excluir
        const activo = row[11];
        return activo === undefined || activo === '' || activo === 'TRUE' || activo === true;
      })
      .map(row => ({
        upc: row[0] || '',
        nombre: row[1] || '',
        marca: row[2] || '',
        categoria: row[3] || '',
        precioBaseUSD: parseFloat(row[4]) || 0,
        stock: parseInt(row[5]) || 0,
        imagenURL: row[6] || '', // Cambiado de imagen a imagenURL para consistencia con frontend
        // Precios calculados por fórmulas de Google Sheets
        precioMayorUSD: parseFloat(row[7]) || 0,
        precioDetalUSD: parseFloat(row[8]) || 0,
        precioMayorVES: parseFloat(row[9]) || 0,
        precioDetalVES: parseFloat(row[10]) || 0,
        activo: row[11] === 'TRUE' || row[11] === true,
        disponible: parseInt(row[5]) > 0 // Disponible si hay stock
      }));

    // Transform config a objeto
    const config = {};
    configRaw.forEach(row => {
      if (row[0]) {
        config[row[0]] = row[1];
      }
    });

    return res.status(200).json({
      success: true,
      productos,
      config,
      marcas: [...new Set(productos.map(p => p.marca))].filter(Boolean).sort(),
      categorias: [...new Set(productos.map(p => p.categoria))].filter(Boolean).sort(),
      lastFetch: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Get sheets data error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Error específico de Google Sheets
    if (error.message && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Google Sheet not found',
        details: error.message,
        hint: 'Verify GOOGLE_SHEET_ID is correct and Service Account has access'
      });
    }

    return res.status(500).json({
      error: error.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      code: error.code
    });
  }
}
