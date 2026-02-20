import express, { type Request, type Response } from 'express';
import { query } from '../config/db.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

const getPlatformFeePercentage = (): number => Number(process.env.PLATFORM_FEE_PERCENTAGE || 3);
const getAdminEmail = (): string => String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const JWT_SECRET = process.env.JWT_SECRET || 'tu-secreto-super-seguro-cambiar-en-produccion';

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

interface ProductOrderMeta {
  availableQty: number;
  sellerId: number;
  payoutAutomationEnabled: boolean;
  mercadoPagoAccountId: string | null;
}

const ensureAdmin = async (userId: number | undefined, res: Response): Promise<boolean> => {
  const adminEmail = getAdminEmail();

  if (!userId) {
    res.status(401).json({ error: 'No autenticado' });
    return false;
  }

  if (!adminEmail) {
    res.status(503).json({ error: 'ADMIN_EMAIL no está configurado en el servidor' });
    return false;
  }

  const userResult = await query('SELECT email FROM users WHERE id = $1 LIMIT 1', [userId]);
  if (userResult.rows.length === 0) {
    res.status(404).json({ error: 'Usuario no encontrado' });
    return false;
  }

  const currentUserEmail = String(userResult.rows[0].email || '').toLowerCase();
  if (currentUserEmail !== adminEmail) {
    res.status(403).json({ error: 'No tienes permisos de administrador' });
    return false;
  }

  return true;
};

