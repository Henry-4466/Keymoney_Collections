/* ═══════════════════════════════════════════════════════════
   KEYMONEYS COLLECTION — script.js  (FIXED)
   • Always reads products from products.json (source of truth)
   • Normalises missing fields so admin products display correctly
   • Resolves image paths from the images/ folder
═══════════════════════════════════════════════════════════ */

// ─── CONFIGURATION ───────────────────────────────────────
const CONFIG = {
  OWNER_WHATSAPP: "254799936052",
  SHOP_NAME: "KEYMONEYS COLLECTION",
  CURRENCY: "KES",
  CAROUSEL_INTERVAL: 4500,
  PRODUCTS_PER_LOAD: 8,
};

// ─── REVIEWS ─────────────────────────────────────────────
const REVIEWS = [
  { name: "Brian K.", location: "Nairobi CBD", rating: 5, text: "Received my Nike Air Max in 2 days. Authentic quality, exactly as described. Will definitely order again!", initials: "BK" },
  { name: "Amina W.", location: "Westlands", rating: 5, text: "The Adidas Ultra Boost fits perfectly. Keymoneys confirmed availability super fast and delivery was smooth.", initials: "AW" },
  { name: "Dennis M.", location: "Thika", rating: 5, text: "Got the Jordan 1s as a gift for my son. He loves them! Great packaging and very responsive on WhatsApp.", initials: "DM" },
  { name: "Fatuma H.", location: "Mombasa", rating: 4, text: "Wide selection of sneakers. Ordered the Blazer Mid — quality is premium and price is fair. Highly recommend.", initials: "FH" },
  { name: "Peter N.", location: "Kisumu", rating: 5, text: "Fast shipping even to Kisumu! The Timberlands are genuine. Best online shoe store I've found in Kenya.", initials: "PN" },
  { name: "Grace A.", location: "Karen", rating: 5, text: "Ordered the Vans Old Skool for my daughter. Arrived quickly, perfect size. The whole process was so easy!", initials: "GA" },
];

// ─── GLOBAL STATE ─────────────────────────────────────────
let allProducts = [];
let filteredProducts = [];
let cart = JSON.parse(localStorage.getItem("kc_cart") || "[]");
let wishlist = JSON.parse(localStorage.getItem("kc_wishlist") || "[]");
let currentFilter = "All";
let currentSort = "default";
let currentMaxPrice = 99999;
let searchQuery = "";
let carouselIndex = 0;
let carouselAutoPlay = null;
let statsAnimated = false;
let productsShowing = 0;

// ─── IMAGE PATH RESOLVER ──────────────────────────────────
// Ensures bare filenames resolve to images/ folder.
// Full URLs (http/https) and already-pathed filenames are kept as-is.
function resolveImagePath(imagePath) {
  if (!imagePath) return "images/placeholder.jpg";
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  if (imagePath.includes("/")) return imagePath;
  return "images/" + imagePath;
}

// ─── PRODUCT NORMALISER ───────────────────────────────────
// Fills in any fields that the admin panel might not save,
// so the storefront never crashes on missing keys.
function normalizeProduct(p) {
  return {
    reviewCount: 0,
    badge: null,
    originalPrice: null,
    color: "",
    sizes: [],
    featured: false,
    rating: 4.5,
    available: true,
    description: "",
    ...p,
    image: resolveImagePath(p.image),
  };
}

// ─── LOAD PRODUCTS ────────────────────────────────────────
// products.json (root) is always the source of truth.
// localStorage is only a fallback if the file can't be fetched.
async function loadProducts() {
  console.log("=== LOADING PRODUCTS ===");

  // Always clear the old shared-cache key so stale data never wins
  localStorage.removeItem("kc_shared_products");

  const URLS = [
    "products.json",                              // root (GitHub Pages serves this)
    "KEYMONEYS_COLLECTION_products.json",         // alternate root name
  ];

  try {
    for (const url of URLS) {
      try {
        const res = await fetch(url + "?_=" + Date.now());
        if (!res.ok) continue;
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          console.log(`✅ Loaded ${data.length} products from ${url}`);
          const normalized = data.map(normalizeProduct);
          localStorage.setItem("KEYMONEYS_products", JSON.stringify(normalized));
          return normalized;
        }
      } catch (_) { /* try next URL */ }
    }

    // Fallback: use cached copy if files are unreachable (e.g. offline)
    const cached = localStorage.getItem("KEYMONEYS_products");
    if (cached) {
      const data = JSON.parse(cached);
      if (Array.isArray(data) && data.length > 0) {
        console.warn("⚠️ Using localStorage cache — JSON files unreachable:", data.length, "products");
        return data.map(normalizeProduct);
      }
    }

    console.warn("⚠️ No products found — showing defaults");
    return getDefaultProducts();

  } catch (err) {
    console.error("Fatal error loading products:", err);
    try {
      const cached = localStorage.getItem("KEYMONEYS_products");
      if (cached) {
        const data = JSON.parse(cached);
        if (Array.isArray(data) && data.length > 0) return data.map(normalizeProduct);
      }
    } catch (_) {}
    return getDefaultProducts();
  }
}

