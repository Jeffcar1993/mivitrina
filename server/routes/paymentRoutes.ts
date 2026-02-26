import express, { type Request, type Response } from 'express';
import { query } from '../config/db.js';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { processAutomaticPayoutsForOrder } from '../services/automaticPayouts.js';
import { withTransaction } from '../config/db.js';

// Configurar Mercado Pago (usa tu access token)
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
  options: {
    timeout: 20000, // Aumentar timeout a 20 segundos para evitar timeouts
  },
});

const router = express.Router();

const normalizeBaseUrl = (rawValue: string | undefined, fallback: string): string => {
  const value = String(rawValue || '').trim();
  const candidate = value.length > 0 ? value : fallback;
  const withProtocol = /^https?:\/\//i.test(candidate) ? candidate : `http://${candidate}`;

  try {
    const parsed = new URL(withProtocol);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return fallback;
  }
};

const DEFAULT_CLIENT_URL = normalizeBaseUrl(process.env.CLIENT_URL, 'http://localhost:5173');
const DEFAULT_SERVER_URL = normalizeBaseUrl(process.env.SERVER_URL, 'http://localhost:3000');
const DEFAULT_CURRENCY = String(process.env.DEFAULT_CURRENCY || 'COP').toUpperCase();

const VALID_PAYMENT_TYPES = new Set([
  'credit_card',
  'debit_card',
  'bank_transfer',
  'account_money',
  'ticket',
]);

type PaymentStatus =
  | 'approved'
  | 'pending'
  | 'rejected'
  | 'refunded'
  | 'charged_back'
  | string;

interface MercadoPagoPayment {
  id: number | string;
  status?: PaymentStatus;
  transaction_amount?: number;
  currency_id?: string;
  external_reference?: string;
  payment_type_id?: string;
  date_approved?: string;
  fee_details?: Array<{ amount?: number }>;
  transaction_details?: {
    net_received_amount?: number;
    total_paid_amount?: number;
  };
}

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const normalizeOrderStatus = (rawStatus: string | null | undefined): string => {
  const status = String(rawStatus || '').toLowerCase();
  if (status === 'completed') return 'pagado';
  return status;
};

const normalizeWebhookStatus = (status: PaymentStatus): string => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'approved') return 'pagado';
  if (normalized === 'pending') return 'pendiente_de_pago';
  if (normalized === 'rejected') return 'fallido';
  if (normalized === 'refunded') return 'cancelado';
  if (normalized === 'charged_back') return 'en_revision';
  return 'pendiente_de_pago';
};

const isApprovedWebhook = (status: PaymentStatus): boolean => String(status || '').toLowerCase() === 'approved';

const extractPaymentIdFromWebhook = (req: Request): string | null => {
  const body = req.body as Record<string, any>;
  const queryParams = req.query as Record<string, string | undefined>;

  const candidates = [
    body?.data?.id,
    body?.id,
    queryParams['data.id'],
    queryParams.id,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'number' || typeof candidate === 'string') {
      const value = String(candidate).trim();
      if (value.length > 0) return value;
    }
  }

  return null;
};

const getWebhookEventKey = (req: Request, paymentId: string): string => {
  const body = req.body as Record<string, any>;
  const directEventId = body?.id;
  if (typeof directEventId === 'number' || typeof directEventId === 'string') {
    return String(directEventId);
  }

  const type = String(body?.type || body?.topic || 'payment');
  const action = String(body?.action || 'unknown');
  const created = String(body?.date_created || 'no_date');
  return `${type}:${action}:${paymentId}:${created}`;
};

const buildInvoiceNumber = (orderNumber: string): string => `INV-${orderNumber}-${Date.now()}`;

