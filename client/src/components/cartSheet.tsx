import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "../context/cartContext";
import { useNavigate } from "react-router-dom";

export function CartSheet() {
  const { cart, total, removeFromCart } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (cart.length === 0) {
      return;
    }
    navigate('/checkout');
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
                {cart.map((item, index) => (
                  <div key={`${item.id}-${index}`} className="flex items-center gap-4 bg-white p-3 rounded-xl ring-1 ring-slate-200">
                    <img 
                      src={item.image_url} 
                      alt={item.title} 
                      className="h-16 w-16 rounded-lg object-cover bg-white" 
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate capitalize">{item.title}</h4>
                      <p className="text-slate-900 font-semibold text-sm">${Number(item.price).toLocaleString()}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removeFromCart(index)}
                      className="text-slate-400 hover:text-[#9B5F71] hover:bg-[#FDF6F8]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-6 space-y-4">
              <div className="flex items-center justify-between text-lg">
                <span className="font-medium text-slate-600">Total estimado:</span>
                <span className="font-black text-slate-900 text-2xl">${total.toLocaleString()}</span>
              </div>
              <SheetFooter>
                <Button 
                  onClick={handleCheckout}
                  disabled={cart.length === 0}
                  className="w-full bg-[#C05673] hover:bg-[#B04B68] h-12 text-lg font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Finalizar Compra
                </Button>
              </SheetFooter>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}