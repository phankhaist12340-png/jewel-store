const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');


const app = express();
const PORT = 3000;

function formatVnTime(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const HH = String(date.getHours()).padStart(2, '0');
  const MM = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}${HH}${MM}${ss}`;
}

function sortObject(obj) {
  let sorted = {};
  let keys = Object.keys(obj).sort();
  for (let key of keys) {
    sorted[key] = obj[key];
  }
  return sorted;
}

const vnp_TmnCode = "9J619TA4";
const vnp_HashSecret = "MNCXOA67HGFBCCA7DOIDRH9TMMGL9535";
const vnp_Url = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
const vnp_ReturnUrl = "http://localhost:3000/api/vnpay_return"; // Đổi port backend nếu cần

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));

// Serve frontend static files
const path = require('path');
app.use(express.static(__dirname));

// Cấu hình kết nối MySQL
//sửa lại username và password theo cấu hình XAMPP/MySQL
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '', // Thường XAMPP để trống pass
  database: 'wbs_store',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

let pool;

async function initDb() {
  try {
    pool = mysql.createPool(dbConfig);
    console.log('Đã cấu hình connection pool tới MySQL (database: wbs_store).');
  } catch (error) {
    console.error('Lỗi khi thiết lập kết nối MySQL:', error);
  }
}

initDb();

// API: Đăng ký
app.post('/api/register', async (req, res) => {
  const { fullname, email, phone, password, role, address } = req.body;

  // Set default role to 0 if not provided
  const userRole = role !== undefined ? role : 0;

  if (!fullname || !email || !phone || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin!' });
  }

  if (!email.endsWith('@gmail.com')) {
    return res.status(400).json({ success: false, message: 'Email phải có định dạng @gmail.com!' });
  }

  try {
    // 1. Kiểm tra email hoặc sđt đã tồn tại chưa
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ? OR phone = ?',
      [email, phone]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: 'Email hoặc số điện thoại đã được đăng ký!' });
    }

    // 2. Lấy ID lớn nhất hiện tại để đảm bảo tính liên tục
    const [maxIdResult] = await pool.execute('SELECT MAX(id) as maxId FROM users');
    const nextId = (maxIdResult[0].maxId || 0) + 1;
    await pool.execute(`ALTER TABLE users AUTO_INCREMENT = ${nextId}`);

    // 3. Thêm vào DB (có chèn thêm role và address)
    const [result] = await pool.execute(
      'INSERT INTO users (fullname, email, phone, password, role, address) VALUES (?, ?, ?, ?, ?, ?)',
      [fullname, email, phone, password, userRole, address || null]
    );

    res.status(201).json({ success: true, message: 'Đăng ký thành công!' });
  } catch (error) {
    console.error('Lỗi API Đăng ký:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ. Hãy chắc chắn bạn đã chạy file database.sql mới nhat.' });
  }
});

// API: Đăng nhập
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body; // HTML login form gửi email hoặc số điện thoại qua trường 'email'

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ thông tin!' });
  }

  try {
    // 1. Tìm user bằng email HOẶC phone
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ? OR phone = ?',
      [email, email]
    );

    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Email/Số điện thoại hoặc mật khẩu không chính xác.' });
    }

    const user = users[0];

    // 2. Kiểm tra password (so sánh chuỗi trực tiếp)
    const isMatch = password === user.password;

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Email/Số điện thoại hoặc mật khẩu không chính xác.' });
    }

    // 3. Thành công -> Trả về dữ liệu (bao gồm password và role)
    const userData = {
      id: user.id,
      fullname: user.fullname,
      email: user.email,
      phone: user.phone,
      address: user.address,
      password: user.password,
      role: user.role
    };

    res.json({ success: true, message: 'Đăng nhập thành công!', user: userData });
  } catch (error) {
    console.error('Lỗi API Đăng nhập:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ.' });
  }
});

// API: Lấy thông tin người dùng theo ID
app.get('/api/user/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const [users] = await pool.execute('SELECT id, fullname, email, phone, address, password, role FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng!' });
    }
    res.json({ success: true, user: users[0] });
  } catch (error) {
    console.error('Lỗi API Lấy thông tin người dùng:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ.' });
  }
});

// API: Lấy danh sách tất cả người dùng (Admin)
app.get('/api/users', async (req, res) => {
  try {
    const [users] = await pool.execute('SELECT * FROM users ORDER BY id ASC');
    res.json({ success: true, users });
  } catch (error) {
    console.error('Lỗi API Lấy danh sách người dùng:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ.' });
  }
});

// API: Cập nhật thông tin người dùng (Admin)
app.put('/api/user/:id', async (req, res) => {
  const userId = req.params.id;
  const { fullname, email, phone, address, password, role } = req.body;

  if (!fullname || !email || !phone) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập đầy đủ họ tên, email và số điện thoại!' });
  }

  if (!email.endsWith('@gmail.com')) {
    return res.status(400).json({ success: false, message: 'Email phải có định dạng @gmail.com!' });
  }

  try {
    // 1. Kiểm tra xem email/phone mới có trùng với user khác không
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE (email = ? OR phone = ?) AND id != ?',
      [email, phone, userId]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: 'Email hoặc số điện thoại đã được sử dụng bởi người khác!' });
    }

    // Xây dựng câu lệnh UPDATE động
    let query = 'UPDATE users SET fullname = ?, email = ?, phone = ?, address = ?';
    let params = [fullname, email, phone, address];

    if (password) {
      query += ', password = ?';
      params.push(password);
    }

    if (role !== undefined) {
      query += ', role = ?';
      params.push(role);
    }

    query += ' WHERE id = ?';
    params.push(userId);

    const [result] = await pool.execute(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng!' });
    }

    // Lấy lại thông tin mới để trả về
    const [updatedUsers] = await pool.execute('SELECT id, fullname, email, phone, address, password, role FROM users WHERE id = ?', [userId]);

    res.json({ success: true, message: 'Cập nhật thông tin thành công!', user: updatedUsers[0] });
  } catch (error) {
    console.error('Lỗi API Cập nhật người dùng:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ.' });
  }
});

// API: Xóa người dùng
app.delete('/api/user/:id', async (req, res) => {
  const userId = req.params.id;
  try {
    const [result] = await pool.execute('DELETE FROM users WHERE id = ?', [userId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng!' });
    }
    res.json({ success: true, message: 'Đã xóa người dùng thành công!' });
  } catch (error) {
    console.error('Lỗi API Xóa người dùng:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ.' });
  }
});

app.get('/api/products', async (req, res) => {
  const { search } = req.query;
  try {
    let query = 'SELECT * FROM product_detail';
    let params = [];

    if (search) {
      query += ' WHERE name LIKE ? OR productCode LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern);
    }

    query += ' ORDER BY id ASC';
    const [products] = await pool.execute(query, params);

    res.json({ success: true, products });
  } catch (error) {
    console.error('Lỗi lấy danh sách sản phẩm:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ: ' + error.message });
  }
});

// API: Lấy chi tiết sản phẩm
app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [products] = await pool.execute('SELECT * FROM product_detail WHERE id = ?', [id]);
    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm.' });
    }

    res.json({
      success: true,
      product: products[0]
    });
  } catch (error) {
    console.error('Lỗi lấy chi tiết sản phẩm:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ: ' + error.message });
  }
});

// API: Xóa sản phẩm
app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute('DELETE FROM product_detail WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm để xóa.' });
    }
    res.json({ success: true, message: 'Đã xóa sản phẩm thành công.' });
  } catch (error) {
    console.error('Lỗi khi xóa sản phẩm:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ: ' + error.message });
  }
});

app.put('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  const { name, price, description, category, stock, image_url, productCode } = req.body;
  try {
    const params = [name || null, price || 0, description || null, category || null, stock || 0, image_url || null, productCode || null, id];
    const [result] = await pool.execute(
      'UPDATE product_detail SET name = ?, price = ?, description = ?, category = ?, stock = ?, image_url = ?, productCode = ? WHERE id = ?',
      params
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm để cập nhật.' });
    }
    res.json({ success: true, message: 'Đã cập nhật sản phẩm thành công.' });
  } catch (error) {
    console.error('Lỗi khi cập nhật sản phẩm:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ: ' + error.message });
  }
});

// API: Thêm sản phẩm mới
app.post('/api/products', async (req, res) => {
  const { name, price, description, category, stock, image_url, productCode } = req.body;

  if (!name || !price) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập tên và giá sản phẩm!' });
  }

  try {
    // Đảm bảo ID tăng dần từ ID lớn nhất hiện có
    const [maxIdResult] = await pool.execute('SELECT MAX(id) as maxId FROM product_detail');
    const nextId = (maxIdResult[0].maxId || 0) + 1;
    await pool.execute(`ALTER TABLE product_detail AUTO_INCREMENT = ${nextId}`);

    const [result] = await pool.execute(
      'INSERT INTO product_detail (name, price, description, category, stock, image_url, productCode) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name || null, price || 0, description || null, category || null, stock || 0, image_url || null, productCode || null]
    );
    res.json({ success: true, message: 'Đã thêm sản phẩm thành công.', id: result.insertId });
  } catch (error) {
    console.error('Lỗi khi thêm sản phẩm:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ nội bộ: ' + error.message });
  }
});

// API: Kiểm tra mã giảm giá
app.post('/api/discount/validate', async (req, res) => {
  const { code, order_value } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: 'Vui lòng nhập mã giảm giá!' });
  }

  try {
    const [codes] = await pool.execute('SELECT * FROM discount_codes WHERE code = ? AND is_active = TRUE', [code]);
    if (codes.length === 0) {
      return res.status(404).json({ success: false, message: 'Mã giảm giá không tồn tại hoặc không còn hiệu lực.' });
    }

    const discount = codes[0];
    if (order_value && order_value < discount.min_order_value) {
      return res.status(400).json({ success: false, message: `Đơn hàng chưa đạt giá trị tối thiểu (${Number(discount.min_order_value).toLocaleString()}đ) để áp dụng mã này.` });
    }

    res.json({ success: true, discount });
  } catch (error) {
    console.error('Lỗi khi kiểm tra mã giảm giá:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
  }
});

// API: Tạo đơn hàng mới
app.post('/api/orders', async (req, res) => {
  const { user_id, items, total_amount, payment_method, note } = req.body;

  if (!user_id || !items || items.length === 0) {
    return res.status(400).json({ success: false, message: 'Dữ liệu đơn hàng không hợp lệ!' });
  }

  const initialStatus = payment_method === 'VNPAY' ? 'Chờ thanh toán' : 'Đã đặt';

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Chèn vào bảng orders
    const [orderResult] = await connection.execute(
      'INSERT INTO orders (user_id, total_amount, status, note) VALUES (?, ?, ?, ?)',
      [user_id, total_amount, initialStatus, note || null]
    );
    const orderId = orderResult.insertId;

    // 2. Kiểm tra tồn kho và Chèn vào bảng order_items
    for (const item of items) {
      // 2a. Kiểm tra tồn kho hiện tại
      const [products] = await connection.execute(
        'SELECT stock, name FROM product_detail WHERE id = ? FOR UPDATE',
        [item.id]
      );

      if (products.length === 0) {
        throw new Error(`Sản phẩm với ID ${item.id} không tồn tại!`);
      }

      const product = products[0];
      if (product.stock < item.quantity) {
        throw new Error(`Sản phẩm "${product.name}" không đủ tồn kho (Còn lại: ${product.stock})!`);
      }

      // 2b. Chèn vào bảng order_items
      await connection.execute(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.id, item.quantity, item.price]
      );

      // 3. Cập nhật số lượng tồn kho (giảm bớt)
      await connection.execute(
        'UPDATE product_detail SET stock = stock - ? WHERE id = ?',
        [item.quantity, item.id]
      );
    }

    await connection.commit();
    res.status(201).json({ success: true, message: 'Đặt hàng thành công!', orderId });
  } catch (error) {
    await connection.rollback();
    console.error('Lỗi API Tạo đơn hàng:', error);
    res.status(400).json({ success: false, message: error.message || 'Lỗi máy chủ khi tạo đơn hàng.' });
  } finally {
    connection.release();
  }
});

// API: Lấy thống kê tổng quan (Admin)
app.get('/api/statistics', async (req, res) => {
  try {
    const [[{ total_revenue }]] = await pool.execute("SELECT SUM(total_amount) as total_revenue FROM orders WHERE status = 'Hoàn thành' OR status = 'Đã thanh toán'");
    const [[{ total_orders }]] = await pool.execute("SELECT COUNT(*) as total_orders FROM orders");
    const [[{ total_customers }]] = await pool.execute("SELECT COUNT(*) as total_customers FROM users WHERE role = 0");
    const [[{ total_products }]] = await pool.execute("SELECT COUNT(*) as total_products FROM product_detail");
    const [[{ total_canceled }]] = await pool.execute("SELECT COUNT(*) as total_canceled FROM orders WHERE status = 'Đã hủy'");

    // Lấy doanh thu theo ngày trong 7 ngày gần nhất
    const [daily_revenue] = await pool.execute(`
      SELECT DATE(created_at) as date, SUM(total_amount) as revenue 
      FROM orders 
      WHERE (status = 'Hoàn thành' OR status = 'Đã thanh toán') 
      AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    res.json({
      success: true,
      data: {
        total_revenue: total_revenue || 0,
        total_orders,
        total_customers,
        total_products,
        total_canceled: total_canceled || 0,
        daily_revenue
      }
    });
  } catch (error) {
    console.error('Lỗi API Thống kê:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
  }
});

