import express from 'express';
import passport from '../config/passport.js';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const router = express.Router();
const JWT_SECRET = String(process.env.JWT_SECRET || '').trim();
const AUTH_COOKIE_NAME = 'auth_token';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const OAUTH_CODE_TTL_MS = 1000 * 60 * 2;
const isProduction = process.env.NODE_ENV === 'production';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET no está configurado. Define una clave segura en variables de entorno.');
}

type OAuthSessionPayload = {
  token: string;
  user: unknown;
  expiresAt: number;
};

const oauthCodeStore = new Map<string, OAuthSessionPayload>();

const authCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
} as const;

const cleanExpiredOAuthCodes = (): void => {
  const now = Date.now();
  for (const [code, payload] of oauthCodeStore.entries()) {
    if (payload.expiresAt <= now) {
      oauthCodeStore.delete(code);
    }
  }
};

const oauthCleanupInterval = setInterval(cleanExpiredOAuthCodes, 30_000);
oauthCleanupInterval.unref();

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

      const oauthCode = randomBytes(32).toString('hex');
      oauthCodeStore.set(oauthCode, {
        token,
        user: userWithoutPassword,
        expiresAt: Date.now() + OAUTH_CODE_TTL_MS,
      });

      const params = new URLSearchParams({ code: oauthCode });
      res.redirect(`${CLIENT_URL}/auth/callback?${params.toString()}`);
    } catch (error) {
      console.error('Error en callback de Google:', error);
      res.redirect(`${CLIENT_URL}/login?error=auth_error`);
    }
  }
);

router.post('/oauth/exchange', (req, res) => {
  const oauthCode = String(req.body?.code || '').trim();

  if (!oauthCode) {
    return res.status(400).json({ error: 'Código OAuth inválido' });
  }

  cleanExpiredOAuthCodes();

  const oauthPayload = oauthCodeStore.get(oauthCode);
  if (!oauthPayload) {
    return res.status(400).json({ error: 'Código OAuth inválido o expirado' });
  }

  oauthCodeStore.delete(oauthCode);
  res.cookie(AUTH_COOKIE_NAME, oauthPayload.token, authCookieOptions);
  return res.json({ user: oauthPayload.user });
});

export default router;
