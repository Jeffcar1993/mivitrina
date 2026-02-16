import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ArrowLeft, Camera, Save, ShoppingBag, Package, Trash2, AlertCircle, Menu, LogOut } from "lucide-react";
import { toast } from "sonner";
import api from '../lib/axios';
import type { User } from '../types';
import LogoImage from '../assets/Logo.webp';
import { Footer } from '../components/Footer';

interface Order {
  id: number;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface Product {
  id: number;
  name: string;
  user_id: number;
}

export default function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    fetchUserProducts();
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

  const fetchUserProducts = async () => {
    try {
      const response = await api.get('/products');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      // Filtrar solo los productos del usuario actual
      const userProducts = response.data.filter((product: Product) => product.user_id === user.id);
      setProducts(userProducts);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  // Escuchar cambios en localStorage y eventos de producto/compra
  useEffect(() => {
    const handleStorageChange = () => {
      fetchUserProducts();
      fetchUserOrders();
    };

    const handleProductPublished = () => {
      console.log('Producto publicado, refrescando lista de productos...');
      fetchUserProducts();
    };

    const handlePurchaseCompleted = () => {
      console.log('Compra completada, refrescando lista de órdenes...');
      fetchUserOrders();
    };

    // Escuchar cambios en el storage
    window.addEventListener('storage', handleStorageChange);
    
    // Escuchar evento personalizado de producto publicado
    window.addEventListener('productPublished', handleProductPublished);
    
    // Escuchar evento personalizado de compra completada
    window.addEventListener('purchaseCompleted', handlePurchaseCompleted);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('productPublished', handleProductPublished);
      window.removeEventListener('purchaseCompleted', handlePurchaseCompleted);
    };
  }, []);

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

  const handleDeleteProfile = async () => {
    if (!user) return;
    
    setDeletingProfile(true);
    try {
      await api.delete(`/api/user/${user.id}`);
      
      // Limpiar datos locales
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      toast.success('Perfil eliminado correctamente');
      
      // Redirigir a login después de un breve delay
      setTimeout(() => {
        navigate('/login');
        window.location.reload();
      }, 1000);
    } catch (err) {
      toast.error('Error al eliminar el perfil');
      console.error(err);
    } finally {
      setDeletingProfile(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setMobileMenuOpen(false);
    navigate('/login');
    window.location.reload();
  };

  if (!user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-white">
        <div className="relative flex items-center justify-center">
          <div className="h-24 w-24 animate-spin rounded-full border-4 border-slate-200 border-t-[#C05673]"></div>
          <img src={LogoImage} alt="MiVitrina Logo" className="absolute h-16 w-16 object-contain" />
        </div>
        <p className="mt-4 animate-pulse text-sm font-medium text-slate-500">Cargando perfil...</p>
      </div>
    );
  }

  // Modal de confirmación para eliminar perfil
  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <Card className="border-slate-200 max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Eliminar Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600">
              ¿Estás seguro de que quieres eliminar tu perfil? Esta acción es irreversible.
            </p>
            <p className="text-sm text-slate-500">
              Se eliminarán:
            </p>
            <ul className="text-sm text-slate-600 space-y-1 ml-4 list-disc">
              <li>Tu cuenta de usuario</li>
              <li>Todos tus datos personales</li>
              <li>Tu historial de órdenes</li>
            </ul>
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={() => setShowDeleteConfirm(false)}
                variant="outline"
                className="flex-1"
                disabled={deletingProfile}
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleDeleteProfile}
                className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={deletingProfile}
              >
                {deletingProfile ? "Eliminando..." : "Eliminar perfil"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FBFBFB]">
      {/* Header */}
      <header className="sticky top-0 z-10 w-full border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src={LogoImage} alt="MiVitrina Logo" className="h-12 w-auto object-contain" />
          </Link>
          <div className="hidden md:flex items-center gap-2">
            <Button asChild variant="ghost" className="font-semibold">
              <Link to="/profile">Perfil</Link>
            </Button>
            <Button asChild variant="outline" className="font-semibold border-[#EACED7] text-[#9B5F71] hover:bg-[#FDF6F8]">
              <Link to="/">Inicio</Link>
            </Button>
          </div>

          <div className="flex md:hidden items-center gap-2">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-slate-100" aria-label="Abrir menú">
                  <Menu className="h-6 w-6 text-slate-700" />
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-[85%] max-w-sm bg-white">
                <SheetHeader className="border-b border-slate-100 pb-4">
                  <SheetTitle className="text-slate-900">Menú</SheetTitle>
                </SheetHeader>

                <div className="mt-6 flex flex-col gap-3">
                  <SheetClose asChild>
                    <Link to="/" className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      Inicio
                    </Link>
                  </SheetClose>
                  <SheetClose asChild>
                    <Link to="/profile" className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                      Mi perfil
                    </Link>
                  </SheetClose>
                  <Button
                    onClick={handleLogout}
                    variant="outline"
                    className="justify-center border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesión
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Back Button */}
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
                  <img src={LogoImage} alt="MiVitrina Logo" className="h-8 w-8 object-contain brightness-0 invert" />
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

            {/* Delete Profile Button */}
            {!editing && (
              <div className="pt-4 border-t">
                <Button 
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="outline"
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                  disabled={deletingProfile}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar mi perfil
                </Button>
              </div>
            )}

            {/* User Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-black text-blue-600">{products.length}</p>
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

      <Footer />
    </div>
  );
}
