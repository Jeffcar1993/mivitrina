import express, { type Request, type Response } from 'express';
import { query } from '../config/db.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';

const router = express.Router();

// Crear una nueva orden
router.post('/create', async (req: Request, res: Response) => {
  const {
    customerName,
    customerEmail,
    customerPhone,
    customerAddress,
    customerCity,
    items,
    totalAmount,
  } = req.body;

  // Validar datos
  if (!customerName || !customerEmail || !items || !totalAmount) {
    res.status(400).json({ error: 'Faltan datos requeridos' });
    return;
  }

  try {
    // Generar número de orden único
    const orderNumber = `ORD-${Date.now()}`;

    // Obtener user_id si está autenticado
    const authHeader = req.headers.authorization;
    let userId: number | null = null;
    if (authHeader) {
      try {
        const token = authHeader.split(' ')[1];
        // Aquí deberías verificar el token, por ahora lo dejamos como null para compras anónimas
        userId = null;
      } catch (err) {
        userId = null;
      }
    }

    // Crear orden
    const orderResult = await query(
      `INSERT INTO orders (order_number, user_id, customer_email, customer_name, customer_phone, customer_address, customer_city, total_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id, order_number, total_amount, status`,
      [orderNumber, userId, customerEmail, customerName, customerPhone, customerAddress, customerCity, totalAmount, 'pending']
    );

    const orderId = orderResult.rows[0].id;

    // Crear items de la orden
    for (const item of items) {
      await query(
        `INSERT INTO order_items (order_id, product_id, seller_id, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [orderId, item.productId, item.sellerId, item.quantity || 1, item.price, Number(item.price) * (item.quantity || 1)]
      );
    }

    res.json({
      success: true,
      orderId,
      orderNumber: orderResult.rows[0].order_number,
      totalAmount: orderResult.rows[0].total_amount,
    });
  } catch (error) {
    console.error('Error al crear orden:', error);
    res.status(500).json({ error: 'Error al crear la orden' });
  }
});

// Obtener detalles de una orden
router.get('/:orderNumber', async (req: Request, res: Response) => {
  const { orderNumber } = req.params;

  try {
    const result = await query(
      `SELECT id, order_number, customer_name, customer_email, customer_phone, customer_address, customer_city, 
              total_amount, status, payment_id, created_at
       FROM orders WHERE order_number = $1`,
      [orderNumber]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Orden no encontrada' });
      return;
    }

    const order = result.rows[0];

    // Obtener items de la orden
    const itemsResult = await query(
      `SELECT oi.id, oi.product_id, p.title, p.image_url, oi.quantity, oi.unit_price, oi.subtotal
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = $1`,
      [order.id]
    );

    res.json({
      ...order,
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error('Error al obtener orden:', error);
    res.status(500).json({ error: 'Error al obtener la orden' });
  }
});

// Obtener órdenes de un usuario (requiere autenticación)
router.get('/user/purchases', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.userId;

  try {
    const result = await query(
      `SELECT id, order_number, customer_email, total_amount, status, created_at
       FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener órdenes:', error);
    res.status(500).json({ error: 'Error al obtener las órdenes' });
  }
});

// Actualizar estado de una orden (uso interno)
router.patch('/:orderId/status', async (req: Request, res: Response) => {
  const { orderId } = req.params;
  const { status } = req.body;

  if (!status) {
    res.status(400).json({ error: 'Estado requerido' });
    return;
  }

  try {
    await query(
      `UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [status, orderId]
    );

    res.json({ success: true, message: 'Estado actualizado' });
  } catch (error) {
    console.error('Error al actualizar orden:', error);
    res.status(500).json({ error: 'Error al actualizar la orden' });
  }
});

export default router;
