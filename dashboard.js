document.addEventListener('DOMContentLoaded', async () => {
  const user = JSON.parse(localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser'));
  if (user && user.id) {
    try {
      const response = await fetch(`http://127.0.0.1:3000/api/user/${user.id}`);
      const data = await response.json();
      if (data.success) {
        const freshUser = data.user;
        const storage = localStorage.getItem('currentUser') ? localStorage : sessionStorage;
        storage.setItem('currentUser', JSON.stringify(freshUser));
        document.getElementById('admin-name-display').textContent = freshUser.fullname;
      }
    } catch (error) {
      console.error('Error fetching fresh profile data:', error);
      if (user.fullname) document.getElementById('admin-name-display').textContent = user.fullname;
    }
  }
  fetchCustomers();
  fetchStatistics();
});

function switchSection(section) {
  const overview = document.getElementById('overview-section');
  const customers = document.getElementById('customers-section');
  const products = document.getElementById('products-section');
  const title = document.getElementById('main-title');
  const subtitle = document.getElementById('main-subtitle');

  const navOverview = document.getElementById('nav-overview');
  const navCustomers = document.getElementById('nav-customers');
  const navProducts = document.getElementById('nav-products');
  const navOrders = document.getElementById('nav-orders');
  const orders = document.getElementById('orders-section');

  // Reset styles and displays
  [overview, customers, products, orders].forEach(el => { if (el) el.style.display = 'none'; });
  [navOverview, navCustomers, navProducts, navOrders].forEach(el => { if (el) el.classList.remove('active'); });

  if (section === 'overview') {
    overview.style.display = 'block';
    title.textContent = 'Tổng quan';
    subtitle.textContent = '';
    navOverview.classList.add('active');
    fetchStatistics();
  } else if (section === 'customers') {
    customers.style.display = 'block';
    title.textContent = 'Quản lý khách hàng';
    subtitle.textContent = '';
    navCustomers.classList.add('active');
    fetchCustomers();
  } else if (section === 'products') {
    products.style.display = 'block';
    title.textContent = 'Quản lý sản phẩm';
    subtitle.textContent = '';
    navProducts.classList.add('active');
    fetchProducts();
  } else if (section === 'orders') {
    orders.style.display = 'block';
    title.textContent = 'Quản lý đơn hàng';
    subtitle.textContent = '';
    navOrders.classList.add('active');
    fetchOrders();
  }
}

let revenueChartInstance = null;

async function fetchStatistics() {
  try {
    const response = await fetch('http://127.0.0.1:3000/api/statistics');
    const data = await response.json();
    if (data.success) {
      document.getElementById('stat-revenue').textContent = Number(data.data.total_revenue).toLocaleString() + 'VND';
      document.getElementById('stat-orders').textContent = data.data.total_orders;
      document.getElementById('stat-customers').textContent = data.data.total_customers;
      document.getElementById('stat-products').textContent = data.data.total_products;
      if(document.getElementById('stat-canceled')) {
        document.getElementById('stat-canceled').textContent = data.data.total_canceled || 0;
      }

      const ctx = document.getElementById('revenueChart');
      if (ctx) {
        if (revenueChartInstance) revenueChartInstance.destroy();

        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          last7Days.push(d.toLocaleDateString('vi-VN'));
        }

        const revenueMap = {};
        data.data.daily_revenue.forEach(item => {
          const formattedDate = new Date(item.date).toLocaleDateString('vi-VN');
          revenueMap[formattedDate] = item.revenue;
        });

        const labels = last7Days;
        const values = last7Days.map(dateStr => revenueMap[dateStr] || 0);

        revenueChartInstance = new Chart(ctx, {
          type: 'bar',
          data: {
            labels: labels,
            datasets: [{
              label: 'Doanh thu (VND)',
              data: values,
              backgroundColor: 'rgba(46, 125, 50, 0.8)',
              borderRadius: 6,
              barPercentage: 0.6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: false
              },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    return Number(context.raw).toLocaleString() + 'đ';
                  }
                }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: {
                  callback: function (value) {
                    if (value >= 1000000) return (value / 1000000) + 'M';
                    if (value >= 1000) return (value / 1000) + 'k';
                    return value;
                  }
                }
              }
            }
          }
        });
      }
    }
  } catch (error) {
    console.error('Lỗi khi tải thống kê:', error);
  }
}

