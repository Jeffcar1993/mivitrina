import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './config/db.js'; // TypeScript ESM requires explicit extensions
import cloudinary from './config/cloudinary.js';
import { upload } from './middleware/multer.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

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

// Obtener todas las categorías
app.get('/categories', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM categories ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// Obtener todos los productos (con el nombre de su categoría)
app.get('/products', async (req: Request, res: Response) => {
  try {
    const text = `
      SELECT p.*, c.name as category_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      ORDER BY p.created_at DESC
    `;
    const result = await query(text);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener productos' });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor TS corriendo en http://localhost:${PORT}`);
});