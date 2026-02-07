import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/axios';
import { useCart } from '../context/cartContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ShoppingCart, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function Checkout() {
  const { cart, total } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Datos del formulario
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    customerAddress: '',
    customerCity: '',
  });

  // Verificar que haya productos en el carrito
  useEffect(() => {
    if (cart.length === 0) {
      navigate('/');
      toast.error('Tu carrito está vacío');
    }
  }, [cart.length, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar datos
    if (!formData.customerName || !formData.customerEmail || !formData.customerAddress || !formData.customerCity) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      // 1. Crear la orden en el backend
      const orderResponse = await api.post('/orders/create', {
        customerName: formData.customerName,
        customerEmail: formData.customerEmail,
        customerPhone: formData.customerPhone,
        customerAddress: formData.customerAddress,
        customerCity: formData.customerCity,
        items: cart.map(product => ({
          productId: product.id,
          sellerId: product.user_id,
          quantity: 1,
          price: product.price,
        })),
        totalAmount: total,
      });

      const orderId = orderResponse.data.orderId;

      // 2. Obtener el preference_id de Mercado Pago
      const paymentResponse = await api.post('/payments/create-preference', {
        orderId: orderId,
        items: cart.map(product => ({
          title: product.title,
          quantity: 1,
          unit_price: Number(product.price),
        })),
        payer: {
          email: formData.customerEmail,
          name: formData.customerName,
          phone: {
            number: formData.customerPhone,
          },
        },
      });

      const initPoint = paymentResponse.data.initPoint as string | undefined;

      // 3. Redirigir a Mercado Pago
      // NOTA: NO limpiamos el carrito aquí. Se limpiará en PaymentConfirmation solo si el pago fue exitoso
      if (initPoint) {
        window.location.href = initPoint;
      } else {
        toast.error('No se pudo iniciar el pago con Mercado Pago. Intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error al crear la orden:', error);
      toast.error('Hubo un error al procesar tu compra. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFB] py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-[#C05673] hover:text-[#B04B68] transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Volver
        </button>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Formulario */}
          <div className="lg:col-span-2">
            <Card className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-2xl">Finalizar compra</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Información del comprador */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900">Información de envío</h3>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="customerName">Nombre completo *</Label>
                        <Input
                          id="customerName"
                          name="customerName"
                          value={formData.customerName}
                          onChange={handleInputChange}
                          placeholder="Juan Pérez"
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="customerEmail">Correo electrónico *</Label>
                        <Input
                          id="customerEmail"
                          name="customerEmail"
                          type="email"
                          value={formData.customerEmail}
                          onChange={handleInputChange}
                          placeholder="juan@example.com"
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customerPhone">Teléfono</Label>
                      <Input
                        id="customerPhone"
                        name="customerPhone"
                        value={formData.customerPhone}
                        onChange={handleInputChange}
                        placeholder="+57 300 000 0000"
                        className="h-11"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customerAddress">Dirección *</Label>
                      <Textarea
                        id="customerAddress"
                        name="customerAddress"
                        value={formData.customerAddress}
                        onChange={handleInputChange}
                        placeholder="Calle 10 #20-30, Apartamento 5"
                        className="resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customerCity">Ciudad *</Label>
                      <Input
                        id="customerCity"
                        name="customerCity"
                        value={formData.customerCity}
                        onChange={handleInputChange}
                        placeholder="Bogotá"
                        className="h-11"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-lg bg-[#C05673] text-white font-semibold hover:bg-[#B04B68] transition-colors"
                  >
                    {loading ? 'Procesando...' : 'Continuar al pago'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Resumen de compra */}
          <div>
            <Card className="border-slate-200 sticky top-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Resumen de compra
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Items */}
                <div className="max-h-96 overflow-y-auto space-y-3 border-b border-slate-200 pb-4">
                  {cart.map((product, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div className="flex-1">
                        <p className="font-medium text-slate-900 line-clamp-1">{product.title}</p>
                        <p className="text-slate-500">Cantidad: 1</p>
                      </div>
                      <p className="font-semibold text-slate-900 ml-2">
                        ${Number(product.price).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="space-y-2 pt-4">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal</span>
                    <span>${total.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Envío</span>
                    <span>A acordar con vendedor</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2 flex justify-between text-lg font-bold text-slate-900">
                    <span>Total</span>
                    <span className="text-[#C05673]">${total.toLocaleString('es-CO', { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                  <p className="font-semibold">ℹ️ Información importante</p>
                  <p className="mt-1">Serás redirigido a Mercado Pago para completar el pago de forma segura.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
