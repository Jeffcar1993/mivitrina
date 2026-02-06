# 🛍️ Guía de Configuración - MiVitrina

## Variables de Entorno Configuradas

### Server (.env)

```env
# Base de Datos (Neon)
DATABASE_URL=postgresql://...
JWT_SECRET=tu-secreto-super-seguro-cambiar-en-produccion

# Cloudinary (ya configurado)
CLOUDINARY_CLOUD_NAME=dyknrzw2o
CLOUDINARY_API_KEY=684787747991165
CLOUDINARY_API_SECRET=NmjRV9R9TR__xBtL4g6NFc753lU

# Mercado Pago - NECESITA CONFIGURACIÓN
MERCADO_PAGO_ACCESS_TOKEN=tu-access-token-aqui

# URLs
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:3000
PORT=3000
```

### Client (.env)

```env
# API Base URL
VITE_API_URL=http://localhost:3000/api

# Mercado Pago - NECESITA CONFIGURACIÓN
VITE_MERCADO_PAGO_PUBLIC_KEY=tu-public-key-aqui
```

---

## 📋 Pasos para Obtener Credenciales de Mercado Pago

### 1. Crear/Acceder a Cuenta de Mercado Pago

- Ir a: https://www.mercadopago.com/developers/panel
- Iniciar sesión con tu cuenta de Mercado Pago (crear si no tienes)
- Seleccionar país: Colombia 🇨🇴

### 2. Obtener Access Token (Para el Backend)

- En el panel, ir a **Settings > Credentials**
- Buscar sección "Access Token"
- En ambiente de **Producción** (o **Testing** para pruebas)
- Copiar el **Access Token**
- Pegar en `server/.env`:
  ```
  MERCADO_PAGO_ACCESS_TOKEN=APP_USR-1234567890-...
  ```

### 3. Obtener Public Key (Para el Frontend)

- En el mismo panel, buscar **Public Key**
- Copiar la clave pública
- Pegar en `client/.env`:
  ```
  VITE_MERCADO_PAGO_PUBLIC_KEY=APP_USR-...-...
  ```

---

## 🧪 Testing

Para hacer pruebas sin dinero real:

1. **Usar ambiente de Testing** en Mercado Pago
2. **Tarjetas de prueba proporcionadas por MP**:
   - Visa: `4111 1111 1111 1111`
   - Mastercard: `5555 4444 3333 2222`
   - Fecha: Cualquier fecha futura
   - CVV: Cualquier número de 3 dígitos

---

## ✅ Checklist de Instalación

- [x] Dependencias instaladas (`npm install mercadopago`)
- [x] Variables de entorno creadas
- [ ] **PENDIENTE**: Agregar credenciales reales de Mercado Pago
- [ ] Ejecutar migraciones de base de datos (tablas de órdenes)
- [ ] Probar flujo de compra completo

---

## 🚀 Próximos Pasos

1. **Obtener credenciales de Mercado Pago** (ver arriba)
2. **Actualizar `.env` files** con las credenciales
3. **Ejecutar en terminal**:
   ```bash
   # Server
   cd server
   npm run dev
   
   # Client (otra terminal)
   cd client
   npm run dev
   ```
4. **Probar compra** en http://localhost:5173
5. **Verificar webhook** (opcional, para notificaciones automáticas)

---

## 📞 Soporte

- Documentación Mercado Pago: https://www.mercadopago.com.co/developers
- Issues comunes: Ver archivo `.env.example` en ambas carpetas
