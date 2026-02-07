import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const userString = searchParams.get('user');
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

    if (token && userString) {
      try {
        // Guardar token y usuario en localStorage
        localStorage.setItem('token', token);
        localStorage.setItem('user', userString);
        
        const user = JSON.parse(userString);
        toast.success(`¡Bienvenido ${user.username}!`, {
          description: 'Has iniciado sesión correctamente.'
        });

        // Redirigir a home y recargar
        navigate('/');
        window.location.reload();
      } catch (error) {
        console.error('Error procesando callback:', error);
        toast.error('Error al procesar autenticación');
        navigate('/login');
      }
    } else {
      toast.error('Datos de autenticación incompletos');
      navigate('/login');
    }
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
