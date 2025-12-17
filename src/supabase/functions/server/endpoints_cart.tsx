// ============================================
// CART ENDPOINTS - POSTGRES TABANLI
// ============================================
// index.tsx'e eklenecek endpoint'ler
// ============================================

import { Hono } from "npm:hono";
import * as cart from './cart.tsx';

const app = new Hono();

// ==========================================
// GET CART
// ==========================================
app.get("/make-server-0f4d2485/cart/:customerId", async (c) => {
  try {
    const customerId = c.req.param('customerId');
    console.log('[CART] Fetching cart for customer:', customerId);
    
    const result = await cart.getCart(customerId);
    
    console.log('[CART] Cart fetched:', result.items?.length || 0, 'items');
    
    return c.json(result);
  } catch (err: any) {
    console.error('[CART] Exception in GET /cart:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// ADD TO CART
// ==========================================
app.post("/make-server-0f4d2485/cart", async (c) => {
  try {
    const { customerId, productId, quantity } = await c.req.json();
    console.log('[CART] Adding to cart:', { customerId, productId, quantity });
    
    const result = await cart.addToCart(customerId, productId, quantity || 1);
    
    if (!result.success) {
      console.error('[CART] Add to cart failed:', result.error);
      return c.json(result, 400);
    }
    
    console.log('[CART] Item added to cart successfully');
    
    return c.json(result);
  } catch (err: any) {
    console.error('[CART] Exception in POST /cart:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// REMOVE FROM CART
// ==========================================
app.delete("/make-server-0f4d2485/cart", async (c) => {
  try {
    const { customerId, productId } = await c.req.json();
    console.log('[CART] Removing from cart:', { customerId, productId });
    
    const result = await cart.removeFromCart(customerId, productId);
    
    if (!result.success) {
      console.error('[CART] Remove from cart failed:', result.error);
      return c.json(result, 400);
    }
    
    console.log('[CART] Item removed from cart successfully');
    
    return c.json(result);
  } catch (err: any) {
    console.error('[CART] Exception in DELETE /cart:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// UPDATE CART ITEM QUANTITY
// ==========================================
app.put("/make-server-0f4d2485/cart", async (c) => {
  try {
    const { customerId, productId, quantity } = await c.req.json();
    console.log('[CART] Updating cart quantity:', { customerId, productId, quantity });
    
    const result = await cart.updateCartItemQuantity(customerId, productId, quantity);
    
    if (!result.success) {
      console.error('[CART] Update quantity failed:', result.error);
      return c.json(result, 400);
    }
    
    console.log('[CART] Quantity updated successfully');
    
    return c.json(result);
  } catch (err: any) {
    console.error('[CART] Exception in PUT /cart:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// CLEAR CART
// ==========================================
app.delete("/make-server-0f4d2485/cart/:customerId", async (c) => {
  try {
    const customerId = c.req.param('customerId');
    console.log('[CART] Clearing cart for customer:', customerId);
    
    const result = await cart.clearCart(customerId);
    
    if (!result.success) {
      console.error('[CART] Clear cart failed:', result.error);
      return c.json(result, 400);
    }
    
    console.log('[CART] Cart cleared successfully');
    
    return c.json(result);
  } catch (err: any) {
    console.error('[CART] Exception in DELETE /cart/:customerId:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// GET CART COUNT
// ==========================================
app.get("/make-server-0f4d2485/cart/:customerId/count", async (c) => {
  try {
    const customerId = c.req.param('customerId');
    console.log('[CART] Getting cart count for customer:', customerId);
    
    const result = await cart.getCartCount(customerId);
    
    console.log('[CART] Cart count:', result.count);
    
    return c.json(result);
  } catch (err: any) {
    console.error('[CART] Exception in GET /cart/count:', err);
    return c.json({ error: err.message }, 500);
  }
});

export default app;
