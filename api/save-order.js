// Vercel Function para guardar pedidos y decrementar stock
// Basado en sw3, modificado para manejar inventario bidireccional
// URL: /api/save-order

import { google } from 'googleapis';

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId, customer, items, total, subtotal, envio, paymentId, paymentMethod } = req.body;

    // Validar datos requeridos
    if (!orderId || !customer || !items || !total) {
      return res.status(400).json({ error: 'Missing required fields' });
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
    // Estructura: A: ID_Pedido, B: Fecha, C: Cliente, D: Pedido, E: Total, F: Estado, G: Email, H: Notas
    const customerNotes = customer.notes || '';
    const tipoEntrega = customer.tipoEntrega || 'envio';
    
    // Formatear fecha en formato legible (YYYY-MM-DD HH:MM:SS)
    const fecha = new Date();
    const fechaFormateada = fecha.toISOString().slice(0, 19).replace('T', ' ');
    
    // Estado inicial: "Pendiente" para pedidos de WhatsApp
    const estado = 'Pendiente';
    
    // Construir detalle del pedido (formato legible)
    const detallePedido = items.map((item, index) => {
      const cantidad = item.quantity || item.cantidad || 1;
      const precio = item.precio || 0;
      const subtotalItem = precio * cantidad;
      return `${index + 1}. ${item.marca || ''} - ${item.nombre || ''} (x${cantidad}) - $${precio.toFixed(2)} c/u = $${subtotalItem.toFixed(2)}`;
    }).join('\n');
    
    // Preparar notas completas (sin incluir tipo de entrega ni envío ya que están en otras columnas)
    const notasCompletas = customerNotes || '';
    
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Pedidos!A:H',
      valueInputOption: 'RAW',
      resource: {
        values: [[
          orderId,                    // A: ID_Pedido
          fechaFormateada,            // B: Fecha
          customer.name || '',        // C: Cliente
          detallePedido,              // D: Pedido (detalle de productos)
          total,                      // E: Total
          estado,                     // F: Estado
          customer.email || '',       // G: Email
          notasCompletas              // H: Notas
        ]]
      }
    });

    console.log(`📝 Order details - Tipo entrega: ${tipoEntrega}, Subtotal: ${subtotal}, Envío: ${envio}`);
    console.log(`✅ Order ${orderId} saved to Pedidos tab`);

    // 2. Decrementar stock de cada producto
    // Leer inventario actual (empezando desde fila 2 para saltar header)
    const inventoryResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Productos!A2:F', // Empezar desde fila 2 (sin header)
    });

    const rows = inventoryResponse.data.values || [];
    const updates = [];

    items.forEach(item => {
      const rowIndex = rows.findIndex(row => row[0] === item.upc); // Buscar por UPC en columna A

      if (rowIndex >= 0) {
        const currentStock = parseInt(rows[rowIndex][5]) || 0; // Columna F (index 5 en array) = Stock
        // Soporta tanto 'quantity' como 'cantidad'
        const cantidad = item.quantity || item.cantidad || 1;
        const newStock = Math.max(0, currentStock - cantidad); // No permitir stock negativo

        // +2 porque: +1 para convertir de 0-indexed a 1-indexed, +1 porque empezamos desde fila 2
        updates.push({
          range: `Productos!F${rowIndex + 2}`,
          values: [[newStock]]
        });

        console.log(`📦 UPC ${item.upc}: ${currentStock} → ${newStock} (cantidad: ${cantidad})`);
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

    return res.status(200).json({
      success: true,
      orderId,
      stocksUpdated: updates.length,
      message: `Order saved and ${updates.length} stocks decremented`
    });

  } catch (error) {
    console.error('❌ Save order error:', error);
    return res.status(500).json({
      error: error.message,
      details: error.stack
    });
  }
}
