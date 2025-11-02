// Vercel Function para scrapear imágenes de albertocortes.com
// Busca productos sin imagen y los completa desde la web del proveedor
// URL: /api/scrape-images

import { google } from 'googleapis';

/**
 * Busca la URL de imagen de un producto en albertocortes.com
 * Estrategia:
 * 1. Buscar producto por UPC
 * 2. Extraer link a página del producto
 * 3. Buscar imagen en elemento FeaturedImage-product-template
 */
async function buscarImagenProducto(upc, nombre) {
  try {
    // Paso 1: Buscar producto por UPC
    const searchUrl = `https://albertocortes.com/search?q=${encodeURIComponent(upc)}&type=product`;
    console.log(`🔍 Searching for UPC: ${upc}`);

    let response = await fetch(searchUrl);
    let html = await response.text();

    // Paso 2: Extraer link al producto
    const productLinkMatch = html.match(/href="(\/products\/[^"]+)"/i);

    if (!productLinkMatch || !productLinkMatch[1]) {
      console.log(`⚠️  No product link found for UPC ${upc}`);
      return null;
    }

    const productUrl = `https://albertocortes.com${productLinkMatch[1]}`;
    console.log(`📄 Found product page: ${productUrl}`);

    // Paso 3: Acceder a la página del producto
    response = await fetch(productUrl);
    html = await response.text();

    // Paso 4: Buscar imagen en FeaturedImage-product-template
    // Patrón: <img id="FeaturedImage-product-template-..." src="//albertocortes.com/cdn/shop/files/..."
    const featuredImageMatch = html.match(/<img[^>]*id="FeaturedImage-product-template-[^"]*"[^>]*src="([^"]+)"/i);

    if (featuredImageMatch && featuredImageMatch[1]) {
      let imageUrl = featuredImageMatch[1];

      // Agregar https: si la URL empieza con //
      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      }

      // Reemplazar {width} con un tamaño específico (usamos 800x800 para buena calidad)
      imageUrl = imageUrl.replace('{width}x', '800x800');
      imageUrl = imageUrl.replace('_{width}x', '_800x800');

      console.log(`✅ Found product image: ${imageUrl}`);
      return imageUrl;
    }

    // Fallback: Buscar en data-zoom attribute del contenedor
    const dataZoomMatch = html.match(/id="FeaturedImageZoom-[^"]*"[^>]*data-zoom="([^"]+)"/i);

    if (dataZoomMatch && dataZoomMatch[1]) {
      let imageUrl = dataZoomMatch[1];

      if (imageUrl.startsWith('//')) {
        imageUrl = 'https:' + imageUrl;
      }

      // Reemplazar {width} placeholder
      imageUrl = imageUrl.replace('{width}x', '800x800');
      imageUrl = imageUrl.replace('_{width}x', '_800x800');

      console.log(`✅ Found product image (data-zoom): ${imageUrl}`);
      return imageUrl;
    }

    console.log(`⚠️  No product image found for UPC ${upc}`);
    return null;

  } catch (error) {
    console.error(`❌ Error searching image for ${upc}:`, error.message);
    return null;
  }
}

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Parámetros opcionales
    const { limit = 10, force = false } = req.query;
    const limitNum = parseInt(limit);
    const forceAll = force === 'true';

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
      .slice(0, limitNum); // Limitar cantidad por ejecución

    console.log(`🔄 Processing ${productosSinImagen.length} products without images`);

    if (productosSinImagen.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'All products already have images',
        processed: 0
      });
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

    return res.status(200).json({
      success: true,
      processed: productosSinImagen.length,
      imagesFound: imagenesEncontradas,
      imagesMissing: productosSinImagen.length - imagenesEncontradas,
      message: `Processed ${productosSinImagen.length} products, found ${imagenesEncontradas} images`
    });

  } catch (error) {
    console.error('❌ Scrape images error:', error);
    return res.status(500).json({
      error: error.message,
      details: error.stack
    });
  }
}
