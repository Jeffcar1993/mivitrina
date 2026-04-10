import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../lib/axios';
import type { User } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, CheckCircle2, ExternalLink, RefreshCw } from 'lucide-react';

export default function SellerPayoutSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);

  const user = useMemo(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  }, []);

  const returnTo = searchParams.get('returnTo') || '/';
  const isConnected = Boolean(user?.mercado_pago_account_id);

  const handleConnectMP = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para conectar tu cuenta');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      const response = await api.get<{ url: string; state: string }>(
        '/auth/mercadopago/url'
      );

      const { url, state } = response.data;

      // Guardamos state y returnTo en sessionStorage para verificarlos en el callback
      sessionStorage.setItem('mp_oauth_state', state);
      sessionStorage.setItem('mp_oauth_return_to', returnTo);

      // Redirigir al flujo OAuth de Mercado Pago
      window.location.href = url;
    } catch (error) {
      console.error('Error iniciando OAuth de Mercado Pago:', error);
      toast.error('No se pudo iniciar la conexión con Mercado Pago. Intenta de nuevo.');
      setLoading(false);
    }
  };

  const handleContinue = () => {
    navigate(returnTo);
  };

  return (
    <div className="min-h-screen bg-[#FBFBFB] flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-2xl font-black text-slate-900">
            {isConnected ? 'Cuenta de cobros conectada' : 'Configura tus cobros para vender'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">

          {isConnected ? (
            <>
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800 text-sm flex gap-3">
                <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold">¡Tu cuenta de Mercado Pago está conectada!</p>
                  <p className="mt-1 text-green-700">
                    ID de cuenta: <span className="font-mono font-bold">{user?.mercado_pago_account_id}</span>
                  </p>
                  <p className="mt-1">Recibirás el 97% de cada venta directamente en tu cuenta.</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleContinue}
                  className="bg-[#C05673] hover:bg-[#B04B68]"
                >
                  Continuar
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-200 gap-2"
                  onClick={handleConnectMP}
                  disabled={loading}
                >
                  <RefreshCw className="h-4 w-4" />
                  {loading ? 'Redirigiendo...' : 'Reconectar cuenta'}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm flex gap-3">
                <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
                <p>
                  Este paso es obligatorio antes de publicar tu primer producto. Sin esta
                  configuración, no podemos transferirte automáticamente el 97% de cada venta.
                </p>
              </div>

              <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-2 text-sm text-slate-600">
                <p className="font-semibold text-slate-800">¿Cómo funciona?</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Haz clic en "Conectar con Mercado Pago".</li>
                  <li>Inicia sesión en tu cuenta de Mercado Pago y acepta los permisos.</li>
                  <li>Serás redirigido de vuelta aquí automáticamente.</li>
                  <li>¡Listo! Ya puedes publicar productos y recibir pagos.</li>
                </ol>
              </div>

              <Button
                onClick={handleConnectMP}
                disabled={loading}
                className="w-full bg-[#009EE3] hover:bg-[#0088C7] text-white font-semibold gap-2"
                size="lg"
              >
                <ExternalLink className="h-4 w-4" />
                {loading ? 'Redirigiendo a Mercado Pago...' : 'Conectar con Mercado Pago'}
              </Button>

              <Button asChild variant="outline" className="w-full border-slate-200">
                <Link to="/profile">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Ir a mi perfil
                </Link>
              </Button>
            </>
          )}

        </CardContent>
      </Card>
    </div>
  );
}

