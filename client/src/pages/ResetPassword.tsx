import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { AxiosError } from 'axios';
import api from '../lib/axios';
import { validatePassword, getPasswordStrengthLabel, getPasswordStrengthColor } from '../lib/passwordValidator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import LogoImage from '../assets/logotipo.png';
import { Footer } from '../components/Footer';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordValidation = validatePassword(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error('El enlace de recuperación es inválido');
      return;
    }

    if (!passwordValidation.isValid) {
      toast.error('La contraseña no cumple los requisitos de seguridad');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        password,
      });

      toast.success('Contraseña actualizada', {
        description: 'Ahora puedes iniciar sesión con tu nueva contraseña.',
      });

      navigate('/login');
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: string }>;
      toast.error(axiosError.response?.data?.error || 'No se pudo restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFB]">
      <header className="sticky top-0 z-10 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="container mx-auto flex h-20 items-center justify-between px-4">
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src={LogoImage} alt="MiVitrina Logo" className="h-16 w-auto object-contain md:h-20" />
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md border-slate-200">
          <CardHeader>
            <CardTitle className="text-2xl font-black text-slate-900">Nueva contraseña</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {password.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getPasswordStrengthColor(passwordValidation.score)}`}
                        style={{ width: `${(passwordValidation.score / 5) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 min-w-fit">
                      {getPasswordStrengthLabel(passwordValidation.score)}
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#C05673] hover:bg-[#B04B68] text-white"
                disabled={loading || !token}
              >
                {loading ? 'Actualizando...' : 'Guardar nueva contraseña'}
              </Button>
            </form>

            {!token && (
              <p className="mt-4 text-sm text-red-600">
                Enlace inválido. Solicita uno nuevo desde la página de recuperación.
              </p>
            )}

            <p className="mt-6 text-center text-sm text-slate-600">
              <Link to="/forgot-password" className="text-[#9B5F71] font-semibold hover:underline">
                Solicitar nuevo enlace
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
