# ⚙️ Configuración Completada

## ✅ Instalaciones

- ✅ `mercadopago` instalado en `/server`
- ✅ Todas las dependencias actualizadas

## ✅ Variables de Entorno

### Server (`/server/.env`)
```
DATABASE_URL=postgresql://... (ya existía)
CLOUDINARY_* (ya existía)
JWT_SECRET=... (ya existía)
PORT=3000
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:3000
MERCADO_PAGO_ACCESS_TOKEN=⚠️ REQUIERE TU CREDENCIAL
```

### Client (`/client/.env`)
```
VITE_API_URL=http://localhost:3000/api
VITE_MERCADO_PAGO_PUBLIC_KEY=⚠️ REQUIERE TU CREDENCIAL
```

## 📝 Archivos Actualizados

- ✅ `server/.env` - Agregadas variables de Mercado Pago
- ✅ `client/.env` - Creado con variables necesarias
- ✅ `server/routes/paymentRoutes.ts` - Integración Mercado Pago SDK
- ✅ `client/src/lib/axios.ts` - Usa variable de entorno VITE_API_URL

## 🎯 Próximo Paso

**IMPORTANTE**: Debes agregar tus credenciales reales de Mercado Pago:

1. Ve a: https://www.mercadopago.com/developers/panel
2. Obtén tu `Access Token` y `Public Key`
3. Actualiza:
   - `server/.env`: `MERCADO_PAGO_ACCESS_TOKEN=...`
   - `client/.env`: `VITE_MERCADO_PAGO_PUBLIC_KEY=...`

Ver `/mivitrina/SETUP_GUIDE.md` para instrucciones detalladas.

## 🚀 Para Iniciar la Aplicación

```bash
# Terminal 1 - Server
cd /Users/mac/Desktop/mivitrina/server
npm run dev

# Terminal 2 - Client
cd /Users/mac/Desktop/mivitrina/client
npm run dev
```

La aplicación estará en: http://localhost:5173
API estará en: http://localhost:3000/api
