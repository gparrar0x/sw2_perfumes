// Vercel Function para crear preferencias de MercadoPago

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

    // Manejar preflight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // Solo permitir POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Tu Access Token de MercadoPago (configúralo en Vercel)
        const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

        if (!ACCESS_TOKEN) {
            console.error('MP_ACCESS_TOKEN not configured');
            return res.status(500).json({
                error: 'Access token not configured',
                message: 'Configura MP_ACCESS_TOKEN en las variables de entorno de Vercel'
            });
        }

        // Parsear datos del request
        const { items, payer, back_urls } = req.body;

        console.log('Creating preference for:', { items, payer });

        // Para desarrollo local, usar URLs localhost
        const isLocalDev = back_urls?.success?.includes('localhost');
        const finalBackUrls = isLocalDev ? {
            success: "http://localhost:3000/success.html",
            failure: "http://localhost:3000/failure.html",
            pending: "http://localhost:3000/pending.html"
        } : back_urls;

        // Crear preferencia en MercadoPago
        const preference = {
            items: items,
            payer: payer,
            back_urls: finalBackUrls,
            // Solo usar auto_return en producción (no funciona con localhost)
            ...(isLocalDev ? {} : { auto_return: "approved" }),
            statement_descriptor: "Super Hot Dog",
            payment_methods: {
                excluded_payment_types: [{"id": "ticket"}],
                excluded_payment_methods: [],
                installments: 12
            },
            // URL para webhooks (opcional)
            notification_url: `${process.env.VERCEL_URL}/api/webhook`
        };

        console.log('Sending to MercadoPago:', JSON.stringify(preference, null, 2));

        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ACCESS_TOKEN}`
            },
            body: JSON.stringify(preference)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('MercadoPago API error:', response.status, errorText);

            return res.status(response.status).json({
                error: `MercadoPago API error: ${response.status}`,
                details: errorText
            });
        }

        const data = await response.json();

        console.log('MercadoPago response:', data);

        return res.status(200).json({
            success: true,
            preference_id: data.id,
            init_point: data.init_point,
            sandbox_init_point: data.sandbox_init_point
        });

    } catch (error) {
        console.error('Error creating preference:', error);

        return res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
}