// ─── DEFAULT PRODUCTS (last resort only) ─────────────────
function getDefaultProducts() {
  return [
    { id: 1, name: "Nike Air Max 270", price: 8500, category: "Sneakers", sizes: [39,40,41,42,43,44], stock: 12, available: true, featured: true, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300", description: "Premium comfort sneaker with Air Max technology", rating: 4.8, reviewCount: 124, color: "Red/White" },
    { id: 2, name: "Adidas Ultra Boost", price: 9200, category: "Running", sizes: [38,39,40,41,42,43], stock: 8, available: true, featured: true, image: "https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=300", description: "Responsive cushioning for ultimate running comfort", rating: 4.9, reviewCount: 89, color: "Black/White" },
    { id: 3, name: "Jordan 1 Retro High", price: 12000, category: "Basketball", sizes: [40,41,42,43,44,45], stock: 5, available: true, featured: true, image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=300", description: "Iconic Jordan silhouette with premium leather", rating: 5.0, reviewCount: 256, color: "Chicago Red" },
  ];
}

// ─── LOADING SCREEN ───────────────────────────────────────
(function initLoadingScreen() {
  const screen = document.getElementById("loading-screen");
  const bar = document.getElementById("loading-bar");
  const txt = document.getElementById("loading-text");
  if (!screen) return;
  const messages = ["Loading inventory...", "Fetching premium kicks...", "Initializing store...", "Almost ready..."];
  let progress = 0, msgIdx = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 22 + 8;
    if (progress > 100) progress = 100;
    bar.style.width = progress + "%";
    txt.textContent = messages[Math.min(msgIdx++, messages.length - 1)];
    if (progress >= 100) {
      clearInterval(interval);
      setTimeout(() => { screen.classList.add("fade-out"); document.body.style.overflow = ""; }, 400);
    }
  }, 280);
  document.body.style.overflow = "hidden";
})();

// ─── DOM READY ────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  initParticles();
  initNavbar();
  initMobileMenu();
  initSearch();
  initCartPanel();
  initWishlistModal();
  initQuickViewModal();
  initCheckoutModal();
  initScrollReveal();
  initBackToTop();
  initWhatsAppLinks();
  renderReviews();
  setFooterYear();

  allProducts = await loadProducts();
  console.log("=== FINAL PRODUCTS LOADED:", allProducts.length, "===");

  filteredProducts = [...allProducts];
  renderCarousel();
  renderProducts();
  initFilters();
  initStatsObserver();
  updateCartUI();
  updateWishlistCount();
});

