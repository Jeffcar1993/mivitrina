import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../lib/axios';
import { useCart } from '../context/cartContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react';

interface OrderData {
  orderId: number;
  orderNumber: string;
  status: string;
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  createdAt: string;
}

export default function PaymentConfirmation() {
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados de pago posibles
  const paymentStatus = searchParams.get('status');
  const externalReference = searchParams.get('external_reference');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        if (!externalReference) {
          setError('No se pudo verificar el pago');
          setLoading(false);
          return;
        }

        // Obtener información de la orden
        const response = await api.get(`/orders/${externalReference}`);
        setOrder(response.data);
        
        // Limpiar carrito SOLO si el pago fue exitoso
        if (paymentStatus === 'approved') {
          clearCart();
        }
      } catch (err) {
        console.error('Error al verificar pago:', err);
        setError('Hubo un error al cargar los detalles de tu orden');
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [externalReference, paymentStatus, clearCart]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FBFBFB] flex items-center justify-center py-8">
        <div className="text-center">
          <Clock className="h-16 w-16 text-[#C05673] mx-auto mb-4 animate-spin" />
          <p className="text-lg font-semibold text-slate-900">Verificando tu pago...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#FBFBFB] py-8">
        <div className="container mx-auto px-4">
          <Card className="border-red-200 max-w-md mx-auto">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <XCircle className="h-16 w-16 text-red-500" />
              </div>
              <CardTitle className="text-center text-xl">Algo salió mal</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-slate-600">{error || 'No se pudo procesar tu compra'}</p>
              <Button asChild className="w-full bg-[#C05673] hover:bg-[#B04B68]">
                <Link to="/">Volver al inicio</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Determinar el estado del pago
  const isApproved = paymentStatus === 'approved' && order.status === 'completed';
  const isPending = paymentStatus === 'pending' || order.status === 'pending';
  const isFailed = paymentStatus === 'rejected' || paymentStatus === 'cancelled' || order.status === 'failed';

  return (
    <div className="min-h-screen bg-[#FBFBFB] py-8">
      <div className="container mx-auto px-4">
        <Card className={`max-w-2xl mx-auto border-2 ${isApproved ? 'border-green-200' : isPending ? 'border-yellow-200' : 'border-red-200'}`}>
          <CardHeader>
            <div className="flex justify-center mb-4">
              {isApproved && <CheckCircle className="h-16 w-16 text-green-500" />}
              {isPending && <Clock className="h-16 w-16 text-yellow-500" />}
              {isFailed && <XCircle className="h-16 w-16 text-red-500" />}
            </div>
            <CardTitle className="text-center text-2xl">
              {isApproved && '¡Pago completado!'}
              {isPending && 'Pago pendiente'}
              {isFailed && 'Pago rechazado'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Información de la orden */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <p className="text-sm text-slate-600">Número de orden</p>
              <p className="text-xl font-bold text-slate-900">{order.orderNumber}</p>
              <p className="text-xs text-slate-500">
                {new Date(order.createdAt).toLocaleDateString('es-CO', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>

            {/* Estado del pago */}
            {isApproved && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-green-900">✓ Tu pago ha sido confirmado</p>
                <p className="text-sm text-green-700">
                  Recibirás una confirmación en {order.customerEmail}
                </p>
              </div>
            )}

            {isPending && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-yellow-900">⏳ Estamos procesando tu pago</p>
                <p className="text-sm text-yellow-700">
                  Puede tomar unos minutos. Te notificaremos cuando se complete.
                </p>
              </div>
            )}

            {isFailed && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                <p className="font-semibold text-red-900">✗ Tu pago fue rechazado</p>
                <p className="text-sm text-red-700">
                  Verifica tus datos y vuelve a intentar. Si el problema persiste, contacta tu banco.
                </p>
              </div>
            )}

            {/* Detalles de la compra */}
            <div className="border-t border-slate-200 pt-4 space-y-3">
              <p className="font-semibold text-slate-900">Detalles de la compra</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Cliente</span>
                  <span className="font-medium text-slate-900">{order.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Correo</span>
                  <span className="font-medium text-slate-900">{order.customerEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Total</span>
                  <span className="font-bold text-[#C05673]">
                    ${order.totalAmount.toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-3 pt-4 border-t border-slate-200">
              <Button asChild variant="outline" className="flex-1 border-slate-200 hover:bg-slate-50">
                <Link to="/">Volver al inicio</Link>
              </Button>
              {isApproved && (
                <Button asChild className="flex-1 bg-[#C05673] hover:bg-[#B04B68]">
                  <Link to="/profile" className="flex items-center justify-center gap-2">
                    Ver mis compras
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>

            {/* Información adicional */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 space-y-1">
              <p className="font-semibold">Próximos pasos</p>
              {isApproved && (
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Los vendedores prepararán tus productos</li>
                  <li>Recibirás información de envío en tu correo</li>
                  <li>Puedes rastrear tu compra en tu perfil</li>
                </ul>
              )}
              {isPending && (
                <p className="text-xs">
                  Por favor no cierres esta página hasta que se complete el pago.
                </p>
              )}
              {isFailed && (
                <p className="text-xs">
                  Intenta de nuevo o elige otro método de pago en tu banco.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
