import { useEffect, useState } from 'react';
import { Link } from "react-router-dom";
import api from './lib/axios';
import type { Product } from './types';
import { useCart } from "./context/cartContext";

// Componentes de shadcn/ui
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";

// Iconos y Componente personalizado
import { ShoppingCart, Eye, Sparkles, Trash2, LogOut, User } from "lucide-react";
import { AddProductForm } from "./components/addProductForm";
import { CartSheet } from './components/cartSheet';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const filteredProducts = selectedCategory === "Todos" 
  ? products 
  : products.filter(p => p.category_name?.toLowerCase() === selectedCategory.toLowerCase());
  
  // Extraemos datos y funciones del Carrito
  const { addToCart } = useCart();

  const fetchProducts = async () => {
    try {
      const res = await api.get<Product[]>('/products');
      setProducts(res.data);
    } catch (err) {
      console.error("Error al cargar productos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    setIsAuthenticated(Boolean(token));
    if (user) {
      const userData = JSON.parse(user);
      setCurrentUserId(userData.id);
    }
  }, []);

  const handleDelete = async (id: number) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este producto?")) {
      try {
        await api.delete(`/products/${id}`);
        fetchProducts(); 
      } catch (err) {
        console.error("Error al borrar:", err);
        alert("No se pudo eliminar el producto");
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-white">
        <div className="relative flex items-center justify-center">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600"></div>
          <Sparkles className="absolute h-6 w-6 text-blue-600" />
        </div>
        <p className="mt-4 animate-pulse text-sm font-medium text-slate-500">Preparando tu escaparate...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Header con efecto Blur */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/70 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-blue-600 p-1.5">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900 leading-none">
              MIVITRINA
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="h-10 flex items-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 rounded-lg shadow-md transition duration-300 ease-in-out transform hover:-translate-y-1">Login</Link>
                <Link to="/register" className="h-10 flex items-center bg-transparent hover:bg-blue-50 text-blue-600 font-semibold px-6 border border-blue-600 rounded-lg transition duration-300 ease-in-out">Register</Link>
                <div className="h-6 w-[1px] bg-slate-200 mx-1" />
                <Button asChild className="h-10 rounded-lg bg-blue-600 px-6 font-semibold text-white shadow-md transition duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-blue-700">
                  <Link to="/login">Publicar producto</Link>
                </Button>
                <CartSheet />
              </>
            ) : (
              <>
                <AddProductForm onProductAdded={fetchProducts} />
                <Button asChild variant="ghost" size="icon" className="h-10 w-10 hover:bg-slate-100" title="Mi perfil">
                  <Link to="/profile">
                    <User className="h-6 w-6 text-slate-700" />
                  </Link>
                </Button>
                <CartSheet />
                <Button 
                  onClick={handleLogout}
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-red-600 hover:bg-red-50 hover:text-red-700"
                  title="Cerrar sesión"
                >
                  <LogOut className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section Atractiva */}
        <section className="relative overflow-hidden bg-white py-16 sm:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
          <div className="container relative mx-auto px-4 text-center">
            <Badge variant="secondary" className="mb-4 rounded-full px-4 py-1 text-blue-700 bg-blue-50 border-blue-100">
              Lo que buscas en un solo lugar
            </Badge>
            <h2 className="text-4xl font-black tracking-tight text-slate-900 sm:text-6xl">
              Tus productos favoritos en <span className="text-blue-600">un solo lugar.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
             Todos los dias encuentras productos que quieres comprar o vender. Hazlo fácil con MiVitrina.
            </p>
          </div>
        </section>

        <div className="container mx-auto px-4 py-12">
          {/* Barra de utilidades */}
          <div className="mb-8 flex flex-col items-center justify-between gap-4 border-b border-slate-100 pb-8 sm:flex-row">
            <h3 className="text-xl font-bold text-slate-800">Todos los productos</h3>
            <div className="mb-8 flex flex-wrap gap-2">
              {["Todos", "Ropa", "Calzado", "electronica", "hogar","Accesorios"].map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-6 transition-all ${
                    selectedCategory === cat 
                    ? "bg-blue-600 text-white hover:bg-blue-700" 
                    : "text-slate-600 hover:border-blue-300 hover:text-blue-600"
                  }`}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          {/* Grid de Productos */}
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white py-24 text-center">
              <div className="rounded-full bg-slate-50 p-6 mb-4">
                <ShoppingCart className="h-12 w-12 text-slate-300" />
              </div>
              <h4 className="text-xl font-semibold text-slate-900">La vitrina está vacía</h4>
              <p className="mt-2 text-slate-500">Parece que aún no has subido ningún producto.</p>
              <div className="mt-6">
                {isAuthenticated ? (
                  <AddProductForm onProductAdded={fetchProducts} />
                ) : (
                  <Button asChild className="h-10 rounded-lg bg-blue-600 px-6 font-semibold text-white shadow-md transition duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-blue-700">
                    <Link to="/login">Inicia sesión para vender</Link>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="group relative flex flex-col overflow-hidden border-none bg-white shadow-sm ring-1 ring-slate-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:ring-blue-100">
                  
                  {/* Imagen con Link al Detalle */}
                  <Link to={`/product/${product.id}`} className="relative aspect-[4/5] overflow-hidden bg-slate-100 block">
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/5 opacity-0 transition-opacity group-hover:opacity-100" />
                    <Badge className="absolute left-3 top-3 bg-white/90 text-slate-900 backdrop-blur shadow-sm hover:bg-white">
                      {product.category_name || 'Novedad'}
                    </Badge>
                  </Link>

                  <CardHeader className="p-5 pb-2"> 
                    <Link to={`/product/${product.id}`}>
                      <CardTitle className="hover:text-blue-600 transition-colors cursor-pointer text-lg font-bold capitalize text-slate-800">
                        {product.title}
                      </CardTitle>
                    </Link>
                    <p className="mt-1 text-2xl font-black text-slate-900">
                      ${Number(product.price).toLocaleString()}
                    </p>
                  </CardHeader>

                  <CardContent className="px-5 py-2">
                    <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
                      {product.description}
                    </p>
                  </CardContent>

                  <CardFooter className="mt-auto flex gap-2 p-5 pt-4">
                    {/* Botón Añadir Principal */}
                    <Button 
                      onClick={() => addToCart(product)}
                      className="w-full bg-blue-600 font-bold text-white shadow-md shadow-blue-100 hover:bg-blue-700 hover:shadow-lg transition-all"
                    >
                      Añadir
                    </Button>
                    
                    {/* Botón Borrar - solo para el creador */}
                    {isAuthenticated && currentUserId === product.user_id && (
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="shrink-0 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}

                    {/* Botón Ver Detalle */}
                    <Link to={`/product/${product.id}`}>
                      <Button variant="outline" size="icon" className="shrink-0 rounded-lg border-slate-200 hover:bg-slate-50 hover:text-blue-600">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white py-12 mt-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-blue-600 p-1.5">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-black tracking-tight text-slate-900">MIVITRINA</span>
              </div>
              <p className="text-sm text-slate-500">
                Tu escaparate digital para comprar y vender productos de forma segura.
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-semibold text-slate-800">Explora</p>
              <div className="flex flex-col gap-1 text-slate-500">
                <Link to="/" className="hover:text-blue-600">Inicio</Link>
                <Link to="/login" className="hover:text-blue-600">Ingresar</Link>
                <Link to="/register" className="hover:text-blue-600">Crear cuenta</Link>
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

          <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-slate-100 pt-6 text-xs text-slate-400 md:flex-row">
            <p>© 2026 MiVitrina. Todos los derechos reservados.</p>
            <p>Hecho con React + Tailwind.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}