// ─── PARTICLE SYSTEM ──────────────────────────────────────
function initParticles() {
  const canvas = document.getElementById("particles-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H, particles = [];
  function resize() { W = canvas.width = canvas.offsetWidth; H = canvas.height = canvas.offsetHeight; }
  resize();
  window.addEventListener("resize", resize);
  const COUNT = window.innerWidth < 600 ? 40 : 80;
  for (let i = 0; i < COUNT; i++) {
    particles.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 2 + 0.5, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, a: Math.random() * 0.6 + 0.1, color: Math.random() > 0.6 ? "0,153,255" : "0,255,102" });
  }
  let mouse = { x: -9999, y: -9999 };
  canvas.addEventListener("mousemove", e => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
  canvas.addEventListener("mouseleave", () => { mouse.x = -9999; mouse.y = -9999; });
  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      const dx = p.x - mouse.x, dy = p.y - mouse.y, dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 80) { p.x += (dx/dist)*1.5; p.y += (dy/dist)*1.5; }
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${p.color},${p.a})`; ctx.fill();
      for (let j = i+1; j < particles.length; j++) {
        const q = particles[j], ex = p.x-q.x, ey = p.y-q.y, ed = Math.sqrt(ex*ex+ey*ey);
        if (ed < 100) { ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(q.x,q.y); ctx.strokeStyle=`rgba(0,255,102,${(1-ed/100)*0.12})`; ctx.lineWidth=0.5; ctx.stroke(); }
      }
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// ─── NAVBAR ───────────────────────────────────────────────
function initNavbar() {
  const navbar = document.getElementById("navbar");
  const navLinks = document.querySelectorAll(".nav-link[href^='#']");
  const sections = document.querySelectorAll("section[id]");
  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 50);
    let current = "";
    sections.forEach(s => { if (window.scrollY >= s.offsetTop - 120) current = s.id; });
    navLinks.forEach(a => { a.classList.toggle("active", a.getAttribute("href") === "#" + current); });
  }, { passive: true });
}

// ─── MOBILE MENU ─────────────────────────────────────────
function initMobileMenu() {
  const ham = document.getElementById("hamburger");
  const overlay = document.getElementById("mobile-menu-overlay");
  if (!ham || !overlay) return;
  const links = [
    { href: "#home", text: "HOME" }, { href: "#shop", text: "ALL SHOES" },
    { href: "#featured", text: "FEATURED" }, { href: "#reviews", text: "REVIEWS" }
  ];
  overlay.innerHTML = links.map(l => `<a href="${l.href}" class="nav-link">${l.text}</a>`).join("") + `<a href="#" id="mobile-help" class="nav-link">HELP (WhatsApp)</a>`;
  function toggleMenu(open) { ham.classList.toggle("open", open); overlay.classList.toggle("open", open); ham.setAttribute("aria-expanded", open); document.body.style.overflow = open ? "hidden" : ""; }
  ham.addEventListener("click", () => toggleMenu(!overlay.classList.contains("open")));
  overlay.querySelectorAll(".nav-link").forEach(a => { a.addEventListener("click", () => toggleMenu(false)); });
  const mobileHelp = document.getElementById("mobile-help");
  if (mobileHelp) mobileHelp.addEventListener("click", e => { e.preventDefault(); openWhatsApp("Hi! I need help with an order."); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && overlay.classList.contains("open")) toggleMenu(false); });
}

// ─── SEARCH ───────────────────────────────────────────────
function initSearch() {
  const toggle = document.getElementById("search-toggle");
  const input = document.getElementById("nav-search");
  if (!toggle || !input) return;
  toggle.addEventListener("click", () => {
    input.classList.toggle("open");
    if (input.classList.contains("open")) input.focus();
    else { input.value = ""; searchQuery = ""; applyFilters(); }
  });
  input.addEventListener("input", () => { searchQuery = input.value.trim().toLowerCase(); applyFilters(); });
  input.addEventListener("keydown", e => { if (e.key === "Escape") { input.classList.remove("open"); input.value = ""; searchQuery = ""; applyFilters(); } });
}

// ─── RENDER CAROUSEL ─────────────────────────────────────
function renderCarousel() {
  const track = document.getElementById("carousel-track");
  const dotsWrap = document.getElementById("carousel-dots");
  const prevBtn = document.getElementById("carousel-prev");
  const nextBtn = document.getElementById("carousel-next");
  if (!track) return;
  const featured = allProducts.filter(p => p.featured);
  if (!featured.length) { document.getElementById("featured")?.classList.add("hidden"); return; }
  track.innerHTML = featured.map(p => buildProductCardHTML(p)).join("");
  attachCardEvents(track);
  dotsWrap.innerHTML = featured.map((_, i) => `<button class="carousel-dot${i===0?' active':''}" data-idx="${i}" aria-label="Slide ${i+1}"></button>`).join("");
  const cardW = () => (track.querySelector(".product-card")?.offsetWidth || 290) + 20;
  function goTo(idx) {
    const max = featured.length - 1;
    carouselIndex = Math.max(0, Math.min(idx, max));
    track.style.transform = `translateX(-${carouselIndex * cardW()}px)`;
    dotsWrap.querySelectorAll(".carousel-dot").forEach((d, i) => d.classList.toggle("active", i === carouselIndex));
    prevBtn.disabled = carouselIndex === 0; nextBtn.disabled = carouselIndex === max;
  }
  prevBtn.addEventListener("click", () => { goTo(carouselIndex - 1); resetAutoPlay(); });
  nextBtn.addEventListener("click", () => { goTo(carouselIndex + 1); resetAutoPlay(); });
  dotsWrap.addEventListener("click", e => { const idx = parseInt(e.target.dataset.idx); if (!isNaN(idx)) { goTo(idx); resetAutoPlay(); } });
  let touchStartX = 0;
  track.addEventListener("touchstart", e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener("touchend", e => { const diff = touchStartX - e.changedTouches[0].clientX; if (Math.abs(diff) > 50) goTo(carouselIndex + (diff > 0 ? 1 : -1)); });
  goTo(0);
  function resetAutoPlay() {
    if (!CONFIG.CAROUSEL_INTERVAL) return;
    clearInterval(carouselAutoPlay);
    carouselAutoPlay = setInterval(() => goTo((carouselIndex + 1) % featured.length), CONFIG.CAROUSEL_INTERVAL);
  }
  if (CONFIG.CAROUSEL_INTERVAL) resetAutoPlay();
  window.addEventListener("resize", () => goTo(carouselIndex));
}

// ─── BUILD PRODUCT CARD HTML ──────────────────────────────
function buildProductCardHTML(p) {
  const isFav = wishlist.some(w => w.id === p.id);
  const badge = p.badge ? `<span class="card-badge badge-${p.badge.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z-]/g,'')}">${p.badge}</span>` : "";
  const discount = p.originalPrice ? Math.round((1 - p.price / p.originalPrice) * 100) : 0;
  const sizes = (p.sizes || []).slice(0, 5).map(s => `<span class="size-chip" data-size="${s}" data-pid="${p.id}">${s}</span>`).join("");
  const stars = "★".repeat(Math.round(p.rating || 5)) + "☆".repeat(5 - Math.round(p.rating || 5));
  const imgSrc = resolveImagePath(p.image);
  return `
    <article class="product-card" data-id="${p.id}" tabindex="0" role="button" aria-label="${p.name}">
      <div class="card-image-wrap">
        ${badge}
        <button class="card-wish-btn${isFav?' active':''}" data-pid="${p.id}" aria-label="Toggle wishlist">❤</button>
        <img src="${imgSrc}" alt="${p.name}" loading="lazy"
          onerror="this.onerror=null;this.src='images/placeholder.jpg';this.onerror=function(){this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=60'}" />
        <div class="card-actions-overlay">
          <button class="card-quick-view" data-pid="${p.id}">QUICK VIEW</button>
        </div>
        ${discount > 0 ? `<div style="position:absolute;bottom:10px;left:10px;background:rgba(255,51,85,0.9);color:#fff;font-family:'Orbitron',sans-serif;font-size:9px;font-weight:700;padding:4px 8px;border-radius:4px;">-${discount}%</div>` : ""}
      </div>
      <div class="card-body">
        <div class="card-category">${p.category || ""}</div>
        <div class="card-name">${p.name}</div>
        <div class="card-price-row">
          <span class="card-price">${CONFIG.CURRENCY} ${p.price.toLocaleString()}</span>
          ${p.originalPrice ? `<span class="card-orig-price">${CONFIG.CURRENCY} ${p.originalPrice.toLocaleString()}</span>` : ""}
        </div>
        <div class="card-rating"><span class="stars">${stars}</span><span>(${p.reviewCount || 0})</span></div>
        <div class="card-sizes">${sizes}</div>
        <span class="card-avail avail-${p.available}">${p.available ? "✓ In Stock" : "✗ Out of Stock"}</span>
        <button class="btn-add-cart" data-pid="${p.id}"${!p.available?' disabled':''}>+ ADD TO CART</button>
      </div>
    </article>
  `;
}

// ─── RENDER PRODUCTS GRID ─────────────────────────────────
function renderProducts(reset = true) {
  const grid = document.getElementById("products-grid");
  const noRes = document.getElementById("no-results");
  const countEl = document.getElementById("results-count");
  if (!grid) return;
  if (reset) { grid.innerHTML = ""; productsShowing = 0; }
  const slice = filteredProducts.slice(productsShowing, productsShowing + CONFIG.PRODUCTS_PER_LOAD);
  productsShowing += slice.length;
  if (!filteredProducts.length) { noRes.classList.remove("hidden"); countEl.textContent = "No products found"; return; }
  noRes.classList.add("hidden");
  countEl.textContent = `Showing ${Math.min(productsShowing, filteredProducts.length)} of ${filteredProducts.length} product${filteredProducts.length !== 1 ? "s" : ""}`;
  const frag = document.createDocumentFragment();
  slice.forEach((p, i) => {
    const div = document.createElement("div");
    div.innerHTML = buildProductCardHTML(p);
    const card = div.firstElementChild;
    card.style.animationDelay = (i * 60) + "ms";
    card.style.animation = "fade-up 0.5s ease both";
    frag.appendChild(card);
  });
  grid.appendChild(frag);
  attachCardEvents(grid);
}

// ─── ATTACH CARD EVENTS ───────────────────────────────────
function attachCardEvents(container) {
  container.addEventListener("click", e => {
    const btn = e.target.closest(".btn-add-cart");
    const quickV = e.target.closest(".card-quick-view");
    const wishBtn = e.target.closest(".card-wish-btn");
    const sizeChip = e.target.closest(".size-chip");
    if (btn) { e.stopPropagation(); const pid = parseInt(btn.dataset.pid); const card = btn.closest(".product-card"); const selSize = card?.querySelector(".size-chip.selected")?.dataset.size || null; addToCart(pid, 1, selSize); return; }
    if (quickV) { e.stopPropagation(); openQuickView(parseInt(quickV.dataset.pid)); return; }
    if (wishBtn) { e.stopPropagation(); toggleWishlist(parseInt(wishBtn.dataset.pid)); wishBtn.classList.toggle("active", wishlist.some(w => w.id === parseInt(wishBtn.dataset.pid))); return; }
    if (sizeChip) { e.stopPropagation(); const pid = sizeChip.dataset.pid; const card = sizeChip.closest(".product-card"); card.querySelectorAll(`.size-chip[data-pid="${pid}"]`).forEach(c => c.classList.remove("selected")); sizeChip.classList.add("selected"); return; }
    const card = e.target.closest(".product-card");
    if (card) { const pid = parseInt(card.dataset.id); if (pid) openQuickView(pid); }
  });
}

// ─── FILTERS ─────────────────────────────────────────────
function initFilters() {
  document.querySelectorAll(".filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      currentFilter = btn.dataset.filter;
      applyFilters();
    });
  });
  const priceRange = document.getElementById("price-range");
  const priceLabel = document.getElementById("price-label");
  if (priceRange) {
    const maxPrice = Math.max(...allProducts.map(p => p.price), 15000);
    priceRange.max = maxPrice + 500;
    priceRange.value = priceRange.max;
    priceLabel.textContent = Number(priceRange.max).toLocaleString();
    currentMaxPrice = Number(priceRange.max);
    priceRange.addEventListener("input", () => { currentMaxPrice = parseInt(priceRange.value); priceLabel.textContent = currentMaxPrice.toLocaleString(); applyFilters(); });
  }
  const sortSel = document.getElementById("sort-select");
  if (sortSel) sortSel.addEventListener("change", () => { currentSort = sortSel.value; applyFilters(); });
}

function applyFilters() {
  let result = [...allProducts];
  if (currentFilter !== "All") result = result.filter(p => p.category === currentFilter);
  result = result.filter(p => p.price <= currentMaxPrice);
  if (searchQuery) result = result.filter(p => p.name.toLowerCase().includes(searchQuery) || (p.category || "").toLowerCase().includes(searchQuery) || (p.color || "").toLowerCase().includes(searchQuery));
  switch (currentSort) {
    case "price-asc": result.sort((a, b) => a.price - b.price); break;
    case "price-desc": result.sort((a, b) => b.price - a.price); break;
    case "rating": result.sort((a, b) => (b.rating||0) - (a.rating||0)); break;
    case "name": result.sort((a, b) => a.name.localeCompare(b.name)); break;
  }
  filteredProducts = result;
  renderProducts(true);
  if (currentFilter !== "All" || searchQuery) document.getElementById("shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

window.resetFilters = function() {
  currentFilter = "All"; currentSort = "default"; searchQuery = ""; currentMaxPrice = 99999;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b.dataset.filter === "All"));
  const priceRange = document.getElementById("price-range");
  if (priceRange) { priceRange.value = priceRange.max; document.getElementById("price-label").textContent = Number(priceRange.max).toLocaleString(); }
  const sortSel = document.getElementById("sort-select"); if (sortSel) sortSel.value = "default";
  const input = document.getElementById("nav-search"); if (input) { input.value = ""; input.classList.remove("open"); }
  applyFilters();
};

window.filterByCategory = function(cat) {
  currentFilter = cat;
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b.dataset.filter === cat));
  applyFilters();
};

// ─── CART ─────────────────────────────────────────────────
function addToCart(productId, qty = 1, size = null) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;
  if (!product.available) { showToast("❌ This item is out of stock", "error"); return; }
  const key = `${productId}_${size || "default"}`;
  const existing = cart.find(i => i.key === key);
  if (existing) { existing.qty += qty; showToast(`🛒 ${product.name} quantity updated`, "success"); }
  else { cart.push({ key, id: productId, name: product.name, price: product.price, image: resolveImagePath(product.image), size, qty }); showToast(`✅ ${product.name} added to cart!`, "success"); }
  saveCart(); updateCartUI();
  const cartBtn = document.getElementById("cart-toggle");
  if (cartBtn) { cartBtn.style.transform = "scale(1.3)"; setTimeout(() => cartBtn.style.transform = "", 300); }
}

function removeFromCart(key) { cart = cart.filter(i => i.key !== key); saveCart(); updateCartUI(); showToast("🗑️ Item removed from cart", "info"); }
function updateCartQty(key, delta) { const item = cart.find(i => i.key === key); if (!item) return; item.qty = Math.max(1, item.qty + delta); saveCart(); updateCartUI(); }
function clearCart() { if (!cart.length) return; cart = []; saveCart(); updateCartUI(); showToast("🧹 Cart cleared", "info"); }
function saveCart() { localStorage.setItem("kc_cart", JSON.stringify(cart)); }
function cartTotal() { return cart.reduce((sum, i) => sum + i.price * i.qty, 0); }

function updateCartUI() {
  const count = cart.reduce((n, i) => n + i.qty, 0);
  document.getElementById("cart-count").textContent = count;
  const total = cartTotal();
  document.getElementById("cart-subtotal").textContent = `${CONFIG.CURRENCY} ${total.toLocaleString()}`;
  document.getElementById("cart-total-amount").textContent = `${CONFIG.CURRENCY} ${total.toLocaleString()}`;
  const itemsWrap = document.getElementById("cart-items");
  const footer = document.getElementById("cart-footer");
  const empty = document.getElementById("cart-empty");
  if (!cart.length) { itemsWrap.innerHTML = ""; itemsWrap.appendChild(empty); empty.classList.remove("hidden"); footer.style.display = "none"; return; }
  footer.style.display = "";
  empty.classList.add("hidden");
  itemsWrap.innerHTML = cart.map(item => `
    <div class="cart-item" data-key="${item.key}">
      <img class="cart-item-img" src="${item.image}" alt="${item.name}"
        onerror="this.onerror=null;this.src='images/placeholder.jpg';this.onerror=function(){this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=60'}" />
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-size">Size: ${item.size || "N/A"}</div>
        <div class="cart-item-price">${CONFIG.CURRENCY} ${(item.price * item.qty).toLocaleString()}</div>
        <div class="cart-item-controls">
          <button class="qty-btn" data-key="${item.key}" data-delta="-1" aria-label="Decrease">−</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn" data-key="${item.key}" data-delta="1" aria-label="Increase">+</button>
          <button class="cart-item-remove" data-key="${item.key}" aria-label="Remove item">×</button>
        </div>
      </div>
    </div>
  `).join("");
}

function initCartPanel() {
  const toggle = document.getElementById("cart-toggle");
  const panel = document.getElementById("cart-panel");
  const overlay = document.getElementById("cart-overlay");
  const closeBtn = document.getElementById("cart-close");
  const shopLink = document.getElementById("cart-shop-link");
  const clearBtn = document.getElementById("clear-cart-btn");
  const checkoutBtn = document.getElementById("checkout-btn");
  function open() { panel.classList.add("open"); overlay.classList.add("active"); document.body.style.overflow = "hidden"; panel.setAttribute("aria-hidden", "false"); }
  function close() { panel.classList.remove("open"); overlay.classList.remove("active"); document.body.style.overflow = ""; panel.setAttribute("aria-hidden", "true"); }
  toggle?.addEventListener("click", () => panel.classList.contains("open") ? close() : open());
  closeBtn?.addEventListener("click", close);
  overlay?.addEventListener("click", close);
  shopLink?.addEventListener("click", close);
  clearBtn?.addEventListener("click", clearCart);
  checkoutBtn?.addEventListener("click", () => { close(); openCheckout(); });
  document.getElementById("cart-items")?.addEventListener("click", e => {
    const qtyBtn = e.target.closest(".qty-btn");
    const remBtn = e.target.closest(".cart-item-remove");
    if (qtyBtn) updateCartQty(qtyBtn.dataset.key, parseInt(qtyBtn.dataset.delta));
    if (remBtn) removeFromCart(remBtn.dataset.key);
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && panel.classList.contains("open")) close(); });
}

// ─── WISHLIST ─────────────────────────────────────────────
function toggleWishlist(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;
  const idx = wishlist.findIndex(w => w.id === productId);
  if (idx >= 0) { wishlist.splice(idx, 1); showToast("💔 Removed from wishlist", "info"); }
  else { wishlist.push({ id: productId, name: product.name, price: product.price, image: resolveImagePath(product.image) }); showToast("❤️ Added to wishlist!", "success"); }
  localStorage.setItem("kc_wishlist", JSON.stringify(wishlist));
  updateWishlistCount();
  updateWishlistModal();
}

function updateWishlistCount() { document.getElementById("wishlist-count").textContent = wishlist.length; }

function updateWishlistModal() {
  const wrap = document.getElementById("wishlist-items");
  if (!wrap) return;
  if (!wishlist.length) { wrap.innerHTML = `<div class="wishlist-empty"><p style="font-size:40px">💔</p><p>Your wishlist is empty</p></div>`; return; }
  wrap.innerHTML = wishlist.map(item => `
    <div class="wishlist-item">
      <img src="${item.image}" alt="${item.name}"
        onerror="this.onerror=null;this.src='images/placeholder.jpg';this.onerror=function(){this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=60'}"/>
      <div class="wishlist-item-info">
        <div class="wishlist-item-name">${item.name}</div>
        <div class="wishlist-item-price">${CONFIG.CURRENCY} ${item.price.toLocaleString()}</div>
        <button class="btn-primary" style="margin-top:8px;padding:8px 16px;font-size:10px;" onclick="addToCart(${item.id},1,null)">Add to Cart</button>
      </div>
      <button class="btn-remove-wish" data-id="${item.id}" aria-label="Remove from wishlist">×</button>
    </div>
  `).join("");
}

function initWishlistModal() {
  const btn = document.getElementById("wishlist-btn");
  const modal = document.getElementById("wishlist-modal");
  const overlay = document.getElementById("wishlist-overlay");
  const closeBtn = document.getElementById("wishlist-close");
  function open() { updateWishlistModal(); modal.classList.add("open"); overlay.classList.add("active"); modal.setAttribute("aria-hidden", "false"); }
  function close() { modal.classList.remove("open"); overlay.classList.remove("active"); modal.setAttribute("aria-hidden", "true"); }
  btn?.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  overlay?.addEventListener("click", close);
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  modal?.addEventListener("click", e => { const remBtn = e.target.closest(".btn-remove-wish"); if (remBtn) toggleWishlist(parseInt(remBtn.dataset.id)); });
}

// ─── QUICK VIEW ───────────────────────────────────────────
function openQuickView(productId) {
  const p = allProducts.find(pr => pr.id === productId);
  if (!p) return;
  const modal = document.getElementById("quickview-modal");
  const overlay = document.getElementById("quickview-overlay");
  const content = document.getElementById("quickview-content");
  const stars = "★".repeat(Math.round(p.rating || 5)) + "☆".repeat(5 - Math.round(p.rating || 5));
  const isFav = wishlist.some(w => w.id === p.id);
  const imgSrc = resolveImagePath(p.image);
  content.innerHTML = `
    <div class="qv-image-col">
      <img src="${imgSrc}" alt="${p.name}"
        onerror="this.onerror=null;this.src='images/placeholder.jpg';this.onerror=function(){this.src='https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&q=60'}" />
    </div>
    <div class="qv-info-col">
      <div class="qv-category">${p.category}</div>
      <h2 class="qv-name">${p.name}</h2>
      <div class="qv-price">${CONFIG.CURRENCY} ${p.price.toLocaleString()}${p.originalPrice?`<span style="font-size:16px;color:var(--gray-3);text-decoration:line-through;margin-left:10px">${CONFIG.CURRENCY} ${p.originalPrice.toLocaleString()}</span>`:""}</div>
      <p class="qv-desc">${p.description || ""}</p>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;font-size:14px;color:var(--gray-light)"><span style="color:#FFD700">${stars}</span><span>${p.rating} (${p.reviewCount || 0} reviews)</span></div>
      <div class="qv-sizes-label">SELECT SIZE (EU):</div>
      <div class="qv-sizes" id="qv-sizes">${(p.sizes||[]).map(s=>`<span class="size-chip" data-size="${s}" data-pid="${p.id}">${s}</span>`).join("")}</div>
      <span class="card-avail avail-${p.available}">${p.available?"✓ In Stock":"✗ Out of Stock"}</span>
      <div style="display:flex;gap:12px;margin-top:16px;flex-wrap:wrap;">
        <button class="btn-primary qv-btn" id="qv-cart-btn" data-pid="${p.id}"${!p.available?' disabled':''} style="flex:1;min-width:140px">+ Add to Cart</button>
        <button class="btn-ghost${isFav?' active':''}" id="qv-wish-btn" data-pid="${p.id}" style="padding:14px;border-radius:var(--radius-sm)">❤ ${isFav?"Saved":"Wishlist"}</button>
      </div>
    </div>
  `;
  content.querySelectorAll(".size-chip").forEach(chip => {
    chip.addEventListener("click", () => { content.querySelectorAll(`.size-chip[data-pid="${chip.dataset.pid}"]`).forEach(c => c.classList.remove("selected")); chip.classList.add("selected"); });
  });
  document.getElementById("qv-cart-btn")?.addEventListener("click", () => { const selSize = content.querySelector(".size-chip.selected")?.dataset.size || null; addToCart(parseInt(document.getElementById("qv-cart-btn").dataset.pid), 1, selSize); });
  document.getElementById("qv-wish-btn")?.addEventListener("click", () => { toggleWishlist(parseInt(document.getElementById("qv-wish-btn").dataset.pid)); const btn = document.getElementById("qv-wish-btn"); btn.textContent = `❤ ${wishlist.some(w => w.id === p.id) ? "Saved" : "Wishlist"}`; });
  modal.classList.add("open"); overlay.classList.add("active"); modal.setAttribute("aria-hidden", "false");
}

function initQuickViewModal() {
  const modal = document.getElementById("quickview-modal");
  const overlay = document.getElementById("quickview-overlay");
  const closeBtn = document.getElementById("quickview-close");
  function close() { modal.classList.remove("open"); overlay.classList.remove("active"); modal.setAttribute("aria-hidden", "true"); }
  closeBtn?.addEventListener("click", close);
  overlay?.addEventListener("click", close);
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
}

// ─── CHECKOUT ─────────────────────────────────────────────
function openCheckout() {
  if (!cart.length) { showToast("🛒 Your cart is empty!", "warn"); return; }
  const modal = document.getElementById("checkout-modal");
  const overlay = document.getElementById("checkout-overlay");
  const step1 = document.getElementById("checkout-step-1");
  const step2 = document.getElementById("checkout-step-2");
  step1.classList.remove("hidden"); step2.classList.add("hidden");
  document.getElementById("checkout-form").reset();
  const total = cartTotal();
  document.getElementById("order-summary-mini").innerHTML = `<div class="order-mini-title">ORDER SUMMARY</div>${cart.map(i=>`<div class="order-mini-item"><span>${i.name} (×${i.qty}) ${i.size?"— Sz "+i.size:""}</span><span>${CONFIG.CURRENCY} ${(i.price*i.qty).toLocaleString()}</span></div>`).join("")}<div class="order-mini-total"><span>TOTAL</span><span>${CONFIG.CURRENCY} ${total.toLocaleString()}</span></div>`;
  modal.classList.add("open"); overlay.classList.add("active"); modal.setAttribute("aria-hidden", "false");
}

function initCheckoutModal() {
  const modal = document.getElementById("checkout-modal");
  const overlay = document.getElementById("checkout-overlay");
  const closeBtn = document.getElementById("checkout-close");
  const form = document.getElementById("checkout-form");
  const step1 = document.getElementById("checkout-step-1");
  const step2 = document.getElementById("checkout-step-2");
  const contBtn = document.getElementById("success-continue");
  function close() { modal.classList.remove("open"); overlay.classList.remove("active"); modal.setAttribute("aria-hidden", "true"); }
  closeBtn?.addEventListener("click", close);
  overlay?.addEventListener("click", close);
  contBtn?.addEventListener("click", () => { close(); cart = []; saveCart(); updateCartUI(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
  form?.addEventListener("submit", e => {
    e.preventDefault();
    const name = document.getElementById("customer-name").value.trim();
    const phone = document.getElementById("customer-phone").value.trim();
    const location = document.getElementById("customer-location").value.trim();
    const notes = document.getElementById("customer-notes").value.trim();
    let valid = true;
    ["customer-name","customer-phone","customer-location"].forEach(id => { const el = document.getElementById(id); if (!el.value.trim()) { el.classList.add("error"); valid = false; } else el.classList.remove("error"); });
    if (!valid) { showToast("⚠️ Please fill all required fields", "warn"); return; }
    const orderLines = cart.map(i => `  • ${i.name} (×${i.qty})${i.size?" — Size "+i.size:""}  →  ${CONFIG.CURRENCY} ${(i.price*i.qty).toLocaleString()}`).join("\n");
    const total = cartTotal();
    const waMsg = encodeURIComponent(`🛒 *NEW ORDER — ${CONFIG.SHOP_NAME}*\n\n*Customer Name:* ${name}\n*Phone:* ${phone}\n*Location:* ${location}\n${notes?`*Notes:* ${notes}\n`:""}\n*ORDER DETAILS:*\n${orderLines}\n\n*TOTAL: ${CONFIG.CURRENCY} ${total.toLocaleString()}*\n\n_Please confirm availability and payment details._`);
    step1.classList.add("hidden"); step2.classList.remove("hidden");
    document.getElementById("success-details").innerHTML = `<strong>${name}</strong><br/>📞 ${phone}<br/>📍 ${location}<br/>💰 Total: ${CONFIG.CURRENCY} ${total.toLocaleString()}`;
    setTimeout(() => { window.open(`https://wa.me/${CONFIG.OWNER_WHATSAPP}?text=${waMsg}`, "_blank"); }, 800);
  });
}

