// ============================================================
// COMMON / DÙNG CHUNG (mọi trang)
// ============================================================

// ===== CART STORAGE =====
function getCart() {
  try {
    return JSON.parse(localStorage.getItem('wbs_cart')) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem('wbs_cart', JSON.stringify(cart));
}

function formatPrice(price) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' })
    .format(price)
    .replace('₫', '₫');
}

function updateCartBadge() {
  const cart = getCart();
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById('cartBadge');
  if (badge) {
    badge.textContent = totalItems;
    badge.style.display = totalItems > 0 ? 'inline' : 'none';
  }
}

// ===== PRODUCT NAVIGATION =====
function goToProductDetail(productId) {
  if (productId === undefined || productId === null || productId === '') return;
  window.location.href = `product-detail.html?id=${encodeURIComponent(productId)}`;
}

// ===== HEADER / LOGIN STATUS (dùng chung topbar) =====
async function checkLoginStatus() {
  const userStr = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  if (!userStr) return;

  try {
    let user = JSON.parse(userStr);

    if (user.id) {
      try {
        const response = await fetch(`http://localhost:3000/api/user/${user.id}`);
        const data = await response.json();
        if (data.success) {
          user = data.user;
          const storage = localStorage.getItem('currentUser') ? localStorage : sessionStorage;
          storage.setItem('currentUser', JSON.stringify(user));
        }
      } catch (e) {
        console.error('Error syncing user with DB:', e);
      }
    }

    const nameToDisplay = user.fullname || user.name || 'User';
    const actionsDiv = document.querySelector('.topbar__actions');
    if (!actionsDiv) return;

    const userBtn = actionsDiv.querySelector('.header-user');
    if (!userBtn) return;

    let userMenu = userBtn.parentElement;
    if (!userMenu.classList.contains('user-menu')) {
      userMenu = document.createElement('div');
      userMenu.className = 'user-menu';
      userBtn.parentNode.insertBefore(userMenu, userBtn);
      userMenu.appendChild(userBtn);
    }

    userBtn.innerHTML = `<i class="fa-solid fa-user"></i> ${nameToDisplay} <i class="fa-solid fa-caret-down" style="font-size: 12px;"></i>`;
    userBtn.href = "javascript:void(0)";
    userBtn.classList.add('user-profile');

    const oldDropdown = userMenu.querySelector('.user-dropdown');
    if (oldDropdown) oldDropdown.remove();

    const dropdown = document.createElement('div');
    dropdown.className = 'user-dropdown';
    dropdown.style.display = 'none';
    dropdown.innerHTML = `
      <a href="profile.html">Thông tin tài khoản</a>
      <a href="orders.html">Đơn hàng của bạn</a>
      <a href="javascript:void(0)" id="headerLogoutBtn">Đăng xuất</a>
    `;
    userMenu.appendChild(dropdown);

    userBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isOpen = dropdown.style.display === 'flex';
      dropdown.style.display = isOpen ? 'none' : 'flex';
    };

    const logoutBtn = dropdown.querySelector('#headerLogoutBtn');
    if (logoutBtn) {
      logoutBtn.onclick = (e) => {
        e.preventDefault();
        if (confirm('Bạn có muốn đăng xuất?')) {
          localStorage.removeItem('currentUser');
          sessionStorage.removeItem('currentUser');
          window.location.href = 'login.html';
        }
      };
    }

    document.addEventListener('click', () => {
      dropdown.style.display = 'none';
    });
  } catch (e) {
    console.error('Error parsing user data', e);
  }
}

// ============================================================
// INDEX.HTML
// ============================================================

