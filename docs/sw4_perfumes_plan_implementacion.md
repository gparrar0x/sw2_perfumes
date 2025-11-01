# SW4 - Plan Detallado de Implementación

## Resumen Ejecutivo
- Objetivo: Completar la experiencia SW4 Perfumes aprovechando el backend ya entregado (ver `projects/sw2_perfumes/IMPLEMENTATION_COMPLETED.md`) y terminar la capa de frontend, QA y handoff al cliente.
- Alcance: Verificación rápida del setup existente, adaptación del frontend para el flujo de perfumes, aseguramiento de calidad end-to-end y capacitación del cliente.
- Duración estimada: 7 horas efectivas distribuidas en 3 sesiones durante 1.5 días.
- Equipo: Mentat (arquitectura, QA técnico) y Gonza (coordinación cliente, pagos, deploy).

## Plan por Fases

### Fase 0 · Coordinación Inicial (0.5 h, Gonza)
- Confirmar con el cliente interés, presupuesto y disponibilidad para cerrar la entrega.
- Recolectar insumos pendientes del checklist (Excel actualizado, márgenes vigentes, inventario inicial).
- Actualizar el espacio compartido (Drive/Notion) con accesos, documentación y fechas de las sesiones.

### Fase 1 · Auditoría del Setup Existente (1 h, Mentat 0.5 h · Gonza 0.5 h)
- Revisar que los workflows y funciones documentados en `IMPLEMENTATION_COMPLETED.md` sigan operativos (sync diario, scraping, decremento de stock).
- Validar que la Google Sheet interna esté accesible y que las fórmulas de precios funcionen con datos reales.
- Verificar variables de entorno en Netlify y tokens de MercadoPago vigentes.
- Registrar hallazgos o ajustes menores antes de avanzar (ej. rangos, rutas, permisos).

### Fase 2 · Adaptación Frontend y Checkout (3 h, Mentat 1.5 h · Gonza 1.5 h)
- Actualizar `index.html` y `app.js`: textos de perfumes, toggle Mayorista/Detallista, filtros por categoría, visualización de marca/categoría, eliminación de lógica de horarios.
- Implementar cálculo de flete 10% en checkout y mostrar desglose de subtotal/flete/total.
- Asegurar que el precio mostrado corresponda al modo seleccionado (Mayorista vs Detallista) usando los campos provistos por `/get-sheets-data`.
- Ajustar carrito para manejar `upc` como identificador y manejar placeholders cuando falten imágenes.
- Probar flujo completo en entorno local (`netlify dev`) con órdenes simuladas.

### Fase 3 · QA, Pulido y Deploy (1.5 h, Mentat 0.75 h · Gonza 0.75 h)
- Mentat: QA técnico (errores de API, fallback de imágenes, límites de precios, performance básica) y actualización de README/documentación con los cambios frontend.
- Gonza: Deploy final en Netlify, smoke-test en producción (navegación, checkout, decremento de stock, sync manual) y checklist de regresión actualizado.
- Documentar cualquier configuración adicional (por ejemplo, parámetros de caché o límites de scraping) detectados durante la verificación.

### Fase 4 · Onboarding y Cierre (1 h, Gonza)
- Capacitar al cliente: uso de la hoja Config, lectura de pedidos, ejecución manual del sync y acceso al dashboard de Netlify.
- Entregar accesos, documentación, checklist final y acordar SLA de soporte (WhatsApp o canal definido).
- Formalizar el modelo comercial elegido ($300 setup + $20/mes o $400 único) y definir método de pago.

### Fase 5 · Post-Lanzamiento (continuo)
- Semana 1: monitorear a diario la ejecución del cron y revisar pedidos registrados para detectar incidencias tempranas.
- Mes 1: realizar retro con el cliente, recopilar feedback y priorizar mejoras opcionales (catálogo PDF, alertas de stock mínimo, múltiples listas de precios).
- Documentar aprendizajes y activos reutilizables para nuevas implementaciones SW4.

## Entregables
- Frontend actualizado con modo Mayorista/Detallista, filtros y cálculo de flete completo.
- Documentación (README + notas de despliegue) reflejando la arquitectura final y procedimientos operativos.
- Checklist de QA y pruebas end-to-end ejecutadas.
- Capacitación al cliente y registro de dudas frecuentes.

## Dependencias y Riesgos
- Acceso continuo a la Google Sheet interna y al Excel del proveedor para pruebas reales.
- Tokens de MercadoPago válidos y sin restricciones para operar en Venezuela.
- Estabilidad de la API/Sheet del proveedor; fallback: importar CSV si se pierde acceso.
- Confirmación de márgenes/tasa de cambio antes de publicar en producción.

## Próximos Pasos Inmediatos
- [ ] Gonza confirma con el cliente la aceptación del plan y agenda las tres sesiones.
- [ ] Cliente entrega Excel definitivo, parámetros de márgenes/tasas actualizados y confirma inventario inicial.
- [ ] Mentat revisa el estado actual del repo (`IMPLEMENTATION_COMPLETED.md`) para preparar la auditoría de Fase 1.
