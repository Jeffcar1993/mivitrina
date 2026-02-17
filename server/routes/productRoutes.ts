import { Router, type Request, type Response } from 'express';
import { query } from '../config/db.js';
import { upload } from '../middleware/multer.js';
import cloudinary from '../config/cloudinary.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = Router();

const ensureSellerRatingsTable = async (): Promise<void> => {
  await query(`
    CREATE TABLE IF NOT EXISTS seller_ratings (
      id SERIAL PRIMARY KEY,
      seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      buyer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(seller_id, buyer_id)
    )
  `);

  await query('CREATE INDEX IF NOT EXISTS idx_seller_ratings_seller_id ON seller_ratings(seller_id)');
};

// Usamos Promise<void> porque la función no retorna un valor, sino que responde al cliente
router.post('/', authMiddleware, upload.array('images', 4), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log("BODY RECIBIDO:", req.body); // Esto nos dirá si title llega o no
    console.log("ARCHIVOS RECIBIDOS:", Array.isArray(req.files) && req.files.length > 0 ? "SÍ" : "NO");

    const { title, description, price, category_id, quantity } = req.body;
    const userId = req.userId; // Viene del middleware de auth

    // Accedemos a los archivos de Multer
    const files = (req.files as Express.Multer.File[]) || [];

    if (!files || files.length === 0) {
      res.status(400).json({ error: "La imagen es obligatoria" });
      return; // Importante el return para que no siga ejecutando
    }

    // 1. Subir todas las imágenes a Cloudinary
    const uploadResults = await Promise.all(
      files.map(async (file) => {
        const b64 = Buffer.from(file.buffer).toString("base64");
        const dataURI = `data:${file.mimetype};base64,${b64}`;
        const cloudRes = await cloudinary.uploader.upload(dataURI, {
          folder: "mi_vitrina_products",
        });
        return cloudRes.secure_url;
      })
    );

    const mainImageUrl = uploadResults[0];
    const extraImages = uploadResults.slice(1);

    // 2. Guardar en Postgres (Neon) incluyendo user_id
    const sql = `
      INSERT INTO products (title, description, price, quantity, image_url, category_id, user_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const normalizedQuantity = Math.max(1, Number(quantity || 1));
    const values = [title, description, price, normalizedQuantity, mainImageUrl, category_id, userId];
    const result = await query(sql, values);

    const productId = result.rows[0].id;

    if (extraImages.length > 0) {
      const insertImagesSql = `
        INSERT INTO product_images (product_id, image_url)
        VALUES ($1, $2)
      `;

      for (const imageUrl of extraImages) {
        await query(insertImagesSql, [productId, imageUrl]);
      }
    }

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
    const pageParam = Number(_req.query.page);
    const limitParam = Number(_req.query.limit);
    const hasPagination = Number.isFinite(pageParam) || Number.isFinite(limitParam);

    const parsedPage = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1;
    const parsedLimit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(Math.floor(limitParam), 100) : 24;
    const offset = (parsedPage - 1) * parsedLimit;

    // Respuesta legacy sin paginación para no romper pantallas existentes
    if (!hasPagination) {
      const sql = `
        SELECT 
          p.*, 
          c.name as category_name,
          u.id as seller_id,
          u.username as seller_username,
          u.profile_image as seller_profile_image
        FROM products p
        JOIN categories c ON p.category_id = c.id
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.quantity > 0
        ORDER BY p.created_at DESC
      `;

      const result = await query(sql);
      res.json(result.rows);
      return;
    }

    const sql = `
      SELECT 
        p.*, 
        c.name as category_name,
        u.id as seller_id,
        u.username as seller_username,
        u.profile_image as seller_profile_image
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.quantity > 0
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const countSql = `
      SELECT COUNT(*)::int as total
      FROM products p
      WHERE p.quantity > 0
    `;

    const [result, countResult] = await Promise.all([
      query(sql, [parsedLimit, offset]),
      query(countSql),
    ]);

    const total = Number(countResult.rows[0]?.total || 0);
    const totalPages = Math.max(1, Math.ceil(total / parsedLimit));

    res.json({
      items: result.rows,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages,
        hasNextPage: parsedPage < totalPages,
      },
    });
  } catch (error) {
    console.error("Error al obtener productos:", error);
    res.status(500).json({ error: "Error al obtener la lista de productos" });
  }
});