const getMercadoPagoPaymentById = async (paymentId: string): Promise<MercadoPagoPayment> => {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
  if (!accessToken) {
    throw new Error('MERCADO_PAGO_ACCESS_TOKEN no configurado');
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Error consultando pago en Mercado Pago: ${response.status} ${payload}`);
  }

  return (await response.json()) as MercadoPagoPayment;
};

const buildPaymentAmounts = (payment: MercadoPagoPayment): {
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
} => {
  const grossAmount = roundMoney(Number(payment.transaction_amount || 0));
  const feeAmount = roundMoney(
    Array.isArray(payment.fee_details)
      ? payment.fee_details.reduce((sum, fee) => sum + Number(fee?.amount || 0), 0)
      : 0
  );

  const netFromProvider = Number(payment.transaction_details?.net_received_amount || 0);
  const netAmount = roundMoney(netFromProvider > 0 ? netFromProvider : grossAmount - feeAmount);

  return { grossAmount, feeAmount, netAmount };
};

const validateApprovedPayment = (params: {
  orderId: number;
  expectedAmount: number;
  expectedCurrency: string;
  payment: MercadoPagoPayment;
}): { valid: boolean; reason?: string } => {
  if (!isApprovedWebhook(params.payment.status || '')) {
    return { valid: false, reason: 'Status no aprobado' };
  }

  const paymentAmount = roundMoney(Number(params.payment.transaction_amount || 0));
  if (Math.abs(paymentAmount - roundMoney(params.expectedAmount)) > 0.01) {
    return { valid: false, reason: 'Monto no coincide con orden' };
  }

  const paymentCurrency = String(params.payment.currency_id || '').toUpperCase();
  if (!paymentCurrency || paymentCurrency !== params.expectedCurrency.toUpperCase()) {
    return { valid: false, reason: 'Moneda no coincide con orden' };
  }

  const externalReference = String(params.payment.external_reference || '').trim();
  if (externalReference !== String(params.orderId)) {
    return { valid: false, reason: 'external_reference no coincide con order_id interno' };
  }

  const paymentTypeId = String(params.payment.payment_type_id || '').trim();
  if (!paymentTypeId || !VALID_PAYMENT_TYPES.has(paymentTypeId)) {
    return { valid: false, reason: 'payment_type_id no permitido' };
  }

  return { valid: true };
};

router.post('/create-preference', async (req: Request, res: Response) => {
  const orderId = Number(req.body?.orderId);

  if (!orderId || Number.isNaN(orderId)) {
    res.status(400).json({ error: 'orderId inválido' });
    return;
  }

  try {
    const orderResult = await query(
      `SELECT id, order_number, customer_name, customer_email, customer_phone, total_amount, currency_id, status
       FROM orders
       WHERE id = $1
       LIMIT 1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      res.status(404).json({ error: 'Orden no encontrada' });
      return;
    }

    const order = orderResult.rows[0];
    const orderStatus = normalizeOrderStatus(order.status);
    if (orderStatus !== 'pendiente_de_pago') {
      res.status(409).json({ error: 'La orden no está disponible para iniciar pago' });
      return;
    }

    const orderItemsResult = await query(
      `SELECT oi.product_id, oi.quantity, oi.unit_price, p.title
       FROM order_items oi
       JOIN products p ON p.id = oi.product_id
       WHERE oi.order_id = $1`,
      [orderId]
    );

    if (orderItemsResult.rows.length === 0) {
      res.status(409).json({ error: 'La orden no tiene items válidos' });
      return;
    }

    const items = orderItemsResult.rows.map((item) => ({
      id: String(item.product_id),
      title: String(item.title || 'Producto'),
      quantity: Number(item.quantity || 1),
      unit_price: Number(item.unit_price || 0),
    }));

    const computedTotal = roundMoney(
      items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
    );
    const storedTotal = roundMoney(Number(order.total_amount || 0));
    if (Math.abs(computedTotal - storedTotal) > 0.01) {
      res.status(409).json({ error: 'El total de la orden no coincide con sus items' });
      return;
    }

    const preference = new Preference(client);
    const hasPublicServerUrl =
      DEFAULT_SERVER_URL.startsWith('https://') &&
      !DEFAULT_SERVER_URL.includes('localhost') &&
      !DEFAULT_SERVER_URL.includes('127.0.0.1');

    const preferenceBody: any = {
      items,
      payer: {
        email: String(order.customer_email || ''),
        name: String(order.customer_name || ''),
        phone: {
          number: String(order.customer_phone || ''),
        },
      },
      back_urls: {
        success: `${DEFAULT_CLIENT_URL}/payment-confirmation?status=approved&orderNumber=${order.order_number}`,
        failure: `${DEFAULT_CLIENT_URL}/payment-confirmation?status=rejected&orderNumber=${order.order_number}`,
        pending: `${DEFAULT_CLIENT_URL}/payment-confirmation?status=pending&orderNumber=${order.order_number}`,
      },
      auto_return: 'approved',
      external_reference: String(order.id),
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
      },
    };

    if (hasPublicServerUrl) {
      preferenceBody.notification_url = `${DEFAULT_SERVER_URL}/api/payments/webhook`;
    }

    let preferenceData: any;

    try {
      preferenceData = await preference.create({
        body: preferenceBody,
      });
    } catch (error: any) {
      const message = String(error?.message || '').toLowerCase();
      const shouldRetryWithoutAutoReturn =
        message.includes('auto_return invalid') ||
        message.includes('back_url.success');

      if (!shouldRetryWithoutAutoReturn) {
        throw error;
      }

      delete preferenceBody.auto_return;
      preferenceData = await preference.create({
        body: preferenceBody,
      });
    }

    const initPoint = preferenceData.init_point || preferenceData.sandbox_init_point;
    await query(
      'UPDATE orders SET mercado_pago_preference_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [preferenceData.id, orderId]
    );

    res.json({
      orderId,
      orderNumber: order.order_number,
      preferenceId: preferenceData.id,
      initPoint,
    });
  } catch (error: any) {
    console.error('Error al crear preference con verificación servidor:', {
      message: error?.message,
      cause: error?.cause,
      status: error?.status,
      response: error?.response,
      body: error?.body,
    });

    const providerStatus = Number(error?.status || error?.response?.status || 0);
    if (providerStatus >= 400 && providerStatus < 500) {
      res.status(502).json({
        error: 'Mercado Pago rechazó la preferencia de pago. Revisa configuración de cuenta/URLs.',
      });
      return;
    }

    res.status(500).json({ error: 'No se pudo iniciar el pago' });
  }
});

