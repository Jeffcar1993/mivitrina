import express from 'express';
import passport from '../config/passport.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { query } from '../config/db.js';

const router = express.Router();
const JWT_SECRET = String(process.env.JWT_SECRET || '').trim();
const AUTH_COOKIE_NAME = 'auth_token';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const OAUTH_CODE_TTL_MS = 1000 * 60 * 2;
const PASSWORD_RESET_TOKEN_TTL_MS = 1000 * 60 * 30;
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

const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Al menos una mayúscula');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Al menos una minúscula');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Al menos un número');
  }

  const specialChars = '!@#$%^&*()_+=-[]{};\':"`\\|,.<>/?';
  if (![...specialChars].some(char => password.includes(char))) {
    errors.push('Al menos un carácter especial');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

const ensurePasswordResetColumns = async (): Promise<void> => {
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token_hash VARCHAR(255)');
  await query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMP');
};

const buildPasswordResetToken = (): { rawToken: string; tokenHash: string; expiresAt: Date } => {
  const rawToken = randomBytes(32).toString('hex');
  const tokenHash = createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
  return { rawToken, tokenHash, expiresAt };
};

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const normalizedUsername = String(username || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedUsername || !normalizedEmail || !password) {
      return res.status(400).json({ error: 'Completa todos los campos' });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'La contraseña no cumple con los requisitos de seguridad',
        requirements: passwordValidation.errors,
      });
    }

    const existing = await query(
      'SELECT email, username FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2)',
      [normalizedEmail, normalizedUsername]
    );
    if (existing.rows.length > 0) {
      const duplicateEmail = existing.rows.some(
        (row) => String(row.email || '').toLowerCase() === normalizedEmail
      );

      if (duplicateEmail) {
        return res.status(409).json({ error: 'El email ya ha sido registrado' });
      }

      return res.status(409).json({ error: 'El nombre de usuario ya existe' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
      [normalizedUsername, normalizedEmail, hashedPassword]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);

    res.json({ user });
  } catch (err) {
    console.error(err);
    const error = err as { code?: string };
    if (error?.code === '23505') {
      return res.status(409).json({ error: 'El email ya ha sido registrado' });
    }
    if (error?.code === '42P01') {
      return res.status(500).json({ error: 'La tabla de usuarios no existe. Revisa la base de datos.' });
    }
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Completa todos los campos' });
    }

    const result = await query('SELECT * FROM users WHERE LOWER(email) = LOWER($1)', [normalizedEmail]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const user = result.rows[0];
    const passwordHash = typeof user.password === 'string' ? user.password.trim() : '';

    if (!passwordHash) {
      return res.status(401).json({
        error: 'Esta cuenta no tiene contraseña local. Usa Google o solicita recuperación de contraseña.',
      });
    }

    const validPassword = await bcrypt.compare(password, passwordHash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email o contraseña incorrectos' });
    }

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
    const { password: _, ...userFields } = user;
    res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
    res.json({ user: userFields });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });
  res.json({ success: true });
});

router.post('/forgot-password', async (req, res) => {
  const normalizedEmail = String(req.body?.email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    return res.status(400).json({ error: 'Debes ingresar tu correo electrónico' });
  }

  try {
    await ensurePasswordResetColumns();

    const userResult = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
      [normalizedEmail]
    );

    let resetUrl: string | undefined;
    if (userResult.rows.length > 0) {
      const userId = Number(userResult.rows[0].id);
      const { rawToken, tokenHash, expiresAt } = buildPasswordResetToken();

      await query(
        `UPDATE users
         SET password_reset_token_hash = $1,
             password_reset_expires_at = $2
         WHERE id = $3`,
        [tokenHash, expiresAt, userId]
      );

      resetUrl = `${CLIENT_URL}/reset-password?token=${rawToken}`;
    }

    return res.json({
      success: true,
      message: 'Si el correo está registrado, enviamos instrucciones para recuperar tu contraseña.',
      resetUrl: process.env.NODE_ENV !== 'production' ? resetUrl : undefined,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'No se pudo iniciar la recuperación de contraseña' });
  }
});

router.post('/reset-password', async (req, res) => {
  const token = String(req.body?.token || '').trim();
  const newPassword = String(req.body?.password || '');

  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Token y nueva contraseña son obligatorios' });
  }

  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.isValid) {
    return res.status(400).json({
      error: 'La contraseña no cumple con los requisitos de seguridad',
      requirements: passwordValidation.errors,
    });
  }

  try {
    await ensurePasswordResetColumns();

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const userResult = await query(
      `SELECT id, password_reset_expires_at
       FROM users
       WHERE password_reset_token_hash = $1
       LIMIT 1`,
      [tokenHash]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ error: 'El enlace de recuperación es inválido' });
    }

    const expiresAt = userResult.rows[0].password_reset_expires_at as Date | string | null;
    const expiresAtDate = expiresAt ? new Date(expiresAt) : null;
    const isExpired = !expiresAtDate || Number.isNaN(expiresAtDate.getTime()) || expiresAtDate.getTime() <= Date.now();

    if (isExpired) {
      await query(
        `UPDATE users
         SET password_reset_token_hash = NULL,
             password_reset_expires_at = NULL
         WHERE id = $1`,
        [userResult.rows[0].id]
      );

      return res.status(400).json({
        error: 'El enlace de recuperación expiró. Solicita uno nuevo.',
      });
    }

    const userId = Number(userResult.rows[0].id);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await query(
      `UPDATE users
       SET password = $1,
           password_reset_token_hash = NULL,
           password_reset_expires_at = NULL
       WHERE id = $2`,
      [hashedPassword, userId]
    );

    return res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'No se pudo restablecer la contraseña' });
  }
});

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
