// Netlify Function para guardar pedidos y decrementar stock
// Basado en sw3, modificado para manejar inventario bidireccional
// URL: /.netlify/functions/save-order

const { google } = require('googleapis');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { orderId, customer, items, total, paymentId } = JSON.parse(event.body);

    // Validar datos requeridos
    if (!orderId || !customer || !items || !total) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    const auth = new google.auth.GoogleAuth({
      credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;

    if (!SHEET_ID) {
      throw new Error('GOOGLE_SHEET_ID not configured');
    }

    // 1. Guardar orden en tab "Pedidos"
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Pedidos!A:H',
      valueInputOption: 'RAW',
      resource: {
        values: [[
          orderId,
          new Date().toISOString(),
          customer.name || '',
          customer.email || '',
          JSON.stringify(items),
          total,
          'mercadopago',
          paymentId || ''
        ]]
      }
    });

    console.log(`✅ Order ${orderId} saved to Pedidos tab`);

    // 2. Decrementar stock de cada producto
    // Leer inventario actual
    const inventoryResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Productos!A:F',
    });

    const rows = inventoryResponse.data.values || [];
    const updates = [];

    items.forEach(item => {
      const rowIndex = rows.findIndex(row => row[0] === item.upc); // Buscar por UPC en columna A

      if (rowIndex >= 0) {
        const currentStock = parseInt(rows[rowIndex][5]) || 0; // Columna F (index 5) = Stock
        const newStock = Math.max(0, currentStock - (item.quantity || 1)); // No permitir stock negativo

        updates.push({
          range: `Productos!F${rowIndex + 1}`, // +1 porque sheets es 1-indexed
          values: [[newStock]]
        });

        console.log(`📦 UPC ${item.upc}: ${currentStock} → ${newStock}`);
      } else {
        console.warn(`⚠️  UPC ${item.upc} not found in inventory`);
      }
    });

    // Batch update stocks
    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SHEET_ID,
        resource: {
          data: updates,
          valueInputOption: 'RAW'
        }
      });

      console.log(`✅ ${updates.length} stocks updated`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        orderId,
        stocksUpdated: updates.length,
        message: `Order saved and ${updates.length} stocks decremented`
      })
    };

  } catch (error) {
    console.error('❌ Save order error:', error);
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