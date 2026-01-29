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

// RUTA PARA ELIMINAR UN PRODUCTO
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // 1. Primero obtenemos la URL de la imagen para saber qué borrar en Cloudinary
    const productQuery = await query('SELECT image_url FROM products WHERE id = $1', [id]);
    
    if (productQuery.rows.length === 0) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    const imageUrl = productQuery.rows[0].image_url;

    // 2. Extraer el public_id de la URL de Cloudinary
    // Ejemplo: .../mi_vitrina_products/imagen.jpg -> mi_vitrina_products/imagen
    const urlParts = imageUrl.split('/');
    const fileNameWithExtension = urlParts[urlParts.length - 1];
    const folderName = urlParts[urlParts.length - 2];
    const publicId = `${folderName}/${fileNameWithExtension.split('.')[0]}`;

    // 3. Borrar imagen en Cloudinary
    await cloudinary.uploader.destroy(publicId);

    // 4. Borrar registro en la base de datos (Neon)
    await query('DELETE FROM products WHERE id = $1', [id]);

    res.json({ message: "Producto e imagen eliminados correctamente" });

  } catch (error) {
    console.error("Error al eliminar producto:", error);
    res.status(500).json({ error: "Error al eliminar el producto" });
  }
});

// RUTA PARA ACTUALIZAR UN PRODUCTO
router.put('/:id', upload.single('image'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, price, category_id } = req.body;

    // 1. Buscamos el producto actual para saber si tiene una imagen previa
    const currentProduct = await query('SELECT image_url FROM products WHERE id = $1', [id]);
    
    if (currentProduct.rows.length === 0) {
      res.status(404).json({ error: "Producto no encontrado" });
      return;
    }

    let finalImageUrl = currentProduct.rows[0].image_url;

    // 2. Si el usuario subió una NUEVA imagen...
    if (req.file) {
      // A. Borramos la imagen anterior de Cloudinary (opcional pero recomendado)
      const oldUrl = currentProduct.rows[0].image_url;
      const urlParts = oldUrl.split('/');
      const publicId = `mi_vitrina_products/${urlParts[urlParts.length - 1].split('.')[0]}`;
      await cloudinary.uploader.destroy(publicId);

      // B. Subimos la nueva imagen
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      const dataURI = `data:${req.file.mimetype};base64,${b64}`;
      const cloudRes = await cloudinary.uploader.upload(dataURI, {
        folder: "mi_vitrina_products",
      });
      finalImageUrl = cloudRes.secure_url;
    }

    // 3. Actualizamos en la base de datos
    const sql = `
      UPDATE products 
      SET title = $1, description = $2, price = $3, image_url = $4, category_id = $5
      WHERE id = $6
      RETURNING *
    `;
    
    const values = [title, description, price, finalImageUrl, category_id, id];
    const result = await query(sql, values);

    res.json({
      message: "Producto actualizado con éxito",
      product: result.rows[0]
    });

  } catch (error) {
    console.error("Error al actualizar:", error);
    res.status(500).json({ error: "Error al actualizar el producto" });
  }
});
export default router;