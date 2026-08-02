import { createContext, useContext, useEffect, useRef, ReactNode } from "react";
import { useQuery, useMutation, useConvexAuth } from "convex/react";
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
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  // Guest cart key. Stays in localStorage even when signed in, so a later
  // sign-out falls back to a working guest cart.
  const sessionId = getSessionId();

  const { isAuthenticated } = useConvexAuth();
  const user = useQuery(api.auth.loggedInUser);

  const cartItems = useQuery(api.cart.getItems, { sessionId }) || [];
  const cartTotal = useQuery(api.cart.getCartTotal, { sessionId }) || { total: 0, itemCount: 0 };

  const addToCartMutation = useMutation(api.cart.addItem);
  const updateQuantityMutation = useMutation(api.cart.updateQuantity);
  const removeItemMutation = useMutation(api.cart.removeItem);
  const clearCartMutation = useMutation(api.cart.clearCart);
  const mergeGuestCartMutation = useMutation(api.cart.mergeGuestCart);

  // Anonymous identities are treated as guests, matching convex/cart.ts —
  // signing up with a password later creates a different user document, so a
  // cart merged onto the anonymous user would be stranded.
  const isRealUser = isAuthenticated && !!user && !user.isAnonymous;
  const userId = isRealUser ? user._id : null;
  const mergedForUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!userId) {
      // Signed out. Clear the guard so a later sign-in merges whatever was
      // added to the guest cart in the meantime.
      mergedForUserId.current = null;
      return;
    }

    // Fire once per signed-out -> signed-in transition. Re-renders and token
    // refreshes leave the user id unchanged, so they hit this early return.
    if (mergedForUserId.current === userId) return;
    mergedForUserId.current = userId;

    void mergeGuestCartMutation({ sessionId }).catch((error) => {
      console.error("Failed to merge guest cart:", error);
      // Allow a retry on the next auth change rather than silently giving up.
      mergedForUserId.current = null;
    });
  }, [userId, sessionId, mergeGuestCartMutation]);

  const addToCart = (productId: Id<"products">, variantId: number, quantity: number) => {
    addToCartMutation({ sessionId, productId, variantId, quantity });
  };

  const updateQuantity = (itemId: Id<"cartItems">, quantity: number) => {
    updateQuantityMutation({ itemId, quantity });
  };

  const removeFromCart = (itemId: Id<"cartItems">) => {
    removeItemMutation({ itemId });
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