// API: Lấy danh sách tất cả đơn hàng (Admin)
app.get('/api/orders', async (req, res) => {
  try {
    const [orders] = await pool.execute(`
      SELECT o.*, u.fullname as customer_name, u.email as customer_email 
      FROM orders o 
      JOIN users u ON o.user_id = u.id 
      ORDER BY o.created_at DESC
    `);
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Lỗi API Lấy tất cả đơn hàng:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
  }
});

// API: Lấy chi tiết đơn hàng (bao gồm items)
app.get('/api/orders/:id', async (req, res) => {
  const orderId = req.params.id;
  try {
    const [orders] = await pool.execute(`
      SELECT o.*, u.fullname as customer_name, u.email as customer_email, u.phone as customer_phone, u.address as shipping_address 
      FROM orders o 
      JOIN users u ON o.user_id = u.id 
      WHERE o.id = ?
    `, [orderId]);
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng.' });
    }

    const [items] = await pool.execute(`
      SELECT oi.*, p.name as product_name, p.image_url 
      FROM order_items oi 
      JOIN product_detail p ON oi.product_id = p.id 
      WHERE oi.order_id = ?
    `, [orderId]);

    res.json({ success: true, order: orders[0], items });
  } catch (error) {
    console.error('Lỗi API Lấy chi tiết đơn hàng:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
  }
});

