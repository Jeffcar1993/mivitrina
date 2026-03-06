import express, { type Request, type Response } from 'express';
import { query, withTransaction } from '../config/db.js';
import { authMiddleware, type AuthRequest } from '../middleware/auth.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

const getPlatformFeePercentage = (): number => Number(process.env.PLATFORM_FEE_PERCENTAGE || 3);
const getAdminEmail = (): string => String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
const getDefaultCurrency = (): string => String(process.env.DEFAULT_CURRENCY || 'COP').trim().toUpperCase();
const JWT_SECRET = String(process.env.JWT_SECRET || '').trim();

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET no está configurado. Define una clave segura en variables de entorno.');
}

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const isPaidLikeStatus = (status: unknown): boolean => {
  const normalized = String(status || '').trim().toLowerCase();
  return normalized === 'pagado' || normalized === 'completed' || normalized === 'completado';
};

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

      if (userId && sellerId === userId) {
        await query('ROLLBACK');
        res.status(409).json({ error: 'No puedes comprar tus propios productos' });
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
        currency_id,
        status
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id, order_number, total_amount, platform_fee_percentage, platform_fee_amount, seller_net_amount, currency_id, status`,
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
        getDefaultCurrency(),
        'pendiente_de_pago',
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
      currencyId: String(orderResult.rows[0].currency_id || getDefaultCurrency()),
      status: String(orderResult.rows[0].status || 'pendiente_de_pago'),
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
    const targetStatus = String(status).trim();

    const result = await withTransaction(async (client) => {
      const currentOrderResult = await client.query(
        `SELECT id, status FROM orders WHERE id = $1 LIMIT 1 FOR UPDATE`,
        [orderId]
      );

      if (currentOrderResult.rows.length === 0) {
        const err = new Error('Orden no encontrada');
        (err as Error & { statusCode?: number }).statusCode = 404;
        throw err;
      }

      const currentStatus = currentOrderResult.rows[0].status;
      const wasPaidLike = isPaidLikeStatus(currentStatus);
      const willBePaidLike = isPaidLikeStatus(targetStatus);

      const updateResult = await client.query(
        `UPDATE orders
         SET status = $1,
             payment_id = COALESCE(payment_id, CASE WHEN $2::boolean THEN CONCAT('PAY-MANUAL-', order_number) ELSE payment_id END),
             paid_at = CASE WHEN $2::boolean THEN COALESCE(paid_at, CURRENT_TIMESTAMP) ELSE paid_at END,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3
         RETURNING id, status`,
        [targetStatus, willBePaidLike, orderId]
      );

      if (!wasPaidLike && willBePaidLike) {
        const orderItems = await client.query(
          'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
          [orderId]
        );

        for (const item of orderItems.rows) {
          await client.query(
            'UPDATE products SET quantity = GREATEST(0, quantity - $1) WHERE id = $2',
            [Number(item.quantity || 0), Number(item.product_id)]
          );
        }
      }

      return updateResult.rows[0];
    });

    res.json({ success: true, message: 'Estado actualizado', order: result });
  } catch (error) {
    if ((error as Error & { statusCode?: number })?.statusCode === 404) {
      res.status(404).json({ error: 'Orden no encontrada' });
      return;
    }
    console.error('Error al actualizar orden:', error);
    res.status(500).json({ error: 'Error al actualizar la orden' });
  }
});

router.get('/by-number/:orderNumber', async (req: Request, res: Response) => {
  const { orderNumber } = req.params;

  try {
    const result = await query(
      `SELECT
        id,
        order_number,
        customer_name,
        customer_email,
        total_amount,
        status,
        created_at,
        updated_at
       FROM orders
       WHERE order_number = $1
       LIMIT 1`,
      [orderNumber]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Orden no encontrada' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al consultar orden por número:', error);
    res.status(500).json({ error: 'Error al consultar la orden' });
  }
});

// Reconciliar stock manualmente para una orden pagada/completada (solo admin)
router.post('/:orderId/reconcile-stock', authMiddleware, async (req: AuthRequest, res: Response) => {
  const orderId = Number(req.params.orderId);

  if (!orderId || Number.isNaN(orderId)) {
    res.status(400).json({ error: 'orderId inválido' });
    return;
  }

  try {
    const isAdmin = await ensureAdmin(req.userId, res);
    if (!isAdmin) return;

    const result = await withTransaction(async (client) => {
      await client.query(
        `CREATE TABLE IF NOT EXISTS order_stock_reconciliations (
          order_id INTEGER PRIMARY KEY REFERENCES orders(id) ON DELETE CASCADE,
          reconciled_by_user_id INTEGER REFERENCES users(id),
          reconciled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`
      );

      const orderResult = await client.query(
        `SELECT id, order_number, status
         FROM orders
         WHERE id = $1
         LIMIT 1
         FOR UPDATE`,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        const err = new Error('Orden no encontrada');
        (err as Error & { statusCode?: number }).statusCode = 404;
        throw err;
      }

      const order = orderResult.rows[0];
      if (!isPaidLikeStatus(order.status)) {
        const err = new Error('Solo puedes reconciliar stock de órdenes pagadas/completadas');
        (err as Error & { statusCode?: number }).statusCode = 409;
        throw err;
      }

      const reconcileInsert = await client.query(
        `INSERT INTO order_stock_reconciliations (order_id, reconciled_by_user_id)
         VALUES ($1, $2)
         ON CONFLICT (order_id) DO NOTHING
         RETURNING reconciled_at`,
        [orderId, req.userId ?? null]
      );

      if (reconcileInsert.rows.length === 0) {
        const err = new Error('Esta orden ya fue reconciliada previamente');
        (err as Error & { statusCode?: number }).statusCode = 409;
        throw err;
      }

      const itemsResult = await client.query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [orderId]
      );

      let affectedProducts = 0;
      for (const item of itemsResult.rows) {
        const updateResult = await client.query(
          'UPDATE products SET quantity = GREATEST(0, quantity - $1) WHERE id = $2',
          [Number(item.quantity || 0), Number(item.product_id)]
        );
        affectedProducts += updateResult.rowCount || 0;
      }

      return {
        orderId,
        orderNumber: String(order.order_number || ''),
        itemsCount: itemsResult.rows.length,
        affectedProducts,
        reconciledAt: reconcileInsert.rows[0].reconciled_at,
      };
    });

    res.json({ success: true, ...result });
  } catch (error) {
    const statusCode = (error as Error & { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 409) {
      res.status(statusCode).json({ error: (error as Error).message });
      return;
    }

    console.error('Error al reconciliar stock de la orden:', error);
    res.status(500).json({ error: 'Error al reconciliar stock de la orden' });
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
      WHERE o.status IN ('pagado', 'completed', 'completado')
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
      WHERE o.status IN ('pagado', 'completed', 'completado')
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
    const createdByUserId = req.userId;

    if (!sellerId || Number.isNaN(sellerId)) {
      res.status(400).json({ error: 'sellerId es requerido' });
      return;
    }

    const result = await withTransaction(async (client) => {
      const pendingItems = await client.query(
        `SELECT oi.id, oi.seller_net_amount
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         LEFT JOIN seller_payout_items spi ON spi.order_item_id = oi.id
         WHERE oi.seller_id = $1
           AND o.status IN ('pagado', 'completed', 'completado')
           AND spi.order_item_id IS NULL
         FOR UPDATE OF oi`,
        [sellerId]
      );

      if (pendingItems.rows.length === 0) {
        const err = new Error('No hay saldo pendiente para este vendedor');
        (err as any).statusCode = 409;
        throw err;
      }

      const totalAmount = roundMoney(
        pendingItems.rows.reduce((acc: number, row: any) => acc + Number(row.seller_net_amount || 0), 0)
      );

      const payoutResult = await client.query(
        `INSERT INTO seller_payouts (seller_id, total_amount, status, notes, created_by_user_id)
         VALUES ($1, $2, 'pending', $3, $4)
         RETURNING id, seller_id, total_amount, status, created_at`,
        [sellerId, totalAmount, notes, createdByUserId]
      );

      const payoutId = payoutResult.rows[0].id;

      for (const item of pendingItems.rows) {
        await client.query(
          `INSERT INTO seller_payout_items (payout_id, order_item_id)
           VALUES ($1, $2)`,
          [payoutId, item.id]
        );
      }

      return { payoutId, totalAmount, itemsCount: pendingItems.rows.length };
    });

    res.json({
      success: true,
      payoutId: result.payoutId,
      sellerId,
      totalAmount: result.totalAmount,
      itemsCount: result.itemsCount,
      status: 'pending',
    });
  } catch (error: any) {
    if (error?.statusCode === 409) {
      res.status(409).json({ error: error.message });
      return;
    }
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
