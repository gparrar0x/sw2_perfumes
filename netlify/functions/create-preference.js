// Netlify Function para crear preferencias de MercadoPago
const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    // Configurar CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Manejar preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers
        };
    }

    // Solo permitir POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        // Tu Access Token de MercadoPago (configúralo en Netlify)
        const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
        
        if (!ACCESS_TOKEN) {
            console.error('MP_ACCESS_TOKEN not configured');
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    error: 'Access token not configured',
                    message: 'Configura MP_ACCESS_TOKEN en las variables de entorno de Netlify'
                })
            };
        }

        // Parsear datos del request
        const { items, payer, back_urls } = JSON.parse(event.body);

        console.log('Creating preference for:', { items, payer });

        // Para desarrollo local, usar URLs localhost 
        const isLocalDev = back_urls?.success?.includes('localhost');
        const finalBackUrls = isLocalDev ? {
            success: "http://localhost:8888/success.html",
            failure: "http://localhost:8888/failure.html", 
            pending: "http://localhost:8888/pending.html"
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
            notification_url: `${process.env.URL}/.netlify/functions/webhook`
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
            
            return {
                statusCode: response.status,
                headers,
                body: JSON.stringify({ 
                    error: `MercadoPago API error: ${response.status}`,
                    details: errorText
                })
            };
        }

        const data = await response.json();
        
        console.log('MercadoPago response:', data);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                preference_id: data.id,
                init_point: data.init_point,
                sandbox_init_point: data.sandbox_init_point
            })
        };

    } catch (error) {
        console.error('Error creating preference:', error);
        
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
