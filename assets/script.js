// CONFIGURACION
const WHATSAPP_NUMBER = '584140161454'; // Número de WhatsApp (código país + número sin +)

// CONFIGURACION MERCADOPAGO VENEZUELA (DESHABILITADO)
// const MP_PUBLIC_KEY = 'APP_USR-8d9f7a5c-1234-5678-9012-abcdef123456'; // Reemplazar con la public key real de MercadoPago Venezuela

// VARIABLES GLOBALES
let productos = [];
let carrito = [];
let modoVenta = 'precio'; // Modo de venta (por compatibilidad)
let config = {};

// INICIALIZAR APLICACION
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando catálogo de perfumes...');

    // Setup event listeners
    setupEventListeners();

    // Cargar productos
    loadProductsFromBackend();
    
    // Auto-refresh cada 2 minutos para mantener el stock actualizado (no tan agresivo)
    setInterval(() => {
        console.log('Auto-refreshing productos...');
        loadProductsFromBackend(true);
    }, 2 * 60 * 1000); // 2 minutos
});

// CONFIGURAR EVENT LISTENERS
function setupEventListeners() {
    // Toggle modo de venta
    document.querySelectorAll('input[name="saleMode"]').forEach(radio => {
        radio.addEventListener('change', function() {
            modoVenta = this.value;
            console.log(`Modo de venta cambiado a: ${modoVenta}`);
            renderProducts();
            updateCartUI();
        });
    });

    // Filtros
    document.getElementById('searchInput').addEventListener('input', filterProducts);
    document.getElementById('filterMarca').addEventListener('change', filterProducts);
    document.getElementById('filterCategoria').addEventListener('change', filterProducts);

    // Cerrar modal al hacer clic fuera
    window.onclick = function(event) {
        const modal = document.getElementById('checkout-modal');
        if (event.target === modal) {
            closeCheckoutModal();
        }
    };
}

