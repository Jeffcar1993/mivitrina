import { useEffect, useState } from 'react';
import { Link } from "react-router-dom";
import api from './lib/axios';
import type { Product } from './types';
import { useCart } from "./context/cartContext";

// Componentes de shadcn/ui
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Input } from "./components/ui/input";

// Iconos y Componente personalizado
import { ShoppingCart, Trash2, LogOut, User, Plus, Search } from "lucide-react";
import { AddProductForm } from "./components/addProductForm";
import { CartSheet } from './components/cartSheet';
import LogoImage from './assets/Logo.webp';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === "Todos" ||
      product.category_name?.toLowerCase() === selectedCategory.toLowerCase();
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      product.title.toLowerCase().includes(query) ||
      product.description.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  // Calcular tendencias dinámicamente
  const trendingCategories = (() => {
    const categoryCounts = products.reduce((acc, product) => {
      const cat = product.category_name || 'Sin categoría';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);
  })();
  
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
          <div className="h-32 w-32 animate-spin rounded-full border-4 border-slate-200 border-t-[#C05673]"></div>
          <img src={LogoImage} alt="MiVitrina Logo" className="absolute h-20 w-20 object-contain" />
        </div>
        <p className="mt-4 animate-pulse text-sm font-medium text-slate-500">Preparando tu escaparate...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFB]">
      {/* Header con efecto Blur */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center">
            <img src={LogoImage} alt="MiVitrina Logo" className="h-14 w-auto object-contain" />
          </div>
          
          <div className="flex items-center gap-2">
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="h-10 flex items-center bg-[#C05673] hover:bg-[#B04B68] text-white font-semibold px-6 rounded-lg shadow-sm transition duration-300 ease-in-out">Login</Link>
                <Link to="/register" className="h-10 flex items-center bg-transparent hover:bg-[#FDF6F8] text-[#9B5F71] font-semibold px-6 border border-[#EACED7] rounded-lg transition duration-300 ease-in-out">Register</Link>
                <div className="h-6 w-[1px] bg-slate-200 mx-1" />
                <Button asChild className="h-10 rounded-lg bg-[#C05673] px-6 font-semibold text-white shadow-sm transition duration-300 ease-in-out hover:bg-[#B04B68]">
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
          <div className="absolute inset-0 bg-[radial-gradient(#f1f5f9_1px,transparent_1px)] [background-size:20px_20px] [mask-image:radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
          <div className="container relative mx-auto grid items-center gap-10 px-4 text-center lg:grid-cols-2 lg:text-left">
            <div>
              <Badge variant="secondary" className="mb-4 rounded-full px-4 py-1 text-[#9B5F71] bg-[#FDF6F8] border-[#EAD1D9]">
                Confianza para comprar, impulso para vender
              </Badge>
              <h2 className="text-4xl font-black tracking-tight text-slate-900 sm:text-6xl">
                Tu vitrina moderna para <span className="text-[#C05673]">comprar</span> y <span className="text-slate-900">vender</span>.
              </h2>
              <p className="mt-6 max-w-2xl text-lg text-slate-600">
                Descubre piezas únicas o publica tu catálogo en minutos. Experiencia segura, rápida y con estilo boutique.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
                <Button asChild className="h-11 rounded-full bg-[#C05673] px-8 text-white hover:bg-[#B04B68]">
                  <Link to={isAuthenticated ? "/" : "/login"}>Quiero vender</Link>
                </Button>
                <Button 
                  onClick={() => document.getElementById("productos")?.scrollIntoView({ behavior: "smooth" })}
                  variant="outline" 
                  className="h-11 rounded-full border-slate-200 px-8 text-slate-900 hover:bg-slate-50"
                >
                  Explorar productos
                </Button>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-md">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-sm font-semibold text-slate-700">Tendencias hoy</p>
                <div className="mt-4 space-y-3">
                  {trendingCategories.length > 0 ? (
                    trendingCategories.map((item) => (
                      <button
                        key={item}
                        onClick={() => {
                          setSelectedCategory(item);
                          document.getElementById("productos")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="w-full flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 hover:bg-[#FDF6F8] transition-colors cursor-pointer"
                      >
                        <span className="text-sm text-slate-700 capitalize">{item}</span>
                        <span className="text-xs font-semibold text-[#9B5F71] hover:text-[#C05673]">Ver más →</span>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">Sin productos aún</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div id="productos" className="container mx-auto px-4 py-12">
          {/* Barra de utilidades */}
          <div className="mb-8 flex flex-col items-center justify-between gap-4 border-b border-slate-100 pb-8 sm:flex-row">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Todos los productos</h3>
              <p className="text-sm text-slate-500">Creado para ti, actualizado cada día.</p>
            </div>
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Busca productos, marcas o estilos"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 rounded-full bg-slate-100 pl-11 text-sm shadow-none ring-1 ring-transparent focus-visible:ring-[#EAD1D9]"
              />
            </div>
          </div>

          <div className="mb-10 flex flex-wrap items-center gap-6 overflow-x-auto pb-2 text-sm font-semibold text-slate-600">
            {["Todos", "Ropa", "Calzado", "electronica", "hogar", "Accesorios"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`relative pb-2 transition-colors ${
                  selectedCategory === cat
                    ? "text-slate-900"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {cat}
                <span
                  className={`absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full transition-all ${
                    selectedCategory === cat ? "bg-[#C05673]" : "bg-transparent"
                  }`}
                />
              </button>
            ))}
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
                  <Button asChild className="h-10 rounded-full bg-[#C05673] px-6 font-semibold text-white shadow-sm transition duration-300 ease-in-out hover:bg-[#B04B68]">
                    <Link to="/login">Inicia sesión para vender</Link>
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="group relative flex flex-col overflow-hidden border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-slate-300">
                  
                  {/* Imagen con Link al Detalle */}
                  <Link to={`/product/${product.id}`} className="relative aspect-[4/5] overflow-hidden bg-slate-100 block">
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/5 opacity-0 transition-opacity group-hover:opacity-100" />
                    <Badge className="absolute left-3 top-3 bg-white/90 text-slate-900 backdrop-blur shadow-sm hover:bg-white">
                      {product.category_name || 'Novedad'}
                    </Badge>
                  </Link>

                  <CardHeader className="p-5 pb-2"> 
                    <Link to={`/product/${product.id}`}>
                      <CardTitle className="hover:text-[#C05673] transition-colors cursor-pointer text-lg font-semibold capitalize text-slate-800">
                        {product.title}
                      </CardTitle>
                    </Link>
                    <p className="mt-1 text-xl font-semibold text-slate-900">
                      ${Number(product.price).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      Disponibles: {Number(product.quantity ?? 0)}
                    </p>
                  </CardHeader>

                  <CardContent className="px-5 py-2">
                    <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
                      {product.description}
                    </p>
                  </CardContent>

                  <CardFooter className="mt-auto flex items-center gap-2 p-5 pt-4">
                    <Button
                      onClick={() => addToCart(product)}
                      size="sm"
                      className="flex-1 rounded-full bg-[#C05673] text-white shadow-sm transition-all hover:bg-[#B04B68]"
                      title="Añadir al carrito"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Comprar
                    </Button>
                    
                    {/* Botón Borrar - solo para el creador */}
                    {isAuthenticated && currentUserId === product.user_id && (
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="shrink-0 border-slate-200 hover:bg-[#FDF6F8] hover:text-[#9B5F71] hover:border-[#EACED7] transition-colors"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
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

          <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-slate-100 pt-6 text-xs text-slate-400 md:flex-row">
            <p>© 2026 MiVitrina. Todos los derechos reservados.</p>
            <p>Hecho con amor y mucho café.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}