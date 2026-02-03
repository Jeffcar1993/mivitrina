// client/src/components/ProductView.tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Eye, ShoppingCart } from "lucide-react";
import type { Product } from "@/types";

export function ProductView({ product }: { product: Product }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 rounded-lg border-slate-200 hover:bg-slate-50 hover:text-blue-600">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl bg-white p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Imagen Grande */}
          <div className="md:w-1/2 bg-slate-100">
            <img 
              src={product.image_url} 
              alt={product.title} 
              className="w-full h-full object-cover max-h-[500px]"
            />
          </div>
          
          {/* Detalles */}
          <div className="md:w-1/2 p-8 flex flex-col">
            <DialogHeader>
              <span className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-2">
                {product.category_name || 'Colección 2026'}
              </span>
              <DialogTitle className="text-3xl font-black text-slate-900 capitalize">
                {product.title}
              </DialogTitle>
            </DialogHeader>
            
            <div className="mt-4">
              <span className="text-2xl font-bold text-slate-900">
                ${Number(product.price).toLocaleString()}
              </span>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-bold text-slate-400 uppercase">Descripción</h4>
              <p className="mt-2 text-slate-600 leading-relaxed">
                {product.description}
              </p>
            </div>

            <div className="mt-auto pt-8">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg font-bold">
                <ShoppingCart className="mr-2 h-5 w-5" /> Añadir al carrito
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}