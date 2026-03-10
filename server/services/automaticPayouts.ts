import { query } from '../config/db.js';

interface SellerPayoutCandidate {
  sellerId: number;
  totalAmount: number;
  orderItemIds: number[];
  mercadoPagoAccountId: string | null;
  payoutAutomationEnabled: boolean;
}

interface AutomaticPayoutSummary {
  processed: number;
  paid: number;
  failed: number;
  skipped: number;
}

const isTrue = (value: string | undefined, defaultValue = false): boolean => {
  if (typeof value === 'undefined') return defaultValue;
  const normalized = value.trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

const roundMoney = (value: number): number => Math.round(value * 100) / 100;

const parseOrderItemIds = (value: unknown): number[] => {
  if (Array.isArray(value)) {
    return value
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0);
  }

  if (typeof value === 'string' && value.startsWith('{') && value.endsWith('}')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item) && item > 0);
  }

  return [];
};

const buildTransferError = async (response: Response): Promise<string> => {
  try {
    const payload = (await response.json()) as Record<string, unknown>;
    const message =
      (typeof payload.message === 'string' && payload.message) ||
      (typeof payload.error === 'string' && payload.error) ||
      'Transferencia rechazada por el proveedor';

    return `${message} (status ${response.status})`;
  } catch {
    return `Transferencia rechazada por el proveedor (status ${response.status})`;
  }
};

const transferWithMercadoPago = async (args: {
  amount: number;
  receiverId: string;
  payoutId: number;
  orderId: number;
  sellerId: number;
}): Promise<string> => {
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
  if (!accessToken) {
    throw new Error('MERCADO_PAGO_ACCESS_TOKEN no está configurado');
  }

  const response = await fetch('https://api.mercadopago.com/v1/transfers', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: roundMoney(args.amount),
      receiver_id: args.receiverId,
      external_reference: `payout-${args.payoutId}-order-${args.orderId}-seller-${args.sellerId}`,
      description: `Payout automático orden ${args.orderId}`,
    }),
  });

  if (!response.ok) {
    throw new Error(await buildTransferError(response));
  }

  const transfer = (await response.json()) as Record<string, unknown>;
  const transferId = transfer.id;
  if (typeof transferId === 'undefined' || transferId === null) {
    throw new Error('La transferencia fue aceptada sin id de referencia');
  }

  return String(transferId);
};

const getCandidates = async (orderId: number): Promise<SellerPayoutCandidate[]> => {
  const result = await query(
    `SELECT
      oi.seller_id,
      COALESCE(SUM(oi.seller_net_amount), 0)::numeric AS total_amount,
      ARRAY_AGG(oi.id) AS order_item_ids,
      u.mercado_pago_account_id,
      COALESCE(u.payout_automation_enabled, true) AS payout_automation_enabled
    FROM order_items oi
    JOIN users u ON u.id = oi.seller_id
    LEFT JOIN seller_payout_items spi ON spi.order_item_id = oi.id
    WHERE oi.order_id = $1
      AND spi.order_item_id IS NULL
    GROUP BY oi.seller_id, u.mercado_pago_account_id, u.payout_automation_enabled`,
    [orderId]
  );

  return result.rows.map((row) => ({
    sellerId: Number(row.seller_id),
    totalAmount: roundMoney(Number(row.total_amount || 0)),
    orderItemIds: parseOrderItemIds(row.order_item_ids),
    mercadoPagoAccountId:
      typeof row.mercado_pago_account_id === 'string' && row.mercado_pago_account_id.trim().length > 0
        ? row.mercado_pago_account_id.trim()
        : null,
    payoutAutomationEnabled: Boolean(row.payout_automation_enabled),
  }));
};

const createPayoutRecord = async (args: {
  sellerId: number;
  totalAmount: number;
  orderItemIds: number[];
  orderId: number;
}): Promise<number> => {
  await query('BEGIN');

  try {
    const payout = await query(
      `INSERT INTO seller_payouts (
        seller_id,
        total_amount,
        status,
        transfer_provider,
        notes
      )
      VALUES ($1, $2, 'processing', 'mercado_pago', $3)
      RETURNING id`,
      [args.sellerId, args.totalAmount, `Payout automático por orden ${args.orderId}`]
    );

    const payoutId = Number(payout.rows[0]?.id || 0);
    if (!payoutId) {
      throw new Error('No se pudo crear payout automático');
    }

    for (const orderItemId of args.orderItemIds) {
      await query(
        `INSERT INTO seller_payout_items (payout_id, order_item_id)
         VALUES ($1, $2)
         ON CONFLICT (order_item_id) DO NOTHING`,
        [payoutId, orderItemId]
      );
    }

    await query('COMMIT');
    return payoutId;
  } catch (error) {
    await query('ROLLBACK');
    throw error;
  }
};

const markPayoutFailed = async (payoutId: number, errorMessage: string): Promise<void> => {
  await query(
    `UPDATE seller_payouts
     SET status = 'failed',
         transfer_error = $2,
         transfer_attempts = transfer_attempts + 1,
         processed_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [payoutId, errorMessage]
  );
};

const markPayoutPaid = async (payoutId: number, transferId: string): Promise<void> => {
  await query(
    `UPDATE seller_payouts
     SET status = 'paid',
         external_transfer_id = $2,
         transfer_error = NULL,
         transfer_attempts = transfer_attempts + 1,
         processed_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [payoutId, transferId]
  );
};

export const processAutomaticPayoutsForOrder = async (orderId: number): Promise<AutomaticPayoutSummary> => {
  const automaticPayoutEnabled = isTrue(process.env.AUTO_PAYOUT_ENABLED, true);
  const simulateTransfers = isTrue(process.env.AUTO_PAYOUT_SIMULATE, process.env.NODE_ENV !== 'production');

  const summary: AutomaticPayoutSummary = {
    processed: 0,
    paid: 0,
    failed: 0,
    skipped: 0,
  };

  if (!automaticPayoutEnabled) {
    return summary;
  }

  const candidates = await getCandidates(orderId);

  for (const candidate of candidates) {
    if (!candidate.payoutAutomationEnabled || candidate.totalAmount <= 0 || candidate.orderItemIds.length === 0) {
      summary.skipped += 1;
      continue;
    }

    const payoutId = await createPayoutRecord({
      sellerId: candidate.sellerId,
      totalAmount: candidate.totalAmount,
      orderItemIds: candidate.orderItemIds,
      orderId,
    });

    summary.processed += 1;

    if (!candidate.mercadoPagoAccountId) {
      await markPayoutFailed(
        payoutId,
        'El vendedor no tiene mercado_pago_account_id configurado para transferencias automáticas'
      );
      summary.failed += 1;
      continue;
    }

    try {
      if (simulateTransfers) {
        await markPayoutPaid(payoutId, `simulated-${orderId}-${candidate.sellerId}-${Date.now()}`);
      } else {
        const transferId = await transferWithMercadoPago({
          amount: candidate.totalAmount,
          receiverId: candidate.mercadoPagoAccountId,
          payoutId,
          orderId,
          sellerId: candidate.sellerId,
        });

        await markPayoutPaid(payoutId, transferId);
      }

      summary.paid += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo ejecutar la transferencia automática';
      await markPayoutFailed(payoutId, message);
      summary.failed += 1;
    }
  }

  return summary;
};
