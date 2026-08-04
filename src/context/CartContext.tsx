import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface CartContextType {
  cartItems: any[];
  cartTotal: { total: number; itemCount: number };
  addToCart: (productId: Id<"products">, variantId: number, quantity: number) => void;
  updateQuantity: (itemId: Id<"cartItems">, quantity: number) => void;
  removeFromCart: (itemId: Id<"cartItems">) => void;
  clearCart: () => void;
  sessionId: string;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  // Generate or get session ID
  const sessionId = getSessionId();

  const cartItems = useQuery(api.cart.getItems, { sessionId }) || [];
  const cartTotal = useQuery(api.cart.getCartTotal, { sessionId }) || { total: 0, itemCount: 0 };

  const addToCartMutation = useMutation(api.cart.addItem);
  const updateQuantityMutation = useMutation(api.cart.updateQuantity);
  const removeItemMutation = useMutation(api.cart.removeItem);
  const clearCartMutation = useMutation(api.cart.clearCart);
  const mergeGuestCartMutation = useMutation(api.cart.mergeGuestCart);

  // Move the guest cart onto the account exactly once per sign-in. Keyed on the
  // user id so re-renders and token refreshes cannot re-trigger it, and so
  // signing in as a different user still merges.
  const loggedInUser = useQuery(api.auth.loggedInUser);
  const mergedForUserRef = useRef<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    if (!loggedInUser || loggedInUser.isAnonymous) return;
    if (mergedForUserRef.current === loggedInUser._id) return;

    mergedForUserRef.current = loggedInUser._id;
    void mergeGuestCartMutation({ sessionId });
  }, [loggedInUser, mergeGuestCartMutation, sessionId]);

  const addToCart = (productId: Id<"products">, variantId: number, quantity: number) => {
    addToCartMutation({ sessionId, productId, variantId, quantity });
    // Adding to cart previously gave no feedback beyond the header count
    // ticking over. Opening the drawer is the confirmation.
    setCartOpen(true);
  };

  const updateQuantity = (itemId: Id<"cartItems">, quantity: number) => {
    updateQuantityMutation({ itemId, sessionId, quantity });
  };

  const removeFromCart = (itemId: Id<"cartItems">) => {
    removeItemMutation({ itemId, sessionId });
  };

  const clearCart = () => {
    clearCartMutation({ sessionId });
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      cartTotal,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      sessionId,
      cartOpen,
      setCartOpen,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

function getSessionId(): string {
  let sessionId = localStorage.getItem("cart-session-id");
  if (!sessionId) {
    sessionId = Math.random().toString(36).substring(2, 15);
    localStorage.setItem("cart-session-id", sessionId);
  }
  return sessionId;
}
