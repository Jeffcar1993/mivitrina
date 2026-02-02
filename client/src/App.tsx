// client/src/App.tsx
import { useEffect, useState } from 'react';
import api from './lib/axios'; // Ruta relativa directa para evitar errores de alias
import type { Product } from './types'; // Importación como tipo (Type-only import)

// Componentes de shadcn/ui
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./components/ui/card";
import { Button } from "./components/ui/button";

// Iconos y Componente personalizado
import { ShoppingCart, Eye, Loader2 } from "lucide-react";
import { AddProductForm } from "./components/addProductForm"; 

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Función para obtener los productos del servidor
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

  // Cargar productos al montar el componente
  useEffect(() => {
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-slate-500" />
        <p className="text-sm font-medium text-slate-500">Cargando vitrina...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50">
      {/* Navbar / Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            MIVITRINA
          </h1>
          
          <div className="flex items-center gap-4">
            {/* Componente para añadir productos (La "puerta" a la base de datos) */}
            <AddProductForm onProductAdded={fetchProducts} />
            
            <Button variant="outline" size="icon" className="rounded-full">
              <ShoppingCart className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section simple */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">Catálogo de Productos</h2>
          <p className="mt-3 text-lg text-slate-600">Explora nuestras últimas novedades directamente desde la base de datos.</p>
        </div>

        {/* Grid de Productos */}
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20">
            <p className="text-slate-500">No hay productos disponibles actualmente.</p>
            <p className="text-sm text-slate-400">¡Usa el botón "Nuevo Producto" para empezar!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <Card key={product.id} className="group flex flex-col overflow-hidden border-none shadow-sm transition-all hover:shadow-md">
                {/* Contenedor de Imagen */}
                <div className="aspect-square overflow-hidden bg-slate-100">
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                <CardHeader className="p-4 pb-0">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-1 text-lg font-bold capitalize text-slate-800">
                      {product.title}
                    </CardTitle>
                    <span className="shrink-0 font-bold text-blue-600">
                      ${Number(product.price).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs font-medium uppercase text-slate-400">
                    {product.category_name || 'General'}
                  </p>
                </CardHeader>

                <CardContent className="p-4 pt-2">
                  <p className="line-clamp-2 text-sm text-slate-500">
                    {product.description}
                  </p>
                </CardContent>

                <CardFooter className="mt-auto flex gap-2 p-4 pt-0">
                  <Button className="w-full bg-slate-900 text-white hover:bg-slate-800">
                    Añadir
                  </Button>
                  <Button variant="outline" size="icon" className="shrink-0">
                    <Eye className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}