// API: Cập nhật trạng thái đơn hàng (Admin)
app.put('/api/orders/:id/status', async (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  if (!status) return res.status(400).json({ success: false, message: 'Trạng thái không hợp lệ' });

  try {
    const [result] = await pool.execute('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đơn hàng' });
    }
    res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
  } catch (error) {
    console.error('Lỗi khi cập nhật trạng thái đơn hàng:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ' });
  }
});

// API: Xóa đơn hàng (Admin)
app.delete('/api/orders/:id', async (req, res) => {
  const orderId = req.params.id;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // Khôi phục tồn kho trước khi xóa
    const [items] = await connection.execute('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
    for (const item of items) {
      await connection.execute('UPDATE product_detail SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
    }

    await connection.execute('DELETE FROM order_items WHERE order_id = ?', [orderId]);
    const [result] = await connection.execute('DELETE FROM orders WHERE id = ?', [orderId]);

    if (result.affectedRows === 0) {
      throw new Error('Không tìm thấy đơn hàng');
    }

    await connection.commit();
    res.json({ success: true, message: 'Xóa đơn hàng thành công' });
  } catch (error) {
    await connection.rollback();
    console.error('Lỗi khi xóa đơn hàng:', error);
    res.status(500).json({ success: false, message: error.message || 'Lỗi máy chủ' });
  } finally {
    connection.release();
  }
});

// API: Lấy danh sách đơn hàng của một người dùng
app.get('/api/orders/user/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const [orders] = await pool.execute('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [userId]);
    res.json({ success: true, orders });
  } catch (error) {
    console.error('Lỗi API Lấy đơn hàng người dùng:', error);
    res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
  }
});

