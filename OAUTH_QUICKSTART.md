# ⚡ Inicio Rápido - Autenticación OAuth

## 🎯 Lo que se implementó

✅ **Autenticación con Google** - OAuth 2.0
✅ **Autenticación con Facebook** - Facebook Login  
✅ **Autenticación con Email** - Tradicional (ya existía)

## 📁 Archivos Creados/Modificados

### Backend
- ✨ `server/config/passport.ts` - Configuración de estrategias OAuth
- ✨ `server/routes/authRoutes.ts` - Rutas de autenticación social
- ✨ `server/migrations/add_oauth_support.sql` - Migración SQL
- 📝 `server/index.ts` - Integración de Passport
- 📝 `server/.env.example` - Ejemplo de variables de entorno

### Frontend
- 📝 `client/src/pages/Login.tsx` - Botones de Google y Facebook
- 📝 `client/src/pages/Register.tsx` - Botones de Google y Facebook
- ✨ `client/src/pages/AuthCallback.tsx` - Procesa respuesta OAuth
- 📝 `client/src/main.tsx` - Ruta de callback agregada
- 📝 `client/.env.example` - Configuración de API URL

### Documentación
- 📚 `OAUTH_SETUP.md` - Guía completa paso a paso

## 🚀 Próximos Pasos (EN ORDEN)

### 1️⃣ Ejecutar Migración SQL (OBLIGATORIO)
```bash
# Abre Neon SQL Editor y ejecuta:
cat server/migrations/add_oauth_support.sql
```

### 2️⃣ Configurar Google OAuth
1. Ve a https://console.cloud.google.com/
2. Crea credenciales OAuth 2.0
3. Configura redirect URI: `http://localhost:3000/api/auth/google/callback`
4. Copia Client ID y Secret a `server/.env`

### 3️⃣ Configurar Facebook Login
1. Ve a https://developers.facebook.com/
2. Crea una app
3. Agrega Facebook Login
4. Configura redirect URI: `http://localhost:3000/api/auth/facebook/callback`
5. Copia App ID y Secret a `server/.env`

### 4️⃣ Configurar Variables de Entorno

**server/.env**:
```env
GOOGLE_CLIENT_ID=tu-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=tu-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

FACEBOOK_APP_ID=tu-app-id
FACEBOOK_APP_SECRET=tu-secret
FACEBOOK_CALLBACK_URL=http://localhost:3000/api/auth/facebook/callback

CLIENT_URL=http://localhost:5173
```

**client/.env**:
```env
VITE_API_URL=http://localhost:3000
```

### 5️⃣ Reiniciar Servidores
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend  
cd client
npm run dev
```

### 6️⃣ Probar
- Abre http://localhost:5173/login
- Haz click en los botones de Google o Facebook
- ¡Listo! 🎉

## 📖 Documentación Completa

Ver `OAUTH_SETUP.md` para:
- Guía detallada paso a paso
- Configuración de Google Cloud Console
- Configuración de Facebook App Dashboard
- Solución de problemas
- Notas de producción

## 🔒 Seguridad

⚠️ **IMPORTANTE**: 
- No subas archivos `.env` a Git
- Los archivos `.env.example` son solo plantillas
- Crea tus propios `.env` con tus credenciales reales

## ✨ Características

- Login/Registro con Google (un click)
- Login/Registro con Facebook (un click)
- Mantiene compatibilidad con email/contraseña
- Migración automática de usuarios existentes
- Sincronización de foto de perfil
- Manejo de errores amigable
- UI moderna y responsive

## 🐛 ¿Problemas?

1. Revisa la consola del navegador (F12)
2. Revisa los logs del servidor
3. Verifica que las URLs de callback coincidan EXACTAMENTE
4. Consulta la sección de troubleshooting en `OAUTH_SETUP.md`

---

**Versión**: 1.0.0  
**Fecha**: Febrero 2026
