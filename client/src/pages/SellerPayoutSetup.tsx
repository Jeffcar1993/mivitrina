import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../lib/axios';
import type { User } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, ArrowLeft } from 'lucide-react';

export default function SellerPayoutSetup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [accountId, setAccountId] = useState('');

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

  const handleSave = async () => {
    if (!user) {
      toast.error('Debes iniciar sesión para configurar cobros');
      navigate('/login');
      return;
    }

    const normalizedAccountId = accountId.trim();
    if (!normalizedAccountId) {
      toast.error('Debes ingresar tu identificador de recepción de Mercado Pago');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: user.username,
        email: user.email,
        bio: user.bio || '',
        phone: user.phone || '',
        profile_image: user.profile_image || '',
        mercado_pago_account_id: normalizedAccountId,
        payout_automation_enabled: true,
      };

      const response = await api.put('/user/profile', payload);
      const updatedUser = response.data?.user || response.data;

      localStorage.setItem('user', JSON.stringify(updatedUser));
      toast.success('Cuenta de cobros configurada. Ya puedes publicar productos.');
      navigate(returnTo);
    } catch (error) {
      console.error('Error guardando cuenta de cobros:', error);
      toast.error('No se pudo guardar la cuenta de cobros. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFB] flex items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl border-slate-200">
        <CardHeader>
          <CardTitle className="text-2xl font-black text-slate-900">Configura tus cobros para vender</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-800 text-sm flex gap-3">
            <AlertCircle className="h-5 w-5 mt-0.5" />
            <p>
              Este paso es obligatorio antes de publicar tu primer producto. Sin esta configuración,
              no podemos transferirte automáticamente el 97% de cada venta.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mp-account">Identificador de recepción Mercado Pago</Label>
            <Input
              id="mp-account"
              placeholder="Ej: user_id / collector_id"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              disabled={loading}
            />
            <p className="text-xs text-slate-500">
              Debe ser el identificador con el que tu cuenta recibe transferencias.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-[#C05673] hover:bg-[#B04B68]"
            >
              {loading ? 'Guardando...' : 'Guardar y continuar'}
            </Button>

            <Button asChild variant="outline" className="border-slate-200">
              <Link to="/profile">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Ir a mi perfil
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
