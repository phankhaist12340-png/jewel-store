-- Create database
CREATE DATABASE IF NOT EXISTS wbs_store;
USE wbs_store;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fullname VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  password VARCHAR(255) NOT NULL,
  address VARCHAR(255),
  role TINYINT DEFAULT 0 COMMENT '0: User, 1: Admin',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create product_detail table
CREATE TABLE IF NOT EXISTS product_detail (
  id INT AUTO_INCREMENT PRIMARY KEY,
   productCode VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  price DECIMAL(12, 0) NOT NULL,
  description LONGTEXT,
  category VARCHAR(50),
  stock INT DEFAULT 0,
  image_url LONGTEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  total_amount DECIMAL(12, 0) NOT NULL,
  status VARCHAR(50) DEFAULT 'Đã đặt',
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  price DECIMAL(12, 0) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES product_detail(id) ON DELETE CASCADE
);

-- Create discount_codes table
CREATE TABLE IF NOT EXISTS discount_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  type ENUM('percent', 'fixed') NOT NULL,
  value DECIMAL(15, 0) NOT NULL,
  min_order_value DECIMAL(15, 0) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


