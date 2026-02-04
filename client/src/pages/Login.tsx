import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/axios';
import type { AxiosError } from 'axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export default function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/login', formData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      toast.success("¡Hola de nuevo!", { description: "Has iniciado sesión correctamente." });
      navigate('/');
      window.location.reload();
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: string }>;
      toast.error(axiosError.response?.data?.error || "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="sticky top-0 z-10 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="rounded-lg bg-blue-600 p-1.5">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900">MIVITRINA</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="font-semibold">
              <Link to="/register">Register</Link>
            </Button>
            <Button asChild variant="outline" className="font-semibold">
              <Link to="/">Inicio</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white mb-4">
              <span className="font-black text-xl italic">V</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900">Bienvenido</h2>
            <p className="text-slate-500">Ingresa tus datos para continuar.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                type="email" 
                required 
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password">Contraseña</Label>
              </div>
              <Input 
                id="password"
                type="password" 
                required 
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>

            <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white h-12 text-lg font-bold" disabled={loading}>
              {loading ? "Cargando..." : "Entrar"}
            </Button>
          </form>

          <p className="mt-8 text-center text-slate-600">
            ¿Aún no vendes en MiVitrina?{' '}
            <Link to="/register" className="text-blue-600 font-bold hover:underline">
              Crea tu cuenta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}