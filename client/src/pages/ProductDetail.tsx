import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import api from "../lib/axios";
import type { Product } from "../types";
import { useCart } from "../context/cartContext";

// Componentes de shadcn/ui
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { CartSheet } from "@/components/cartSheet";
import { Footer } from "@/components/Footer";
import LogoImage from '../assets/Logo.webp';

// Iconos
import { 
  ArrowLeft, 
  ShoppingCart, 
  ShieldCheck, 
  Truck, 
  RefreshCcw,
  Loader2,
  Star,
  ChevronLeft,
  ChevronRight,
  Menu
} from "lucide-react";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [sellerAverageRating, setSellerAverageRating] = useState(0);
  const [sellerRatingsCount, setSellerRatingsCount] = useState(0);
  const [mySellerRating, setMySellerRating] = useState(0);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const productImages = useMemo(() => {
    if (!product) return [];
    const images = [product.image_url, ...(product.images ?? [])].filter(Boolean);
    return Array.from(new Set(images));
  }, [product]);

  const selectedImage = productImages[currentImageIndex] ?? product?.image_url;
  const sellerId = product?.seller_id ?? product?.user_id;

  const fetchSellerRating = useCallback(async () => {
    if (!id) return;

    try {
      const summaryRes = await api.get(`/products/${id}/seller-rating`);
      setSellerAverageRating(Number(summaryRes.data?.averageRating ?? 0));
      setSellerRatingsCount(Number(summaryRes.data?.totalRatings ?? 0));

      const token = localStorage.getItem("token");
      if (!token) {
        setMySellerRating(0);
        return;
      }

      try {
        const myRatingRes = await api.get(`/products/${id}/seller-rating/my`);
        setMySellerRating(Number(myRatingRes.data?.myRating ?? 0));
      } catch {
        setMySellerRating(0);
      }
    } catch (error) {
      console.error("Error al obtener calificaciones del vendedor:", error);
      setSellerAverageRating(0);
      setSellerRatingsCount(0);
      setMySellerRating(0);
    }
  }, [id]);

  useEffect(() => {
    api.get(`/products/${id}`)
      .then(async (res) => {
        const data = res.data as Product;
        setProduct(data);
        setCurrentImageIndex(0);

        await fetchSellerRating();
      })
      .catch((err) => {
        console.error("Error al obtener el producto:", err);
      })
      .finally(() => setLoading(false));
  }, [id, fetchSellerRating]);

  const changeImage = (direction: "prev" | "next") => {
    if (productImages.length <= 1) return;

    if (direction === "prev") {
      setCurrentImageIndex((prev) =>
        prev === 0 ? productImages.length - 1 : prev - 1
      );
      return;
    }

    setCurrentImageIndex((prev) =>
      prev === productImages.length - 1 ? 0 : prev + 1
    );
  };

  const handleRateSeller = (rating: number) => {
    if (!sellerId) return;

    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const currentUserId = currentUser?.id ? String(currentUser.id) : "";

    if (!currentUserId) {
      alert("Debes iniciar sesión para calificar al vendedor.");
      return;
    }

    if (currentUser.id === sellerId) {
      alert("No puedes calificar tus propios productos.");
      return;
    }

    if (!id) return;

    setRatingSubmitting(true);
    api.post(`/products/${id}/seller-rating`, { rating })
      .then((res) => {
        setMySellerRating(Number(res.data?.myRating ?? rating));
        setSellerAverageRating(Number(res.data?.averageRating ?? 0));
        setSellerRatingsCount(Number(res.data?.totalRatings ?? 0));
      })
      .catch((error) => {
        const message = error?.response?.data?.error || "No se pudo guardar la calificación.";
        alert(message);
      })
      .finally(() => setRatingSubmitting(false));
  };

  if (loading) return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-white">
      <Loader2 className="animate-spin h-12 w-12 text-[#C05673] mb-4" />
      <p className="text-slate-500 font-medium animate-pulse">Cargando detalles...</p>
    </div>
  );

  if (!product) return (
    <div className="flex flex-col h-screen items-center justify-center space-y-4">
      <h2 className="text-2xl font-bold text-slate-800">¡Ups! Producto no encontrado</h2>
      <p className="text-slate-500">Es posible que el producto haya sido eliminado o el ID sea incorrecto.</p>
      <Button onClick={() => navigate("/")} className="bg-[#C05673] hover:bg-[#B04B68]">
        Volver al catálogo principal
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FBFBFB]">
      {/* Header Reutilizado */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/70 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center group">
            <img src={LogoImage} alt="MiVitrina Logo" className="h-12 w-auto object-contain transition-transform group-hover:scale-110" />
          </Link>
          
          <div className="flex items-center gap-3">
            <CartSheet />

            <div className="md:hidden">
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
                    <SheetClose asChild>
                      <Link to="/checkout" className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        Ir al checkout
                      </Link>
                    </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>

      {/* Navegación Secundaria */}
      <div className="container mx-auto px-4 py-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          className="group text-slate-500 hover:text-[#9B5F71] hover:bg-[#FDF6F8] pl-0"
        >
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Volver al catálogo
        </Button>
      </div>

      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
          
          {/* Columna Izquierda: Imagen + Galería */}
          <div className="space-y-4">
            <div className="group relative rounded-3xl overflow-hidden bg-white ring-1 ring-slate-200 shadow-sm">
              <img 
                src={selectedImage || product.image_url} 
                alt={product.title} 
                className="w-full h-auto min-h-[400px] object-cover transition-transform duration-1000 group-hover:scale-105"
              />

              {productImages.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => changeImage("prev")}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white"
                    aria-label="Imagen anterior"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>

                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => changeImage("next")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 hover:bg-white"
                    aria-label="Siguiente imagen"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>

            {productImages.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {productImages.map((img, idx) => (
                  <button
                    key={`${img}-${idx}`}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`aspect-square rounded-xl overflow-hidden ring-2 transition-all ${
                      idx === currentImageIndex ? "ring-[#C05673]" : "ring-slate-100 hover:ring-[#EAD1D9]"
                    }`}
                  >
                    <img src={img} alt={`${product.title} ${idx + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Columna Derecha: Información */}
          <div className="flex flex-col space-y-8">
            <div className="space-y-4">
              <Badge variant="secondary" className="bg-[#FDF6F8] text-[#9B5F71] border-[#EAD1D9] px-3 py-1 text-xs font-bold uppercase tracking-wider">
                {product.category_name || "Colección Premium"}
              </Badge>
              <h1 className="text-4xl md:text-6xl font-black text-slate-900 capitalize leading-[1.1]">
                {product.title}
              </h1>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-900">
                  ${Number(product.price).toLocaleString()}
                </span>
                <span className="text-slate-400 text-sm font-medium">IVA incluido</span>
              </div>
              <div className="text-sm font-semibold text-slate-500">
                Disponibles: {Number(product.quantity ?? 0)}
              </div>
            </div>

            <div className="border-y border-slate-100 py-8">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Información del Producto</h3>
              <p className="text-xl text-slate-600 leading-relaxed font-light">
                {product.description}
              </p>
            </div>

            {product.seller_username && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Vendedor</h3>
                <div className="flex items-center gap-4">
                  {product.seller_profile_image ? (
                    <img
                      src={product.seller_profile_image}
                      alt={product.seller_username}
                      className="h-12 w-12 rounded-full object-cover ring-2 ring-white"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-[#C05673] flex items-center justify-center">
                      <span className="text-lg font-bold text-white">
                        {product.seller_username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-lg font-bold text-slate-800">{product.seller_username}</p>
                    <p className="text-sm text-slate-500">Vendedor verificado</p>

                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, index) => {
                        const starValue = index + 1;
                        const isActive = mySellerRating >= starValue;

                        return (
                          <button
                            key={`my-star-${starValue}`}
                            onClick={() => handleRateSeller(starValue)}
                            className="rounded p-0.5 transition hover:scale-110 disabled:opacity-50"
                            aria-label={`Calificar con ${starValue} estrellas`}
                            type="button"
                            disabled={ratingSubmitting}
                          >
                            <Star
                              className={`h-4 w-4 ${isActive ? "fill-[#C05673] text-[#C05673]" : "text-slate-300"}`}
                            />
                          </button>
                        );
                      })}
                      </div>
                      <span className="text-xs font-medium text-slate-500">
                        {sellerRatingsCount > 0
                          ? `Promedio ${sellerAverageRating.toFixed(1)} (${sellerRatingsCount})`
                          : "Sin calificaciones"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Acciones */}
            <div className="space-y-4 pt-2">
              <Button 
                onClick={() => addToCart(product)}
                disabled={Number(product.quantity ?? 0) <= 0}
                className="w-full h-16 text-xl font-bold bg-[#C05673] hover:bg-[#B04B68] shadow-sm transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="mr-3 h-6 w-6" />
                {Number(product.quantity ?? 0) > 0 ? 'Añadir al Carrito' : 'Sin stock'}
              </Button>
            </div>

            {/* Beneficios Trust Signals */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-slate-100">
              <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-white border border-slate-200">
                <Truck className="h-6 w-6 text-[#C05673] mb-3" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Logística</span>
                <span className="text-xs font-bold text-slate-700">Envío Express Gratis</span>
              </div>
              <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-white border border-slate-200">
                <ShieldCheck className="h-6 w-6 text-green-500 mb-3" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Protección</span>
                <span className="text-xs font-bold text-slate-700">Compra Segura</span>
              </div>
              <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-white border border-slate-200">
                <RefreshCcw className="h-6 w-6 text-orange-500 mb-3" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-1">Garantía</span>
                <span className="text-xs font-bold text-slate-700">30 Días de Cambio</span>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer className="mt-20 py-10" />
    </div>
  );
}