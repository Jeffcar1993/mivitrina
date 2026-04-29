import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../lib/axios';
import type { User } from '../types';

/**
 * Página de callback OAuth de Mercado Pago.
 * MP redirige aquí con: ?code=XXX&state=YYY
 *
 * Flujo:
 * 1. Verifica el `state` contra sessionStorage (previene CSRF).
 * 2. Envía `code` + `state` al backend (/auth/mercadopago/exchange).
 * 3. Backend intercambia el code por access_token + user_id y lo guarda en DB.
 * 4. Actualiza el usuario en localStorage y redirige.
 */
export default function MercadoPagoCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // useRef para garantizar que el intercambio solo corra una vez en StrictMode
  const exchanged = useRef(false);

  useEffect(() => {
    if (exchanged.current) return;
    exchanged.current = true;

    const code = searchParams.get('code');
    const stateFromUrl = searchParams.get('state');
    const error = searchParams.get('error');

    // MP puede devolver un error si el usuario cancela
    if (error) {
      toast.error('Conexión con Mercado Pago cancelada.');
      navigate('/configurar-cobros');
      return;
    }

    if (!code || !stateFromUrl) {
      toast.error('Respuesta de Mercado Pago incompleta. Intenta de nuevo.');
      navigate('/configurar-cobros');
      return;
    }

    // Verificar state contra sessionStorage (anti-CSRF)
    const savedState = sessionStorage.getItem('mp_oauth_state');
    const returnTo = sessionStorage.getItem('mp_oauth_return_to') || '/';
    sessionStorage.removeItem('mp_oauth_state');
    sessionStorage.removeItem('mp_oauth_return_to');

    if (!savedState || savedState !== stateFromUrl) {
      toast.error('Estado de seguridad inválido. Intenta conectar de nuevo.');
      navigate('/configurar-cobros');
      return;
    }

    const exchange = async () => {
      try {
        const response = await api.post<{ user: User }>('/auth/mercadopago/exchange', {
          code,
          state: stateFromUrl,
        });

        const updatedUser = response.data?.user;
        if (!updatedUser) {
          throw new Error('El servidor no devolvió el usuario actualizado');
        }

        // Actualizar usuario en localStorage conservando campos que el backend no devuelve
        const currentRaw = localStorage.getItem('user');
        const current = currentRaw ? (JSON.parse(currentRaw) as User) : {};
        localStorage.setItem('user', JSON.stringify({ ...current, ...updatedUser }));

        toast.success('¡Cuenta de Mercado Pago conectada! Ya puedes publicar productos.');
        navigate(returnTo);
      } catch (err: unknown) {
        console.error('Error en callback de Mercado Pago:', err);
        const message =
          (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'No se pudo completar la conexión con Mercado Pago.';
        toast.error(message);
        navigate('/configurar-cobros');
      }
    };

    exchange();
  }, [navigate, searchParams]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-white gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#009EE3]" />
      <p className="text-sm font-medium text-slate-500">Conectando tu cuenta de Mercado Pago...</p>
    </div>
  );
}
