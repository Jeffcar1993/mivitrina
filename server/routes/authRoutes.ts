import express from 'express';
import passport from '../config/passport.js';
import jwt from 'jsonwebtoken';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'tu-secreto-super-seguro-cambiar-en-produccion';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ==================== GOOGLE OAUTH ====================
// Iniciar autenticación con Google
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  session: false 
}));

// Callback de Google
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${CLIENT_URL}/login?error=google_auth_failed` }),
  (req, res) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.redirect(`${CLIENT_URL}/login?error=no_user`);
      }

      // Crear token JWT
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
      
      // Eliminar contraseña antes de enviar
      const { password, ...userWithoutPassword } = user;
      
      // Redirigir al frontend con el token y datos del usuario
      const params = new URLSearchParams({
        token,
        user: JSON.stringify(userWithoutPassword)
      });
      
      res.redirect(`${CLIENT_URL}/auth/callback?${params.toString()}`);
    } catch (error) {
      console.error('Error en callback de Google:', error);
      res.redirect(`${CLIENT_URL}/login?error=auth_error`);
    }
  }
);

// ==================== FACEBOOK OAUTH ====================
// Iniciar autenticación con Facebook
router.get('/facebook', passport.authenticate('facebook', { 
  scope: ['email'],
  session: false 
}));

// Callback de Facebook
router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: `${CLIENT_URL}/login?error=facebook_auth_failed` }),
  (req, res) => {
    try {
      const user = req.user as any;
      if (!user) {
        return res.redirect(`${CLIENT_URL}/login?error=no_user`);
      }

      // Crear token JWT
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
      
      // Eliminar contraseña antes de enviar
      const { password, ...userWithoutPassword } = user;
      
      // Redirigir al frontend con el token y datos del usuario
      const params = new URLSearchParams({
        token,
        user: JSON.stringify(userWithoutPassword)
      });
      
      res.redirect(`${CLIENT_URL}/auth/callback?${params.toString()}`);
    } catch (error) {
      console.error('Error en callback de Facebook:', error);
      res.redirect(`${CLIENT_URL}/login?error=auth_error`);
    }
  }
);

export default router;
