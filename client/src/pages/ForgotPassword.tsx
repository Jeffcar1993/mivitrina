import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AxiosError } from 'axios';
import api from '../lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import LogoImage from '../assets/logotipo.png';
import { Footer } from '../components/Footer';

interface ForgotPasswordResponse {
  message?: string;
  resetUrl?: string;
}

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {



    e.preventDefault();
    setLoading(true);
    setResetUrl(null);

    try {
      const response = await api.post<ForgotPasswordResponse>('/auth/forgot-password', {
        email,
      });

      toast.success('Solicitud enviada', {
        description:
          response.data?.message ||
          'Si el correo existe, recibirás instrucciones para recuperar tu contraseña.',
      });

      setEmail(''); // Limpiar email para evitar duplicidad

      if (response.data?.resetUrl) {
        setResetUrl(response.data.resetUrl);
      }
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: string }>;
      toast.error(axiosError.response?.data?.error || 'No se pudo iniciar la recuperación');
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
          <div className="hidden md:flex items-center gap-2">
            <Button asChild variant="ghost" className="font-semibold">
              <Link to="/login">Iniciar sesión</Link>
            </Button>
            <Button asChild variant="outline" className="font-semibold border-[#EACED7] text-[#9B5F71] hover:bg-[#FDF6F8]">
              <Link to="/register">Crear cuenta</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <Card className="w-full max-w-md border-slate-200">
          <CardHeader>
            <CardTitle className="text-2xl font-black text-slate-900">Recuperar contraseña</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo registrado</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#C05673] hover:bg-[#B04B68] text-white"
                disabled={loading}
              >
                {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </Button>
            </form>

            {resetUrl && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <p className="mb-2 font-semibold">Enlace de recuperación (modo desarrollo):</p>
                <a href={resetUrl} className="text-[#9B5F71] hover:underline break-all">
                  {resetUrl}
                </a>
              </div>
            )}

            <p className="mt-6 text-center text-sm text-slate-600">
              ¿Recordaste tu contraseña?{' '}
              <Link to="/login" className="text-[#9B5F71] font-semibold hover:underline">
                Volver a iniciar sesión
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
