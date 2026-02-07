import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, Save, ShoppingBag, Package } from "lucide-react";
import { LogoIcon } from "@/components/LogoIcon";
import { toast } from "sonner";
import api from '../lib/axios';
import type { User } from '../types';

interface Order {
  id: number;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
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

    fetchUserOrders();
  }, [navigate]);

  const fetchUserOrders = async () => {
    setLoadingOrders(true);
    try {
      const response = await api.get('/orders/user/purchases');
      setOrders(response.data);
    } catch (error) {
      console.error('Error al cargar órdenes:', error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    setImageUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);

      const response = await api.post('/products/upload-image', form);
      const imageUrl = response.data.imageUrl;
      setFormData({ ...formData, profile_image: imageUrl });
      toast.success('Imagen subida correctamente');
    } catch (err) {
      toast.error('Error al subir la imagen');
      console.error(err);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const response = await api.put(`/users/${user.id}`, formData);
      const updatedUser = response.data;
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setEditing(false);
      toast.success('Perfil actualizado correctamente');
    } catch (err) {
      toast.error('Error al actualizar el perfil');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-white">
        <div className="relative flex items-center justify-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-[#C05673]"></div>
          <LogoIcon className="absolute h-6 w-6 text-[#C05673]" />
        </div>
        <p className="mt-4 animate-pulse text-sm font-medium text-slate-500">Cargando perfil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFB] py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-[#C05673] hover:text-[#B04B68] transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          Volver
        </button>

        {/* Profile Card */}
        <Card className="border-slate-200 mb-8">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-[#C05673] p-3">
                  <LogoIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-xl font-bold text-slate-900">Mi Perfil</p>
                  <p className="text-sm text-slate-500">Gestiona tu información personal</p>
                </div>
              </div>
              {!editing && (
                <Button
                  onClick={() => setEditing(true)}
                  className="bg-[#C05673] hover:bg-[#B04B68]"
                >
                  Editar
                </Button>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Profile Image */}
            <div className="flex flex-col items-center">
              <div className="relative mb-4">
                <img
                  src={formData.profile_image || `https://ui-avatars.com/api/?name=${user.username}`}
                  alt="Perfil"
                  className="h-24 w-24 rounded-full object-cover border-4 border-slate-200"
                />
                {editing && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 rounded-full bg-[#C05673] p-2 text-white hover:bg-[#B04B68] transition-colors"
                    disabled={imageUploading}
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleImageUpload(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
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
                  className="flex-1 bg-[#C05673] hover:bg-[#B04B68]"
                  disabled={loading || imageUploading}
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
                  className="border-[#EACED7] text-[#9B5F71] hover:bg-[#FDF6F8]"
                  disabled={loading || imageUploading}
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
                <p className="text-3xl font-black text-green-600">{orders.length}</p>
                <p className="text-sm text-slate-600 mt-1">Compras realizadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Historial de Órdenes */}
        <div className="mt-8">
          <h2 className="text-2xl font-black text-slate-900 mb-4 flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-[#C05673]" />
            Mis compras
          </h2>

          {loadingOrders ? (
            <Card className="border-slate-200">
              <CardContent className="p-8 text-center">
                <p className="text-slate-500">Cargando tus compras...</p>
              </CardContent>
            </Card>
          ) : orders.length === 0 ? (
            <Card className="border-slate-200">
              <CardContent className="p-8 text-center">
                <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-600 font-medium">Aún no has realizado compras</p>
                <p className="text-slate-500 text-sm mt-1">Explora nuestros productos y realiza tu primera compra</p>
                <Button asChild className="mt-4 bg-[#C05673] hover:bg-[#B04B68]">
                  <Link to="/">Ver productos</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id} className="border-slate-200 hover:border-slate-300 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-slate-900">{order.order_number}</h3>
                          <Badge
                            variant={
                              order.status === 'completed'
                                ? 'default'
                                : order.status === 'pending'
                                ? 'secondary'
                                : 'destructive'
                            }
                            className={
                              order.status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : order.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }
                          >
                            {order.status === 'completed'
                              ? '✓ Pagado'
                              : order.status === 'pending'
                              ? '⏳ Pendiente'
                              : '✗ Cancelado'}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
                          <div>
                            <span className="text-slate-500">Fecha:</span>{' '}
                            <span className="font-medium text-slate-900">
                              {new Date(order.created_at).toLocaleDateString('es-CO')}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Total:</span>{' '}
                            <span className="font-bold text-[#C05673]">
                              ${order.total_amount.toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="border-slate-200 hover:bg-slate-50"
                        onClick={() => navigate(`/order/${order.id}`)}
                      >
                        Ver detalles
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
