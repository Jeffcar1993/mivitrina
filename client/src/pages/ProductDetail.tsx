import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../lib/axios";
import type { Product } from "../types";
import { useCart } from "../context/cartContext";

// Componentes de shadcn/ui
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CartSheet } from "@/components/cartSheet";

// Iconos
import { 
  ArrowLeft, 
  ShoppingCart, 
  ShieldCheck, 
  Truck, 
  RefreshCcw,
  Loader2,
  Sparkles
} from "lucide-react";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch((err) => {
        console.error("Error al obtener el producto:", err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-white">
      <Loader2 className="animate-spin h-12 w-12 text-blue-600 mb-4" />
      <p className="text-slate-500 font-medium animate-pulse">Cargando detalles...</p>
    </div>
  );

  if (!product) return (
    <div className="flex flex-col h-screen items-center justify-center space-y-4">
      <h2 className="text-2xl font-bold text-slate-800">¡Ups! Producto no encontrado</h2>
      <p className="text-slate-500">Es posible que el producto haya sido eliminado o el ID sea incorrecto.</p>
      <Button onClick={() => navigate("/")} className="bg-blue-600">
        Volver al catálogo principal
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header Reutilizado */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/70 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="rounded-lg bg-blue-600 p-1.5 transition-transform group-hover:scale-110">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tighter text-slate-900 leading-none">
              MIVITRINA
            </h1>
          </Link>
          
          <div className="flex items-center gap-3">
            <CartSheet />
          </div>
        </div>
      </header>

      {/* Navegación Secundaria */}
      <div className="container mx-auto px-4 py-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="group text-slate-500 hover:text-blue-600 hover:bg-blue-50 pl-0"
        >
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Volver al catálogo
        </Button>
      </div>

      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          
          {/* Columna Izquierda: Imagen */}
          <div className="group relative rounded-3xl overflow-hidden bg-slate-50 ring-1 ring-slate-100 shadow-2xl shadow-slate-200/50">
            <img 
              src={product.image_url} 
              alt={product.title} 
              className="w-full h-auto min-h-[400px] object-cover transition-transform duration-1000 group-hover:scale-105"
            />
          </div>

          {/* Columna Derecha: Información */}
          <div className="flex flex-col space-y-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                {product.category_name || "Colección Premium"}
              </Badge>
              <h1 className="text-4xl md:text-6xl font-black text-slate-900 capitalize leading-[1.1]">
                {product.title}
              </h1>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-blue-600">
                  ${Number(product.price).toLocaleString()}
                </span>
                <span className="text-slate-400 text-sm font-medium">IVA incluido</span>
              </div>
            </div>

            <div className="border-y border-slate-100 py-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Información del Producto</h3>
              <p className="text-xl text-slate-600 leading-relaxed font-light">
                {product.description}
              </p>
            </div>

            {/* Acciones */}
            <div className="space-y-4 pt-2">
              <Button 
                onClick={() => addToCart(product)}
                className="w-full h-16 text-xl font-bold bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-[0.98]"
              >
                <ShoppingCart className="mr-3 h-6 w-6" />
                Añadir al Carrito
              </Button>
            </div>

            {/* Beneficios Trust Signals */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-slate-50">
              <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-slate-50 border border-white">
                <Truck className="h-6 w-6 text-blue-500 mb-3" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Logística</span>
                <span className="text-xs font-bold text-slate-700">Envío Express Gratis</span>
              </div>
              <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-slate-50 border border-white">
                <ShieldCheck className="h-6 w-6 text-green-500 mb-3" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Protección</span>
                <span className="text-xs font-bold text-slate-700">Compra Segura</span>
              </div>
              <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-slate-50 border border-white">
                <RefreshCcw className="h-6 w-6 text-orange-500 mb-3" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Garantía</span>
                <span className="text-xs font-bold text-slate-700">30 Días de Cambio</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer Simple */}
      <footer className="mt-20 border-t border-slate-100 py-10 text-center">
        <p className="text-slate-400 text-sm italic">MIVITRINA - Tu catálogo digital 2026</p>
      </footer>
    </div>
  );
}