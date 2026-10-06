import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { CartLine, Product } from '../types';

/** Что контекст даёт компонентам */
interface CartContextValue {
  lines: CartLine[];
  count: number;
  total: number;
  add: (product: Product, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

const CART_STORAGE_KEY = 'toolshop.cart';

const CartContext = createContext<CartContextValue | null>(null);

/**
 * Хранит корзину покупателя.
 * Содержимое лежит в localStorage браузера, поэтому корзина не пропадает
 * при перезагрузке страницы и не требует запросов к серверу до оформления заказа.
 */
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useLocalStorage<CartLine[]>(CART_STORAGE_KEY, []);

  function add(product: Product, quantity = 1) {
    // текущий список берём из аргумента: кнопку могут нажать несколько раз подряд
    setLines((current) => {
      const existing = current.find((line) => line.productId === product.id);

      if (existing) {
        // больше, чем есть на складе, положить нельзя
        const total = Math.min(existing.quantity + quantity, product.stock);
        return current.map((line) =>
          line.productId === product.id ? { ...line, quantity: total, stock: product.stock } : line,
        );
      }

      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: Math.min(Math.max(1, quantity), product.stock),
          stock: product.stock,
          image: product.image,
        },
      ];
    });
  }

  function setQuantity(productId: string, quantity: number) {
    setLines(
      lines.map((line) =>
        line.productId === productId
          ? { ...line, quantity: Math.min(Math.max(1, quantity), line.stock) }
          : line,
      ),
    );
  }

  function remove(productId: string) {
    setLines(lines.filter((line) => line.productId !== productId));
  }

  function clear() {
    setLines([]);
  }

  let count = 0;
  let total = 0;
  lines.forEach((line) => {
    count += line.quantity;
    total += line.quantity * line.price;
  });

  const value: CartContextValue = { lines, count, total, add, setQuantity, remove, clear };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/** Доступ к контексту из компонентов */
export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart должен использоваться внутри CartProvider');
  }
  return context;
}
