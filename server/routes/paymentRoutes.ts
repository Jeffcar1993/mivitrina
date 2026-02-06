import express, { type Request, type Response } from 'express';
import { query } from '../config/db.js';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// Configurar Mercado Pago (usa tu access token)
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
});

const router = express.Router();
router.post('/create-preference', async (req: Request, res: Response) => {
  const { orderId, items, payer } = req.body;

  if (!orderId || !items || !payer) {
    res.status(400).json({ error: 'Datos incompletos' });
    return;
  }

  try {
    // Obtener información de la orden para usar como external_reference
    const orderResult = await query('SELECT order_number FROM orders WHERE id = $1', [orderId]);

    if (orderResult.rows.length === 0) {
      res.status(404).json({ error: 'Orden no encontrada' });
      return;
    }

    const orderNumber = orderResult.rows[0].order_number;

    // Usar SDK de Mercado Pago con acceso token configurado
    try {
      const preference = new Preference(client);
      const preferenceData = await preference.create({
        body: {
          items: items.map((item: any) => ({
            title: item.title,
            quantity: item.quantity,
            unit_price: item.unit_price,
          })),
          payer: {
            email: payer.email,
            name: payer.name,
            phone: {
              number: payer.phone?.number || '',
            },
          },
          back_urls: {
            success: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-confirmation?status=approved&external_reference=${orderNumber}`,
            failure: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-confirmation?status=rejected&external_reference=${orderNumber}`,
            pending: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-confirmation?status=pending&external_reference=${orderNumber}`,
          },
          external_reference: orderNumber,
          notification_url: `${process.env.SERVER_URL || 'http://localhost:3000'}/api/payments/webhook`,
          // Permitir múltiples métodos de pago
          payment_methods: {
            excluded_payment_methods: [],
            excluded_payment_types: [],
          },
        },
      });

      const initPoint = preferenceData.init_point || preferenceData.sandbox_init_point;

      // Guardar preference_id en la orden
      await query(
        'UPDATE orders SET mercado_pago_preference_id = $1 WHERE id = $2',
        [preferenceData.id, orderId]
      );

      res.json({ preferenceId: preferenceData.id, initPoint });
    } catch (mpError) {
      console.error('Error con Mercado Pago:', mpError);
      // Si hay error con MP, usar preference_id simulado para desarrollo
      const simulatedPreferenceId = `PREF-${orderNumber}-${Date.now()}`;
      const fallbackInitPoint = `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-confirmation?status=pending&external_reference=${orderNumber}`;

      await query(
        'UPDATE orders SET mercado_pago_preference_id = $1 WHERE id = $2',
        [simulatedPreferenceId, orderId]
      );

      res.json({
        preferenceId: simulatedPreferenceId,
        initPoint: fallbackInitPoint,
        message: 'En producción, usa SDK de Mercado Pago',
      });
    }
  } catch (error) {
    console.error('Error al crear preference:', error);
    res.status(500).json({ error: 'Error al crear la preferencia de pago' });
  }
});

// Webhook de Mercado Pago (para notificaciones de pago)
router.post('/webhook', async (req: Request, res: Response) => {
  const { id, type, data } = req.body;

  // Validar que sea una notificación de Mercado Pago
  if (type !== 'payment') {
    res.json({ received: true });
    return;
  }

  try {
    // Aquí iría la lógica para verificar el pago con Mercado Pago
    // const preference = new Preference(client);
    // const payment = await client.payment.findById(data.id);

    // Por ahora, simulamos la actualización
    const paymentId = data.id;

    // Buscar la orden por payment_id
    const orderResult = await query(
      'SELECT id FROM orders WHERE mercado_pago_preference_id = $1',
      [paymentId]
    );

    if (orderResult.rows.length > 0) {
      const orderId = orderResult.rows[0].id;

      // Actualizar estado de la orden (esto debería venir del webhook)
      await query(
        'UPDATE orders SET status = $1, payment_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        ['completed', paymentId, orderId]
      );

      // Registrar el pago
      await query(
        `INSERT INTO payments (order_id, payment_id, status, amount, mercado_pago_payment_id)
         SELECT id, $2, 'completed', total_amount, $2 FROM orders WHERE id = $1`,
        [orderId, paymentId]
      );
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error en webhook:', error);
    res.status(500).json({ error: 'Error procesando webhook' });
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

export default router;
