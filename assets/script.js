// CONFIGURACION
const WHATSAPP_NUMBER = '584121234567'; // Reemplazar con el número de WhatsApp real (código país + número sin +)

// CONFIGURACION MERCADOPAGO VENEZUELA (DESHABILITADO)
// const MP_PUBLIC_KEY = 'APP_USR-8d9f7a5c-1234-5678-9012-abcdef123456'; // Reemplazar con la public key real de MercadoPago Venezuela

// VARIABLES GLOBALES
let productos = [];
let carrito = [];
let modoVenta = 'detal'; // 'detal' o 'mayor'
let config = {};

// INICIALIZAR APLICACION
document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando catálogo de perfumes...');

    // Setup event listeners
    setupEventListeners();

    // Cargar productos
    loadProductsFromBackend();
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
async function loadProductsFromBackend() {
    try {
        console.log('Cargando productos desde backend...');

        const response = await fetch('/api/get-sheets-data');

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('Datos recibidos:', data);

        productos = data.productos || [];
        config = data.config || {};

        console.log(`Productos cargados: ${productos.length}`);
        console.log('Configuración:', config);

        // Llenar filtros
        populateFilters();

        // Renderizar productos
        renderProducts();

        // Ocultar loading
        document.getElementById('loading').style.display = 'none';
        document.getElementById('products-container').style.display = 'grid';
        document.getElementById('cart-button').style.display = 'flex';

    } catch (error) {
        console.error('Error cargando productos:', error);
        showError('No se pudo cargar el catálogo. Por favor recarga la página.');
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

    // Filtrar productos
    let filtered = productos.filter(p => p.activo);

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
    const precio = modoVenta === 'mayor' ? producto.precioMayorVES : producto.precioDetalVES;
    const precioUSD = modoVenta === 'mayor' ? producto.precioMayorUSD : producto.precioDetalUSD;
    const tipoLabel = modoVenta === 'mayor' ? 'Mayorista' : 'Minorista';

    const hasStock = producto.stock > 0;
    const stockClass = hasStock ? 'in-stock' : 'out-of-stock';
    const stockText = hasStock ? `En stock: ${producto.stock} unidades` : 'Sin stock';

    const imageUrl = producto.imagenURL || 'https://via.placeholder.com/300x250?text=Sin+Imagen';

    return `
        <div class="product-card" data-upc="${producto.upc}">
            <img src="${imageUrl}" alt="${producto.nombre}" class="product-image"
                 onerror="this.src='https://via.placeholder.com/300x250?text=Sin+Imagen'">

            <div class="product-brand">${producto.marca}</div>
            <div class="product-name">${producto.nombre}</div>
            <div class="product-category">${producto.categoria || 'Sin categoría'}</div>

            <div class="product-prices">
                <div class="price-row">
                    <span class="price-label">${tipoLabel} (VES):</span>
                    <span class="price-value highlight">Bs. ${formatPrice(precio)}</span>
                </div>
                <div class="price-row">
                    <span class="price-label">${tipoLabel} (USD):</span>
                    <span class="price-value">$${formatPrice(precioUSD)}</span>
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
    return parseFloat(price).toLocaleString('es-VE', {
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
        alert('Este producto no tiene stock disponible');
        return;
    }

    // Buscar si ya existe en el carrito
    const itemExistente = carrito.find(item => item.upc === upc && item.modoVenta === modoVenta);

    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        const precio = modoVenta === 'mayor' ? producto.precioMayorVES : producto.precioDetalVES;

        carrito.push({
            upc: producto.upc,
            nombre: producto.nombre,
            marca: producto.marca,
            precio: precio,
            cantidad: 1,
            modoVenta: modoVenta
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

    document.getElementById('cart-count').textContent = totalItems;
    document.getElementById('cart-total').textContent = formatPrice(subtotal);

    // Mostrar/ocultar carrito
    const cartButton = document.getElementById('cart-button');
    cartButton.style.display = totalItems > 0 ? 'flex' : 'none';
}

// CALCULAR TOTALES (SUBTOTAL + FLETE)
function calcularTotales() {
    const subtotal = carrito.reduce((sum, item) => {
        return sum + (item.precio * item.cantidad);
    }, 0);

    const flete = subtotal * 0.10; // 10% del subtotal
    const total = subtotal + flete;

    return { subtotal, flete, total };
}

// ABRIR MODAL DE CHECKOUT
function openCheckoutModal() {
    if (carrito.length === 0) {
        alert('El carrito está vacío');
        return;
    }

    const modal = document.getElementById('checkout-modal');
    const orderSummary = document.getElementById('order-summary');

    const { subtotal, flete, total } = calcularTotales();

    let summaryHTML = '<h3>Resumen del Pedido</h3>';

    // Items del carrito
    carrito.forEach(item => {
        const itemTotal = item.precio * item.cantidad;
        summaryHTML += `
            <div class="summary-item">
                <span>${item.nombre} (x${item.cantidad}) - ${item.modoVenta === 'mayor' ? 'Mayorista' : 'Minorista'}</span>
                <span>Bs. ${formatPrice(itemTotal)}</span>
            </div>
        `;
    });

    // Subtotal
    summaryHTML += `
        <div class="summary-item">
            <span>Subtotal:</span>
            <span>Bs. ${formatPrice(subtotal)}</span>
        </div>
    `;

    // Flete
    summaryHTML += `
        <div class="summary-item">
            <span>Flete (10%):</span>
            <span>Bs. ${formatPrice(flete)}</span>
        </div>
    `;

    // Total
    summaryHTML += `
        <div class="summary-item summary-total">
            <span>TOTAL A PAGAR:</span>
            <span>Bs. ${formatPrice(total)}</span>
        </div>
    `;

    orderSummary.innerHTML = summaryHTML;
    modal.style.display = 'block';
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
    const phone = document.getElementById('customer-phone').value.trim();
    const notes = document.getElementById('customer-notes').value.trim();

    // Validaciones
    if (!name) {
        alert('Por favor ingresa tu nombre');
        return;
    }

    if (!phone) {
        alert('Por favor ingresa tu teléfono');
        return;
    }

    if (carrito.length === 0) {
        alert('El carrito está vacío');
        return;
    }

    const { subtotal, flete, total } = calcularTotales();

    // Construir mensaje de WhatsApp
    let mensaje = `✨ *¡NUEVO PEDIDO DE PERFUMES!* ✨\n`;
    mensaje += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    mensaje += `👤 *DATOS DEL CLIENTE*\n`;
    mensaje += `• Nombre: ${name}\n`;
    mensaje += `• Email: ${email}\n`;
    mensaje += `• Teléfono: ${phone}\n\n`;

    mensaje += `━━━━━━━━━━━━━━━━━━━━━\n`;
    mensaje += `🎁 *PRODUCTOS SOLICITADOS*\n\n`;

    carrito.forEach((item, index) => {
        const tipoVenta = item.modoVenta === 'mayor' ? '📦 Mayorista' : '🛍️ Minorista';
        mensaje += `${index + 1}️⃣ *${item.marca}*\n`;
        mensaje += `   ${item.nombre}\n`;
        mensaje += `   ${tipoVenta} | Cant: ${item.cantidad} unid.\n`;
        mensaje += `   💵 Bs. ${formatPrice(item.precio)} c/u → *Bs. ${formatPrice(item.precio * item.cantidad)}*\n\n`;
    });

    mensaje += `━━━━━━━━━━━━━━━━━━━━━\n`;
    mensaje += `💰 *RESUMEN DE PAGO*\n\n`;
    mensaje += `Subtotal: Bs. ${formatPrice(subtotal)}\n`;
    mensaje += `🚚 Envío (10%): Bs. ${formatPrice(flete)}\n`;
    mensaje += `━━━━━━━━━━━━━━━━━━━━━\n`;
    mensaje += `✅ *TOTAL A PAGAR: Bs. ${formatPrice(total)}*\n`;
    mensaje += `━━━━━━━━━━━━━━━━━━━━━\n`;

    if (notes) {
        mensaje += `\n📝 *Notas adicionales:*\n${notes}\n`;
    }

    mensaje += `\n¡Gracias por tu pedido! 🙏✨`;

    // Codificar mensaje para URL
    const mensajeCodificado = encodeURIComponent(mensaje);
    const whatsappURL = `https://wa.me/${WHATSAPP_NUMBER}?text=${mensajeCodificado}`;

    // Abrir WhatsApp
    window.open(whatsappURL, '_blank');

    // Limpiar carrito y cerrar modal
    carrito = [];
    updateCartUI();
    closeCheckoutModal();

    showToast('Pedido enviado a WhatsApp ✅');
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
            title: `${item.nombre} (${item.modoVenta === 'mayor' ? 'Mayorista' : 'Minorista'})`,
            description: `${item.marca} - ${item.nombre}`,
            quantity: item.cantidad,
            unit_price: item.precio,
            currency_id: 'VES' // Bolívares venezolanos
        }));

        // Agregar flete como item separado
        items.push({
            id: 'flete',
            title: 'Flete (10%)',
            description: 'Costo de envío',
            quantity: 1,
            unit_price: flete,
            currency_id: 'VES'
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
function showError(message) {
    const loading = document.getElementById('loading');
    loading.innerHTML = `
        <h3>Error</h3>
        <p>${message}</p>
        <button class="btn btn-primary" onclick="location.reload()">
            Reintentar
        </button>
    `;
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
