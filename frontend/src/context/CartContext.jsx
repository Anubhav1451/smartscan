import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [selectedStore, setSelectedStore] = useState(() => {
    try {
      const saved = localStorage.getItem('smartscan_active_store');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [items, setItems] = useState([]);
  const [pendingStoreSwitch, setPendingStoreSwitch] = useState(null);

  // Load cart for current store from localStorage
  useEffect(() => {
    if (!selectedStore?.id) {
      setItems([]);
      return;
    }
    try {
      const saved = localStorage.getItem(`smartscan_cart_${selectedStore.id}`);
      setItems(saved ? JSON.parse(saved) : []);
    } catch {
      setItems([]);
    }
  }, [selectedStore?.id]);

  // Persist cart to localStorage whenever items change
  useEffect(() => {
    if (selectedStore?.id) {
      try {
        localStorage.setItem(`smartscan_cart_${selectedStore.id}`, JSON.stringify(items));
      } catch (e) {
        console.error('Failed to save cart to localStorage', e);
      }
    }
  }, [items, selectedStore?.id]);

  // Persist selected store
  useEffect(() => {
    if (selectedStore) {
      try {
        localStorage.setItem('smartscan_active_store', JSON.stringify(selectedStore));
      } catch (e) {
        console.error('Failed to save active store', e);
      }
    }
  }, [selectedStore]);

  const selectStore = (store, force = false) => {
    if (!selectedStore || selectedStore.id === store.id) {
      setSelectedStore(store);
      return true;
    }

    // Cross-store guard: if current cart has items, prompt first
    if (items.length > 0 && !force) {
      setPendingStoreSwitch(store);
      return false; // indicates confirmation needed
    }

    setSelectedStore(store);
    return true;
  };

  const confirmStoreSwitch = () => {
    if (pendingStoreSwitch) {
      // Clear previous store's cart
      if (selectedStore?.id) {
        localStorage.removeItem(`smartscan_cart_${selectedStore.id}`);
      }
      setItems([]);
      setSelectedStore(pendingStoreSwitch);
      setPendingStoreSwitch(null);
    }
  };

  const cancelStoreSwitch = () => {
    setPendingStoreSwitch(null);
  };

  const addToCart = (product, qty = 1) => {
    if (!product || product.stock <= 0) return false;

    setItems((prev) => {
      const existing = prev.find((it) => it.barcode === product.barcode);
      if (existing) {
        const nextQty = existing.qty + qty;
        if (nextQty > product.stock) {
          return prev; // cannot exceed stock
        }
        return prev.map((it) =>
          it.barcode === product.barcode ? { ...it, qty: nextQty } : it
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          barcode: product.barcode,
          name: product.name,
          price: product.price,
          category: product.category,
          stock: product.stock,
          qty: Math.min(qty, product.stock),
        },
      ];
    });
    return true;
  };

  const updateQty = (barcode, newQty) => {
    if (newQty <= 0) {
      removeFromCart(barcode);
      return;
    }
    setItems((prev) =>
      prev.map((it) => {
        if (it.barcode === barcode) {
          const maxQty = it.stock ?? 999;
          return { ...it, qty: Math.min(newQty, maxQty) };
        }
        return it;
      })
    );
  };

  const removeFromCart = (barcode) => {
    setItems((prev) => prev.filter((it) => it.barcode !== barcode));
  };

  const clearCart = () => {
    setItems([]);
    if (selectedStore?.id) {
      localStorage.removeItem(`smartscan_cart_${selectedStore.id}`);
    }
  };

  const cartCount = items.reduce((sum, it) => sum + it.qty, 0);
  const cartTotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);

  return (
    <CartContext.Provider
      value={{
        selectedStore,
        selectStore,
        items,
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
        cartCount,
        cartTotal,
        pendingStoreSwitch,
        confirmStoreSwitch,
        cancelStoreSwitch,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