async function loadProductsToIndex() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const searchTerm = urlParams.get('search');
    let url = 'http://127.0.0.1:3000/api/products';
    if (searchTerm) {
      url += `?search=${encodeURIComponent(searchTerm)}`;
    }

    const response = await fetch(url);
    const data = await response.json();
    if (!data?.success || !Array.isArray(data.products)) {
      throw new Error(data?.message || 'Không thể tải danh sách sản phẩm.');
    }

    const products = data.products;
    grid.innerHTML = '';



    products.forEach((p) => {
      const id = p.id;
      const name = p.name || 'Sản phẩm';
      const price = Number(p.price || 0);
      let imageUrl = p.image_url || 'https://via.placeholder.com/600x600?text=WBS';
      try {
        if (p.image_url && p.image_url.startsWith('[')) {
          const arr = JSON.parse(p.image_url);
          if (arr.length > 0) imageUrl = arr[0];
        }
      } catch (e) { }

      const card = document.createElement('article');
      card.className = 'card';
      card.setAttribute('role', 'button');
      card.tabIndex = 0;
      card.addEventListener('click', () => goToProductDetail(id));
      card.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') goToProductDetail(id);
      });

      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.textContent = 'NEW';

      const img = document.createElement('img');
      img.src = imageUrl;
      img.alt = name;
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('error', () => {
        img.src = 'https://via.placeholder.com/600x600?text=WBS';
      });

      const body = document.createElement('div');
      body.className = 'card__body';

      const h4 = document.createElement('h4');
      h4.textContent = name;

      const foot = document.createElement('div');
      foot.className = 'card__foot';

      const priceEl = document.createElement('div');
      priceEl.className = 'price';
      priceEl.textContent = `${price.toLocaleString('vi-VN')}đ`;

      const link = document.createElement('a');
      link.href = `product-detail.html?id=${encodeURIComponent(id)}`;
      link.className = 'card-cart';
      link.addEventListener('click', (e) => e.stopPropagation());
      link.innerHTML = `<i class="fas fa-shopping-cart"></i>`;

      foot.appendChild(priceEl);
      foot.appendChild(link);

      body.appendChild(h4);
      body.appendChild(foot);

      card.appendChild(badge);
      card.appendChild(img);
      card.appendChild(body);

      grid.appendChild(card);
    });
  } catch (e) {
    console.error('Error loading products:', e);
    grid.innerHTML = `
      <div class="card" style="display:flex;align-items:center;justify-content:center;min-height:180px;">
        <div class="card__body" style="text-align:center;">
          <h4 style="margin:0 0 8px;">Không tải được sản phẩm</h4>
          <div style="color:#6c757d;font-size:13px;">Hãy chắc chắn backend đang chạy ở cổng 3000</div>
        </div>
      </div>
    `;
  }
}

// Slider đơn giản (chỉ chạy trên trang có slider)
function initIndexSlider() {
  const slider = document.getElementById('slider');
  if (!slider) return;

  const slides = Array.from(slider.querySelectorAll('.slide'));
  const dotsWrap = document.getElementById('dots');
  if (!dotsWrap) return;

  let index = 0;
  slides.forEach((_, i) => {
    const d = document.createElement('button');
    d.addEventListener('click', () => go(i));
    dotsWrap.appendChild(d);
  });

  function render() {
    slides.forEach((s, i) => s.classList.toggle('is-active', i === index));
    dotsWrap.querySelectorAll('button').forEach((b, i) => b.classList.toggle('active', i === index));
  }

  function go(i) {
    index = (i + slides.length) % slides.length;
    render();
  }

  slider.querySelector('.prev')?.addEventListener('click', () => go(index - 1));
  slider.querySelector('.next')?.addEventListener('click', () => go(index + 1));
  render();

  setInterval(() => go(index + 1), 5000);
}

// ============================================================
// PRODUCT-DETAIL.HTML
// ============================================================

function changeQuantity(delta) {
  const qty = document.getElementById('quantity');
  if (!qty) return;
  const newValue = parseInt(qty.value) + delta;
  if (newValue >= 1) {
    qty.value = newValue;
  }
}

