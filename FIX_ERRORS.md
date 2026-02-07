# 🔧 SOLUCIÓN DE ERRORES - PASO A PASO

## ✅ PASO 1: Ejecutar SQL en Neon

**NO ejecutes** `cat server/migrations/add_oauth_support.sql` en Neon.

**En su lugar:**

1. Abre Neon SQL Editor: https://console.neon.tech
2. **Copia y pega ESTE SQL** exactamente:

```sql
-- 1. Agregar columnas para OAuth en la tabla users
ALTER TABLE users 
  ALTER COLUMN password DROP NOT NULL;

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
```

3. Haz click en **Run** o presiona `Cmd + Enter`
4. Deberías ver: "Successfully ran X statements"

---

## ✅ PASO 2: Verificar archivos .env

### Backend ya está configurado ✅
`server/.env` ya tiene los placeholders necesarios.

### Frontend ya está configurado ✅
`client/.env` ya tiene la URL correcta.

---

## ✅ PASO 3: Reiniciar servidores

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

El servidor debería arrancar sin errores ahora.

---

## 🎯 ESTADO ACTUAL

### ✅ Lo que ya funciona:
- Login/Registro con email y contraseña
- Toda la funcionalidad existente
- La estructura OAuth está lista

### ⚠️ Lo que aún NO funciona (hasta configurar OAuth):
- Botones de Google (necesitas credenciales reales)
- Botones de Facebook (necesitas credenciales reales)

**Los botones aparecerán en /login y /register pero no funcionarán hasta que configures las credenciales de Google y Facebook.**

---

## 📋 Siguiente paso (OPCIONAL - solo si quieres activar OAuth):

Sigue la guía completa en `OAUTH_SETUP.md` para obtener credenciales reales de:
- Google Cloud Console
- Facebook Developers

**Por ahora, todo debería funcionar normalmente con email/contraseña.**

---

## 🐛 Si sigues teniendo errores:

1. **Error en Neon**: Verifica que copiaste el SQL completo, sin el comando `cat`
2. **Error en server**: Asegúrate de que `server/.env` tiene los placeholders
3. **Error en client**: Verifica que `VITE_API_URL=http://localhost:3000` (sin `/api`)

---

¡Listo! El servidor debería arrancar correctamente ahora. 🚀
