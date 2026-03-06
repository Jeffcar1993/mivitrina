import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../lib/axios';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const oauthCode = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
      let errorMessage = 'Error al iniciar sesión';
      
      if (error === 'google_auth_failed') {
        errorMessage = 'Error al autenticar con Google';
      } else if (error === 'facebook_auth_failed') {
        errorMessage = 'Error al autenticar con Facebook';
      } else if (error === 'no_user') {
        errorMessage = 'No se pudo obtener información del usuario';
      }

      toast.error(errorMessage);
      navigate('/login');
      return;
    }

    if (!oauthCode) {
      toast.error('Datos de autenticación incompletos');
      navigate('/login');
      return;
    }

    const exchangeOAuthCode = async () => {
      try {
        const response = await api.post<{ token: string; user: unknown }>('/auth/oauth/exchange', {
          code: oauthCode,
        });

        const token = response.data?.token;
        const user = response.data?.user;

        if (!token || !user) {
          throw new Error('Respuesta OAuth incompleta');
        }

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        const parsedUser = user as { username?: string };
        toast.success(`¡Bienvenido ${parsedUser.username || 'de nuevo'}!`, {
          description: 'Has iniciado sesión correctamente.'
        });

        navigate('/');
        window.location.reload();
      } catch (exchangeError) {
        console.error('Error procesando callback OAuth:', exchangeError);
        toast.error('Error al procesar autenticación');
        navigate('/login');
      }
    };

    void exchangeOAuthCode();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FBFBFB]">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#C05673] text-white mb-4 animate-pulse">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Iniciando sesión...</h2>
        <p className="text-slate-500">Un momento por favor</p>
      </div>
    </div>
  );
}
