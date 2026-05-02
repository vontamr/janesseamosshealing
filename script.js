let cart = [];

function loadCart() {
    const saved = localStorage.getItem('janesseCart');
    cart = saved ? JSON.parse(saved) : [];
}

function saveCart() {
    localStorage.setItem('janesseCart', JSON.stringify(cart));
}

function calculateTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
}

function addToCart(item) {
    const existing = cart.findIndex(i => i.id === item.id);
    if (existing > -1) {
        cart[existing].qty += (item.qty || 1);
    } else {
        cart.push({ ...item, qty: item.qty || 1 });
    }
    saveCart();
    updateCartUI();
    showToast(`🌿 ${item.name} added to your basket`);
}

function removeFromCart(id) {
    cart = cart.filter(i => i.id !== id);
    saveCart();
    updateCartUI();
}

function updateQuantity(id, change) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.qty = Math.max(1, item.qty + change);
        saveCart();
        updateCartUI();
    }
}

function updateCartUI() {
    const countEl = document.getElementById('cart-count');
    const viewCartBtn = document.getElementById('view-cart-btn');
    
    const totalItems = cart.reduce((sum, i) => sum + i.qty, 0);
    
    if (countEl) countEl.textContent = totalItems;
    
    if (viewCartBtn) {
        if (totalItems > 0) {
            viewCartBtn.classList.remove('hidden');
            viewCartBtn.classList.add('flex');
        } else {
            viewCartBtn.classList.add('hidden');
            viewCartBtn.classList.remove('flex');
        }
    }
    
    // Update modal if open
    const modal = document.getElementById('cart-modal');
    if (modal && !modal.classList.contains('hidden')) {
        renderCartModal();
    }
}

function renderCartModal() {
    const container = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');
    if (!container || !totalEl) return;

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-400">
                <div class="text-6xl mb-4">🌊</div>
                <p>Your wellness basket is empty</p>
            </div>
        `;
        totalEl.textContent = '$0.00';
        return;
    }

    let html = '';
    cart.forEach(item => {
        html += `
            <div class="flex gap-4 py-6 border-b">
                <div class="flex-1">
                    <p class="font-medium">${item.name}</p>
                    ${item.details ? `<p class="text-xs text-purple">${item.details}</p>` : ''}
                    <p class="text-sm text-gray-500">$${item.price} × ${item.qty}</p>
                </div>
                <div class="text-right">
                    <p class="font-semibold">$${(item.price * item.qty).toFixed(2)}</p>
                    <div class="flex items-center gap-3 mt-3 justify-end">
                        <button onclick="updateQuantity('${item.id}', -1)" class="w-7 h-7 border border-purple/30 rounded-xl hover:bg-purple/5">-</button>
                        <span class="w-6 text-center">${item.qty}</span>
                        <button onclick="updateQuantity('${item.id}', 1)" class="w-7 h-7 border border-purple/30 rounded-xl hover:bg-purple/5">+</button>
                    </div>
                    <button onclick="removeFromCart('${item.id}'); renderCartModal();" class="text-red-400 text-xs mt-4 hover:text-red-600">Remove</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    totalEl.textContent = '$' + calculateTotal().toFixed(2);
}

function showCartModal() {
    const modal = document.getElementById('cart-modal');
    if (modal) {
        modal.classList.remove('hidden');
        renderCartModal();
    }
}

function hideCartModal() {
    const modal = document.getElementById('cart-modal');
    if (modal) modal.classList.add('hidden');
}

async function proceedToCheckout() {
    hideCartModal();
    const total = calculateTotal();
    if (total <= 0) {
        alert("🌿 Your wellness basket is empty!");
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart: cart })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Payment error');

        const stripe = Stripe('pk_live_51TREXTIeLXeJ9tb9RCUiY0hHSBBY5hbqPfwgnVpyUDS0nAYTgwhls3y2ffClfgUu7ZJjVPDVpr6tPZZWNBKcec8Q00BbSr1yQc');
        await stripe.redirectToCheckout({ sessionId: data.id });

    } catch (error) {
        console.error(error);
        alert("⚠️ Unable to connect to payment. Make sure backend is running.");
    }
}

function showToast(msg) {
    let toast = document.getElementById('global-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'global-toast';
        toast.className = 'fixed bottom-6 right-6 bg-deep text-white px-8 py-4 rounded-3xl shadow-2xl z-[9999] text-sm';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2800);
}

window.addEventListener('load', () => {
    loadCart();
    updateCartUI();
});