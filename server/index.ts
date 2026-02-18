import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './config/db.js'; // TypeScript ESM requires explicit extensions
import cloudinary from './config/cloudinary.js';
import { upload } from './middleware/multer.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import authRoutes from './routes/authRoutes.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authMiddleware, type AuthRequest } from './middleware/auth.js';
import passport from './config/passport.js';
import { configurePassport } from './config/passport.js';

dotenv.config();

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'tu-secreto-super-seguro-cambiar-en-produccion';

// Función para validar contraseña segura
const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Mínimo 8 caracteres");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Al menos una mayúscula");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Al menos una minúscula");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Al menos un número");
  }

  const specialChars = '!@#$%^&*()_+=-[]{};\':"`\\|,.<>/?';
  if (![...specialChars].some(char => password.includes(char))) {
    errors.push("Al menos un carácter especial");
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Configurar Passport
configurePassport();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Añade esta línea para formularios
app.use(passport.initialize());

app.use('/api/products', productRoutes); // Aquí conectamos todo
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/cart', cartRoutes);

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

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    if (!username || !email || !password) {
      return res.status(400).json({ error: "Completa todos los campos" });
    }

    // Validar que la contraseña sea segura
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({ 
        error: "La contraseña no cumple con los requisitos de seguridad",
        requirements: passwordValidation.errors
      });
    }

    const existing = await query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "El usuario o email ya existen." });
    }

    // 1. Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 2. Guardar en la base de datos
    const result = await query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );

    const user = result.rows[0];

    // 3. Crear el token de sesión
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ user, token });
  } catch (err) {
    console.error(err);
    const error = err as { code?: string };
    if (error?.code === '23505') {
      return res.status(409).json({ error: "El usuario o email ya existen." });
    }
    if (error?.code === '42P01') {
      return res.status(500).json({ error: "La tabla de usuarios no existe. Revisa la base de datos." });
    }
    res.status(500).json({ error: "Error en el servidor" });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: "Completa todos los campos" });
    }

    // 1. Buscar usuario
    const result = await query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Email o contraseña incorrectos" });
    }

    const user = result.rows[0];

    // 2. Verificar contraseña
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Email o contraseña incorrectos" });
    }

    // 3. Crear token
    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });

    // No enviamos la contraseña de vuelta al cliente
    const { password: _, ...userFields } = user;
    res.json({ user: userFields, token });
  } catch (err) {
    res.status(500).json({ error: "Error en el servidor" });
  }
});

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
app.post('/api/upload', upload.single('image'), async (req: any, res: any) => {
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

app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Opcional: Podrías buscar el producto primero para borrar la imagen de Cloudinary
    // Por ahora, borremos el registro de la DB:
    await query('DELETE FROM products WHERE id = $1', [id]);
    
    res.json({ message: "Producto eliminado correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar el producto" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor TS corriendo en http://localhost:${PORT}`);
});