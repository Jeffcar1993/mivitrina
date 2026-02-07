import express, { type Request, type Response } from 'express';
import { query } from '../config/db.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = express.Router();

interface CartItemInput {
  productId: number;
  quantity?: number;
}

// Obtener carrito del usuario
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  try {
    const result = await query(
      `SELECT p.*, c.quantity
       FROM cart_items c
       JOIN products p ON c.product_id = p.id
       WHERE c.user_id = $1
       ORDER BY c.added_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener carrito:', error);
    res.status(500).json({ error: 'Error al obtener el carrito' });
  }
});

// Guardar carrito del usuario (reemplaza todo)
router.post('/save', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.userId;
  const { items } = req.body as { items?: CartItemInput[] };

  if (!Array.isArray(items)) {
    res.status(400).json({ error: 'Items inválidos' });
    return;
  }

  try {
    await query('BEGIN');

    // Limpiar carrito actual
    await query('DELETE FROM cart_items WHERE user_id = $1', [userId]);

    // Insertar items nuevos
    for (const item of items) {
      if (!item?.productId) continue;
      const quantity = Math.max(1, Number(item.quantity || 1));
      await query(
        `INSERT INTO cart_items (user_id, product_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (user_id, product_id)
         DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP`,
        [userId, item.productId, quantity]
      );
    }

    await query('COMMIT');
    res.json({ success: true });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Error al guardar carrito:', error);
    res.status(500).json({ error: 'Error al guardar el carrito' });
  }
});

// Limpiar carrito del usuario
router.delete('/clear', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  try {
    await query('DELETE FROM cart_items WHERE user_id = $1', [userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error al limpiar carrito:', error);
    res.status(500).json({ error: 'Error al limpiar el carrito' });
  }
});

export default router;