function openImageModal(src) {
  const old = document.getElementById('imageModal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'imageModal';
  modal.style.cssText = `
    position: fixed; inset: 0; z-index: 99999;
    background: rgba(0,0,0,0.88);
    display: flex; align-items: center; justify-content: center;
    cursor: zoom-out;
    animation: fadeInModal 0.25s ease;
  `;

  if (!document.getElementById('imageModalStyle')) {
    const style = document.createElement('style');
    style.id = 'imageModalStyle';
    style.textContent = `
      @keyframes fadeInModal { from { opacity:0; } to { opacity:1; } }
      #imageModal img { max-width: 90vw; max-height: 90vh; border-radius: 8px;
        box-shadow: 0 8px 40px rgba(0,0,0,0.6); object-fit: contain; }
      #imageModal .close-modal { position:fixed; top:20px; right:28px;
        color:#fff; font-size:36px; cursor:pointer; line-height:1; 
        background:none; border:none; opacity:0.8; }
      #imageModal .close-modal:hover { opacity:1; }
    `;
    document.head.appendChild(style);
  }

  modal.innerHTML = `
    <button class="close-modal" onclick="document.getElementById('imageModal').remove()">×</button>
    <img src="${src}" alt="Phóng to ảnh" />
  `;

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });

  document.addEventListener('keydown', function escClose(e) {
    if (e.key === 'Escape') {
      const m = document.getElementById('imageModal');
      if (m) m.remove();
      document.removeEventListener('keydown', escClose);
    }
  });

  document.body.appendChild(modal);
}

function addToCart() {
  const quantity = parseInt(document.getElementById('quantity')?.value) || 1;
  const name = document.querySelector('.product-title')?.textContent?.trim() || '';
  const priceText = document.querySelector('.product-price')?.textContent?.trim() || '0';
  const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
  const image = document.getElementById('mainImage')?.src || '';
  const productId = new URLSearchParams(window.location.search).get('id') || '0';

  if (!name) {
    alert('Không thể thêm sản phẩm. Vui lòng thử lại.');
    return;
  }

  const cart = getCart();
  const existing = cart.find(item => item.id === productId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ id: productId, name, price, image, quantity });
  }

  saveCart(cart);
  updateCartBadge();
}

async function loadProductDetailFromApi(productId) {
  const idToFetch = productId || 1;
  try {
    const response = await fetch(`http://127.0.0.1:3000/api/products/${idToFetch}`);
    const data = await response.json();
    if (!data.success) return;

    const product = data.product;
    const titleEl = document.querySelector('.product-title');
    if (titleEl) titleEl.textContent = product.name;

    const priceEl = document.querySelector('.product-price');
    if (priceEl) priceEl.textContent = `${Number(product.price).toLocaleString()} ₫`;

    const mainImg = document.getElementById('mainImage');
    const thumbnailsContainer = document.getElementById('productThumbnails');

    if (mainImg) {
      let images = [];
      if (product.image_url) {
        if (product.image_url.startsWith('[')) {
          try {
            images = JSON.parse(product.image_url);
          } catch (e) {
            images = [product.image_url];
          }
        } else {
          images = [product.image_url];
        }
      } else {
        images = ['https://via.placeholder.com/600x600?text=WBS'];
      }

      if (images.length > 0) {
        mainImg.src = images[0];
      }

      if (thumbnailsContainer) {
        thumbnailsContainer.innerHTML = '';
        if (images.length > 1) {
          images.forEach(imgSrc => {
            const thumb = document.createElement('img');
            thumb.src = imgSrc;
            thumb.style.cssText = 'width: 80px; height: 80px; object-fit: cover; border-radius: 4px; cursor: pointer; border: 2px solid transparent; transition: all 0.2s ease;';
            thumb.onmouseover = () => thumb.style.opacity = '0.8';
            thumb.onmouseout = () => thumb.style.opacity = '1';
            thumb.onclick = () => {
              mainImg.src = imgSrc;
              Array.from(thumbnailsContainer.children).forEach(c => c.style.borderColor = 'transparent');
              thumb.style.borderColor = '#d4af37';
            };
            thumbnailsContainer.appendChild(thumb);
          });
          if (thumbnailsContainer.children.length > 0) {
            thumbnailsContainer.children[0].style.borderColor = '#d4af37';
          }
        }
      }
    }

    const codeEl = document.getElementById('product-code-display');
    if (codeEl) codeEl.textContent = product.productCode || 'N/A';

    const descEl = document.getElementById('product-description-display');
    if (descEl) descEl.innerHTML = product.description || 'Không có mô tả chi tiết.';
  } catch (e) {
    console.error('Error fetching product details:', e);
  }
}

// ============================================================
// CART.HTML
// ============================================================

