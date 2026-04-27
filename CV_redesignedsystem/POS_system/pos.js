/* 
  ========================================================
  LOGIC: POS System (Creative Vision Redesigned)
  ======================================================== 
*/

// Use 'var' to allow re-declaration when the module is re-loaded via AJAX
var allProducts = allProducts || { accessories: [], reloads: [], cards: [] };
var cart = cart || [];
var currentCategory = currentCategory || 'All';
var searchTerm = searchTerm || '';

/**
 * INITIALIZE
 */
function initPOS() {
    fetchProducts();
    
    // Handle payment method selection UI
    document.querySelectorAll('.method-card input').forEach(input => {
        input.addEventListener('change', () => {
            document.querySelectorAll('.method-card').forEach(card => card.classList.remove('active'));
            input.parentElement.classList.add('active');
        });
    });
}

/**
 * FETCH PRODUCTS FROM API
 */
window.fetchProducts = function() {
    const grid = document.getElementById('product-grid');
    if(!grid) return;

    fetch('../POS_system/pos_api.php?action=get_products')
        .then(res => res.json())
        .then(res => {
            if (res.status === 'success') {
                allProducts = {
                    accessories: res.accessories || [],
                    reloads: res.reloads || [],
                    cards: res.cards || []
                };
                renderProducts();
            } else {
                grid.innerHTML = `<p style="color:red">Error: ${res.message}</p>`;
            }
        })
        .catch(err => {
            console.error(err);
            if(grid) grid.innerHTML = `<p style="color:red">Failed to load products.</p>`;
        });
}

/**
 * RENDER PRODUCTS TO GRID
 */
window.renderProducts = function() {
    const grid = document.getElementById('product-grid');
    if(!grid) return;
    grid.innerHTML = '';
    
    let filtered = [];
    
    if (currentCategory === 'All' || currentCategory === 'Accessory') {
        filtered = filtered.concat(allProducts.accessories.map(p => ({ ...p, type: 'Accessory' })));
    }
    if (currentCategory === 'All' || currentCategory === 'Reload') {
        filtered = filtered.concat(allProducts.reloads.map(p => ({ ...p, type: 'Reload', price: 0, stock: p.stock })));
    }
    if (currentCategory === 'All' || currentCategory === 'Card') {
        filtered = filtered.concat(allProducts.cards.map(p => ({ ...p, type: 'Card', name: `${p.network_name} Rs.${p.denomination}`, price: p.denomination })));
    }
    
    // Filter by search
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (p.barcode && p.barcode.includes(searchTerm))
        );
    }
    
    if (filtered.length === 0) {
        grid.innerHTML = `<div class="loading-spinner">No products found.</div>`;
        return;
    }
    
    filtered.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => addToCart(p);
        
        let imageHtml = `<i class="fa-solid fa-box"></i>`;
        if (p.type === 'Reload') imageHtml = `<i class="fa-solid fa-mobile-screen"></i>`;
        if (p.type === 'Card') imageHtml = `<i class="fa-solid fa-sim-card"></i>`;
        if (p.image_path) imageHtml = `<img src="${p.image_path}" alt="${p.name}">`;
        
        card.innerHTML = `
            <div class="add-indicator"><i class="fa-solid fa-plus"></i></div>
            <div class="product-img">${imageHtml}</div>
            <div class="product-info">
                <h4>${p.name}</h4>
                <p class="price">${p.type === 'Reload' ? 'Custom' : 'Rs.' + parseFloat(p.price).toLocaleString()}</p>
                <p class="stock">${p.type === 'Reload' ? 'Bal: Rs.' + parseFloat(p.stock).toLocaleString() : 'Stock: ' + p.stock}</p>
            </div>
        `;
        grid.appendChild(card);
    });
}

/**
 * FILTER LOGIC
 */
window.filterCategory = function(cat) {
    currentCategory = cat;
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.toggle('active', btn.innerText === (cat === 'Accessory' ? 'Accessories' : cat === 'Card' ? 'SIM/Top-up Cards' : cat === 'Reload' ? 'Reloads' : 'All'));
    });
    renderProducts();
}

window.filterProducts = function() {
    const searchInput = document.getElementById('pos-search');
    searchTerm = searchInput ? searchInput.value : '';
    renderProducts();
}

/**
 * CART MANAGEMENT
 */
window.addToCart = function(product) {
    if (product.type === 'Reload') {
        openReloadModal(product.name);
        return;
    }
    
    const existing = cart.find(item => item.id === product.id && item.type === product.type);
    
    if (existing) {
        if (existing.quantity < product.stock) {
            existing.quantity++;
            existing.subtotal = existing.quantity * existing.price;
        } else {
            alert("Not enough stock!");
        }
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: parseFloat(product.price),
            quantity: 1,
            subtotal: parseFloat(product.price),
            type: product.type
        });
    }
    
    renderCart();
}

