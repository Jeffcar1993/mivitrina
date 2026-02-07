# 🔐 Configuración de Autenticación OAuth (Google & Facebook)

Este proyecto soporta autenticación con:
- ✉️ Email y contraseña (tradicional)
- 🔵 Google OAuth 2.0
- 🔷 Facebook Login

## 📋 Requisitos Previos

1. **Ejecutar la migración de base de datos**:
   ```bash
   # Ejecuta este SQL en tu Neon SQL Editor
   cat server/migrations/add_oauth_support.sql
   ```

2. **Crear aplicaciones OAuth en Google y Facebook**

---

## 🔵 GOOGLE OAUTH - Configuración Paso a Paso

### 1. Crear Proyecto en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. En el menú lateral, ve a **APIs & Services** → **Credentials**

### 2. Configurar Pantalla de Consentimiento OAuth

1. Click en **OAuth consent screen** (barra lateral)
2. Selecciona **External** como tipo de usuario
3. Completa la información requerida:
   - **App name**: MiVitrina
   - **User support email**: tu email
   - **Developer contact**: tu email
4. Click en **Save and Continue**
5. En **Scopes**, agrega:
   - `userinfo.email`
   - `userinfo.profile`
6. Click en **Save and Continue**
7. En **Test users**, agrega tu email para testing
8. Click en **Save and Continue**

### 3. Crear Credenciales OAuth 2.0

1. Ve a **Credentials** → **Create Credentials** → **OAuth client ID**
2. Selecciona **Web application**
3. Configura:
   - **Name**: MiVitrina Web Client
   - **Authorized JavaScript origins**:
     ```
     http://localhost:5173
     http://localhost:3000
     ```
   - **Authorized redirect URIs**:
     ```
     http://localhost:3000/api/auth/google/callback
     ```
4. Click en **Create**
5. **Copia el Client ID y Client Secret** ⚠️

### 4. Configurar Variables de Entorno

Edita `server/.env`:
```env
GOOGLE_CLIENT_ID=tu-client-id-aqui.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-client-secret-aqui
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
```

---

## 🔷 FACEBOOK LOGIN - Configuración Paso a Paso

### 1. Crear Aplicación de Facebook

