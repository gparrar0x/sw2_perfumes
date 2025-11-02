// Vercel Function para obtener pedidos desde Google Sheets

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    // Manejar preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Solo permitir GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Verificar variables de entorno
        const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
        const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;

        if (!GOOGLE_API_KEY || !GOOGLE_SHEET_ID) {
            return res.status(500).json({
                error: 'Server configuration error',
                message: 'Missing Google Sheets credentials'
            });
        }

        // Obtener parámetros de consulta
        const { status, limit = 50 } = req.query;

        // URL para obtener datos de la pestaña Pedidos
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/Pedidos?key=${GOOGLE_API_KEY}`;

        console.log('Fetching orders from:', url.replace(GOOGLE_API_KEY, '[REDACTED]'));

        const response = await fetch(url);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Google Sheets API error:', response.status, errorText);

            return res.status(response.status).json({
                error: `Google Sheets API error: ${response.status}`,
                details: errorText
            });
        }

        const data = await response.json();

        if (!data.values || data.values.length === 0) {
            return res.status(200).json({
                success: true,
                orders: [],
                total: 0,
                message: 'No orders found'
            });
        }

        // Parsear pedidos (asumiendo que la primera fila son headers)
        const headers_row = data.values[0];
        const orders = [];

        for (let i = 1; i < data.values.length && orders.length < parseInt(limit); i++) {
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

        return res.status(200).json({
            success: true,
            orders: orders,
            total: orders.length,
            filtered: !!status,
            lastUpdated: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching orders:', error);

        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}

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
