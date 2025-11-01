// Netlify Function que sincroniza productos desde Google Sheet del proveedor
// Ejecutado por GitHub Actions cron diario o trigger manual
// URL: /.netlify/functions/sync-supplier

const { google } = require('googleapis');

/**
 * Extrae la marca de la descripción del producto
 * Ejemplo: "A.BANDERAS BLACK SEDUCTION M EDT 100 ML" → "A.BANDERAS"
 */
function extraerMarca(descripcion) {
  if (!descripcion) return '';
  const palabras = descripcion.trim().split(' ');
  return palabras[0] || '';
}

/**
 * Detecta la categoría basada en palabras clave
 */
function detectarCategoria(descripcion) {
  if (!descripcion) return 'Otro';
  const desc = descripcion.toUpperCase();

  if (desc.includes('EDT')) return 'Eau de Toilette';
  if (desc.includes('EDP')) return 'Eau de Parfum';
  if (desc.includes('COLOGNE')) return 'Colonia';
  if (desc.includes('PARFUM') || desc.includes('PERFUME')) return 'Perfume';
  if (desc.includes('BODY SPRAY') || desc.includes('SPRAY')) return 'Body Spray';

  return 'Fragancia';
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  try {
    // 1. Conectar a Google Sheets API
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const SHEET_PROVEEDOR_ID = process.env.GOOGLE_SHEET_PROVEEDOR_ID;
    const SHEET_INTERNO_ID = process.env.GOOGLE_SHEET_ID;

    if (!SHEET_PROVEEDOR_ID || !SHEET_INTERNO_ID) {
      throw new Error('GOOGLE_SHEET_PROVEEDOR_ID or GOOGLE_SHEET_ID not configured');
    }

    // 2. Leer Sheet del proveedor (Alberto Cortes)
    console.log('🔄 Reading supplier sheet...');
    const proveedorResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_PROVEEDOR_ID,
      range: 'Sheet1!A2:E', // Asume que los datos están en Sheet1, ajustar si es necesario
    });

    const proveedorRows = proveedorResponse.data.values || [];
    console.log(`✅ Fetched ${proveedorRows.length} products from supplier sheet`);

    if (proveedorRows.length === 0) {
      throw new Error('No products found in supplier sheet');
    }

    // 3. Leer stock actual del Sheet interno para no perderlo
    console.log('📦 Reading current stock from internal sheet...');
    let stockActual = {};
    try {
      const stockResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_INTERNO_ID,
        range: 'Productos!A2:F',
      });

      const stockRows = stockResponse.data.values || [];
      stockRows.forEach(row => {
        const upc = row[0];
        const stock = parseInt(row[5]) || 0;
        if (upc) {
          stockActual[upc] = stock;
        }
      });
      console.log(`✅ Preserved stock for ${Object.keys(stockActual).length} products`);
    } catch (error) {
      console.log('⚠️  No existing stock found, starting fresh');
    }

    // 4. Transform datos del proveedor a formato interno
    const productos = proveedorRows
      .filter(row => row[0] && row[1] && row[2]) // Filtrar filas vacías
      .map(row => {
        const upc = row[0] || '';
        const descripcion = row[1] || '';
        const precioUSD = parseFloat(row[2]) || 0;

        const marca = extraerMarca(descripcion);
        const categoria = detectarCategoria(descripcion);
        const stock = stockActual[upc] || 0; // Mantener stock existente o 0

        return [
          upc,                    // A: UPC
          descripcion,            // B: Nombre
          marca,                  // C: Marca
          categoria,              // D: Categoria
          precioUSD,              // E: Precio_USD_Base
          stock,                  // F: Stock (preservado)
          '',                     // G: Imagen_URL (se llena con scraper)
          // H-K son fórmulas, no las tocamos
          // L se llena por defecto en el Sheet
        ];
      });

    console.log(`🔄 Transformed ${productos.length} products`);

    // 5. Actualizar Sheet interno (SOLO columnas A-G, sin tocar fórmulas)
    console.log('📝 Updating internal sheet...');

    // Clear datos antiguos
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_INTERNO_ID,
      range: 'Productos!A2:G',
    });

    // Insertar nuevos datos
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_INTERNO_ID,
      range: 'Productos!A2',
      valueInputOption: 'RAW',
      resource: { values: productos },
    });

    console.log(`✅ Updated ${productos.length} products in internal sheet`);

    // 6. Registrar sync en Historial_Sync
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_INTERNO_ID,
        range: 'Historial_Sync!A:D',
        valueInputOption: 'RAW',
        resource: {
          values: [[
            new Date().toISOString(),
            productos.length,
            0, // imágenes agregadas (se actualiza con scraper)
            0  // errores
          ]]
        }
      });
    } catch (error) {
      console.warn('⚠️  Could not update Historial_Sync:', error.message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        productsUpdated: productos.length,
        stockPreserved: Object.keys(stockActual).length,
        lastSync: new Date().toISOString(),
        message: `Synced ${productos.length} products from supplier sheet`
      })
    };

  } catch (error) {
    console.error('❌ Sync error:', error);
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
