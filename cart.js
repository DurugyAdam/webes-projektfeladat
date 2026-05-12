// ============================================================
//  cart.js – Mozifoglaló kosár logika
//  Minden oldalon betöltődik ahol kosár funkció kell
// ============================================================

// ── Kosár adatok ──────────────────────────────────────────────
function getCart() {
    const c = localStorage.getItem("mozi_cart");
    return c ? JSON.parse(c) : [];
}
function saveCart(cart) {
    localStorage.setItem("mozi_cart", JSON.stringify(cart));
}
function clearCart() {
    localStorage.removeItem("mozi_cart");
}

function addToCart(id, nev, ar) {
    const cart = getCart();
    const meglevo = cart.find(i => i.id === id);
    if (meglevo) {
        meglevo.mennyiseg++;
    } else {
        cart.push({ id, nev, ar, mennyiseg: 1 });
    }
    saveCart(cart);
    updateCartBadge();
}

function removeFromCart(id) {
    const cart = getCart();
    const meglevo = cart.find(i => i.id === id);
    if (!meglevo) return;
    if (meglevo.mennyiseg > 1) {
        meglevo.mennyiseg--;
    } else {
        cart.splice(cart.indexOf(meglevo), 1);
    }
    saveCart(cart);
    updateCartBadge();
}

function cartTotal() {
    return getCart().reduce((sum, i) => sum + i.ar * i.mennyiseg, 0);
}

function cartCount() {
    return getCart().reduce((sum, i) => sum + i.mennyiseg, 0);
}

// ── Kosár badge frissítése a navbarban ───────────────────────
function updateCartBadge() {
    const badge = document.getElementById("cartBadge");
    if (!badge) return;
    const count = cartCount();
    badge.textContent = count;
    badge.classList.toggle("hidden", count === 0);
}

// ── +/− gombok bekötése az étel oldalon ──────────────────────
function wireFoodControls() {
    document.querySelectorAll(".food-controls").forEach(ctrl => {
        const id  = parseInt(ctrl.dataset.id);
        const nev = ctrl.dataset.nev;
        const ar  = parseInt(ctrl.dataset.ar);
        const display = ctrl.querySelector(".qty-display");

        // Kosárból visszatöltjük az aktuális mennyiséget
        const cart = getCart();
        const meglevo = cart.find(i => i.id === id);
        if (meglevo) display.textContent = meglevo.mennyiseg;

        ctrl.querySelector(".plus").addEventListener("click", () => {
            addToCart(id, nev, ar);
            const c = getCart().find(i => i.id === id);
            display.textContent = c ? c.mennyiseg : 0;
        });

        ctrl.querySelector(".minus").addEventListener("click", () => {
            removeFromCart(id);
            const c = getCart().find(i => i.id === id);
            display.textContent = c ? c.mennyiseg : 0;
        });
    });
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    updateCartBadge();
    wireFoodControls();
});