// Crear una nueva orden
router.post('/create', async (req: Request, res: Response) => {
  const {
    customerName,
    customerEmail,
    customerPhone,
    customerAddress,
    customerCity,
    items,
    totalAmount: clientTotalAmount,
  } = req.body;

  // Validar datos
  if (!customerName || !customerEmail || !items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'Faltan datos requeridos' });
    return;
  }

  try {
    // Generar número de orden único
    const orderNumber = `ORD-${Date.now()}`;

    // Obtener user_id si está autenticado
    const authHeader = req.headers.authorization;
    let userId: number | null = null;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '').trim();
        const decoded = jwt.verify(token, JWT_SECRET) as { id?: number };
        if (typeof decoded.id === 'number' && Number.isFinite(decoded.id)) {
          userId = decoded.id;
        }
      } catch {
        userId = null;
      }
    }

    await query('BEGIN');

    const productMetaById = new Map<number, ProductOrderMeta>();

    // Validar stock disponible y configuración de payout automático por vendedor
    for (const item of items) {
      const requestedQty = Math.max(1, Number(item.quantity || 1));
      const stockResult = await query(
        `SELECT
          p.quantity,
          p.user_id AS seller_id,
          COALESCE(u.payout_automation_enabled, true) AS payout_automation_enabled,
          u.mercado_pago_account_id
         FROM products p
         LEFT JOIN users u ON u.id = p.user_id
         WHERE p.id = $1
         FOR UPDATE OF p`,
        [item.productId]
      );

      if (stockResult.rows.length === 0) {
        await query('ROLLBACK');
        res.status(404).json({ error: 'Producto no encontrado' });
        return;
      }

      const availableQty = Number(stockResult.rows[0].quantity || 0);
      const sellerId = Number(stockResult.rows[0].seller_id || 0);
      const payoutAutomationEnabled = Boolean(stockResult.rows[0].payout_automation_enabled);
      const mercadoPagoAccountIdRaw = stockResult.rows[0].mercado_pago_account_id;
      const mercadoPagoAccountId =
        typeof mercadoPagoAccountIdRaw === 'string' && mercadoPagoAccountIdRaw.trim().length > 0
          ? mercadoPagoAccountIdRaw.trim()
          : null;

      if (!sellerId) {
        await query('ROLLBACK');
        res.status(409).json({ error: 'El producto no tiene vendedor válido asociado' });
        return;
      }

      if (!payoutAutomationEnabled) {
        await query('ROLLBACK');
        res.status(409).json({
          error: 'Este vendedor no tiene habilitada la liquidación automática de pagos',
        });
        return;
      }

      if (!mercadoPagoAccountId) {
        await query('ROLLBACK');
        res.status(409).json({
          error: 'El vendedor no tiene cuenta de recepción configurada para pago automático',
        });
        return;
      }

      if (availableQty < requestedQty) {
        await query('ROLLBACK');
        res.status(409).json({ error: 'No hay suficiente stock disponible' });
        return;
      }

      productMetaById.set(Number(item.productId), {
        availableQty,
        sellerId,
        payoutAutomationEnabled,
        mercadoPagoAccountId,
      });
    }

    const itemsWithAmounts = items.map((item: any) => {
      const productMeta = productMetaById.get(Number(item.productId));
      if (!productMeta) {
        throw new Error('No se encontró metadata del producto durante la creación de la orden');
      }

      const platformFeePercentage = getPlatformFeePercentage();
      const requestedQty = Math.max(1, Number(item.quantity || 1));
      const unitPrice = Number(item.price);
      const subtotal = roundMoney(unitPrice * requestedQty);
      const platformFeeAmount = roundMoney(subtotal * (platformFeePercentage / 100));
      const sellerNetAmount = roundMoney(subtotal - platformFeeAmount);

      return {
        ...item,
        requestedQty,
        unitPrice,
        subtotal,
        sellerId: productMeta.sellerId,
        platformFeePercentage,
        platformFeeAmount,
        sellerNetAmount,
      };
    });

    const computedTotalAmount = roundMoney(
      itemsWithAmounts.reduce((acc: number, item: any) => acc + item.subtotal, 0)
    );
    const computedPlatformFeeAmount = roundMoney(
      itemsWithAmounts.reduce((acc: number, item: any) => acc + item.platformFeeAmount, 0)
    );
    const computedSellerNetAmount = roundMoney(
      itemsWithAmounts.reduce((acc: number, item: any) => acc + item.sellerNetAmount, 0)
    );

    if (typeof clientTotalAmount !== 'undefined') {
      const normalizedClientTotal = roundMoney(Number(clientTotalAmount || 0));
      if (Math.abs(normalizedClientTotal - computedTotalAmount) > 0.01) {
        await query('ROLLBACK');
        res.status(400).json({ error: 'El total de la orden no coincide con el cálculo del servidor' });
        return;
      }
    }

    // Crear orden
    const orderResult = await query(
      `INSERT INTO orders (
        order_number,
        user_id,
        customer_email,
        customer_name,
        customer_phone,
        customer_address,
        customer_city,
        total_amount,
        platform_fee_percentage,
        platform_fee_amount,
        seller_net_amount,
        status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, order_number, total_amount, platform_fee_percentage, platform_fee_amount, seller_net_amount, status`,
      [
        orderNumber,
        userId,
        customerEmail,
        customerName,
        customerPhone,
        customerAddress,
        customerCity,
        computedTotalAmount,
        getPlatformFeePercentage(),
        computedPlatformFeeAmount,
        computedSellerNetAmount,
        'pending',
      ]
    );

    const orderId = orderResult.rows[0].id;

    // Crear items de la orden SIN descontar stock aún
    // El stock se deducirá cuando el pago sea confirmado
    for (const item of itemsWithAmounts) {
      await query(
        `INSERT INTO order_items (
          order_id,
          product_id,
          seller_id,
          quantity,
          unit_price,
          subtotal,
          platform_fee_percentage,
          platform_fee_amount,
          seller_net_amount
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          orderId,
          item.productId,
          item.sellerId,
          item.requestedQty,
          item.unitPrice,
          item.subtotal,
          item.platformFeePercentage,
          item.platformFeeAmount,
          item.sellerNetAmount,
        ]
      );
    }

    await query('COMMIT');

    res.json({
      success: true,
      orderId,
      orderNumber: orderResult.rows[0].order_number,
      totalAmount: orderResult.rows[0].total_amount,
      platformFeePercentage: Number(orderResult.rows[0].platform_fee_percentage),
      platformFeeAmount: Number(orderResult.rows[0].platform_fee_amount),
      sellerNetAmount: Number(orderResult.rows[0].seller_net_amount),
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Error al crear orden:', error);
    res.status(500).json({ error: 'Error al crear la orden' });
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

// ==================== FINANZAS / COMISIONES ====================

// Resumen global de monetización
router.get('/finance/summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = await ensureAdmin(req.userId, res);
    if (!isAdmin) return;

    const from = req.query.from ? String(req.query.from) : null;
    const to = req.query.to ? String(req.query.to) : null;

    const summaryResult = await query(
      `SELECT
        COUNT(*)::int AS orders_count,
        COALESCE(SUM(o.total_amount), 0)::numeric AS gross_sales,
        COALESCE(SUM(o.platform_fee_amount), 0)::numeric AS platform_revenue,
        COALESCE(SUM(o.seller_net_amount), 0)::numeric AS seller_net_total
      FROM orders o
      WHERE o.status = 'completed'
        AND ($1::timestamptz IS NULL OR o.created_at >= $1::timestamptz)
        AND ($2::timestamptz IS NULL OR o.created_at <= $2::timestamptz)
      `,
      [from, to]
    );

    const row = summaryResult.rows[0];

    res.json({
      ordersCount: Number(row.orders_count || 0),
      grossSales: Number(row.gross_sales || 0),
      platformRevenue: Number(row.platform_revenue || 0),
      sellerNetTotal: Number(row.seller_net_total || 0),
      feePercentage: getPlatformFeePercentage(),
      dateFilter: { from, to },
    });
  } catch (error) {
    console.error('Error al obtener resumen financiero:', error);
    res.status(500).json({ error: 'Error al obtener resumen financiero' });
  }
});

// Balance por vendedor (pendiente/pagado)
router.get('/finance/sellers', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = await ensureAdmin(req.userId, res);
    if (!isAdmin) return;

    const from = req.query.from ? String(req.query.from) : null;
    const to = req.query.to ? String(req.query.to) : null;

    const result = await query(
      `SELECT
        oi.seller_id,
        u.username AS seller_username,
        u.email AS seller_email,
        COALESCE(SUM(oi.subtotal), 0)::numeric AS gross_sales,
        COALESCE(SUM(oi.platform_fee_amount), 0)::numeric AS platform_fee_total,
        COALESCE(SUM(oi.seller_net_amount), 0)::numeric AS seller_net_total,
        COALESCE(SUM(CASE WHEN spi.order_item_id IS NULL THEN oi.seller_net_amount ELSE 0 END), 0)::numeric AS pending_payout_amount,
        COALESCE(SUM(CASE WHEN spi.order_item_id IS NOT NULL THEN oi.seller_net_amount ELSE 0 END), 0)::numeric AS paid_payout_amount,
        COUNT(DISTINCT oi.order_id)::int AS orders_count,
        COUNT(*)::int AS items_count
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN users u ON u.id = oi.seller_id
      LEFT JOIN seller_payout_items spi ON spi.order_item_id = oi.id
      WHERE o.status = 'completed'
        AND ($1::timestamptz IS NULL OR o.created_at >= $1::timestamptz)
        AND ($2::timestamptz IS NULL OR o.created_at <= $2::timestamptz)
      GROUP BY oi.seller_id, u.username, u.email
      ORDER BY pending_payout_amount DESC, seller_net_total DESC
      `,
      [from, to]
    );

    const sellers = result.rows.map((row) => ({
      sellerId: Number(row.seller_id),
      sellerUsername: row.seller_username,
      sellerEmail: row.seller_email,
      grossSales: Number(row.gross_sales || 0),
      platformFeeTotal: Number(row.platform_fee_total || 0),
      sellerNetTotal: Number(row.seller_net_total || 0),
      pendingPayoutAmount: Number(row.pending_payout_amount || 0),
      paidPayoutAmount: Number(row.paid_payout_amount || 0),
      ordersCount: Number(row.orders_count || 0),
      itemsCount: Number(row.items_count || 0),
    }));

    res.json({ sellers, dateFilter: { from, to } });
  } catch (error) {
    console.error('Error al obtener balances por vendedor:', error);
    res.status(500).json({ error: 'Error al obtener balances por vendedor' });
  }
});

// Listado de payouts creados
router.get('/finance/payouts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = await ensureAdmin(req.userId, res);
    if (!isAdmin) return;

    const status = req.query.status ? String(req.query.status) : null;

    const result = await query(
      `SELECT
        sp.id,
        sp.seller_id,
        u.username AS seller_username,
        u.email AS seller_email,
        sp.total_amount,
        sp.status,
        sp.notes,
        sp.created_by_user_id,
        sp.created_at,
        sp.processed_at,
        COUNT(spi.id)::int AS items_count
      FROM seller_payouts sp
      JOIN users u ON u.id = sp.seller_id
      LEFT JOIN seller_payout_items spi ON spi.payout_id = sp.id
      WHERE ($1::text IS NULL OR sp.status = $1::text)
      GROUP BY sp.id, u.username, u.email
      ORDER BY sp.created_at DESC
      LIMIT 200`,
      [status]
    );

    const payouts = result.rows.map((row) => ({
      id: Number(row.id),
      sellerId: Number(row.seller_id),
      sellerUsername: row.seller_username,
      sellerEmail: row.seller_email,
      totalAmount: Number(row.total_amount || 0),
      status: row.status,
      notes: row.notes,
      createdByUserId: row.created_by_user_id ? Number(row.created_by_user_id) : null,
      createdAt: row.created_at,
      processedAt: row.processed_at,
      itemsCount: Number(row.items_count || 0),
    }));

    res.json({ payouts });
  } catch (error) {
    console.error('Error al listar payouts:', error);
    res.status(500).json({ error: 'Error al listar payouts' });
  }
});

// Crear payout manual para un vendedor (toma todos los ítems pendientes)
router.post('/finance/payouts/create', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = await ensureAdmin(req.userId, res);
    if (!isAdmin) return;

    const sellerId = Number(req.body?.sellerId);
    const notes = req.body?.notes ? String(req.body.notes) : null;

    if (!sellerId || Number.isNaN(sellerId)) {
      res.status(400).json({ error: 'sellerId es requerido' });
      return;
    }

    await query('BEGIN');

    const pendingItems = await query(
      `SELECT oi.id, oi.seller_net_amount
       FROM order_items oi
       JOIN orders o ON o.id = oi.order_id
       LEFT JOIN seller_payout_items spi ON spi.order_item_id = oi.id
       WHERE oi.seller_id = $1
         AND o.status = 'completed'
         AND spi.order_item_id IS NULL
       FOR UPDATE`,
      [sellerId]
    );

    if (pendingItems.rows.length === 0) {
      await query('ROLLBACK');
      res.status(409).json({ error: 'No hay saldo pendiente para este vendedor' });
      return;
    }

    const totalAmount = roundMoney(
      pendingItems.rows.reduce((acc, row) => acc + Number(row.seller_net_amount || 0), 0)
    );

    const payoutResult = await query(
      `INSERT INTO seller_payouts (seller_id, total_amount, status, notes, created_by_user_id)
       VALUES ($1, $2, 'pending', $3, $4)
       RETURNING id, seller_id, total_amount, status, created_at`,
      [sellerId, totalAmount, notes, req.userId]
    );

    const payoutId = payoutResult.rows[0].id;

    for (const item of pendingItems.rows) {
      await query(
        `INSERT INTO seller_payout_items (payout_id, order_item_id)
         VALUES ($1, $2)`,
        [payoutId, item.id]
      );
    }

    await query('COMMIT');

    res.json({
      success: true,
      payoutId,
      sellerId,
      totalAmount,
      itemsCount: pendingItems.rows.length,
      status: 'pending',
    });
  } catch (error) {
    await query('ROLLBACK');
    console.error('Error al crear payout:', error);
    res.status(500).json({ error: 'Error al crear payout' });
  }
});

// Marcar payout como pagado
router.patch('/finance/payouts/:payoutId/mark-paid', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const isAdmin = await ensureAdmin(req.userId, res);
    if (!isAdmin) return;

    const payoutId = Number(req.params.payoutId);
    if (!payoutId || Number.isNaN(payoutId)) {
      res.status(400).json({ error: 'payoutId inválido' });
      return;
    }

    const updateResult = await query(
      `UPDATE seller_payouts
       SET status = 'paid', processed_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, seller_id, total_amount, status, processed_at`,
      [payoutId]
    );

    if (updateResult.rows.length === 0) {
      res.status(404).json({ error: 'Payout no encontrado' });
      return;
    }

    res.json({ success: true, payout: updateResult.rows[0] });
  } catch (error) {
    console.error('Error al marcar payout como pagado:', error);
    res.status(500).json({ error: 'Error al actualizar payout' });
  }
});

export default router;
