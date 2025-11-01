// Netlify Function para scrapear imágenes de albertocortes.com
// Busca productos sin imagen y los completa desde la web del proveedor
// URL: /.netlify/functions/scrape-images

const { google } = require('googleapis');

/**
 * Busca la URL de imagen de un producto en albertocortes.com
 * Intenta por UPC primero, luego por nombre
 */
async function buscarImagenProducto(upc, nombre) {
  try {
    // Estrategia 1: Buscar por UPC en la búsqueda de Shopify
    let searchUrl = `https://albertocortes.com/search?q=${encodeURIComponent(upc)}&type=product`;

    console.log(`🔍 Searching for UPC: ${upc}`);
    let response = await fetch(searchUrl);
    let html = await response.text();

    // Buscar imagen en el HTML (Shopify CDN pattern)
    let imageMatch = html.match(/https:\/\/cdn\.shopify\.com\/s\/files\/[^"'\s]+\.(jpg|jpeg|png|webp)/i);

    if (imageMatch) {
      console.log(`✅ Found image for UPC ${upc}`);
      return imageMatch[0];
    }

    // Estrategia 2: Buscar por nombre (primera palabra = marca)
    if (nombre) {
      const marca = nombre.split(' ')[0];
      searchUrl = `https://albertocortes.com/search?q=${encodeURIComponent(marca)}&type=product`;

      console.log(`🔍 Searching by brand: ${marca}`);
      response = await fetch(searchUrl);
      html = await response.text();

      imageMatch = html.match(/https:\/\/cdn\.shopify\.com\/s\/files\/[^"'\s]+\.(jpg|jpeg|png|webp)/i);

      if (imageMatch) {
        console.log(`✅ Found image for brand ${marca}`);
        return imageMatch[0];
      }
    }

    console.log(`⚠️  No image found for UPC ${upc}`);
    return null;

  } catch (error) {
    console.error(`❌ Error searching image for ${upc}:`, error.message);
    return null;
  }
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
    // Parámetros opcionales
    const queryParams = event.queryStringParameters || {};
    const limit = parseInt(queryParams.limit) || 10; // Cuántos productos procesar por ejecución
    const forceAll = queryParams.force === 'true'; // Si true, procesa todos aunque tengan imagen

    // 1. Conectar a Google Sheets
    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;

    if (!SHEET_ID) {
      throw new Error('GOOGLE_SHEET_ID not configured');
    }

    // 2. Leer productos del Sheet interno
    console.log('📦 Reading products from internal sheet...');
    const productosResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Productos!A2:G',
    });

    const rows = productosResponse.data.values || [];
    console.log(`✅ Found ${rows.length} total products`);

    // 3. Filtrar productos sin imagen (columna G vacía)
    const productosSinImagen = rows
      .map((row, index) => ({
        rowIndex: index + 2, // +2 porque Sheet es 1-indexed y saltamos header
        upc: row[0] || '',
        nombre: row[1] || '',
        imagen: row[6] || ''
      }))
      .filter(p => !p.imagen || forceAll)
      .slice(0, limit); // Limitar cantidad por ejecución

    console.log(`🔄 Processing ${productosSinImagen.length} products without images`);

    if (productosSinImagen.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'All products already have images',
          processed: 0
        })
      };
    }

    // 4. Buscar imágenes para cada producto
    const updates = [];
    let imagenesEncontradas = 0;

    for (const producto of productosSinImagen) {
      const imagenUrl = await buscarImagenProducto(producto.upc, producto.nombre);

      if (imagenUrl) {
        updates.push({
          range: `Productos!G${producto.rowIndex}`,
          values: [[imagenUrl]]
        });
        imagenesEncontradas++;
      }

      // Delay para no saturar el servidor (rate limiting)
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms entre requests
    }

    // 5. Actualizar Sheet con las imágenes encontradas
    if (updates.length > 0) {
      console.log(`📝 Updating ${updates.length} images in sheet...`);
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SHEET_ID,
        resource: {
          data: updates,
          valueInputOption: 'RAW'
        }
      });

      console.log(`✅ Updated ${updates.length} product images`);
    }

    // 6. Registrar en Historial_Sync
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: 'Historial_Sync!A:D',
        valueInputOption: 'RAW',
        resource: {
          values: [[
            new Date().toISOString(),
            0, // productos actualizados
            imagenesEncontradas, // imágenes agregadas
            productosSinImagen.length - imagenesEncontradas // errores
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
        processed: productosSinImagen.length,
        imagesFound: imagenesEncontradas,
        imagesMissing: productosSinImagen.length - imagenesEncontradas,
        message: `Processed ${productosSinImagen.length} products, found ${imagenesEncontradas} images`
      })
    };

  } catch (error) {
    console.error('❌ Scrape images error:', error);
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
