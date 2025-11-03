// Vercel Function para leer productos y configuración desde Google Sheets
// URL: /api/get-sheets-data

import { google } from 'googleapis';

// In-memory cache (30 segundos TTL para actualizaciones más frecuentes)
let cache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30 * 1000; // 30 segundos

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  // Check si se solicita sin cache
  const skipCache = req.query.nocache === '1' || req.query.nocache === 'true';
  
  // Cache-Control header: no-cache si se solicita refresh, o muy corto si no
  if (skipCache) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=30'); // Cache 30 segundos
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Check cache first (skip cache if nocache param is present)
    const now = Date.now();
    
    // Solo usar cache si NO se solicita refresh y el cache es válido
    if (!skipCache && cache && (now - cacheTimestamp) < CACHE_TTL) {
      // Verificar que el cache también tenga solo productos activos
      const cacheProductosActivos = (cache.productos || []).filter(p => p.activo === true);
      if (cacheProductosActivos.length !== (cache.productos || []).length) {
        console.log('⚠️ Cache contiene productos inactivos, invalidando cache');
        cache = null; // Invalidar cache si contiene productos inactivos
      } else {
        console.log('✅ Returning cached data (age: ' + Math.round((now - cacheTimestamp) / 1000) + 's)');
        return res.status(200).json({
          ...cache,
          productos: cacheProductosActivos, // Asegurar que solo productos activos
          cached: true,
          cacheAge: Math.round((now - cacheTimestamp) / 1000)
        });
      }
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
        range: 'Productos!A2:I', // Columnas: A=UPC, B=Nombre, C=Marca, D=Categoria, E=Precio_USD_Base, F=Stock, G=Imagen_URL, H=Precio_Mayor_USD, I=Activo
        valueRenderOption: 'UNFORMATTED_VALUE', // Obtener valores sin formato para booleanos
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
      // Debug: Verificar valores de la columna Activo en las primeras filas
      console.log(`📊 Valores de columna Activo (índice 8) en primeras 10 filas:`);
      productosRaw.slice(0, 10).forEach((row, idx) => {
        const activoRaw = row[8];
        console.log(`   Fila ${idx + 2}: activoRaw = "${activoRaw}" (tipo: ${typeof activoRaw}, valor: ${JSON.stringify(activoRaw)})`);
      });
    }

    // Transform productos a JSON
    const productos = productosRaw
      .filter(row => row[0]) // Solo filas con UPC
      .map(row => {
        // Estructura del Sheet:
        // A: UPC, B: Nombre, C: Marca, D: Categoria, E: Precio_USD_Base, F: Stock, G: Imagen_URL, H: Precio_Mayor_USD, I: Activo
        
        // La columna Activo está en índice 8 (columna I)
        const activoRaw = row[8];
        
        // Lógica estricta: solo TRUE (explícito) significa activo
        // Cualquier otra cosa (FALSE, vacío, undefined) = inactivo
        let activo = false;
        
        // Manejar diferentes formatos que Google Sheets puede devolver
        // Google Sheets puede devolver: true/false (boolean), "TRUE"/"FALSE" (string), o vacío
        if (activoRaw !== undefined && activoRaw !== null && activoRaw !== '') {
          // Convertir a string y normalizar
          const activoStr = String(activoRaw).toUpperCase().trim();
          
          // Verificar si es FALSE explícito primero (para logging)
          if (activoRaw === false || activoStr === 'FALSE' || activoStr === '0' || activoStr === 'NO') {
            activo = false;
            // Debug: Log productos inactivos para verificar
            if (row[0]) {
              console.log(`🔍 Producto INACTIVO detectado: ${row[0]} - activoRaw: "${activoRaw}" (tipo: ${typeof activoRaw}) -> activo: false`);
            }
          }
          // Verificar si es TRUE explícito
          else if (activoRaw === true || activoStr === 'TRUE' || activoStr === '1' || activoStr === 'YES' || activoStr === 'SÍ') {
            activo = true;
          }
          // Cualquier otra cosa = inactivo por defecto
          else {
            activo = false;
            if (row[0]) {
              console.log(`⚠️ Producto con valor desconocido en Activo: ${row[0]} - activoRaw: "${activoRaw}" (tipo: ${typeof activoRaw}) -> activo: false (por defecto)`);
            }
          }
        } else {
          // Vacío, undefined o null = inactivo
          activo = false;
        }

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

    // Debug: Mostrar distribución de productos por estado activo
    const productosActivos = productos.filter(p => p.activo === true);
    const productosInactivos = productos.filter(p => p.activo !== true);
    
    console.log(`📊 Products analysis:`);
    console.log(`   Total productos procesados: ${productos.length}`);
    console.log(`   Activos (activo === true): ${productosActivos.length}`);
    console.log(`   Inactivos (activo !== true): ${productosInactivos.length}`);
    
    // Verificar valores raw de activo en productos inactivos
    if (productosInactivos.length > 0) {
      console.log(`   📋 Primeros 10 productos inactivos con detalles:`);
      productosInactivos.slice(0, 10).forEach(p => {
        console.log(`      - ${p.upc} - ${p.nombre}`);
        console.log(`        activo: ${p.activo} (tipo: ${typeof p.activo})`);
      });
    } else {
      console.log(`   ⚠️  PROBLEMA: No se encontraron productos inactivos, pero deberían haber ${productosRaw.length - productosActivos.length} según Google Sheets`);
    }
    
    // Filtrar SOLO productos activos (activo === true explícitamente)
    const productosFinales = productosActivos;

    // Verificación final estricta
    const productosNoActivosEnFinales = productosFinales.filter(p => p.activo !== true);
    if (productosNoActivosEnFinales.length > 0) {
      console.error(`❌ ERROR: Se encontraron ${productosNoActivosEnFinales.length} productos inactivos en productosFinales!`);
      productosNoActivosEnFinales.forEach(p => {
        console.error(`   - ${p.upc} - ${p.nombre} (activo: ${p.activo}, tipo: ${typeof p.activo})`);
      });
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

    // Update cache solo si no se solicitó skip cache
    if (!skipCache) {
      cache = response;
      cacheTimestamp = Date.now();
      console.log('✅ Data cached for 30 seconds');
    } else {
      console.log('🔄 Cache skipped, fresh data from Google Sheets');
    }

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
