const mysql = require('mysql2/promise');

async function updateDb() {
  const config = { host: 'localhost', user: 'root', password: '', database: 'wbs_store' };
  try {
    const connection = await mysql.createConnection(config);
    // Thay đổi kiểu dữ liệu để dung lượng lớn hơn
    await connection.execute(`ALTER TABLE discount_codes MODIFY value DECIMAL(15, 0) NOT NULL`);
    await connection.execute(`ALTER TABLE discount_codes MODIFY min_order_value DECIMAL(15, 0) DEFAULT 0`);
    
    // Thêm một mã giảm giá cực khủng như trong ảnh
    await connection.execute(`
      INSERT IGNORE INTO discount_codes (code, type, value, min_order_value) 
      VALUES ('GIAM10TY', 'fixed', 10000000000, 0)
    `);
    
    console.log("Cập nhật CSDL thành công!");
    await connection.end();
  } catch (err) {
    console.error("Lỗi:", err);
  }
}
updateDb();
