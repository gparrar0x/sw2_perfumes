// Vercel Function para leer productos y configuración desde Google Sheets
// URL: /api/get-sheets-data

import { google } from 'googleapis';

// In-memory cache (5 minutes TTL)
let cache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
    // Check cache first (skip cache if nocache param is present)
    const now = Date.now();
    const skipCache = req.query.nocache === '1' || req.query.nocache === 'true';
    if (!skipCache && cache && (now - cacheTimestamp) < CACHE_TTL) {
      console.log('✅ Returning cached data (age: ' + Math.round((now - cacheTimestamp) / 1000) + 's)');
      return res.status(200).json({
        ...cache,
        cached: true,
        cacheAge: Math.round((now - cacheTimestamp) / 1000)
      });
    }

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

    // Leer productos y config EN PARALELO para reducir tiempo
    console.log('📖 Reading productos and config in parallel...');
    const [productosResponse, configResponse] = await Promise.all([
      sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'Productos!A2:I', // Columnas: UPC, Nombre, Marca, Categoria, Precio_USD_Base, Stock, Imagen_URL, Precio_Mayor_USD, Activo
      }),
      sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: 'Config!A1:B10',
      })
    ]);

    const productosRaw = productosResponse.data.values || [];
    const configRaw = configResponse.data.values || [];

    console.log(`📊 Raw productos count: ${productosRaw.length}`);
    if (productosRaw.length > 0) {
      console.log(`📊 Sample row length: ${productosRaw[0].length}, first row:`, productosRaw[0].slice(0, 10));
    }

    // Transform productos a JSON
    const productos = productosRaw
      .filter(row => row[0]) // Solo filas con UPC
      .map(row => {
        // Estructura del Sheet:
        // A: UPC, B: Nombre, C: Marca, D: Categoria, E: Precio_USD_Base, F: Stock, G: Imagen_URL, H: Precio_Mayor_USD, I: Activo
        
        // La columna Activo está en índice 8 (columna I)
        const activoRaw = row[8];
        
        // Si la columna no existe, está vacía, o contiene TRUE (string o boolean), el producto está activo
        // Si contiene FALSE explícito, entonces está inactivo
        const esFalso = activoRaw === 'FALSE' || activoRaw === false || 
                       (typeof activoRaw === 'string' && activoRaw.toUpperCase() === 'FALSE');
        const activo = !esFalso && (activoRaw === undefined || 
                      activoRaw === '' || 
                      activoRaw === 'TRUE' || 
                      activoRaw === true ||
                      (typeof activoRaw === 'string' && activoRaw.toUpperCase() === 'TRUE'));

        return {
          upc: row[0] || '',
          nombre: row[1] || '',
          marca: row[2] || '',
          categoria: row[3] || '',
          precioBaseUSD: parseFloat(row[4]) || 0,
          stock: parseInt(row[5]) || 0,
          imagenURL: row[6] || '',
          // Solo existe Precio_Mayor_USD en columna H (índice 7)
          precioMayorUSD: parseFloat(row[7]) || 0,
          // No hay Precio_Detal_USD, usar el mismo precio mayorista
          precioDetalUSD: parseFloat(row[7]) || 0,
          activo: activo,
          disponible: parseInt(row[5]) > 0
        };
      });

    // Si todos los productos están marcados como inactivos, es probable que el Sheet
    // todavía tenga las columnas VES y la columna Activo no esté configurada correctamente
    // En ese caso, consideramos todos los productos como activos por defecto
    const productosActivos = productos.filter(p => p.activo === true);
    console.log(`📊 Products marked as active: ${productosActivos.length} out of ${productos.length}`);
    
    // TEMPORAL: Si todos están inactivos, activarlos todos automáticamente
    // Esto es necesario porque el Sheet puede tener la columna Activo mal configurada
    const productosFinales = productosActivos.length > 0 
      ? productosActivos 
      : productos.map(p => ({ ...p, activo: true }));

    if (productosActivos.length === 0 && productos.length > 0) {
      console.log('⚠️  All products were marked inactive, treating all as active by default');
    }

    console.log(`✅ Final products count: ${productosFinales.length}, all activo: ${productosFinales.every(p => p.activo === true)}`);

    // Transform config a objeto
    const config = {};
    configRaw.forEach(row => {
      if (row[0]) {
        config[row[0]] = row[1];
      }
    });

    // Validar que tenemos productos antes de enviar respuesta
    if (!productosFinales || productosFinales.length === 0) {
      console.warn('⚠️ No hay productos finales para enviar');
      return res.status(200).json({
        success: true,
        productos: [],
        config: {},
        marcas: [],
        categorias: [],
        lastFetch: new Date().toISOString(),
        cached: false,
        warning: 'No products found in sheet'
      });
    }

    // Prepare response
    const response = {
      success: true,
      productos: productosFinales,
      config,
      marcas: [...new Set(productosFinales.map(p => p.marca))].filter(Boolean).sort(),
      categorias: [...new Set(productosFinales.map(p => p.categoria))].filter(Boolean).sort(),
      lastFetch: new Date().toISOString(),
      cached: false
    };

    // Update cache
    cache = response;
    cacheTimestamp = Date.now();
    console.log('✅ Data cached for 5 minutes');

    return res.status(200).json(response);

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
