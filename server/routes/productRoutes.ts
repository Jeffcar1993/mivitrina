import { Router, type Request, type Response } from 'express';
import { query } from '../config/db.js';
import { upload } from '../middleware/multer.js';
import cloudinary from '../config/cloudinary.js';

const router = Router();

// Usamos Promise<void> porque la función no retorna un valor, sino que responde al cliente
router.post('/', upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("BODY RECIBIDO:", req.body); // Esto nos dirá si title llega o no
    console.log("ARCHIVO RECIBIDO:", req.file ? "SÍ" : "NO");

    const { title, description, price, category_id } = req.body;

    // Accedemos al archivo de Multer
    const file = req.file; 

    if (!file) {
      res.status(400).json({ error: "La imagen es obligatoria" });
      return; // Importante el return para que no siga ejecutando
    }

    // 1. Subir a Cloudinary
    const b64 = Buffer.from(file.buffer).toString("base64");
    const dataURI = `data:${file.mimetype};base64,${b64}`;
    
    const cloudRes = await cloudinary.uploader.upload(dataURI, {
      folder: "mi_vitrina_products",
    });

    // 2. Guardar en Postgres (Neon)
    const sql = `
      INSERT INTO products (title, description, price, image_url, category_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [title, description, price, cloudRes.secure_url, category_id];
    const result = await query(sql, values);

    res.status(201).json({
      message: "Producto creado exitosamente",
      product: result.rows[0]
    });

  } catch (error) {
    console.error("Error al crear producto:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// RUTA PARA OBTENER TODOS LOS PRODUCTOS
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    // Usamos un JOIN para traer el nombre de la categoría también
    const sql = `
      SELECT 
        p.*, 
        c.name as category_name 
      FROM products p
      JOIN categories c ON p.category_id = c.id
      ORDER BY p.created_at DESC
    `;
    
    const result = await query(sql);
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ error: "Error al obtener la lista de productos" });
  }
});

// RUTA PARA OBTENER UN PRODUCTO ESPECÍFICO POR ID
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        p.*, 
        c.name as category_name 
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1
    `;
    
    const result = await query(sql, [id]);

    // Si no encuentra el producto, devolvemos un 404
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error al obtener el producto:", error);
    res.status(500).json({ error: "Error al obtener el detalle del producto" });
  }
});

export default router;