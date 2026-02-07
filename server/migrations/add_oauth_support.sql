-- Modificaciones para soportar autenticación con Google, Facebook y Email
-- Ejecutar en Neon SQL Editor

-- 1. Agregar columnas para OAuth en la tabla users
ALTER TABLE users 
  ALTER COLUMN password DROP NOT NULL; -- Contraseña opcional (no necesaria para OAuth)

ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS provider VARCHAR(50) DEFAULT 'email',
  ADD COLUMN IF NOT EXISTS provider_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;

-- 2. Crear índice único compuesto para evitar duplicados por proveedor
CREATE UNIQUE INDEX IF NOT EXISTS users_provider_provider_id_unique 
  ON users(provider, provider_id) 
  WHERE provider_id IS NOT NULL;

-- 3. Actualizar usuarios existentes para que tengan provider = 'email'
UPDATE users 
SET provider = 'email', email_verified = true 
WHERE provider IS NULL;

-- Nota: Los usuarios con OAuth tendrán:
-- - provider: 'google' o 'facebook'
-- - provider_id: ID único del proveedor
-- - password: NULL (no necesitan contraseña local)
-- - email_verified: true (el proveedor ya verificó el email)