let allOrdersData = [];

async function fetchOrders() {
  const tableBody = document.getElementById('order-table-body');
  if (!tableBody) return;
  tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Đang tải...</td></tr>';

  try {
    const response = await fetch('http://127.0.0.1:3000/api/orders');
    const data = await response.json();

    if (data.success) {
      allOrdersData = data.orders || [];
      filterOrders();
    } else {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:red;">Lỗi máy chủ: ${data.message}</td></tr>`;
    }
  } catch (error) {
    console.error('Error fetching orders:', error);
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#999;">Chưa có dữ liệu hiển thị.</td></tr>`;
  }
}

function filterOrders() {
  const filterValue = document.getElementById('order-status-filter')?.value || '';
  let filteredOrders = allOrdersData;
  
  if (filterValue) {
    filteredOrders = allOrdersData.filter(order => {
      let displayStatus = order.status;
      if (displayStatus === 'Chờ xử lý') displayStatus = 'Đã đặt';
      return displayStatus === filterValue;
    });
  }
  
  renderOrders(filteredOrders);
}

function renderOrders(orders) {
  const tableBody = document.getElementById('order-table-body');
  if (!tableBody) return;
  
  if (orders.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 40px;">Không có đơn hàng nào.</td></tr>';
    return;
  }

  tableBody.innerHTML = '';
  orders.forEach(order => {
    const row = document.createElement('tr');
    const date = new Date(order.created_at).toLocaleDateString('vi-VN');
    let displayStatus = order.status;
    if (displayStatus === 'Chờ xử lý') displayStatus = 'Đã đặt';
    row.innerHTML = `
      <td>${order.id}</td>
      <td>${order.customer_name || 'Khách vãng lai'}</td>
      <td>${order.customer_email || 'N/A'}</td>
      <td>${date}</td>
      <td><strong>${Number(order.total_amount).toLocaleString()}đ</strong></td>
      <td><span class="badge" style="background: transparent; color: #000; font-size: 14px; font-weight: normal; position: static;">${displayStatus}</span></td>
      <td style="text-align: right;">
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button class="btn-glass" style="color: black; border-color: transparent; padding: 4px 8px;" onclick="viewOrder(${order.id})">Xem</button>
          <button class="btn-glass" style="color: black; border-color: transparent; padding: 4px 8px;" onclick="deleteOrder(${order.id})">Xóa</button>
        </div>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

async function viewOrder(id) {
  try {
    const response = await fetch(`http://127.0.0.1:3000/api/orders/${id}`);
    const data = await response.json();
    if (data.success) {
      const order = data.order;

      document.getElementById('edit-order-id-display').textContent = order.id;
      document.getElementById('edit-order-id').value = order.id;
      document.getElementById('edit-order-customer').textContent = order.customer_name || 'Khách vãng lai';
      document.getElementById('edit-order-phone').textContent = order.customer_phone || 'N/A';
      document.getElementById('edit-order-email').textContent = order.customer_email || 'N/A';
      document.getElementById('edit-order-address').textContent = order.shipping_address || 'N/A';
      document.getElementById('edit-order-date').textContent = new Date(order.created_at).toLocaleDateString('vi-VN');
      document.getElementById('edit-order-total').textContent = Number(order.total_amount).toLocaleString() + 'đ';

      let displayStatus = order.status;
      if (displayStatus === 'Chờ xử lý') displayStatus = 'Đã đặt';
      document.getElementById('edit-order-status').value = displayStatus;

      const itemsListEl = document.getElementById('edit-order-items-list');
      itemsListEl.innerHTML = '';
      data.items.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.style.display = 'flex';
        itemEl.style.justifyContent = 'space-between';
        itemEl.style.marginBottom = '10px';
        itemEl.style.paddingBottom = '10px';
        itemEl.style.borderBottom = '1px dashed #eee';
        itemEl.innerHTML = `
          <div style="display: flex; gap: 10px; align-items: center;">
            <img src="${item.image_url}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
            <div>
              <div style="font-weight: 500;">${item.product_name}</div>
              <div style="color: #777; font-size: 13px;">SL: ${item.quantity} x ${Number(item.price).toLocaleString()}đ</div>
            </div>
          </div>
          <div style="font-weight: 600;">${Number(item.price * item.quantity).toLocaleString()}đ</div>
        `;
        itemsListEl.appendChild(itemEl);
      });

      document.getElementById('editOrderModal').style.display = 'block';
    } else {
      alert('Không tìm thấy đơn hàng!');
    }
  } catch (error) {
    console.error('Lỗi khi tải chi tiết đơn hàng:', error);
    alert('Lỗi kết nối máy chủ!');
  }
}