// ─── WHATSAPP ─────────────────────────────────────────────
function openWhatsApp(msg = "Hi! I'd like to inquire about shoes.") { window.open(`https://wa.me/${CONFIG.OWNER_WHATSAPP}?text=${encodeURIComponent(msg)}`, "_blank"); }
function initWhatsAppLinks() {
  const defaultMsg = `Hi! I found you on your website. I need help with shoes.`;
  document.getElementById("whatsapp-float")?.addEventListener("click", e => { e.preventDefault(); openWhatsApp(defaultMsg); });
  document.getElementById("help-btn")?.addEventListener("click", e => { e.preventDefault(); openWhatsApp("Hi! I need help with my order."); });
  document.getElementById("footer-whatsapp")?.addEventListener("click", e => { e.preventDefault(); openWhatsApp(defaultMsg); });
  document.getElementById("footer-contact-wa")?.addEventListener("click", e => { e.preventDefault(); openWhatsApp(defaultMsg); });
}

// ─── REVIEWS ─────────────────────────────────────────────
function renderReviews() {
  const grid = document.getElementById("reviews-grid");
  if (!grid) return;
  grid.innerHTML = REVIEWS.map(r => `<div class="review-card"><div class="review-stars">${"★".repeat(r.rating)}${"☆".repeat(5-r.rating)}</div><p class="review-text">"${r.text}"</p><div class="review-author"><div class="review-avatar">${r.initials}</div><div><div class="review-name">${r.name}</div><div class="review-location">📍 ${r.location}</div></div></div></div>`).join("");
}

