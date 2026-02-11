import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { query } from './db.js';

// Configuración de estrategias OAuth
export function configurePassport() {
  // ==================== ESTRATEGIA GOOGLE ====================
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new Error('No se pudo obtener el email de Google'));
          }

          // Buscar usuario existente por proveedor y provider_id
          let result = await query(
            'SELECT * FROM users WHERE provider = $1 AND provider_id = $2',
            ['google', profile.id]
          );

          let user;
          if (result.rows.length > 0) {
            // Usuario ya existe
            user = result.rows[0];
          } else {
            // Verificar si existe un usuario con ese email (migración de cuenta)
            const emailCheck = await query('SELECT * FROM users WHERE email = $1', [email]);
            
            if (emailCheck.rows.length > 0) {
              // Email ya existe - actualizar a OAuth
              result = await query(
                `UPDATE users 
                 SET provider = $1, provider_id = $2, email_verified = true,
                     username = COALESCE(username, $3),
                     profile_image = COALESCE(profile_image, $4)
                 WHERE email = $5
                 RETURNING *`,
                ['google', profile.id, profile.displayName || email.split('@')[0], profile.photos?.[0]?.value, email]
              );
              user = result.rows[0];
            } else {
              // Crear nuevo usuario
              result = await query(
                `INSERT INTO users (username, email, provider, provider_id, email_verified, profile_image) 
                 VALUES ($1, $2, $3, $4, $5, $6) 
                 RETURNING *`,
                [
                  profile.displayName || email.split('@')[0],
                  email,
                  'google',
                  profile.id,
                  true,
                  profile.photos?.[0]?.value || null,
                ]
              );
              user = result.rows[0];
            }
          }

          return done(null, user);
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );

  // Serialización de usuario (opcional, para sesiones)
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const result = await query('SELECT * FROM users WHERE id = $1', [id]);
      done(null, result.rows[0]);
    } catch (error) {
      done(error);
    }
  });
}

export default passport;
