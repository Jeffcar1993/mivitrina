import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/axios';
import type { AxiosError } from 'axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import LogoImage from '../assets/Logo.webp';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

  const handleGoogleRegister = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFB]">
      <header className="sticky top-0 z-10 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src={LogoImage} alt="MiVitrina Logo" className="h-12 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="font-semibold">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild variant="outline" className="font-semibold border-[#EACED7] text-[#9B5F71] hover:bg-[#FDF6F8]">
              <Link to="/">Inicio</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* Lado Izquierdo: Visual */}
        <div className="hidden lg:flex bg-[#C05673] items-center justify-center p-12 text-white">
          <div className="max-w-md space-y-6">
            <div className="rounded-2xl bg-white/10 p-4 w-fit">
              <img src={LogoImage} alt="MiVitrina Logo" className="h-16 w-auto object-contain brightness-0 invert" />
            </div>
            <h1 className="text-5xl font-black leading-tight">Empieza a vender hoy mismo.</h1>
            <p className="text-xl text-[#FBEFF3] font-light">
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

            <div className="grid grid-cols-1 gap-3">
              <Button 
                type="button"
                variant="outline" 
                onClick={handleGoogleRegister}
                className="h-12 border-slate-300 hover:bg-slate-50"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Registrarse con Google
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-slate-500 font-medium">O con tu email</span>
              </div>
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

              <Button type="submit" className="w-full bg-[#C05673] hover:bg-[#B04B68] text-white h-12 text-lg font-bold" disabled={loading}>
                {loading ? "Creando cuenta..." : "Registrarse ahora"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </form>

            <p className="text-center text-slate-600">
              ¿Ya tienes una cuenta?{' '}
              <Link to="/login" className="text-[#9B5F71] font-bold hover:underline">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white py-8 mt-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="space-y-3">
              <div className="flex items-center">
                <img src={LogoImage} alt="MiVitrina Logo" className="h-10 w-auto object-contain" />
              </div>
              <p className="text-sm text-slate-500">
                Tu escaparate digital para comprar y vender productos de forma segura.
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-semibold text-slate-800">Explora</p>
              <div className="flex flex-col gap-1 text-slate-500">
                <Link to="/" className="hover:text-[#9B5F71]">Inicio</Link>
                <Link to="/login" className="hover:text-[#9B5F71]">Ingresar</Link>
                <Link to="/register" className="hover:text-[#9B5F71]">Crear cuenta</Link>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-semibold text-slate-800">Soporte</p>
              <div className="flex flex-col gap-1 text-slate-500">
                <span>contacto@mivitrina.com</span>
                <span>+57 300 000 0000</span>
                <span>Atención 24/7</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-400 md:flex-row">
            <p>© 2026 MiVitrina. Todos los derechos reservados.</p>
            <p>Hecho con amor y mucho café.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}