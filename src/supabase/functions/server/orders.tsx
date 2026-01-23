// ============================================
// ORDERS MODULE - POSTGRES TABANLI
// ============================================
// KV Store yerine Postgres kullanıyoruz
// ============================================

import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ============================================
// HELPER: Generate Order Number
// ============================================
export async function generateOrderNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  
  // Bugünkü sipariş sayısını bul
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', `${year}-${month}-${day}T00:00:00Z`)
    .lt('created_at', `${year}-${month}-${day}T23:59:59Z`);
  
  const orderCount = (count || 0) + 1;
  const orderNumber = `ES-${dateStr}-${String(orderCount).padStart(4, '0')}`;
  
  return orderNumber;
}

// ============================================
// CREATE ORDER - Postgres'e kaydet
// ============================================
export async function createOrder(orderData: any) {
  try {
    // 1. Order Number oluştur
    const orderNumber = await generateOrderNumber();
    
    // 2. Orders tablosuna ekle
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: orderData.customer_id || null,
        customer_name: orderData.customer_name,
        customer_email: orderData.customer_email,
        customer_phone: orderData.customer_phone,
        customer_city: orderData.customer_city || 'İzmir',
        customer_district: orderData.customer_district || '',
        customer_neighborhood: orderData.customer_neighborhood || '',
        customer_street: orderData.customer_street || '',
        customer_building_no: orderData.customer_building_no || '',
        customer_apartment_no: orderData.customer_apartment_no || '',
        customer_address_notes: orderData.customer_address_notes || '',
        order_type: orderData.order_type || 'purchase',
        status: 'pending',
        total_amount: orderData.total_amount || 0,
        delivery_date: orderData.delivery_date || orderData.preferred_date || null,
        delivery_time: orderData.delivery_time || null,
        notes: orderData.notes || '',
        service_details: orderData.service_details || null,
        moving_details: orderData.moving_details || null,
        sell_product_details: orderData.sell_product_details || null,
      })
      .select()
      .single();
    
    if (orderError) {
      throw new Error(`Order creation failed: ${orderError.message}`);
    }
    
    // 3. Order Items ekle
    if (orderData.items && orderData.items.length > 0) {
      const orderItems = orderData.items.map((item: any) => ({
        order_id: order.id,
        product_id: item.id || null,
        product_title: item.title || item.name,
        product_price: item.price,
        product_image: item.image || '',
        product_condition: item.condition || '',
        product_category: item.category || '',
        quantity: item.quantity || 1,
        unit_price: item.price,
        total_price: (item.price * (item.quantity || 1)),
      }));
      
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);
      
      if (itemsError) {
        console.error('Error inserting order items:', itemsError);
        // Rollback order if items fail
        await supabase.from('orders').delete().eq('id', order.id);
        throw new Error(`Order items creation failed: ${itemsError.message}`);
      }
    }
    
    // 4. ✅ YENİ MANTIK: Sipariş oluştuğu anda ürün hemen SATILDI olarak işaretlenir
    // Sipariş oluşunca: for_sale → sold (ürün artık satıldı)
    if (orderData.items && orderData.items.length > 0) {
      const productIds = orderData.items.map((item: any) => item.id).filter(Boolean);
      
      if (productIds.length > 0) {
        console.log(`[ORDERS] 💰 Setting ${productIds.length} products to SOLD (order created)`);
        
        const { error: productError } = await supabase
          .from('products')
          .update({ 
            status: 'sold',
            updated_at: new Date().toISOString()
          })
          .in('id', productIds);
        
        if (productError) {
          console.error('[ORDERS] ❌ Failed to update product status:', productError);
        } else {
          console.log(`[ORDERS] ✅ Products marked as SOLD immediately`);
        }
      }
    }
    
    // 5. Sepeti temizle (eğer customer_id varsa)
    if (orderData.customer_id) {
      await supabase
        .from('cart_items')
        .delete()
        .eq('customer_id', orderData.customer_id);
    }
    
    return {
      success: true,
      order,
    };
  } catch (error: any) {
    console.error('Error creating order:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================
// GET ORDERS - Müşteriye göre siparişleri getir
// ============================================
export async function getCustomerOrders(customerId: string) {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          product_title,
          product_price,
          product_image,
          product_condition,
          product_category,
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }
    
    return {
      success: true,
      orders: orders || [],
    };
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return {
      success: false,
      error: error.message,
      orders: [],
    };
  }
}