function loadCartFromStorage() {
  const cart = getCart();
  const cartItemsContainer = document.querySelector('.cart-items');
  if (!cartItemsContainer) return;

  const existingItems = cartItemsContainer.querySelectorAll('.cart-item');
  existingItems.forEach(item => item.remove());

  if (cart.length === 0) {
    const cartWrapper = document.querySelector('.cart-wrapper');
    const emptyCart = document.getElementById('emptyCart');
    if (cartWrapper) cartWrapper.style.display = 'none';
    if (emptyCart) emptyCart.style.display = 'block';
    return;
  }

  cart.forEach(item => {
    const itemEl = document.createElement('div');
    itemEl.className = 'cart-item';
    itemEl.dataset.id = item.id;
    const priceFormatted = Number(item.price).toLocaleString('vi-VN') + '₫';
    const totalFormatted = Number(item.price * item.quantity).toLocaleString('vi-VN') + '₫';
    itemEl.innerHTML = `
      <div class="cart-item-product">
        <div class="cart-item-image">
          <img src="${item.image}" alt="${item.name}" />
        </div>
        <div class="cart-item-info">
          <h3><a href="product-detail.html?id=${item.id}">${item.name}</a></h3>
        </div>
      </div>
      <div class="cart-item-price">
        <span class="price-value">${priceFormatted}</span>
      </div>
      <div class="cart-item-quantity">
        <div class="quantity-controls">
          <button class="qty-btn" onclick="changeCartQuantity(this, -1)">-</button>
          <input type="number" class="qty-input" value="${item.quantity}" min="1" onchange="updateCartQuantityDirectly(this)" onkeyup="if(event.key === 'Enter') this.blur();" />
          <button class="qty-btn" onclick="changeCartQuantity(this, 1)">+</button>
        </div>
      </div>
      <div class="cart-item-total">
        <span class="total-value">${totalFormatted}</span>
      </div>
      <div class="cart-item-remove">
        <button class="remove-btn" onclick="removeCartItem(this)" aria-label="Xóa sản phẩm">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    cartItemsContainer.appendChild(itemEl);
  });

  updateCartTotals();
  updateCartBadge();
}

function changeCartQuantity(btn, delta) {
  const cartItem = btn.closest('.cart-item');
  const qtyInput = cartItem.querySelector('.qty-input');
  const currentQty = parseInt(qtyInput.value);
  const newQty = Math.max(1, currentQty + delta);

  qtyInput.value = newQty;

  const itemId = cartItem.dataset.id;
  const cart = getCart();
  const found = cart.find(item => item.id === itemId);
  if (found) {
    found.quantity = newQty;
    saveCart(cart);
  }

  updateCartItemTotal(cartItem);
  updateCartTotals();
  updateCartBadge();
}

function updateCartQuantityDirectly(input) {
  let newQty = parseInt(input.value);
  if (isNaN(newQty) || newQty < 1) {
    newQty = 1;
    input.value = 1;
  }

  const cartItem = input.closest('.cart-item');
  const itemId = cartItem.dataset.id;

  const cart = getCart();
  const found = cart.find(item => item.id === itemId);
  if (found) {
    found.quantity = newQty;
    saveCart(cart);
  }

  updateCartItemTotal(cartItem);
  updateCartTotals();
  updateCartBadge();
}

function updateCartItemTotal(cartItem) {
  const priceText = cartItem.querySelector('.price-value').textContent;
  const price = parseInt(priceText.replace(/[^\d]/g, ''));
  const quantity = parseInt(cartItem.querySelector('.qty-input').value);
  const total = price * quantity;

  const totalElement = cartItem.querySelector('.total-value');
  totalElement.textContent = formatPrice(total);
}

function removeCartItem(btn) {
  if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi giỏ hàng?')) {
    const cartItem = btn.closest('.cart-item');
    cartItem.style.opacity = '0';
    cartItem.style.transform = 'translateX(-20px)';

    setTimeout(() => {
      const itemId = cartItem.dataset.id;
      let cart = getCart();
      cart = cart.filter(item => item.id !== itemId);
      saveCart(cart);

      cartItem.remove();
      updateCartTotals();
      updateCartBadge();
      checkEmptyCart();
    }, 300);
  }
}

function updateCartTotals() {
  const cartItems = document.querySelectorAll('.cart-item');
  let subtotal = 0;

  cartItems.forEach(item => {
    const totalText = item.querySelector('.total-value').textContent;
    const total = parseInt(totalText.replace(/[^\d]/g, ''));
    subtotal += total;
  });

  const shipping = subtotal >= 500000 ? 0 : 30000;
  const grandTotal = subtotal + shipping;

  const subtotalEl = document.getElementById('subtotal');
  const shippingEl = document.getElementById('shipping');
  const grandTotalEl = document.getElementById('grandTotal');

  if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
  if (shippingEl) shippingEl.textContent = subtotal >= 500000 ? 'Miễn phí' : formatPrice(shipping);
  if (grandTotalEl) grandTotalEl.textContent = formatPrice(grandTotal);
}

function checkEmptyCart() {
  const cartItems = document.querySelectorAll('.cart-item');
  const emptyCart = document.getElementById('emptyCart');
  const cartWrapper = document.querySelector('.cart-wrapper');

  if (cartItems.length === 0) {
    if (cartWrapper) cartWrapper.style.display = 'none';
    if (emptyCart) emptyCart.style.display = 'block';
  } else {
    if (cartWrapper) cartWrapper.style.display = 'flex';
    if (emptyCart) emptyCart.style.display = 'none';
  }
}

async function checkout() {
  const userStr = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
  if (!userStr) {
    const wantToLogin = confirm('Bạn chưa đăng nhập. Nhấn OK để Đăng nhập, hoặc nhấn Hủy để tiếp tục mua sắm.');
    if (wantToLogin) {
      window.location.href = 'login.html';
    }
    return; // Dừng việc thanh toán lại nếu họ chưa đăng nhập
  }

  const cart = getCart();
  if (cart.length === 0) {
    alert('Giỏ hàng của bạn đang trống!');
    return;
  }

  // Kiểm tra số lượng tồn kho trước khi sang trang checkout
  try {
    for (const item of cart) {
      const resp = await fetch(`http://127.0.0.1:3000/api/products/${item.id}`);
      const data = await resp.json();
      if (data.success) {
        const dbStock = data.product.stock;
        if (item.quantity > dbStock) {
          alert(`Sản phẩm "${item.name}" không đủ số lượng trong kho! (Chỉ còn ${dbStock} sản phẩm). Vui lòng giảm số lượng để tiếp tục.`);
          return;
        }
      } else {
        alert(`Không thể kiểm tra thông tin sản phẩm "${item.name}"!`);
        return;
      }
    }
  } catch (e) {
    console.error('Lỗi kiểm tra kho:', e);
    alert('Lỗi kết nối khi kiểm tra số lượng tồn kho!');
    return;
  }

  window.location.href = 'checkout.html';
}

