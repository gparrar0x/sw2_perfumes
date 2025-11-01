// Netlify Function para leer productos y configuración desde Google Sheets
// URL: /.netlify/functions/get-sheets-data

const { google } = require('googleapis');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Cache-Control': 'public, max-age=300' // Cache 5 minutos
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;

    if (!SHEET_ID) {
      throw new Error('GOOGLE_SHEET_ID not configured');
    }

    // Leer productos (A:L incluye precios calculados + Activo)
    const productosResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Productos!A2:L',
    });

    // Leer configuración
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        productos,
        config,
        marcas: [...new Set(productos.map(p => p.marca))].filter(Boolean).sort(),
        categorias: [...new Set(productos.map(p => p.categoria))].filter(Boolean).sort(),
        lastFetch: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ Get sheets data error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        details: error.stack
      })
    };
  }
};