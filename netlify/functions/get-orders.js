// Netlify Function para obtener pedidos desde Google Sheets
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // Configurar CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    // Manejar preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers
        };
    }

    // Solo permitir GET
    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Verificar variables de entorno
        const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
        const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
        
        if (!GOOGLE_API_KEY || !GOOGLE_SHEET_ID) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Server configuration error',
                    message: 'Missing Google Sheets credentials'
                })
            };
        }

        // Obtener parámetros de consulta
        const queryParams = event.queryStringParameters || {};
        const status = queryParams.status; // Filtrar por estado si se proporciona
        const limit = parseInt(queryParams.limit) || 50; // Límite de resultados

        // URL para obtener datos de la pestaña Pedidos
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/Pedidos?key=${GOOGLE_API_KEY}`;

        console.log('Fetching orders from:', url.replace(GOOGLE_API_KEY, '[REDACTED]'));

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Google Sheets API error:', response.status, errorText);
            
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ 
                    error: `Google Sheets API error: ${response.status}`,
                    details: errorText
                })
            };
        }

        const data = await response.json();
        
        if (!data.values || data.values.length === 0) {
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    orders: [],
                    total: 0,
                    message: 'No orders found'
                })
            };
        }

        // Parsear pedidos (asumiendo que la primera fila son headers)
        const headers_row = data.values[0];
        const orders = [];

        for (let i = 1; i < data.values.length && orders.length < limit; i++) {
            const row = data.values[i];
            if (row && row.length > 0) {
                const order = {
                    id: row[0] || '',                          // A: ID_Pedido
                    date: row[1] || '',                        // B: Fecha
                    customer: row[2] || '',                    // C: Cliente
                    items: parseOrderItems(row[3]),            // D: Items_JSON
                    total: parseFloat(row[4]) || 0,            // E: Total
                    status: row[5] || 'pendiente',             // F: Estado
                    paymentMethod: row[6] || '',               // G: Pago_Metodo
                    paymentId: row[7] || '',                   // H: Pago_ID
                    phone: row[8] || '',                       // I: Telefono
                    notes: row[9] || ''                        // J: Notas
                };

                // Filtrar por estado si se especifica
                if (!status || order.status.toLowerCase() === status.toLowerCase()) {
                    orders.push(order);
                }
            }
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                orders: orders,
                total: orders.length,
                filtered: !!status,
                lastUpdated: new Date().toISOString()
            })
        };

    } catch (error) {
        console.error('Error fetching orders:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: 'Internal server error',
                message: error.message
            })
        };
    }
};

// Función auxiliar para parsear items JSON
function parseOrderItems(itemsJson) {
    try {
        if (!itemsJson) return [];
        return JSON.parse(itemsJson);
    } catch (error) {
        console.error('Error parsing items JSON:', error);
        return [];
    }
}