function closeEditOrderModal() {
  document.getElementById('editOrderModal').style.display = 'none';
}

async function saveOrderStatus(event) {
  event.preventDefault();
  const id = document.getElementById('edit-order-id').value;
  const newStatus = document.getElementById('edit-order-status').value;

  try {
    const response = await fetch(`http://127.0.0.1:3000/api/orders/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await response.json();
    if (data.success) {
      alert('Cập nhật trạng thái thành công!');
      closeEditOrderModal();
      fetchOrders();
    } else {
      alert('Lỗi: ' + data.message);
    }
  } catch (error) {
    console.error('Lỗi cập nhật trạng thái:', error);
    alert('Lỗi hệ thống khi cập nhật!');
  }
}

async function deleteOrder(id) {
  if (!confirm(`Bạn có chắc chắn muốn xóa đơn hàng #${id} không? Hành động này không thể hoàn tác.`)) return;

  try {
    const response = await fetch(`http://127.0.0.1:3000/api/orders/${id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (data.success) {
      alert('Xóa đơn hàng thành công!');
      closeEditOrderModal();
      fetchOrders();
    } else {
      alert('Lỗi: ' + data.message);
    }
  } catch (error) {
    console.error('Lỗi xóa đơn hàng:', error);
    alert('Lỗi hệ thống khi xóa!');
  }
}


async function fetchProducts() {
  const tableBody = document.getElementById('product-table-body');
  tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Đang tải...</td></tr>';

  try {
    const response = await fetch('http://127.0.0.1:3000/api/products');
    const data = await response.json();

    if (data.success) {
      tableBody.innerHTML = '';
      data.products.forEach(product => {
        const row = document.createElement('tr');
        let firstImage = product.image_url || 'https://via.placeholder.com/40';
        try {
          if (product.image_url && product.image_url.startsWith('[')) {
            const arr = JSON.parse(product.image_url);
            if (arr.length > 0) firstImage = arr[0];
          }
        } catch (e) { }

        row.innerHTML = `
          <td>#${product.id}</td>
          <td>${product.name}</td>
          <td><span class="badge" style="background: #e3f2fd; color: #1976d2; position: static;">${product.productCode || 'N/A'}</span></td>
          <td>${product.category}</td>
          <td><strong>${Number(product.price).toLocaleString()} VND</strong></td>
          <td>${product.stock}</td>
          <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${product.description || '<span style="color:#ccc;">Không có mô tả</span>'}
          </td>
          <td>
            <img src="${firstImage}" class="product-img" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">
          </td>
          <td style="text-align: right;">
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <button class="btn-glass" style="color: black; border-color: transparent; padding: 4px 8px;" onclick="editProduct(${product.id})">Sửa</button>
              <button class="btn-glass" style="color: black; border-color: transparent; padding: 4px 8px;" onclick="deleteProduct(${product.id})">Xóa</button>
            </div>
          </td>
        `;
        tableBody.appendChild(row);
      });
    } else {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Lỗi máy chủ: ${data.message}</td></tr>`;
    }
  } catch (error) {
    console.error('Error fetching products:', error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding: 40px 0;">
          <p style="color:red; font-weight:600; margin-bottom: 8px;">Lỗi kết nối tới máy chủ (http://127.0.0.1:3000)</p>
          <p style="color: #666; font-size: 14px;">Hãy kiểm tra xem bạn đã chạy lệnh <code style="background: #eee; padding: 2px 4px;">node server.js</code> ở terminal chưa.</p>
          <button class="btn-cancel" style="margin-top: 15px; padding: 8px 20px;" onclick="fetchProducts()">Thử lại</button>
        </td>
      </tr>
    `;
  }
}

async function fetchCustomers() {
  const tableBody = document.getElementById('customer-table-body');
  tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center;">Đang tải...</td></tr>';

  try {
    const response = await fetch('http://127.0.0.1:3000/api/users');
    const data = await response.json();

    if (data.success) {
      tableBody.innerHTML = '';
      data.users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>#${user.id}</td>
          <td><strong>${user.fullname}</strong></td>
          <td>${user.email}</td>
          <td>${user.phone}</td>
          <td>${user.address || '<span style="color:#ccc;">Chưa có</span>'}</td>
          <td><span style="font-weight: 500;">${user.role === 1 ? 'Admin' : 'Khách'}</span></td>
          <td style="text-align: right;">
            <div style="display: flex; gap: 8px; justify-content: flex-end;">
              <button class="btn-glass" style="color: black; border-color: transparent; padding: 4px 8px;" onclick="editCustomer(${user.id})">Sửa</button>
              <button class="btn-glass" style="color: black; border-color: transparent; padding: 4px 8px;" onclick="deleteCustomer(${user.id})">Xóa</button>
            </div>
          </td>
        `;
        tableBody.appendChild(row);
      });
    } else {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:red;">Lỗi máy chủ: ${data.message}</td></tr>`;
    }
  } catch (error) {
    console.error('Error fetching customers:', error);
    tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:red;">Lỗi khi tải dữ liệu</td></tr>';
  }
}

async function deleteProduct(id) {
  if (!confirm(`Bạn có chắc chắn muốn xóa sản phẩm #${id} không?`)) return;

  try {
    const response = await fetch(`http://127.0.0.1:3000/api/products/${id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (data.success) {
      alert('Đã xóa sản phẩm thành công!');
      fetchProducts();
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    alert('Lỗi kết nối khi xóa sản phẩm: ' + error.message);
  }
}

async function editProduct(id) {
  try {
    const response = await fetch(`http://127.0.0.1:3000/api/products/${id}`);
    const data = await response.json();

    if (data.success) {
      const product = data.product;
      document.getElementById('edit-prod-id').value = product.id;
      document.getElementById('edit-prod-name').value = product.name;
      document.getElementById('edit-prod-id-val').value = product.productCode || '';
      document.getElementById('edit-prod-category').value = product.category;
      document.getElementById('edit-prod-price').value = product.price;
      document.getElementById('edit-prod-stock').value = product.stock;
      document.getElementById('edit-prod-description').value = product.description || '';
      // Reset file input and display
      document.getElementById('edit-prod-file').value = '';
      document.getElementById('edit-file-name').textContent = 'Giữ ảnh cũ hoặc chọn mới';

      document.getElementById('editProductModal').style.display = 'block';
    } else {
      alert('Không tìm thấy dữ liệu sản phẩm!');
    }
  } catch (error) {
    console.error('Error fetching product detail:', error);
    alert('Lỗi kết nối máy chủ khi lấy dữ liệu sản phẩm!');
  }
}

function closeEditProductModal() {
  document.getElementById('editProductModal').style.display = 'none';
}

async function saveProduct(event) {
  event.preventDefault();
  const id = document.getElementById('edit-prod-id').value;
  const fileInput = document.getElementById('edit-prod-file');
  let image_url = '';

  // If a new file is selected, convert it. Otherwise, we might want to keep the old one.
  // This is a bit tricky without a hidden field for the old URL.
  // Let's fetch the current product data first to get the old image if no new one is selected.

  if (fileInput.files && fileInput.files.length > 0) {
    try {
      const filePromises = Array.from(fileInput.files).map(f => fileToBase64(f));
      const base64Arr = await Promise.all(filePromises);
      image_url = JSON.stringify(base64Arr);
    } catch (e) {
      alert('Lỗi khi xử lý ảnh!');
      return;
    }
  } else {
    // Keep old image. We need to fetch it or store it somewhere.
    // For now, let's just fetch it again to be safe.
    try {
      const resp = await fetch(`http://127.0.0.1:3000/api/products/${id}`);
      const d = await resp.json();
      if (d.success) image_url = d.product.image_url;
    } catch (e) {
      console.error('Error fetching old image:', e);
    }
  }

  const prodCodeValue = document.getElementById('edit-prod-id-val').value;

  const productData = {
    name: document.getElementById('edit-prod-name').value,
    productCode: prodCodeValue,
    category: document.getElementById('edit-prod-category').value,
    price: document.getElementById('edit-prod-price').value,
    stock: document.getElementById('edit-prod-stock').value,
    image_url: image_url,
    description: document.getElementById('edit-prod-description').value
  };

  try {
    const response = await fetch(`http://127.0.0.1:3000/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });

    const data = await response.json();
    if (data.success) {
      alert('Đã cập nhật sản phẩm thành công!');
      closeEditProductModal();
      fetchProducts();
    } else {
      alert('Lỗi: ' + data.message);
    }
  } catch (error) {
    console.error('Error updating product:', error);
    alert('Lỗi hệ thống khi lưu thông tin sản phẩm!');
  }
}

// Add Product Modal Logic
function openAddProductModal() {
  document.getElementById('addProductForm').reset();
  document.getElementById('add-file-name').textContent = 'Chưa chọn ảnh nào';
  document.getElementById('addProductModal').style.display = 'block';
}

function closeAddProductModal() {
  document.getElementById('addProductModal').style.display = 'none';
}

async function createNewProduct(event) {
  event.preventDefault();
  const fileInput = document.getElementById('add-prod-file');
  let image_url = '';

  if (fileInput.files && fileInput.files.length > 0) {
    try {
      const filePromises = Array.from(fileInput.files).map(f => fileToBase64(f));
      const base64Arr = await Promise.all(filePromises);
      image_url = JSON.stringify(base64Arr);
    } catch (e) {
      alert('Lỗi khi xử lý ảnh!');
      return;
    }
  }

  const productData = {
    name: document.getElementById('add-prod-name').value,
    productCode: document.getElementById('add-prod-id-val').value,
    category: document.getElementById('add-prod-category').value,
    price: document.getElementById('add-prod-price').value,
    stock: document.getElementById('add-prod-stock').value,
    image_url: image_url,
    description: document.getElementById('add-prod-description').value
  };

  try {
    const response = await fetch('http://127.0.0.1:3000/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(productData)
    });

    const data = await response.json();
    if (data.success) {
      alert('Đã thêm sản phẩm thành công!');
      closeAddProductModal();
      fetchProducts();
    } else {
      alert('Lỗi từ máy chủ: ' + data.message);
    }
  } catch (error) {
    console.error('Error creating product:', error);
    alert('Lỗi hệ thống khi thêm sản phẩm mới: ' + error.message);
  }
}

// Utility: Convert file to Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
}

function updateFileName(input, displayId) {
  const fileNameDisplay = document.getElementById(displayId);
  if (input.files && input.files.length === 1) {
    fileNameDisplay.textContent = input.files[0].name;
  } else if (input.files && input.files.length > 1) {
    fileNameDisplay.textContent = `Đã chọn ${input.files.length} ảnh`;
  } else {
    fileNameDisplay.textContent = displayId.includes('edit') ? 'Giữ ảnh cũ hoặc chọn mới' : 'Chưa chọn ảnh nào';
  }
}

async function deleteCustomer(id) {
  if (!confirm(`Bạn có chắc chắn muốn xóa người dùng #${id} không?`)) return;

  try {
    const response = await fetch(`http://127.0.0.1:3000/api/user/${id}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (data.success) {
      alert('Đã xóa thành công!');
      fetchCustomers();
    } else {
      alert(data.message);
    }
  } catch (error) {
    console.error('Error deleting customer:', error);
    alert('Lỗi khi xóa người dùng!');
  }
}

async function editCustomer(id) {
  try {
    const response = await fetch(`http://127.0.0.1:3000/api/user/${id}`);
    const data = await response.json();

    if (data.success) {
      const user = data.user;
      document.getElementById('edit-id').value = user.id;
      document.getElementById('edit-fullname').value = user.fullname;
      document.getElementById('edit-email').value = user.email;
      document.getElementById('edit-phone').value = user.phone;
      document.getElementById('edit-address').value = user.address || '';

      document.getElementById('editModal').style.display = 'block';
    } else {
      alert('Không tìm thấy dữ liệu người dùng!');
    }
  } catch (error) {
    console.error('Error fetching user detail:', error);
    alert('Lỗi kết nối máy chủ khi lấy dữ liệu!');
  }
}

function closeModal() {
  document.getElementById('editModal').style.display = 'none';
}

async function saveCustomer(event) {
  event.preventDefault();
  const id = document.getElementById('edit-id').value;
  const fullname = document.getElementById('edit-fullname').value;
  const email = document.getElementById('edit-email').value;
  const phone = document.getElementById('edit-phone').value;
  const address = document.getElementById('edit-address').value;

  if (!email.endsWith('@gmail.com')) {
    alert('Email phải có định dạng @gmail.com!');
    return;
  }

  const userData = {
    fullname,
    email,
    phone,
    address
  };

  try {
    const response = await fetch(`http://127.0.0.1:3000/api/user/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    const data = await response.json();
    if (data.success) {
      alert('Đã cập nhật thông tin thành công!');

      // Sync with localStorage if editing currently logged-in user
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser'));
      if (currentUser && currentUser.id == id) {
        const updatedUser = data.user;
        const storage = localStorage.getItem('currentUser') ? localStorage : sessionStorage;
        storage.setItem('currentUser', JSON.stringify(updatedUser));
        document.getElementById('admin-name-display').textContent = updatedUser.fullname;
      }

      closeModal();
      fetchCustomers();
    } else {
      alert('Lỗi: ' + data.message);
    }
  } catch (error) {
    console.error('Error updating customer:', error);
    alert('Lỗi hệ thống khi lưu thông tin!');
  }
}

// Add Account Logic
function addCustomer() {
  document.getElementById('addForm').reset();
  document.getElementById('addModal').style.display = 'block';
}

function closeAddModal() {
  document.getElementById('addModal').style.display = 'none';
}

async function createCustomer(event) {
  event.preventDefault();
  
  const emailVal = document.getElementById('add-email').value;
  if (!emailVal.endsWith('@gmail.com')) {
    alert('Email phải có định dạng @gmail.com!');
    return;
  }

  const userData = {
    fullname: document.getElementById('add-fullname').value,
    email: emailVal,
    phone: document.getElementById('add-phone').value,
    password: document.getElementById('add-password').value,
    address: document.getElementById('add-address').value,
    role: 0 // Default for admin-created accounts
  };

  try {
    const response = await fetch('http://127.0.0.1:3000/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });

    const data = await response.json();
    if (data.success) {
      alert('Đã thêm tài khoản thành công!');
      closeAddModal();
      fetchCustomers();
    } else {
      alert('Lỗi: ' + data.message);
    }
  } catch (error) {
    console.error('Error creating customer:', error);
    alert('Lỗi hệ thống khi thêm tài khoản!');
  }
}

// Close modals when clicking outside
window.onclick = function (event) {
  if (event.target == document.getElementById('editModal')) closeModal();
  if (event.target == document.getElementById('addModal')) closeAddModal();
  if (event.target == document.getElementById('editProductModal')) closeEditProductModal();
  if (event.target == document.getElementById('addProductModal')) closeAddProductModal();
  if (event.target == document.getElementById('editOrderModal')) closeEditOrderModal();
}