app.post('/api/create_payment_url', (req, res) => {
  const { orderId, amount, bankCode } = req.body;

  const date = new Date();
  // Convert to Vietnam time using UTC offset (+7)
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const vnDate = new Date(utc + (7 * 3600000));

  let vnp_Params = {};
  vnp_Params['vnp_Version'] = '2.1.0';
  vnp_Params['vnp_Command'] = 'pay';
  vnp_Params['vnp_TmnCode'] = vnp_TmnCode;
  vnp_Params['vnp_Locale'] = 'vn';
  vnp_Params['vnp_CurrCode'] = 'VND';
  vnp_Params['vnp_TxnRef'] = String(orderId);
  vnp_Params['vnp_OrderInfo'] = 'Thanh toan don hang ' + orderId;
  vnp_Params['vnp_OrderType'] = 'other';
  vnp_Params['vnp_Amount'] = String(Math.floor(amount * 100));
  vnp_Params['vnp_ReturnUrl'] = vnp_ReturnUrl;
  vnp_Params['vnp_IpAddr'] = '127.0.0.1';
  vnp_Params['vnp_CreateDate'] = formatVnTime(vnDate);

  if (bankCode) {
    vnp_Params['vnp_BankCode'] = bankCode;
  }

  vnp_Params = sortObject(vnp_Params);

  // Build hash data and query string (matching VNPay Java example exactly)
  // hashData: key (plain) = value (URL-encoded with + for spaces)
  // queryStr: key (URL-encoded) = value (URL-encoded)
  let hashData = '';
  let queryStr = '';
  const keys = Object.keys(vnp_Params);
  for (let idx = 0; idx < keys.length; idx++) {
    const key = keys[idx];
    const value = vnp_Params[key];
    if (value !== null && value !== undefined && value.length > 0) {
      // encodeURIComponent then replace %20 with + (matching PHP urlencode / Java URLEncoder)
      const encodedValue = encodeURIComponent(value).replace(/%20/g, '+');
      const encodedKey = encodeURIComponent(key);

      if (idx > 0) {
        hashData += '&';
        queryStr += '&';
      }
      // Hash data: key NOT encoded, value encoded (matching Java example)
      hashData += key + '=' + encodedValue;
      // Query string: both key and value encoded
      queryStr += encodedKey + '=' + encodedValue;
    }
  }

  const hmac = crypto.createHmac("sha512", vnp_HashSecret);
  const signed = hmac.update(Buffer.from(hashData, 'utf-8')).digest("hex");

  queryStr += '&vnp_SecureHash=' + signed;
  const redirectUrl = vnp_Url + '?' + queryStr;

  res.json({ success: true, redirectUrl });
});