// ============================================================
// SEARCH FUNCTIONALITY
// ============================================================
function initSearch() {
  const searchInput = document.querySelector('.search input');
  const searchBtn = document.querySelector('.search button');
  if (!searchInput || !searchBtn) return;

  const urlParams = new URLSearchParams(window.location.search);
  const existingSearch = urlParams.get('search');
  if (existingSearch) {
    searchInput.value = existingSearch;
  }

  const doSearch = () => {
    const val = searchInput.value.trim();
    if (val) {
      window.location.href = `index.html?search=${encodeURIComponent(val)}`;
    } else {
      window.location.href = `index.html`;
    }
  };

  searchBtn.addEventListener('click', doSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') doSearch();
  });
}

// ============================================================
// INIT THEO THỨ TỰ: index.html -> product-detail.html -> cart.html
// ============================================================

document.addEventListener('DOMContentLoaded', async function () {
  checkLoginStatus();
  initSearch();

  // index.html
  const isIndexPage =
    window.location.pathname.endsWith('/index.html') ||
    window.location.pathname === '/' ||
    window.location.href.includes('index.html');
  if (isIndexPage) {
    loadProductsToIndex();
    initIndexSlider();
  }

  // product-detail.html
  const isDetailPage =
    window.location.pathname.includes('product-detail.html') ||
    window.location.href.includes('product-detail.html');
  if (isDetailPage) {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    await loadProductDetailFromApi(productId);
  }

  // cart.html
  const isCartPage =
    window.location.pathname.includes('cart.html') ||
    window.location.href.includes('cart.html');
  if (isCartPage) {
    loadCartFromStorage();
  } else {
    updateCartBadge();
  }
});