// CARGAR PRODUCTOS DESDE BACKEND
async function loadProductsFromBackend(forceRefresh = false) {
    try {
        console.log('Cargando productos desde backend...', forceRefresh ? '(forzando refresh)' : '');

        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        // Si forceRefresh es true, agregar parámetro para bypass cache y timestamp único
        const timestamp = Date.now();
        const url = forceRefresh 
            ? `/api/get-sheets-data?nocache=1&t=${timestamp}&_=${timestamp}`
            : `/api/get-sheets-data?t=${timestamp}`;

        const response = await fetch(url, {
            signal: controller.signal,
            cache: forceRefresh ? 'no-cache' : 'no-store', // no-store para evitar cache del navegador
            headers: forceRefresh ? {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            } : {}
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('Error de respuesta:', {
                status: response.status,
                statusText: response.statusText,
                error: errorData
            });
            throw new Error(`Error HTTP: ${response.status} - ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
        console.log('Datos recibidos:', data);
        console.log('Estructura de datos:', {
            tieneProductos: Array.isArray(data.productos),
            cantidadProductos: data.productos?.length || 0,
            tieneConfig: !!data.config,
            success: data.success
        });

        productos = data.productos || [];
        config = data.config || {};

        console.log(`Productos cargados: ${productos.length}`);
        console.log('Configuración:', config);
        
        // Validar que tenemos productos
        if (!Array.isArray(productos) || productos.length === 0) {
            console.warn('⚠️ No se recibieron productos o el array está vacío');
            showError('No se encontraron productos disponibles. Por favor contacta al administrador.');
            return;
        }
        
        // Verificar productos activos
        const productosActivos = productos.filter(p => p.activo !== false);
        console.log(`Productos activos: ${productosActivos.length} de ${productos.length}`);
        
        if (productosActivos.length === 0) {
            console.warn('⚠️ Todos los productos están marcados como inactivos');
            showError('No hay productos disponibles en este momento.');
            return;
        }

        // Llenar filtros
        populateFilters();

        // Renderizar productos
        renderProducts();

        // Ocultar loading
        document.getElementById('loading').style.display = 'none';
        document.getElementById('products-container').style.display = 'grid';
        document.getElementById('cart-button').style.display = 'flex';
        
        // Retornar éxito para que el botón de refresh sepa que terminó
        return Promise.resolve();

    } catch (error) {
        console.error('Error cargando productos:', error);
        console.error('Error completo:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });

        // Show specific error message
        let errorMessage = 'No se pudo cargar el catálogo.';
        let errorDetails = '';

        if (error.name === 'AbortError') {
            errorMessage = 'El servidor está tardando demasiado.';
            errorDetails = 'Por favor intenta de nuevo o verifica tu conexión.';
        } else if (!navigator.onLine) {
            errorMessage = 'No hay conexión a internet.';
            errorDetails = 'Verifica tu conexión y recarga la página.';
        } else if (error.message.includes('HTTP')) {
            errorMessage = 'Error del servidor';
            errorDetails = error.message;
            
            // Si es un error 500, sugerir verificar configuración
            if (error.message.includes('500')) {
                errorDetails += '\n\nPosibles causas:\n- Variables de entorno no configuradas\n- Service Account sin acceso al Sheet\n- Error en Google Sheets API';
            }
        } else {
            errorDetails = error.message || 'Error desconocido';
        }

        showError(errorMessage, errorDetails);
    }
}

// LLENAR FILTROS DINAMICAMENTE
function populateFilters() {
    // Filtro de marcas
    const marcas = [...new Set(productos.map(p => p.marca))].filter(Boolean).sort();
    const filterMarca = document.getElementById('filterMarca');
    filterMarca.innerHTML = '<option value="">Todas las marcas</option>';

    marcas.forEach(marca => {
        const option = document.createElement('option');
        option.value = marca;
        option.textContent = marca;
        filterMarca.appendChild(option);
    });

    // Filtro de categorías
    const categorias = [...new Set(productos.map(p => p.categoria))].filter(Boolean).sort();
    const filterCategoria = document.getElementById('filterCategoria');
    filterCategoria.innerHTML = '<option value="">Todas las categorías</option>';

    categorias.forEach(categoria => {
        const option = document.createElement('option');
        option.value = categoria;
        option.textContent = categoria;
        filterCategoria.appendChild(option);
    });

    console.log(`Filtros poblados: ${marcas.length} marcas, ${categorias.length} categorías`);
}

// FILTRAR PRODUCTOS
function filterProducts() {
    renderProducts();
}

// RENDERIZAR PRODUCTOS
function renderProducts() {
    const container = document.getElementById('products-container');
    const emptyState = document.getElementById('empty-state');

    // Obtener filtros
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const selectedMarca = document.getElementById('filterMarca').value;
    const selectedCategoria = document.getElementById('filterCategoria').value;

    // Filtrar productos - solo mostrar productos activos (activo === true)
    // FILTRO ESTRICTO: solo productos con activo === true explícitamente
    let filtered = productos.filter(p => {
      // Verificación estricta: solo true explícito
      const esActivo = p.activo === true;
      
      // Log solo si encontramos productos inactivos (para debugging)
      if (!esActivo && p.upc && productos.length > 0) {
        // Solo log los primeros 5 para no saturar la consola
        const inactivos = productos.filter(prod => prod.activo !== true);
        if (inactivos.indexOf(p) < 5) {
          console.warn(`⚠️ Producto inactivo filtrado: ${p.upc} - ${p.nombre} (activo: ${p.activo}, tipo: ${typeof p.activo})`);
        }
      }
      
      return esActivo;
    });
    
    // Verificación de seguridad: asegurar que no hay productos inactivos
    const productosInactivosEnFiltrados = filtered.filter(p => p.activo !== true);
    if (productosInactivosEnFiltrados.length > 0) {
      console.error(`❌ ERROR CRÍTICO: Se encontraron ${productosInactivosEnFiltrados.length} productos inactivos en filtered!`);
      // Filtrar nuevamente de forma más agresiva
      filtered = filtered.filter(p => p.activo === true);
    }

    if (searchTerm) {
        filtered = filtered.filter(p =>
            p.nombre.toLowerCase().includes(searchTerm) ||
            p.marca.toLowerCase().includes(searchTerm) ||
            (p.categoria && p.categoria.toLowerCase().includes(searchTerm))
        );
    }

    if (selectedMarca) {
        filtered = filtered.filter(p => p.marca === selectedMarca);
    }

    if (selectedCategoria) {
        filtered = filtered.filter(p => p.categoria === selectedCategoria);
    }

    // Mostrar/ocultar empty state
    if (filtered.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    container.style.display = 'grid';
    emptyState.style.display = 'none';

    // Renderizar productos
    container.innerHTML = filtered.map(producto => renderProductCard(producto)).join('');

    console.log(`Renderizados ${filtered.length} productos`);
}

// RENDERIZAR TARJETA DE PRODUCTO
function renderProductCard(producto) {
    // Solo tenemos Precio_Mayor_USD, usar siempre ese precio
    const precio = producto.precioMayorUSD || 0;
    const tipoLabel = 'Precio';

    const hasStock = producto.stock > 0;
    const stockClass = hasStock ? 'in-stock' : 'out-of-stock';
    const stockText = hasStock ? `En stock: ${producto.stock} unidades` : 'Sin stock';

    // Usar data URI SVG inline en lugar de placeholder externo para evitar llamadas HTTP
    const placeholderSvg = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="250"%3E%3Crect fill="%23f5f5f5" width="300" height="250"/%3E%3Ctext fill="%23999" font-family="Arial,sans-serif" font-size="14" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ESin Imagen%3C/text%3E%3C/svg%3E';
    const imageUrl = producto.imagenURL && producto.imagenURL.trim() !== '' 
        ? producto.imagenURL 
        : placeholderSvg;

    return `
        <div class="product-card" data-upc="${producto.upc}">
            <img src="${imageUrl}" alt="${producto.nombre}" class="product-image" loading="lazy"
                 onerror="this.onerror=null; this.src='${placeholderSvg}'">

            <div class="product-brand">${producto.marca}</div>
            <div class="product-name">${producto.nombre}</div>
            <div class="product-category">${producto.categoria || 'Sin categoría'}</div>

            <div class="product-prices">
                <div class="price-row">
                    <span class="price-label">${tipoLabel}:</span>
                    <span class="price-value highlight">$${formatPrice(precio)}</span>
                </div>
            </div>

            <div class="product-stock ${stockClass}">
                ${stockText}
            </div>

            <button class="btn btn-primary"
                    onclick="addToCart('${producto.upc}')"
                    ${!hasStock ? 'disabled' : ''}>
                ${hasStock ? 'Agregar al carrito' : 'Sin stock'}
            </button>
        </div>
    `;
}

// FORMATEAR PRECIO
function formatPrice(price) {
    if (!price) return '0.00';
    return parseFloat(price).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

// AGREGAR AL CARRITO
function addToCart(upc) {
    const producto = productos.find(p => p.upc === upc);

    if (!producto) {
        console.error('Producto no encontrado:', upc);
        return;
    }

    if (producto.stock <= 0) {
        showToastError('Este producto no tiene stock disponible');
        return;
    }

    // Calcular cantidad total que ya está en el carrito (sumar todos los items con mismo UPC)
    const cantidadEnCarrito = carrito
        .filter(item => item.upc === upc)
        .reduce((sum, item) => sum + item.cantidad, 0);

    // Verificar que al agregar 1 más no exceda el stock disponible
    if (cantidadEnCarrito + 1 > producto.stock) {
        const unidadesDisponibles = producto.stock - cantidadEnCarrito;
        if (unidadesDisponibles <= 0) {
            showToastError(`Ya tienes todas las unidades disponibles de este producto en el carrito`);
        } else {
            showToastError(`Solo puedes agregar ${unidadesDisponibles} unidad${unidadesDisponibles > 1 ? 'es' : ''} más. Ya tienes ${cantidadEnCarrito} en el carrito`);
        }
        return;
    }

    // Buscar si ya existe en el carrito
    const itemExistente = carrito.find(item => item.upc === upc);

    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        // Solo tenemos Precio_Mayor_USD, usar siempre ese precio
        const precio = producto.precioMayorUSD || 0;

        carrito.push({
            upc: producto.upc,
            nombre: producto.nombre,
            marca: producto.marca,
            precio: precio,
            cantidad: 1,
            modoVenta: 'precio',
            stockDisponible: producto.stock // Guardar stock para referencia
        });
    }

    console.log('Producto agregado al carrito:', producto.nombre);
    updateCartUI();

    // Feedback visual
    showToast(`${producto.nombre} agregado al carrito`);
}

// ACTUALIZAR UI DEL CARRITO
function updateCartUI() {
    const totalItems = carrito.reduce((sum, item) => sum + item.cantidad, 0);
    const { subtotal } = calcularTotales();

    const cartCountElement = document.getElementById('cart-count');
    const cartButton = document.getElementById('cart-button');

    // Actualizar badge con cantidad
    cartCountElement.textContent = totalItems;
    cartCountElement.style.display = totalItems > 0 ? 'inline-block' : 'none';

    // Actualizar total
    document.getElementById('cart-total').textContent = formatPrice(subtotal);

    // Mostrar/ocultar carrito
    cartButton.style.display = totalItems > 0 ? 'flex' : 'none';
}

// CALCULAR TOTALES (SUBTOTAL + ENVÍO)
function calcularTotales(tipoEntrega = 'envio') {
    const subtotal = carrito.reduce((sum, item) => {
        return sum + (item.precio * item.cantidad);
    }, 0);

    // Si es pickup, no hay costo de envío
    let envio = 0;
    if (tipoEntrega === 'envio') {
        // Si el pedido es más de $500, envío gratis. Si no, $3
        envio = subtotal >= 500 ? 0 : 3;
    }
    
    const total = subtotal + envio;

    return { subtotal, envio, total, envioGratis: tipoEntrega === 'envio' && subtotal >= 500, tipoEntrega };
}

// ABRIR MODAL DE CHECKOUT
function openCheckoutModal() {
    if (carrito.length === 0) {
        alert('El carrito está vacío');
        return;
    }

    const modal = document.getElementById('checkout-modal');
    const orderSummary = document.getElementById('order-summary');

    // Obtener tipo de entrega seleccionado (por defecto 'envio')
    const tipoEntrega = document.querySelector('input[name="delivery-type"]:checked')?.value || 'envio';
    const { subtotal, envio, total, envioGratis } = calcularTotales(tipoEntrega);
    
    // Función para actualizar el resumen cuando cambie el tipo de entrega
    const updateSummary = () => {
        const selectedTipoEntrega = document.querySelector('input[name="delivery-type"]:checked')?.value || 'envio';
        const totals = calcularTotales(selectedTipoEntrega);
        renderOrderSummary(totals);
    };

    // Agregar listener a los radio buttons
    document.querySelectorAll('input[name="delivery-type"]').forEach(radio => {
        radio.removeEventListener('change', updateSummary); // Remover listener previo si existe
        radio.addEventListener('change', updateSummary);
    });

    renderOrderSummary({ subtotal, envio, total, envioGratis, tipoEntrega });
    
    modal.style.display = 'block';
}

// RENDERIZAR RESUMEN DEL PEDIDO
function renderOrderSummary({ subtotal, envio, total, envioGratis, tipoEntrega }) {
    const orderSummary = document.getElementById('order-summary');

    let summaryHTML = '<h3>Resumen del Pedido</h3>';

    // Agrupar productos por UPC y modoVenta para consolidar duplicados
    const productosAgrupados = {};
    carrito.forEach(item => {
        const key = `${item.upc}_${item.modoVenta}`;
        if (productosAgrupados[key]) {
            productosAgrupados[key].cantidad += item.cantidad;
        } else {
            productosAgrupados[key] = {
                nombre: item.nombre,
                cantidad: item.cantidad,
                precio: item.precio,
                modoVenta: item.modoVenta
            };
        }
    });

    // Renderizar items agrupados
    Object.values(productosAgrupados).forEach(item => {
        const itemTotal = item.precio * item.cantidad;
        summaryHTML += `
            <div class="summary-item">
                <span>${item.nombre} (x${item.cantidad})</span>
                <span>$${formatPrice(itemTotal)}</span>
            </div>
        `;
    });

    // Subtotal
    summaryHTML += `
        <div class="summary-item">
            <span>Subtotal:</span>
            <span>$${formatPrice(subtotal)}</span>
        </div>
    `;

    // Envío o Pickup
    if (tipoEntrega === 'pickup') {
        summaryHTML += `
            <div class="summary-item">
                <span>Tipo de entrega:</span>
                <span>🏪 Recoger en tienda</span>
            </div>
        `;
    } else {
        if (envioGratis) {
            summaryHTML += `
                <div class="summary-item">
                    <span>Envío:</span>
                    <span class="envio-tachado">$${formatPrice(3)}</span>
                    <span class="envio-gratis">GRATIS</span>
                </div>
            `;
        } else {
            summaryHTML += `
                <div class="summary-item">
                    <span>Envío:</span>
                    <span>$${formatPrice(envio)}</span>
                </div>
            `;
        }
    }

    // Total
    summaryHTML += `
        <div class="summary-item summary-total">
            <span>TOTAL A PAGAR:</span>
            <span>$${formatPrice(total)}</span>
        </div>
    `;

    orderSummary.innerHTML = summaryHTML;
}

// CERRAR MODAL DE CHECKOUT
function closeCheckoutModal() {
    const modal = document.getElementById('checkout-modal');
    modal.style.display = 'none';

    // Limpiar formulario
    document.getElementById('checkout-form').reset();
}

// ENVIAR PEDIDO POR WHATSAPP
function processPayment() {
    const name = document.getElementById('customer-name').value.trim();
    const email = document.getElementById('customer-email').value.trim();
    const notes = document.getElementById('customer-notes').value.trim();

    // Validaciones
    if (!name) {
        alert('Por favor ingresa tu nombre');
        return;
    }

    if (carrito.length === 0) {
        alert('El carrito está vacío');
        return;
    }

    // Obtener tipo de entrega seleccionado
    const tipoEntrega = document.querySelector('input[name="delivery-type"]:checked')?.value || 'envio';
    const { subtotal, envio, total, envioGratis } = calcularTotales(tipoEntrega);

    // Agrupar productos por UPC y modoVenta para consolidar duplicados
    const productosAgrupados = {};
    carrito.forEach(item => {
        const key = `${item.upc}_${item.modoVenta}`;
        if (productosAgrupados[key]) {
            productosAgrupados[key].cantidad += item.cantidad;
        } else {
            productosAgrupados[key] = {
                upc: item.upc,
                marca: item.marca,
                nombre: item.nombre,
                cantidad: item.cantidad,
                precio: item.precio,
                modoVenta: item.modoVenta
            };
        }
    });

    // Construir mensaje de WhatsApp (sin emojis, estructura reorganizada)
    let mensaje = `Me gustaría hacer el siguiente pedido:\n\n`;

    // DATOS DEL CLIENTE
    mensaje += `*Mis Datos:*\n`;
    mensaje += `Nombre: ${name}\n`;
    if (email) {
        mensaje += `Email: ${email}\n`;
    }
    mensaje += `Tipo de entrega: ${tipoEntrega === 'pickup' ? 'Recoger en tienda (Pickup)' : 'Envío a domicilio'}\n`;
    mensaje += `\n`;

    // RESUMEN DE PAGO
    mensaje += `*RESUMEN DE PAGO*\n`;
    mensaje += `Subtotal: $${formatPrice(subtotal)}\n`;
    if (tipoEntrega === 'pickup') {
        mensaje += `Recoger en tienda: Sin costo adicional\n`;
    } else {
        if (envioGratis) {
            mensaje += `Envío: GRATIS (pedido mayor a $500)\n`;
        } else {
            mensaje += `Envío: $${formatPrice(envio)}\n`;
        }
    }
    mensaje += `TOTAL A PAGAR: $${formatPrice(total)}\n`;
    mensaje += `\n`;

    // PRODUCTOS SOLICITADOS
    mensaje += `*PRODUCTOS SOLICITADOS*\n\n`;
    let index = 1;
    Object.values(productosAgrupados).forEach(item => {
        mensaje += `${index}. ${item.marca} - ${item.nombre}\n`;
        mensaje += `   Cantidad: ${item.cantidad} unidad${item.cantidad > 1 ? 'es' : ''}\n`;
        mensaje += `   Precio unitario: $${formatPrice(item.precio)}\n`;
        mensaje += `   Subtotal: $${formatPrice(item.precio * item.cantidad)}\n\n`;
        index++;
    });

    // Notas adicionales
    if (notes) {
        mensaje += `*Notas adicionales:*\n${notes}\n`;
    }

    // Generar ID único del pedido (formato: PERF-YYYYMMDD-XXX)
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderId = `PERF-${dateStr}-${randomSuffix}`;

    // Preparar items para guardar (usar productos agrupados)
    const itemsToSave = Object.values(productosAgrupados).map(item => ({
        upc: item.upc,
        nombre: item.nombre,
        marca: item.marca,
        cantidad: item.cantidad,
        precio: item.precio,
        modoVenta: item.modoVenta
    }));

    // Preparar datos del pedido para guardar
    const orderData = {
        orderId: orderId,
        customer: {
            name: name,
            email: email || '',
            notes: notes || '',
            tipoEntrega: tipoEntrega
        },
        items: itemsToSave,
        total: total,
        subtotal: subtotal,
        envio: envio,
        paymentId: '', // WhatsApp no tiene paymentId
        paymentMethod: 'whatsapp'
    };

    // Guardar pedido en Google Sheets
    fetch('/api/save-order', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().catch(() => ({}));
        }
        return response.json();
    })
    .then(result => {
        if (result.success) {
            console.log('Pedido guardado:', result);
            // Agregar orderId al mensaje de WhatsApp
            mensaje += `\n*ID del Pedido: ${orderId}*`;
        } else {
            console.error('Error guardando pedido:', result);
        }
        
        // Enviar a WhatsApp después de intentar guardar
        enviarAWhatsApp(mensaje);
    })
    .catch(error => {
        console.error('Error al guardar pedido:', error);
        // Continuar con WhatsApp aunque falle el guardado
        enviarAWhatsApp(mensaje);
    });

    // Función auxiliar para enviar a WhatsApp
    function enviarAWhatsApp(mensajeFinal) {
        // Mostrar mensaje en consola para debugging
        console.log('Mensaje de WhatsApp que se enviará:');
        console.log('━━━━━━━━━━━━━━━━━━━━━');
        console.log(mensajeFinal);
        console.log('━━━━━━━━━━━━━━━━━━━━━');

        // Codificar mensaje para URL
        const mensajeCodificado = encodeURIComponent(mensajeFinal);
        const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${mensajeCodificado}`;

        // Abrir WhatsApp
        window.open(whatsappURL, '_blank');

        // Limpiar carrito y cerrar modal
        carrito = [];
        updateCartUI();
        closeCheckoutModal();

        showToast('Pedido enviado a WhatsApp');
        
        // Recargar productos para actualizar stock (bypass cache)
        setTimeout(() => {
            loadProductsFromBackend(true);
        }, 1000);
    }
}

/* ============================================
   CODIGO MERCADOPAGO (DESHABILITADO)
   ============================================

// PROCESAR PAGO CON MERCADOPAGO
async function processPaymentMercadoPago() {
    const name = document.getElementById('customer-name').value.trim();
    const email = document.getElementById('customer-email').value.trim();
    const phone = document.getElementById('customer-phone').value.trim();
    const notes = document.getElementById('customer-notes').value.trim();

    // Validaciones
    if (!name) {
        alert('Por favor ingresa tu nombre');
        return;
    }

    if (!email) {
        alert('Por favor ingresa tu email');
        return;
    }

    if (!email.includes('@') || !email.includes('.')) {
        alert('Por favor ingresa un email válido');
        return;
    }

    if (carrito.length === 0) {
        alert('El carrito está vacío');
        return;
    }

    try {
        // Mostrar loading
        const btnPayment = document.querySelector('.btn-payment');
        const originalText = btnPayment.textContent;
        btnPayment.textContent = 'Procesando...';
        btnPayment.disabled = true;

        const { subtotal, flete, total } = calcularTotales();

        // Preparar items para MercadoPago
        const items = carrito.map(item => ({
            id: item.upc,
            title: `${item.nombre}`,
            description: `${item.marca} - ${item.nombre}`,
            quantity: item.cantidad,
            unit_price: item.precio,
            currency_id: 'USD' // Dólares estadounidenses
        }));

        // Agregar flete como item separado
        items.push({
            id: 'flete',
            title: 'Flete (10%)',
            description: 'Costo de envío',
            quantity: 1,
            unit_price: flete,
            currency_id: 'USD'
        });

        // Preparar datos del pedido
        const orderData = {
            customerName: name,
            customerEmail: email,
            customerPhone: phone,
            customerNotes: notes,
            items: carrito,
            subtotal: subtotal,
            flete: flete,
            total: total,
            timestamp: new Date().toISOString()
        };

        // Guardar en localStorage para la página de éxito
        localStorage.setItem('perfumes_order', JSON.stringify(orderData));

        // Crear preferencia de pago
        const preference = {
            items: items,
            payer: {
                name: name,
                email: email,
                phone: phone ? { number: phone } : undefined
            },
            back_urls: {
                success: window.location.origin + '/success.html',
                failure: window.location.origin + '/failure.html',
                pending: window.location.origin + '/pending.html'
            },
            auto_return: 'approved',
            statement_descriptor: 'Perfumes Premium'
        };

        console.log('Creando preferencia de pago...');

        const response = await fetch('/api/create-preference', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(preference)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Error ${response.status}`);
        }

        const data = await response.json();
        console.log('Preferencia creada:', data);

        if (!data.init_point) {
            throw new Error('No se recibió URL de pago');
        }

        // Redirigir a MercadoPago
        console.log('Redirigiendo a MercadoPago...');
        window.location.href = data.init_point;

    } catch (error) {
        console.error('Error procesando pago:', error);
        alert(`Error al procesar el pago: ${error.message}`);

        // Restaurar botón
        const btnPayment = document.querySelector('.btn-payment');
        btnPayment.textContent = 'Pagar con MercadoPago';
        btnPayment.disabled = false;
    }
}

   ============================================ */

// MOSTRAR ERROR
function showError(message, details = '') {
    const loading = document.getElementById('loading');
    loading.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <h3 style="color: var(--error, #ef4444); margin-bottom: 1rem;">${message}</h3>
            ${details ? `<p style="color: var(--charcoal, #4a5568); margin-bottom: 1.5rem; white-space: pre-line; font-size: 0.9rem;">${details}</p>` : ''}
            <button class="btn btn-primary" onclick="location.reload()" style="margin-right: 1rem;">
                Reintentar
            </button>
            <button class="btn" onclick="checkHealth()" style="background: transparent; border: 1px solid var(--gold, #d4af37); color: var(--gold, #d4af37);">
                Verificar Estado
            </button>
        </div>
    `;
}

// Función para verificar el estado del servidor
async function checkHealth() {
    try {
        const response = await fetch('/api/health-check');
        const data = await response.json();
        
        console.log('Health check:', data);
        
        let healthMessage = 'Estado del sistema:\n\n';
        healthMessage += `Variables de entorno: ${data.summary.envVarsConfigured ? '✓' : '✗'}\n`;
        healthMessage += `Credenciales válidas: ${data.summary.credentialsValid ? '✓' : '✗'}\n`;
        healthMessage += `Acceso al Sheet: ${data.summary.sheetAccessible ? '✓' : '✗'}\n`;
        
        if (!data.summary.sheetAccessible && data.checks.sheetAccess?.error) {
            healthMessage += `\nError: ${data.checks.sheetAccess.error}`;
        }
        
        alert(healthMessage);
    } catch (error) {
        console.error('Error en health check:', error);
        alert('No se pudo verificar el estado del servidor.');
    }
}

// MOSTRAR TOAST (NOTIFICACIÓN)
function showToast(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;

    toast.textContent = message;
    document.body.appendChild(toast);

    // Agregar animación CSS si no existe
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    // Remover después de 3 segundos
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }
    }, 3000);
}

// MOSTRAR TOAST DE ERROR (NOTIFICACIÓN ROJA)
function showToastError(message) {
    const toast = document.createElement('div');
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc2626;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(220, 38, 38, 0.3);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;

    toast.textContent = message;
    document.body.appendChild(toast);

    // Agregar animación CSS si no existe
    if (!document.getElementById('toast-styles')) {
        const style = document.createElement('style');
        style.id = 'toast-styles';
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    // Remover después de 4 segundos (un poco más largo para errores)
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}
