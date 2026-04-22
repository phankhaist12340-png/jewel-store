const mysql = require('mysql2/promise');

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'wbs_store'
};

async function setup() {
  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('Connected to DB wbs_store');

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS discount_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        type ENUM('percent', 'fixed') NOT NULL,
        value DECIMAL(15, 0) NOT NULL,
        min_order_value DECIMAL(15, 0) DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Table discount_codes created or already exists.');

    await connection.execute(`
      INSERT IGNORE INTO discount_codes (code, type, value, min_order_value)
      VALUES 
      ('WBS10', 'percent', 10, 0),
      ('GIAM50K', 'fixed', 50000, 200000),
      ('WELCOME20', 'percent', 20, 0)
    `);
    console.log('Mock discount codes inserted.');
  } catch (error) {
    console.error('Error setting up table:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setup();
