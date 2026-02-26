-- Esquema de la base de datos para MiVitrina

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  mercado_pago_account_id VARCHAR(255),
  payout_automation_enabled BOOLEAN DEFAULT true NOT NULL,
  password_reset_token_hash VARCHAR(255),
  password_reset_expires_at TIMESTAMP,
  bio TEXT,
  phone VARCHAR(50),
  profile_image TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de calificaciones de vendedores
CREATE TABLE IF NOT EXISTS seller_ratings (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(seller_id, buyer_id)
);

-- Tabla de categorías
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

-- Tabla de productos
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  quantity INTEGER DEFAULT 1 NOT NULL,
  image_url TEXT,
  category_id INTEGER REFERENCES categories(id),
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de imágenes adicionales de productos
CREATE TABLE IF NOT EXISTS product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL
);

-- Tabla de órdenes
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50),
  customer_address VARCHAR(255),
  customer_city VARCHAR(100),
  total_amount DECIMAL(10, 2) NOT NULL,
  platform_fee_percentage DECIMAL(5, 2) DEFAULT 3.00 NOT NULL,
  platform_fee_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  seller_net_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  currency_id VARCHAR(10) DEFAULT 'COP',
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50) DEFAULT 'mercado_pago',
  payment_id VARCHAR(255),
  mercado_pago_preference_id VARCHAR(255),
  paid_at TIMESTAMP,
  last_payment_webhook_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de items de orden
CREATE TABLE IF NOT EXISTS order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  seller_id INTEGER REFERENCES users(id),
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  platform_fee_percentage DECIMAL(5, 2) DEFAULT 3.00 NOT NULL,
  platform_fee_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  seller_net_amount DECIMAL(10, 2) DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de pagos
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  payment_id VARCHAR(255) UNIQUE,
  external_reference VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  amount DECIMAL(10, 2) NOT NULL,
  gross_amount DECIMAL(10, 2),
  fee_amount DECIMAL(10, 2),
  net_amount DECIMAL(10, 2),
  currency_id VARCHAR(10),
  payment_method VARCHAR(50) DEFAULT 'mercado_pago',
  payment_type_id VARCHAR(50),
  approved_at TIMESTAMP,
  mercado_pago_payment_id VARCHAR(255),
  mercado_pago_status VARCHAR(50),
  transaction_id VARCHAR(255),
  webhook_payload JSONB,
  webhook_received_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de facturas
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  order_id INTEGER UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'emitida',
  subtotal DECIMAL(10, 2) NOT NULL,
  platform_fee_amount DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  currency_id VARCHAR(10) DEFAULT 'COP' NOT NULL,
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de envíos
CREATE TABLE IF NOT EXISTS shipments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'pendiente_preparacion',
  shipping_address VARCHAR(255),
  shipping_city VARCHAR(100),
  tracking_code VARCHAR(120),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Auditoría de eventos de webhook
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id SERIAL PRIMARY KEY,
  source VARCHAR(30) NOT NULL,
  event_key VARCHAR(120) NOT NULL,
  payment_id VARCHAR(120),
  event_type VARCHAR(80),
  payload JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(source, event_key)
);

-- Tabla de payouts manuales a vendedores
CREATE TABLE IF NOT EXISTS seller_payouts (
  id SERIAL PRIMARY KEY,
  seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  transfer_provider VARCHAR(50) DEFAULT 'mercado_pago',
  external_transfer_id VARCHAR(255),
  transfer_error TEXT,
  transfer_attempts INTEGER DEFAULT 0 NOT NULL,
  notes TEXT,
  created_by_user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);

-- Relación entre payout e items de orden pagados al vendedor
CREATE TABLE IF NOT EXISTS seller_payout_items (
  id SERIAL PRIMARY KEY,
  payout_id INTEGER REFERENCES seller_payouts(id) ON DELETE CASCADE,
  order_item_id INTEGER UNIQUE REFERENCES order_items(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de carrito de compras por usuario
CREATE TABLE IF NOT EXISTS cart_items (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1 NOT NULL,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, product_id)
);

-- Insertar categorías por defecto (si no existen)
INSERT INTO categories (name) 
VALUES ('Ropa'), ('Calzado'), ('Electrónica'), ('Hogar'), ('Accesorios')
ON CONFLICT DO NOTHING;
