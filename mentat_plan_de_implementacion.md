# Plan de Implementación SW4 Perfumes (8 horas)

## Sesión 1: Setup & Sync (3h)

- Crear Google Sheet "Productos" con fórmulas de precio
- Netlify Function para sync desde Sheet del proveedor
- Netlify Function para scraping de imágenes (albertocortes.com)
- GitHub Actions cron diario

## Sesión 2: Frontend & Checkout (3h)
- Clonar sw3 → sw4_perfumes
- Adaptar frontend (toggle Mayorista/Detal, filtros por marca/categoría)
- Modificar get-sheets-data.js y save-order.js
- Integrar MercadoPago con decremento de stock

## Sesión 3: Deploy & Polish (2h)
- Deploy a Netlify con variables de entorno
- Admin UI simple (triggers manuales)
- Testing end-to-end en producción
- Documentación

## Arquitectura:
- Source of Truth: Tu Google Sheet actual (solo lectura)
- Sheet interno "Productos" con precios calculados + stock
- Flete 10% aplicado en checkout (no en precio unitario)
- Imágenes via scraping automático de albertocortes.com
- Config centralizada en config/pricing.json + Sheet "Config"