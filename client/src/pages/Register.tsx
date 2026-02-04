import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/axios';
import type { AxiosError } from 'axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function Register() {
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/auth/register', formData);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      toast.success("¡Bienvenido a MiVitrina!", { description: "Cuenta creada con éxito." });
      navigate('/'); 
      window.location.reload(); 
    } catch (err) {
      const axiosError = err as AxiosError<{ error?: string }>;
      toast.error(axiosError.response?.data?.error || "Error al registrarse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
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
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild variant="outline" className="font-semibold">
              <Link to="/">Inicio</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* Lado Izquierdo: Visual */}
        <div className="hidden lg:flex bg-blue-600 items-center justify-center p-12 text-white">
          <div className="max-w-md space-y-6">
            <div className="rounded-2xl bg-white/10 p-4 w-fit">
              <Sparkles className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-5xl font-black leading-tight">Empieza a vender hoy mismo.</h1>
            <p className="text-xl text-blue-100 font-light">
              Únete a cientos de personas que ya están ganando dinero con su vitrina digital.
            </p>
          </div>
        </div>

        {/* Lado Derecho: Formulario */}
        <div className="flex items-center justify-center p-8 bg-white">
          <div className="w-full max-w-sm space-y-8">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl font-black text-slate-900">Crear cuenta</h2>
              <p className="text-slate-500 mt-2">Completa tus datos para empezar.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username">Nombre de usuario</Label>
                <Input 
                  id="username"
                  placeholder="Ej: mariashop" 
                  required 
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input 
                  id="email"
                  type="email" 
                  placeholder="tu@email.com" 
                  required 
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input 
                  id="password"
                  type="password" 
                  placeholder="••••••••" 
                  required 
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg font-bold" disabled={loading}>
                {loading ? "Creando cuenta..." : "Registrarse ahora"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </form>

            <p className="text-center text-slate-600">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" className="text-blue-600 font-bold hover:underline">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}