app.get('/api/vnpay_return', async (req, res) => {
  let vnp_Params = req.query;
  const secureHash = vnp_Params['vnp_SecureHash'];

  delete vnp_Params['vnp_SecureHash'];
  delete vnp_Params['vnp_SecureHashType'];

  vnp_Params = sortObject(vnp_Params);

  // Build hash data matching VNPay signing pattern
  let hashData = '';
  const keys = Object.keys(vnp_Params);
  for (let idx = 0; idx < keys.length; idx++) {
    const key = keys[idx];
    const value = vnp_Params[key];
    if (value !== null && value !== undefined && String(value).length > 0) {
      const encodedValue = encodeURIComponent(value).replace(/%20/g, '+');
      if (idx > 0) hashData += '&';
      hashData += key + '=' + encodedValue;
    }
  }

  const hmac = crypto.createHmac("sha512", vnp_HashSecret);
  const signed = hmac.update(Buffer.from(hashData, 'utf-8')).digest("hex");

  if (secureHash === signed) {
    const orderId = vnp_Params['vnp_TxnRef'];
    const rspCode = vnp_Params['vnp_ResponseCode'];

    if (rspCode === '00') {
      try {
        await pool.execute('UPDATE orders SET status = ? WHERE id = ?', ['Đã thanh toán', orderId]);
        res.send(`<script>window.location.href = "/payment-success.html?id=${orderId}";</script>`);
      } catch (e) {
        res.send(`<script>window.location.href = "/order-detail.html?id=${orderId}&vnpay=error";</script>`);
      }
    } else {
      res.send(`<script>window.location.href = "/order-detail.html?id=${orderId}&vnpay=failed";</script>`);
    }
  } else {
    res.send(`<script>window.location.href = "/orders.html?vnpay=invalid";</script>`);
  }
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`🚀 Backend Server đang chạy tại http://localhost:${PORT}`);
  console.log(`👉 Hãy chắc chắn bạn đã chạy XAMPP và tạo CSDL 'wbs_store' từ file database.sql`);
  console.log(`========================================\n`);
});
