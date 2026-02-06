/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import type { Product } from '@/types';
import { toast } from "sonner";

const CART_STORAGE_KEY = 'mivitrina_cart';

interface CartContextType {
  cart: Product[];
  addToCart: (product: Product) => void;
  removeFromCart: (index: number) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Product[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Cargar carrito desde localStorage al montar
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsedCart = JSON.parse(savedCart);
        setCart(parsedCart);
      }
    } catch (error) {
      console.error('Error cargando carrito:', error);
      // Si hay error, limpiar localStorage
      localStorage.removeItem(CART_STORAGE_KEY);
    }
    setIsLoaded(true);
  }, []);

  // Guardar carrito en localStorage cada vez que cambie
  useEffect(() => {
    if (isLoaded) {
      try {
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      } catch (error) {
        console.error('Error guardando carrito:', error);
      }
    }
  }, [cart, isLoaded]);

  const addToCart = (product: Product) => {
    setCart((prev) => [...prev, product]);
    toast.success(`${product.title} añadido al carrito`, {
      description: "Puedes ver tus productos en el icono del carrito.",
    });
  };

  const removeFromCart = (index: number) => {
    const removedProduct = cart[index];
    setCart((prev) => prev.filter((_, i) => i !== index));
    if (removedProduct) {
      toast.success(`${removedProduct.title} removido del carrito`);
    }
  };

  const clearCart = () => {
    setCart([]);
  };

  const total = cart.reduce((acc, item) => acc + Number(item.price), 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de CartProvider");
  return context;
};