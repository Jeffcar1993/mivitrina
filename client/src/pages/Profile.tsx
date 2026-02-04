import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, ArrowLeft, Camera, Save } from "lucide-react";
import { toast } from "sonner";
import api from '../lib/axios';
import type { User } from '../types';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    bio: '',
    phone: '',
    profile_image: ''
  });

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/login');
      return;
    }
    
    const userData = JSON.parse(storedUser);
    setUser(userData);
    setFormData({
      username: userData.username || '',
      email: userData.email || '',
      bio: userData.bio || '',
      phone: userData.phone || '',
      profile_image: userData.profile_image || ''
    });
  }, [navigate]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await api.put('/user/profile', formData);
      
      // Actualizar localStorage con los datos actualizados
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setUser(res.data.user);
      setEditing(false);
      toast.success("Perfil actualizado correctamente");
    } catch {
      toast.error("Error al actualizar el perfil");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-10 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="rounded-lg bg-blue-600 p-1.5">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900">MIVITRINA</span>
          </Link>
          <Button asChild variant="ghost">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al inicio
            </Link>
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-4xl font-black text-slate-900">Mi Perfil</h1>
          <p className="text-slate-600 mt-2">Administra tu información como vendedor</p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-white border-b">
            <CardTitle className="text-2xl font-bold flex items-center justify-between">
              <span>Información del vendedor</span>
              {!editing && (
                <Button onClick={() => setEditing(true)} variant="outline">
                  Editar perfil
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-8 space-y-8">
            {/* Profile Image */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-32 w-32 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden ring-4 ring-blue-100">
                  {formData.profile_image ? (
                    <img src={formData.profile_image} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-5xl font-black text-slate-400">
                      {formData.username.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                {editing && (
                  <Button 
                    size="icon" 
                    className="absolute bottom-0 right-0 rounded-full h-10 w-10 bg-blue-600 hover:bg-blue-700"
                    title="Cambiar imagen"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {editing && (
                <Input 
                  placeholder="URL de la imagen de perfil"
                  value={formData.profile_image}
                  onChange={(e) => setFormData({...formData, profile_image: e.target.value})}
                  className="max-w-md"
                />
              )}
            </div>

            {/* Form Fields */}
            <div className="grid gap-6">
              <div className="space-y-2">
                <Label htmlFor="username">Nombre de usuario</Label>
                <Input 
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  disabled={!editing}
                  className={!editing ? "bg-slate-50" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input 
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  disabled={!editing}
                  className={!editing ? "bg-slate-50" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono (opcional)</Label>
                <Input 
                  id="phone"
                  type="tel"
                  placeholder="+57 300 123 4567"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  disabled={!editing}
                  className={!editing ? "bg-slate-50" : ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Biografía (opcional)</Label>
                <Textarea 
                  id="bio"
                  placeholder="Cuéntanos sobre ti y lo que vendes..."
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  disabled={!editing}
                  className={!editing ? "bg-slate-50" : ""}
                  rows={4}
                />
              </div>
            </div>

            {/* Action Buttons */}
            {editing && (
              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  onClick={handleSave}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Guardando..." : "Guardar cambios"}
                </Button>
                <Button 
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      username: user.username || '',
                      email: user.email || '',
                      bio: user.bio || '',
                      phone: user.phone || '',
                      profile_image: user.profile_image || ''
                    });
                  }}
                  variant="outline"
                  disabled={loading}
                >
                  Cancelar
                </Button>
              </div>
            )}

            {/* User Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-black text-blue-600">0</p>
                <p className="text-sm text-slate-600 mt-1">Productos publicados</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-black text-green-600">0</p>
                <p className="text-sm text-slate-600 mt-1">Ventas realizadas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
