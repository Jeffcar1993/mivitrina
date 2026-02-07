/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Product } from '@/types';
import { toast } from "sonner";
import api from '../lib/axios';

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
  const [isHydrated, setIsHydrated] = useState(false);
  const isSyncingRef = useRef(false);
  const hasSyncedRef = useRef(false);

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

  const compressCart = (items: Product[]) => {
    const map = new Map<number, { productId: number; quantity: number }>();
    items.forEach((item) => {
      const current = map.get(item.id);
      if (current) {
        current.quantity += 1;
      } else {
        map.set(item.id, { productId: item.id, quantity: 1 });
      }
    });
    return Array.from(map.values());
  };

  // Sincronizar carrito con backend si el usuario está autenticado
  useEffect(() => {
    if (!isLoaded || hasSyncedRef.current) return;
    hasSyncedRef.current = true;

    const token = localStorage.getItem('token');
    if (!token) {
      setIsHydrated(true);
      return;
    }

    const syncFromServer = async () => {
      try {
        const response = await api.get('/cart');
        const serverItems = response.data as Array<Product & { quantity?: number }>;

        if (serverItems.length > 0) {
          const expanded = serverItems.flatMap((item) => {
            const { quantity, ...product } = item as Product & { quantity?: number };
            const count = Math.max(1, Number(quantity || 1));
            return Array.from({ length: count }, () => product as Product);
          });

          isSyncingRef.current = true;
          setCart(expanded);
          isSyncingRef.current = false;
        } else if (cart.length > 0) {
          await api.post('/cart/save', { items: compressCart(cart) });
        }
      } catch (error: any) {
        console.error('Error sincronizando carrito:', error);
        // Si es error 401, limpiar token inválido
        if (error?.response?.status === 401) {
          localStorage.removeItem('token');
        }
      } finally {
        setIsHydrated(true);
      }
    };

    syncFromServer();
  }, [isLoaded, cart]);

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

  // Guardar carrito en backend si está autenticado
  useEffect(() => {
    if (!isLoaded || !isHydrated || isSyncingRef.current) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const syncToServer = async () => {
      try {
        await api.post('/cart/save', { items: compressCart(cart) });
      } catch (error: any) {
        console.error('Error guardando carrito en servidor:', error);
        // Si es error 401, limpiar token inválido
        if (error?.response?.status === 401) {
          localStorage.removeItem('token');
        }
      }
    };

    syncToServer();
  }, [cart, isLoaded, isHydrated]);

  const addToCart = (product: Product) => {
    // Contar cuántas veces ya está este producto en el carrito
    const itemCount = cart.filter(item => item.id === product.id).length;
    const availableStock = Number(product.quantity ?? 0);

    if (itemCount >= availableStock) {
      toast.error(`No puedes agregar más de ${availableStock} unidad(es) de ${product.title}`, {
        description: "No hay suficiente stock disponible.",
      });
      return;
    }

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

  const clearCart = async () => {
    setCart([]);
    
    // También limpiar del servidor si está autenticado
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await api.delete('/cart/clear');
      } catch (error) {
        console.error('Error limpiando carrito en servidor:', error);
      }
    }
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