// Obtener resumen de calificaciones del vendedor de un producto
router.get('/:id/seller-rating', async (req: Request, res: Response): Promise<void> => {
  try {
    await ensureSellerRatingsTable();

    const { id } = req.params;

    const sellerQuery = await query('SELECT user_id FROM products WHERE id = $1', [id]);

    if (sellerQuery.rows.length === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    const sellerId = Number(sellerQuery.rows[0].user_id);

    if (!sellerId) {
      res.status(400).json({ error: 'El producto no tiene vendedor asociado' });
      return;
    }

    const summaryQuery = await query(
      `
      SELECT
        COALESCE(AVG(rating)::numeric, 0) AS average_rating,
        COUNT(*)::int AS total_ratings
      FROM seller_ratings
      WHERE seller_id = $1
      `,
      [sellerId]
    );

    const averageRating = Number(summaryQuery.rows[0]?.average_rating || 0);
    const totalRatings = Number(summaryQuery.rows[0]?.total_ratings || 0);

    res.json({
      sellerId,
      averageRating,
      totalRatings,
    });
  } catch (error) {
    console.error('Error al obtener rating del vendedor:', error);
    res.status(500).json({ error: 'Error al obtener calificaciones del vendedor' });
  }
});

// Obtener la calificación del usuario autenticado para el vendedor de un producto
router.get('/:id/seller-rating/my', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureSellerRatingsTable();

    const { id } = req.params;
    const buyerId = req.userId;

    if (!buyerId) {
      res.status(401).json({ error: 'Debes iniciar sesión para ver tu calificación' });
      return;
    }

    const sellerQuery = await query('SELECT user_id FROM products WHERE id = $1', [id]);

    if (sellerQuery.rows.length === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    const sellerId = Number(sellerQuery.rows[0].user_id);

    if (!sellerId) {
      res.status(400).json({ error: 'El producto no tiene vendedor asociado' });
      return;
    }

    const myRatingQuery = await query(
      `
      SELECT rating
      FROM seller_ratings
      WHERE seller_id = $1 AND buyer_id = $2
      LIMIT 1
      `,
      [sellerId, buyerId]
    );

    const myRating = myRatingQuery.rows.length > 0 ? Number(myRatingQuery.rows[0].rating) : null;

    res.json({
      sellerId,
      myRating,
    });
  } catch (error) {
    console.error('Error al obtener mi rating:', error);
    res.status(500).json({ error: 'Error al obtener tu calificación' });
  }
});

// Crear o actualizar calificación del vendedor de un producto
router.post('/:id/seller-rating', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await ensureSellerRatingsTable();

    const { id } = req.params;
    const buyerId = req.userId;
    const rating = Number(req.body?.rating);

    if (!buyerId) {
      res.status(401).json({ error: 'Debes iniciar sesión para calificar' });
      return;
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ error: 'La calificación debe ser un número entero entre 1 y 5' });
      return;
    }

    const sellerQuery = await query('SELECT user_id FROM products WHERE id = $1', [id]);

    if (sellerQuery.rows.length === 0) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }

    const sellerId = Number(sellerQuery.rows[0].user_id);

    if (!sellerId) {
      res.status(400).json({ error: 'El producto no tiene vendedor asociado' });
      return;
    }

    if (sellerId === buyerId) {
      res.status(400).json({ error: 'No puedes calificar tus propios productos' });
      return;
    }

    await query(
      `
      INSERT INTO seller_ratings (seller_id, buyer_id, rating)
      VALUES ($1, $2, $3)
      ON CONFLICT (seller_id, buyer_id)
      DO UPDATE SET rating = EXCLUDED.rating, updated_at = CURRENT_TIMESTAMP
      `,
      [sellerId, buyerId, rating]
    );

    const summaryQuery = await query(
      `
      SELECT
        COALESCE(AVG(rating)::numeric, 0) AS average_rating,
        COUNT(*)::int AS total_ratings
      FROM seller_ratings
      WHERE seller_id = $1
      `,
      [sellerId]
    );

    const averageRating = Number(summaryQuery.rows[0]?.average_rating || 0);
    const totalRatings = Number(summaryQuery.rows[0]?.total_ratings || 0);

    res.json({
      message: 'Calificación guardada correctamente',
      sellerId,
      myRating: rating,
      averageRating,
      totalRatings,
    });
  } catch (error) {
    console.error('Error al guardar rating:', error);
    res.status(500).json({ error: 'Error al guardar la calificación' });
  }
});

// RUTA PARA OBTENER UN PRODUCTO ESPECÍFICO POR ID
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT 
        p.*, 
        c.name as category_name,
        u.id as seller_id,
        u.username as seller_username,
        u.profile_image as seller_profile_image,
        COALESCE(array_remove(array_agg(pi.image_url), NULL), ARRAY[]::text[]) as images
      FROM products p
      JOIN categories c ON p.category_id = c.id
      LEFT JOIN users u ON p.user_id = u.id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.id = $1 AND p.quantity > 0
      GROUP BY p.id, c.name, u.id, u.username, u.profile_image
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
    const { title, description, price, category_id, quantity } = req.body;

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
      SET title = $1, description = $2, price = $3, quantity = $4, image_url = $5, category_id = $6
      WHERE id = $7
      RETURNING *
    `;
    
    const normalizedQuantity = Math.max(1, Number(quantity || 1));
    const values = [title, description, price, normalizedQuantity, finalImageUrl, category_id, id];
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