// ============================================
// GET ALL ORDERS - Admin için tüm siparişler
// ============================================
export async function getAllOrders() {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          product_title,
          product_price,
          product_image,
          product_condition,
          product_category,
          quantity,
          unit_price,
          total_price
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch orders: ${error.message}`);
    }
    
    return {
      success: true,
      orders: orders || [],
    };
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return {
      success: false,
      error: error.message,
      orders: [],
    };
  }
}

// ============================================
// UPDATE ORDER STATUS
// ============================================
export async function updateOrderStatus(orderId: string, status: string) {
  try {
    // 1️⃣ Önce siparişi güncelle
    const { data: order, error } = await supabase
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select(`
        *,
        order_items (
          id,
          product_id
        )
      `)
      .single();
    
    if (error) {
      throw new Error(`Failed to update order: ${error.message}`);
    }
    
    // 2️⃣ YENİ MANTIK: Ürünler zaten sipariş oluşturulduğunda 'sold' oldu
    // Sadece sipariş iptal edilirse (cancelled) ürünleri 'for_sale' yap
    console.log(`[ORDERS] 📦 Order status changed to: ${status}`);
    
    // Ürün status mantığı:
    // - cancelled (İptal Edildi) → for_sale (ürün satışa geri döner)
    // - Diğer durumlar → Ürün zaten 'sold' olduğu için dokunma
    
    // 3️⃣ Siparişin içindeki tüm ürünleri güncelle (sadece iptal durumunda)
    if (status === 'cancelled' && order.order_items && order.order_items.length > 0) {
      const productIds = order.order_items.map((item: any) => item.product_id).filter(Boolean);
      
      if (productIds.length > 0) {
        console.log(`[ORDERS] 🔄 Sipariş iptal - ${productIds.length} ürün satışa geri dönüyor`);
        
        const { error: productError } = await supabase
          .from('products')
          .update({ 
            status: 'for_sale',
            updated_at: new Date().toISOString()
          })
          .in('id', productIds);
        
        if (productError) {
          console.error(`[ORDERS] ❌ Failed to update product status:`, productError);
        } else {
          console.log(`[ORDERS] ✅ ${productIds.length} ürün başarıyla satışa döndü`);
        }
      }
    }
    
    return {
      success: true,
      order,
    };
  } catch (error: any) {
    console.error('Error updating order:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================
// GET ORDER BY NUMBER
// ============================================
export async function getOrderByNumber(orderNumber: string) {
  try {
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id,
          product_title,
          product_price,
          product_image,
          product_condition,
          product_category,
          quantity,
          unit_price,
          total_price
        )
      `)
      .eq('order_number', orderNumber)
      .single();
    
    if (error) {
      throw new Error(`Order not found: ${error.message}`);
    }
    
    return {
      success: true,
      order,
    };
  } catch (error: any) {
    console.error('Error fetching order:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// ============================================
// DELETE ORDER - Sipariş silindiğinde ürünleri satışa geri döndür
// ============================================
export async function deleteOrder(orderId: string) {
  try {
    // 1️⃣ Önce siparişi ve ürünleri getir
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id,
          product_id
        )
      `)
      .eq('id', orderId)
      .single();
    
    if (fetchError) {
      throw new Error(`Order not found: ${fetchError.message}`);
    }
    
    // 2️⃣ Ürünleri satışa geri döndür
    if (order.order_items && order.order_items.length > 0) {
      const productIds = order.order_items.map((item: any) => item.product_id).filter(Boolean);
      
      if (productIds.length > 0) {
        console.log(`[ORDERS] 🔄 Sipariş siliniyor - ${productIds.length} ürün satışa geri dönüyor`);
        
        const { error: productError } = await supabase
          .from('products')
          .update({ 
            status: 'for_sale',
            updated_at: new Date().toISOString()
          })
          .in('id', productIds);
        
        if (productError) {
          console.error('[ORDERS] ❌ Failed to return products to sale:', productError);
        } else {
          console.log(`[ORDERS] ✅ ${productIds.length} ürün başarıyla satışa döndü`);
        }
      }
    }
    
    // 3️⃣ Sipariş ürünlerini sil
    const { error: itemsError } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId);
    
    if (itemsError) {
      console.error('[ORDERS] ⚠️ Warning: Could not delete order items:', itemsError);
    }
    
    // 4️⃣ Siparişi sil
    const { error: deleteError } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);
    
    if (deleteError) {
      throw new Error(`Failed to delete order: ${deleteError.message}`);
    }
    
    console.log(`[ORDERS] ✅ Sipariş başarıyla silindi: ${order.order_number}`);
    
    return {
      success: true,
      message: 'Sipariş başarıyla silindi',
    };
  } catch (error: any) {
    console.error('Error deleting order:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