1. Ve a [Facebook for Developers](https://developers.facebook.com/)
2. Click en **My Apps** → **Create App**
3. Selecciona **Consumer** como tipo de app
4. Completa la información:
   - **App Display Name**: MiVitrina
   - **App Contact Email**: tu email
5. Click en **Create App**

### 2. Agregar Facebook Login

1. En el Dashboard de tu app, click en **Add Product**
2. Busca **Facebook Login** y click en **Set Up**
3. Selecciona **Web** como plataforma
4. Ingresa la URL de tu sitio: `http://localhost:5173`
5. Click en **Save** y **Continue**

### 3. Configurar OAuth Redirect URIs

1. En el menú lateral, ve a **Facebook Login** → **Settings**
2. En **Valid OAuth Redirect URIs**, agrega:
   ```
   http://localhost:3000/api/auth/facebook/callback
   ```
3. Click en **Save Changes**

### 4. Obtener App ID y App Secret

1. En el menú lateral, ve a **Settings** → **Basic**
2. Copia el **App ID**
3. Click en **Show** en **App Secret** y cópialo ⚠️

### 5. Configurar Variables de Entorno

Edita `server/.env`:
```env
FACEBOOK_APP_ID=tu-app-id-aqui
FACEBOOK_APP_SECRET=tu-app-secret-aqui
FACEBOOK_CALLBACK_URL=http://localhost:3000/api/auth/facebook/callback
```

### 6. Configurar Permisos

1. Ve a **App Review** → **Permissions and Features**
2. Solicita el permiso `email` si no está aprobado (para desarrollo, ya está incluido)

---

## ⚙️ Variables de Entorno Completas

### Backend (`server/.env`)
```env
# Server
PORT=3000
CLIENT_URL=http://localhost:5173
JWT_SECRET=tu-secreto-super-seguro-cambiar-en-produccion

# Google OAuth
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Facebook OAuth
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...
FACEBOOK_CALLBACK_URL=http://localhost:3000/api/auth/facebook/callback

# Database
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require

# Otros servicios (Cloudinary, MercadoPago, etc.)
```

### Frontend (`client/.env`)
```env
VITE_API_URL=http://localhost:3000
```

---

## 🚀 Iniciar el Proyecto

1. **Instalar dependencias** (si no lo has hecho):
   ```bash
   # Backend
   cd server
   npm install

   # Frontend
   cd ../client
   npm install
   ```

2. **Ejecutar migración de base de datos**:
   - Abre Neon SQL Editor
   - Ejecuta el contenido de `server/migrations/add_oauth_support.sql`

3. **Configurar variables de entorno**:
   ```bash
   # Backend
   cp server/.env.example server/.env
   # Edita server/.env con tus credenciales

   # Frontend
   cp client/.env.example client/.env
   # Edita client/.env si usas URL diferente
   ```

4. **Iniciar servidores**:
   ```bash
   # Terminal 1 - Backend
   cd server
   npm run dev

   # Terminal 2 - Frontend
   cd client
   npm run dev
   ```

5. **Probar autenticación**:
   - Ve a `http://localhost:5173/login`
   - Prueba los botones de Google y Facebook
   - También puedes usar email/contraseña tradicional

---

## 🔍 Solución de Problemas

### Error: "redirect_uri_mismatch" (Google)
- Verifica que la URL de callback en Google Cloud Console coincida exactamente con `GOOGLE_CALLBACK_URL`
- Asegúrate de que no haya espacios o caracteres extra

### Error: "Can't Load URL" (Facebook)
- Verifica las URLs autorizadas en Facebook App Dashboard
- Asegúrate de que la app no esté en modo de desarrollo restrictivo

### Error: "No se pudo obtener el email"
- Google: Verifica que hayas agregado el scope `userinfo.email`
- Facebook: Verifica que hayas solicitado el permiso `email`

### Error 401 en rutas protegidas
- Verifica que `JWT_SECRET` sea el mismo en desarrollo y producción
- Limpia localStorage y vuelve a iniciar sesión

---

## 📝 Notas Importantes

1. **Migración de Usuarios Existentes**: 
   - Si un usuario ya existe con el mismo email, se actualizará automáticamente a OAuth
   - La contraseña anterior se mantendrá como respaldo

2. **Email Verificado**: 
   - Los usuarios OAuth se marcan automáticamente como `email_verified = true`
   - Los usuarios por email tradicional tienen `email_verified = false`

3. **Producción**:
   - Actualiza las URLs de callback a tu dominio de producción
   - Publica tu app de Facebook (App Review)
   - Actualiza las URLs autorizadas en Google Cloud Console

4. **Seguridad**:
   - **NUNCA** compartas tus Client Secrets o App Secrets
   - Agrega `.env` a `.gitignore`
   - Usa variables de entorno en producción (Vercel, Heroku, etc.)

---

## 🎨 Características Implementadas

✅ Login con Google
✅ Login con Facebook  
✅ Login tradicional (email/contraseña)
✅ Registro con Google
✅ Registro con Facebook
✅ Registro tradicional
✅ Migración automática de cuentas existentes
✅ Sincronización de perfiles (nombre, foto)
✅ Manejo de errores y mensajes amigables
✅ UI moderna con iconos de redes sociales

---

## 📚 Recursos Adicionales

- [Documentación OAuth 2.0 de Google](https://developers.google.com/identity/protocols/oauth2)
- [Documentación Facebook Login](https://developers.facebook.com/docs/facebook-login)
- [Passport.js Documentation](http://www.passportjs.org/docs/)

---

**¿Necesitas ayuda?** Revisa la consola del navegador y los logs del servidor para más detalles sobre errores.
