-- Esquema de la base de datos para MiVitrina

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
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
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50) DEFAULT 'mercado_pago',
  payment_id VARCHAR(255),
  mercado_pago_preference_id VARCHAR(255),
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de pagos
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  payment_id VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'pending',
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'mercado_pago',
  mercado_pago_payment_id VARCHAR(255),
  mercado_pago_status VARCHAR(50),
  transaction_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