// ─── STATS COUNTER ───────────────────────────────────────
function initStatsObserver() {
  const statsSection = document.getElementById("stats");
  if (!statsSection) return;
  const observer = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting && !statsAnimated) { statsAnimated = true; animateCounters(); observer.unobserve(entry.target); } }); }, { threshold: 0.3 });
  observer.observe(statsSection);
}
function animateCounters() {
  document.querySelectorAll(".stat-number[data-target]").forEach(counter => {
    const target = parseInt(counter.dataset.target), duration = 1800, step = 16;
    const increment = target / (duration / step);
    let current = 0;
    const timer = setInterval(() => { current = Math.min(current + increment, target); counter.textContent = Math.floor(current).toLocaleString(); if (current >= target) clearInterval(timer); }, step);
  });
}

// ─── SCROLL REVEAL ───────────────────────────────────────
function initScrollReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!els.length) return;
  const observer = new IntersectionObserver(entries => { entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add("visible"); observer.unobserve(entry.target); } }); }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  els.forEach(el => observer.observe(el));
}

// ─── BACK TO TOP ─────────────────────────────────────────
function initBackToTop() {
  const btn = document.getElementById("back-to-top");
  if (!btn) return;
  window.addEventListener("scroll", () => { btn.classList.toggle("visible", window.scrollY > 500); }, { passive: true });
  btn.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

// ─── TOAST ───────────────────────────────────────────────
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  if (!container) return;
  const icons = { success: "✅", error: "❌", warn: "⚠️", info: "ℹ️" };
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]||"💬"}</span><span class="toast-msg">${message}</span><button class="toast-close" aria-label="Close">&times;</button>`;
  container.appendChild(toast);
  const close = () => { toast.classList.add("removing"); setTimeout(() => toast.remove(), 320); };
  toast.querySelector(".toast-close").addEventListener("click", close);
  setTimeout(close, 3500);
}

// ─── FOOTER YEAR ─────────────────────────────────────────
function setFooterYear() { const el = document.getElementById("footer-year"); if (el) el.textContent = new Date().getFullYear(); }

// ─── KEYBOARD NAVIGATION ─────────────────────────────────
document.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { const card = document.activeElement?.closest(".product-card"); if (card) { e.preventDefault(); openQuickView(parseInt(card.dataset.id)); } } });