window.updateQty = function(index, delta) {
    const item = cart[index];
    item.quantity += delta;
    
    if (item.quantity <= 0) {
        cart.splice(index, 1);
    } else {
        // Check stock if applicable
        let original;
        if (item.type === 'Accessory') original = allProducts.accessories.find(p => p.id === item.id);
        if (item.type === 'Card') original = allProducts.cards.find(p => p.id === item.id);
        
        if (original && item.quantity > original.stock) {
            alert("Not enough stock!");
            item.quantity = original.stock;
        }
        
        item.subtotal = item.quantity * item.price;
    }
    renderCart();
}

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    renderCart();
}

window.clearCart = function() {
    if (confirm("Clear current order?")) {
        cart = [];
        renderCart();
    }
}

window.renderCart = function() {
    const cartList = document.getElementById('cart-items');
    if(!cartList) return;

    if (cart.length === 0) {
        cartList.innerHTML = `
            <div class="empty-cart-msg">
                <i class="fa-solid fa-cart-shopping"></i>
                <p>Cart is empty</p>
            </div>
        `;
        calculateTotal();
        return;
    }
    
    cartList.innerHTML = '';
    cart.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div class="item-meta">
                <h5>${item.name}</h5>
                <span>Rs.${item.price.toLocaleString()}</span>
            </div>
            <div class="item-qty">
                <button onclick="updateQty(${index}, -1)"><i class="fa-solid fa-minus"></i></button>
                <input type="text" value="${item.quantity}" readonly>
                <button onclick="updateQty(${index}, 1)"><i class="fa-solid fa-plus"></i></button>
            </div>
            <div class="item-price">Rs.${item.subtotal.toLocaleString()}</div>
            <div class="remove-item" onclick="removeFromCart(${index})">
                <i class="fa-solid fa-xmark"></i>
            </div>
        `;
        cartList.appendChild(div);
    });
    
    calculateTotal();
}

window.calculateTotal = function() {
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const discInput = document.getElementById('bill-discount');
    const discount = discInput ? (parseFloat(discInput.value) || 0) : 0;
    const total = subtotal - discount;
    
    const subEl = document.getElementById('bill-subtotal');
    const totEl = document.getElementById('bill-total');
    if(subEl) subEl.innerText = `Rs. ${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
    if(totEl) totEl.innerText = `Rs. ${total.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
}

/**
 * RELOAD MODAL LOGIC
 */
window.openReloadModal = function(network) {
    document.getElementById('reload-network').value = network;
    document.getElementById('reload-amount').value = '';
    document.getElementById('reload-modal').classList.add('show');
    setTimeout(() => document.getElementById('reload-amount').focus(), 100);
}

window.closeReloadModal = function() {
    document.getElementById('reload-modal').classList.remove('show');
}

window.addReloadToCart = function() {
    const net = document.getElementById('reload-network').value;
    const amt = parseFloat(document.getElementById('reload-amount').value);
    
    if (!amt || amt <= 0) {
        alert("Please enter a valid amount.");
        return;
    }
    
    // Check balance
    const original = allProducts.reloads.find(p => p.name === net);
    if (original && amt > original.stock) {
        alert(`Insufficient balance! Available: Rs.${original.stock}`);
        return;
    }
    
    cart.push({
        id: net, 
        name: `${net} Reload`,
        price: amt,
        quantity: 1,
        subtotal: amt,
        type: 'Reload'
    });
    
    renderCart();
    closeReloadModal();
}

/**
 * CHECKOUT
 */
window.processCheckout = function() {
    if (cart.length === 0) {
        alert("Cart is empty!");
        return;
    }
    
    const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
    const discInput = document.getElementById('bill-discount');
    const discount = discInput ? (parseFloat(discInput.value) || 0) : 0;
    const total = subtotal - discount;
    const methodInput = document.querySelector('input[name="payment-method"]:checked');
    const method = methodInput ? methodInput.value : 'Cash';
    
    const btn = document.getElementById('checkout-btn');
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin"></i> PROCESSING...`;
    
    const formData = new FormData();
    formData.append('action', 'process_sale');
    formData.append('total_amount', subtotal);
    formData.append('discount', discount);
    formData.append('payable_amount', total);
    formData.append('payment_method', method);
    formData.append('items', JSON.stringify(cart));
    formData.append('customer_name', 'Walking Customer');
    
    fetch('../POS_system/pos_api.php', {
        method: 'POST',
        body: formData
    })
    .then(res => res.json())
    .then(res => {
        if (res.status === 'success') {
            alert("Sale completed successfully!");
            printReceipt(res.sale_id);
            cart = [];
            renderCart();
            fetchProducts(); 
        } else {
            alert("Error: " + res.message);
        }
    })
    .catch(err => {
        console.error(err);
        alert("Checkout failed. Check console.");
    })
    .finally(() => {
        btn.disabled = false;
        btn.innerHTML = originalContent;
    });
}

window.printReceipt = function(saleId) {
    console.log("Printing receipt for Sale ID:", saleId);
}

// Run init
initPOS();
