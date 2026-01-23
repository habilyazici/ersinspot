// ============================================
// CART MODULE - POSTGRES TABANLI
// ============================================
// Sepet işlemleri için Postgres kullanıyoruz
// ============================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================
// WARRANTY HELPER FUNCTION
// ============================================
function warrantyMonthsToString(months: number): string {
  if (months === 0) return 'Garanti Yok';
  if (months === 3) return '3 Ay';
  if (months === 6) return '6 Ay';
  if (months === 12) return '1 Yıl';
  if (months === 24) return '2 Yıl';
  if (months === 36) return '3 Yıl';
  return `${months} Ay`;
}

// ============================================
// GET CART - Müşterinin sepetini getir
// ============================================
export async function getCart(customerId: string) {
  try {
    const { data: cartItems, error } = await supabase
      .from('cart_items')
      .select(`
        id,
        quantity,
        created_at,
        products (
          id,
          title,
          price,
          condition,
          status,
          warranty,
          description,
          images:product_images (image_url, order_num),
          category:categories (id, name, slug),
          brand:brands (id, name, slug)
        )
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch cart: ${error.message}`);
    }
    
    // Transform data to frontend format
    const formattedItems = (cartItems || []).map((item: any) => ({
      id: item.products.id,
      title: item.products.title,
      price: item.products.price,
      image: item.products.images?.[0]?.image_url || '',
      images: item.products.images?.sort((a: any, b: any) => a.order_num - b.order_num).map((img: any) => img.image_url) || [],
      condition: item.products.condition,
      category: item.products.category?.name || '',
      quantity: item.quantity,
      status: item.products.status,
    }));
    
    return {
      success: true,
      items: formattedItems,
    };
  } catch (error: any) {
    console.error('Error fetching cart:', error);
    return {
      success: false,
      error: error.message,
      items: [],
    };
  }
}

// ============================================
// ADD TO CART - Sepete ürün ekle
// ============================================
export async function addToCart(customerId: string, productId: string, quantity: number = 1) {
  try {
    // 1. Ürün zaten sepette mi kontrol et
    const { data: existing, error: checkError } = await supabase
      .from('cart_items')
      .select('*')
      .eq('customer_id', customerId)
      .eq('product_id', productId)
      .single();
    
    if (existing) {
      // Zaten sepette - miktar güncelle (ikinci el için genelde 1)
      const { data: updated, error: updateError } = await supabase
        .from('cart_items')
        .update({ 
          quantity: existing.quantity + quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();
      
      if (updateError) {
        throw new Error(`Failed to update cart: ${updateError.message}`);
      }
      
      return {
        success: true,
        message: 'Cart updated',
        item: updated,
      };
    }
    
    // 2. Yeni ürün ekle
    const { data: newItem, error: insertError } = await supabase
      .from('cart_items')
      .insert({
        customer_id: customerId,
        product_id: productId,
        quantity,
      })
      .select()
      .single();
    
    if (insertError) {
      throw new Error(`Failed to add to cart: ${insertError.message}`);
    }
    
    return {
      success: true,
      message: 'Item added to cart',
      item: newItem,
    };
  } catch (error: any) {
    console.error('Error adding to cart:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================
// REMOVE FROM CART - Sepetten ürün çıkar
// ============================================
export async function removeFromCart(customerId: string, productId: string) {
  try {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('customer_id', customerId)
      .eq('product_id', productId);
    
    if (error) {
      throw new Error(`Failed to remove from cart: ${error.message}`);
    }
    
    return {
      success: true,
      message: 'Item removed from cart',
    };
  } catch (error: any) {
    console.error('Error removing from cart:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================
// UPDATE CART ITEM QUANTITY
// ============================================
export async function updateCartItemQuantity(customerId: string, productId: string, quantity: number) {
  try {
    if (quantity <= 0) {
      return await removeFromCart(customerId, productId);
    }
    
    const { data: updated, error } = await supabase
      .from('cart_items')
      .update({ 
        quantity,
        updated_at: new Date().toISOString()
      })
      .eq('customer_id', customerId)
      .eq('product_id', productId)
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to update quantity: ${error.message}`);
    }
    
    return {
      success: true,
      message: 'Quantity updated',
      item: updated,
    };
  } catch (error: any) {
    console.error('Error updating quantity:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================
// CLEAR CART - Sepeti temizle
// ============================================
export async function clearCart(customerId: string) {
  try {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('customer_id', customerId);
    
    if (error) {
      throw new Error(`Failed to clear cart: ${error.message}`);
    }
    
    return {
      success: true,
      message: 'Cart cleared',
    };
  } catch (error: any) {
    console.error('Error clearing cart:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================
// GET CART COUNT - Sepetteki ürün sayısı
// ============================================
export async function getCartCount(customerId: string) {
  try {
    const { count, error } = await supabase
      .from('cart_items')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId);
    
    if (error) {
      throw new Error(`Failed to get cart count: ${error.message}`);
    }
    
    return {
      success: true,
      count: count || 0,
    };
  } catch (error: any) {
    console.error('Error getting cart count:', error);
    return {
      success: false,
      error: error.message,
      count: 0,
    };
  }
}
