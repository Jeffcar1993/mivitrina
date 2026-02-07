import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, ShoppingBag, XCircle } from "lucide-react";
import { useCart } from "../context/cartContext";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export function CartSheet() {
  const { cart, total, removeFromCart, clearCart } = useCart();
  const navigate = useNavigate();
  const [isClearingCart, setIsClearingCart] = useState(false);

  const handleCheckout = () => {
    if (cart.length === 0) {
      return;
    }
    navigate('/checkout');
  };

  const handleClearCart = async () => {
    setIsClearingCart(true);
    await clearCart();
    setIsClearingCart(false);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-slate-100 rounded-full">
          <ShoppingCart className="h-5 w-5 text-slate-700" />
          {cart.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#C05673] text-[10px] font-bold text-white animate-in zoom-in">
              {cart.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col bg-white">
        <SheetHeader className="border-b pb-4">
          <SheetTitle className="flex items-center gap-2 text-2xl font-black">
            <ShoppingBag className="text-[#C05673]" /> Tu Carrito
          </SheetTitle>
        </SheetHeader>

        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <ShoppingCart className="h-12 w-12 mb-4 opacity-20" />
            <p className="font-medium">Tu carrito está vacío</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto pr-4 py-4">
              <div className="space-y-4">
                {(() => {
                  const grouped = new Map<number, { product: typeof cart[0]; quantity: number; firstIndex: number }>();
                  cart.forEach((item, index) => {
                    if (grouped.has(item.id)) {
                      grouped.get(item.id)!.quantity += 1;
                    } else {
                      grouped.set(item.id, { product: item, quantity: 1, firstIndex: index });
                    }
                  });
                  return Array.from(grouped.values()).map(({ product, quantity, firstIndex }) => (
                    <div key={product.id} className="flex items-center gap-4 bg-white p-3 rounded-xl ring-1 ring-slate-200">
                      <img 
                        src={product.image_url} 
                        alt={product.title} 
                        className="h-16 w-16 rounded-lg object-cover bg-white" 
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 truncate capitalize">{product.title}</h4>
                        <p className="text-slate-900 font-semibold text-sm">${Number(product.price).toLocaleString()}</p>
                        <p className="text-xs text-slate-500 mt-1">Cantidad: {quantity}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeFromCart(firstIndex)}
                        className="text-slate-400 hover:text-[#9B5F71] hover:bg-[#FDF6F8]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div className="border-t pt-6 space-y-4">
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium text-slate-600">Total estimado:</span>
                <span className="font-black text-slate-900 text-2xl">${total.toLocaleString()}</span>
              </div>
              <SheetFooter className="flex-col gap-2">
                <Button 
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className="w-full bg-[#C05673] text-white hover:bg-[#B04B68] h-12 text-lg font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Finalizar Compra
                </Button>
                <Button 
                  onClick={handleClearCart}
                  disabled={cart.length === 0 || isClearingCart}
                  variant="outline"
                  className="w-full h-11 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {isClearingCart ? 'Limpiando...' : 'Limpiar Carrito'}
                </Button>
              </SheetFooter>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}