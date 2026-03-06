import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { query } from './config/db.js'; // TypeScript ESM requires explicit extensions
import cloudinary from './config/cloudinary.js';
import { upload } from './middleware/multer.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import authRoutes from './routes/authRoutes.js';
import { authMiddleware, type AuthRequest } from './middleware/auth.js';
import passport from './config/passport.js';
import { configurePassport } from './config/passport.js';

dotenv.config();

const app = express();

const isProduction = process.env.NODE_ENV === 'production';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' },
});

const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 25,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de autenticación. Intenta más tarde.' },
});

const allowedOrigins = Array.from(
  new Set(
    [
      process.env.CLIENT_URL,
      ...(process.env.CORS_ALLOWED_ORIGINS || '').split(',').map((origin) => origin.trim()),
    ].filter((origin): origin is string => Boolean(origin && origin.length > 0))
  )
);

const corsOptions: cors.CorsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      callback(null, true);
      return;
    }

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origen no permitido por CORS'));
  },
};

// Configurar Passport
configurePassport();

if (isProduction) {
  app.set('trust proxy', 1);
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Añade esta línea para formularios
app.use(cookieParser());
app.use(passport.initialize());

if (isProduction) {
  app.use('/api', apiLimiter);
  app.use('/api/auth', authLimiter);
}

app.use('/api/products', productRoutes); // Aquí conectamos todo
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/auth', authRoutes);

// Ruta de prueba
app.get('/', (req: Request, res: Response) => {
  res.send('¡Servidor de la tienda funcionando! 🚀');
});

app.get('/test-db', async (req: Request, res: Response) => {
  try {
    // result.rows[0] ahora sabe que es parte de una consulta SQL
    const result = await query('SELECT NOW()');
    res.json({ 
      message: "Conectado a Neon con éxito", 
      time: result.rows[0] 
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error de conexión");
  }
});

const getCategoriesHandler = async (_req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM categories ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
};

// Obtener todas las categorías
app.get('/categories', getCategoriesHandler);
app.get('/api/categories', getCategoriesHandler);

// Actualizar perfil de usuario
app.put('/api/user/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const { username, email, bio, phone, profile_image, mercado_pago_account_id, payout_automation_enabled } = req.body;

    const sql = `
      UPDATE users 
      SET
        username = $1,
        email = $2,
        bio = $3,
        phone = $4,
        profile_image = $5,
        mercado_pago_account_id = COALESCE($7, mercado_pago_account_id),
        payout_automation_enabled = COALESCE($8, payout_automation_enabled)
      WHERE id = $6
      RETURNING id, username, email, bio, phone, profile_image, mercado_pago_account_id, payout_automation_enabled, created_at
    `;
    
    const normalizedPayoutFlag =
      typeof payout_automation_enabled === 'boolean' ? payout_automation_enabled : null;

    const normalizedMercadoPagoAccountId =
      typeof mercado_pago_account_id === 'string' && mercado_pago_account_id.trim().length > 0
        ? mercado_pago_account_id.trim()
        : null;

    const result = await query(sql, [
      username,
      email,
      bio,
      phone,
      profile_image,
      userId,
      normalizedMercadoPagoAccountId,
      normalizedPayoutFlag,
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al actualizar el perfil" });
  }
});

// Eliminar perfil/usuario
app.delete('/api/user/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    // Verificar que el usuario está intentando eliminar su propio perfil
    if (!id || parseInt(id) !== userId) {
      return res.status(403).json({ error: "No tienes permiso para eliminar este perfil" });
    }

    // Opcionalmente, eliminar primero todos los productos del usuario
    await query('DELETE FROM products WHERE user_id = $1', [userId]);

    // Eliminar todas las órdenes del usuario
    await query('DELETE FROM orders WHERE user_id = $1', [userId]);

    // Eliminar el usuario
    const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json({ message: "Perfil eliminado correctamente" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error al eliminar el perfil" });
  }
});

// Obtener todos los productos (con el nombre de su categoría y vendedor)
app.get('/api/products', async (req: Request, res: Response) => {
  try {
    const result = await query(`
      SELECT 
        p.*, 
        c.name as category_name,
        u.id as seller_id,
        u.username as seller_username,
        u.profile_image as seller_profile_image
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Error al obtener productos" });
  }
});

// RUTA DE PRUEBA PARA SUBIR IMÁGENES
app.post('/api/upload', authMiddleware, upload.single('image'), async (req: any, res: any) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se envió ninguna imagen" });
    }

    // Proceso para enviar el Buffer de memoria a Cloudinary
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    const dataURI = "data:" + req.file.mimetype + ";base64," + b64;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: "mi_vitrina_products",
    });

    res.json({
      message: "Imagen subida!",
      url: result.secure_url // Esta URL es la que guardaremos en Neon después
    });
  } catch (error) {
    console.error("Error en Cloudinary:", error);
    res.status(500).json({ error: "Error al subir la imagen" });
  }
});

// server/index.ts (o tus rutas)

app.delete('/api/products/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const productOwnerResult = await query('SELECT user_id FROM products WHERE id = $1 LIMIT 1', [id]);

    if (productOwnerResult.rows.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const ownerId = Number(productOwnerResult.rows[0].user_id || 0);
    if (!req.userId || ownerId !== req.userId) {
      return res.status(403).json({ error: 'No tienes permiso para eliminar este producto' });
    }

    await query('DELETE FROM products WHERE id = $1 AND user_id = $2', [id, req.userId]);
    
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el producto' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);