router.post('/webhook', async (req: Request, res: Response) => {
  const paymentId = extractPaymentIdFromWebhook(req);
  const eventType = String((req.body as Record<string, unknown>)?.type || (req.body as Record<string, unknown>)?.topic || 'payment');

  console.info('[MP][WEBHOOK] recibido', {
    type: eventType,
    hasBody: Boolean(req.body),
    paymentId,
  });

  if (eventType !== 'payment') {
    res.status(200).json({ received: true, ignored: true });
    return;
  }

  if (!paymentId) {
    res.status(400).json({ error: 'Webhook sin payment_id' });
    return;
  }

  const eventKey = getWebhookEventKey(req, paymentId);

  try {
    const payment = await getMercadoPagoPaymentById(paymentId);
    console.info('[MP][API] pago consultado', {
      paymentId,
      status: payment.status,
      externalReference: payment.external_reference,
      amount: payment.transaction_amount,
      currency: payment.currency_id,
      paymentType: payment.payment_type_id,
    });

    const externalReference = String(payment.external_reference || '').trim();
    const orderId = Number(externalReference);
    if (!externalReference || Number.isNaN(orderId) || orderId <= 0) {
      res.status(422).json({ error: 'external_reference inválido en pago' });
      return;
    }

    const payoutData = await withTransaction(async (clientTx) => {
      const eventInsert = await clientTx.query(
        `INSERT INTO payment_webhook_events (source, event_key, payment_id, event_type, payload)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (source, event_key) DO NOTHING
         RETURNING id`,
        ['mercadopago', eventKey, paymentId, eventType, req.body]
      );

      if (eventInsert.rows.length === 0) {
        return { idempotent: true as const, paidNow: false as const, orderId };
      }

      const orderResult = await clientTx.query(
        `SELECT id, order_number, status, total_amount, currency_id, platform_fee_amount, customer_address, customer_city
         FROM orders
         WHERE id = $1
         FOR UPDATE`,
        [orderId]
      );

      if (orderResult.rows.length === 0) {
        throw new Error('Orden interna no encontrada para external_reference');
      }

      const order = orderResult.rows[0];
      const currentOrderStatus = normalizeOrderStatus(order.status);
      const normalizedIncomingStatus = normalizeWebhookStatus(payment.status || 'pending');
      const amounts = buildPaymentAmounts(payment);

      await clientTx.query(
        `INSERT INTO payments (
          order_id,
          payment_id,
          external_reference,
          status,
          amount,
          gross_amount,
          fee_amount,
          net_amount,
          currency_id,
          payment_method,
          payment_type_id,
          approved_at,
          mercado_pago_payment_id,
          mercado_pago_status,
          transaction_id,
          webhook_payload,
          webhook_received_at,
          updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8,
          $9, $10, $11, $12, $13, $14, $15, $16,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        ON CONFLICT (payment_id)
        DO UPDATE SET
          order_id = EXCLUDED.order_id,
          external_reference = EXCLUDED.external_reference,
          status = EXCLUDED.status,
          amount = EXCLUDED.amount,
          gross_amount = EXCLUDED.gross_amount,
          fee_amount = EXCLUDED.fee_amount,
          net_amount = EXCLUDED.net_amount,
          currency_id = EXCLUDED.currency_id,
          payment_method = EXCLUDED.payment_method,
          payment_type_id = EXCLUDED.payment_type_id,
          approved_at = EXCLUDED.approved_at,
          mercado_pago_payment_id = EXCLUDED.mercado_pago_payment_id,
          mercado_pago_status = EXCLUDED.mercado_pago_status,
          transaction_id = EXCLUDED.transaction_id,
          webhook_payload = EXCLUDED.webhook_payload,
          webhook_received_at = EXCLUDED.webhook_received_at,
          updated_at = CURRENT_TIMESTAMP`,
        [
          orderId,
          String(payment.id),
          externalReference,
          normalizedIncomingStatus,
          amounts.grossAmount,
          amounts.grossAmount,
          amounts.feeAmount,
          amounts.netAmount,
          String(payment.currency_id || order.currency_id || DEFAULT_CURRENCY).toUpperCase(),
          'mercado_pago',
          String(payment.payment_type_id || ''),
          payment.date_approved ? new Date(payment.date_approved) : null,
          String(payment.id),
          String(payment.status || ''),
          String(payment.id),
          payment,
        ]
      );

      if (isApprovedWebhook(payment.status || '')) {
        const validation = validateApprovedPayment({
          orderId,
          expectedAmount: Number(order.total_amount || 0),
          expectedCurrency: String(order.currency_id || DEFAULT_CURRENCY),
          payment,
        });

        if (!validation.valid) {
          throw new Error(`Pago aprobado inválido: ${validation.reason || 'validación fallida'}`);
        }

        if (currentOrderStatus === 'pagado') {
          await clientTx.query(
            `UPDATE orders
             SET last_payment_webhook_at = CURRENT_TIMESTAMP,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [orderId]
          );

          return { idempotent: false as const, paidNow: false as const, orderId };
        }

        await clientTx.query(
          `UPDATE orders
           SET status = 'pagado',
               payment_id = $2,
               paid_at = COALESCE($3, CURRENT_TIMESTAMP),
               last_payment_webhook_at = CURRENT_TIMESTAMP,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [orderId, String(payment.id), payment.date_approved ? new Date(payment.date_approved) : null]
        );

        const orderItems = await clientTx.query(
          'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
          [orderId]
        );

        for (const item of orderItems.rows) {
          await clientTx.query(
            'UPDATE products SET quantity = GREATEST(0, quantity - $1) WHERE id = $2',
            [Number(item.quantity || 0), Number(item.product_id)]
          );
        }

        await clientTx.query(
          `INSERT INTO invoices (
            order_id,
            invoice_number,
            status,
            subtotal,
            platform_fee_amount,
            total_amount,
            currency_id,
            issued_at
          )
          VALUES ($1, $2, 'emitida', $3, $4, $5, $6, CURRENT_TIMESTAMP)
          ON CONFLICT (order_id) DO NOTHING`,
          [
            orderId,
            buildInvoiceNumber(String(order.order_number || orderId)),
            amounts.grossAmount,
            Number(order.platform_fee_amount || 0),
            amounts.grossAmount,
            String(payment.currency_id || order.currency_id || DEFAULT_CURRENCY).toUpperCase(),
          ]
        );

        await clientTx.query(
          `INSERT INTO shipments (order_id, status, shipping_address, shipping_city)
           VALUES ($1, 'pendiente_preparacion', $2, $3)
           ON CONFLICT (order_id) DO NOTHING`,
          [orderId, order.customer_address || null, order.customer_city || null]
        );

        console.info('[MP][ORDER] transición a pagado aplicada', {
          orderId,
          paymentId,
        });

        return { idempotent: false as const, paidNow: true as const, orderId };
      }

      await clientTx.query(
        `UPDATE orders
         SET status = $2,
             payment_id = COALESCE(payment_id, $3),
             last_payment_webhook_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
           AND status != 'pagado'`,
        [orderId, normalizedIncomingStatus, String(payment.id)]
      );

      console.info('[MP][ORDER] estado no aprobado actualizado', {
        orderId,
        to: normalizedIncomingStatus,
      });

      return { idempotent: false as const, paidNow: false as const, orderId };
    });

    if (!payoutData.idempotent && payoutData.paidNow) {
      const payoutSummary = await processAutomaticPayoutsForOrder(payoutData.orderId);
      console.info('[MP][PAYOUT] resumen', { orderId: payoutData.orderId, ...payoutSummary });
    }

    res.json({
      received: true,
      idempotent: payoutData.idempotent,
      orderId,
    });
  } catch (error) {
    console.error('[MP][WEBHOOK] error procesando evento', {
      paymentId,
      eventKey,
      error,
    });
    res.status(500).json({ error: 'Error procesando webhook de Mercado Pago' });
  }
});

// Verificar estado de pago
router.get('/:orderId', async (req: Request, res: Response) => {
  const { orderId } = req.params;

  try {
    const result = await query(
      'SELECT id, status, mercado_pago_preference_id FROM orders WHERE id = $1',
      [orderId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Orden no encontrada' });
      return;
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al obtener pago:', error);
    res.status(500).json({ error: 'Error al obtener el estado del pago' });
  }
});

// Confirmar pago y actualizar status a 'pagado'
router.put('/:orderNumber/confirm-payment', async (req: Request, res: Response) => {
  const { orderNumber } = req.params;

  try {
    let confirmedOrderId: number | null = null;
    await query('BEGIN'); // Iniciar transacción

    // 1. Actualizar la orden a completada
    const orderResult = await query(
      `UPDATE orders SET status = 'pagado', paid_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE order_number = $1 AND status NOT IN ('pagado', 'completed')
       RETURNING id`,
      [orderNumber]
    );

    if (orderResult.rows.length > 0) {
      const orderId = orderResult.rows[0].id;
      confirmedOrderId = Number(orderId);

      // 2. Buscar los items de esa orden
      const items = await query(
        'SELECT product_id, quantity FROM order_items WHERE order_id = $1',
        [orderId]
      );

      // 3. Descontar el stock de cada producto
      for (const item of items.rows) {
        await query(
          'UPDATE products SET quantity = GREATEST(0, quantity - $1) WHERE id = $2',
          [item.quantity, item.product_id]
        );
      }
      
      await query('COMMIT');

      const payoutSummary = confirmedOrderId
        ? await processAutomaticPayoutsForOrder(confirmedOrderId)
        : { processed: 0, paid: 0, failed: 0, skipped: 0 };

      res.json({
        success: true,
        message: 'Pago confirmado, stock actualizado y repartición automática procesada',
        payoutSummary,
      });
    } else {
      const existingOrderResult = await query(
        'SELECT id, status FROM orders WHERE order_number = $1 LIMIT 1',
        [orderNumber]
      );

      if (existingOrderResult.rows.length === 0) {
        await query('ROLLBACK');
        res.status(404).json({ error: 'Orden no encontrada' });
        return;
      }

      if (normalizeOrderStatus(existingOrderResult.rows[0].status) === 'pagado') {
        await query('ROLLBACK');
        res.json({
          success: true,
          message: 'La orden ya estaba confirmada previamente',
          payoutSummary: { processed: 0, paid: 0, failed: 0, skipped: 0 },
        });
        return;
      }

      await query('ROLLBACK');
      res.status(409).json({ error: 'No se pudo confirmar la orden en este estado' });
    }
  } catch (error) {
    await query('ROLLBACK');
    console.error('Error al confirmar pago:', error);
    res.status(500).json({ error: 'Error interno' });
  }
});

export default router;
