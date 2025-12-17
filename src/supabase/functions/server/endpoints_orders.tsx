// ============================================
// ORDERS ENDPOINTS - POSTGRES TABANLI
// ============================================
// index.tsx'e eklenecek endpoint'ler
// ============================================

import { Hono } from "npm:hono";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as orders from './orders.tsx';

const app = new Hono();
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ==========================================
// CREATE ORDER
// ==========================================
app.post("/make-server-0f4d2485/orders", async (c) => {
  try {
    const body = await c.req.json();
    const { customer, items, delivery, payment, notes } = body;
    
    console.log('[ORDERS] Creating new order:', { customer: customer.email, items: items.length });
    
    // 1. Müşteri ID'sini al veya oluştur
    let customerId = null;
    
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .or(`email.eq.${customer.email},phone.eq.${customer.phone}`)
      .single();
    
    if (existingCustomer) {
      customerId = existingCustomer.id;
      console.log('[ORDERS] Existing customer found:', customerId);
    } else {
      console.log('[ORDERS] Creating new customer...');
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          district: customer.district || '',
          neighborhood: customer.neighborhood || '',
          street: customer.street || '',
          building_no: customer.building_no || '',
          apartment_no: customer.apartment_no || '',
          city: 'İzmir'
        })
        .select()
        .single();
      
      if (customerError) {
        console.error('[ORDERS] Customer creation failed:', customerError);
        return c.json({ error: 'Müşteri oluşturulamadı: ' + customerError.message }, 500);
      }
      
      customerId = newCustomer?.id;
      console.log('[ORDERS] New customer created:', customerId);
    }
    
    // 2. Sipariş oluştur
    const result = await orders.createOrder({
      customer_id: customerId,
      customer_name: customer.name,
      customer_email: customer.email,
      customer_phone: customer.phone,
      customer_district: customer.district || '',
      customer_neighborhood: customer.neighborhood || '',
      customer_street: customer.street || '',
      customer_building_no: customer.building_no || '',
      customer_apartment_no: customer.apartment_no || '',
      customer_address_notes: customer.address_notes || '',
      order_type: 'purchase',
      total_amount: items.reduce((sum: number, item: any) => sum + item.price, 0),
      delivery_time: delivery?.time || null,
      preferred_date: delivery?.date || null,
      notes: notes || '',
      items: items,
    });
    
    if (!result.success) {
      console.error('[ORDERS] Order creation failed:', result.error);
      return c.json({ error: result.error }, 500);
    }
    
    console.log('[ORDERS] Order created successfully:', result.order.order_number);
    
    return c.json({
      success: true,
      order: result.order,
      message: 'Sipariş başarıyla oluşturuldu'
    });
  } catch (err: any) {
    console.error('[ORDERS] Exception in POST /orders:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// GET CUSTOMER ORDERS
// ==========================================
app.get("/make-server-0f4d2485/orders/customer/:email", async (c) => {
  try {
    const email = c.req.param('email');
    console.log('[ORDERS] Fetching orders for customer:', email);
    
    // Müşteri ID'sini bul
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email)
      .single();
    
    if (!customer) {
      console.log('[ORDERS] Customer not found:', email);
      return c.json({ orders: [] });
    }
    
    // Siparişleri getir
    const result = await orders.getCustomerOrders(customer.id);
    
    console.log('[ORDERS] Orders fetched:', result.orders.length);
    
    return c.json({ orders: result.orders || [] });
  } catch (err: any) {
    console.error('[ORDERS] Exception in GET /orders/customer/:email:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// GET ALL ORDERS (ADMIN)
// ==========================================
app.get("/make-server-0f4d2485/admin/orders", async (c) => {
  try {
    console.log('[ORDERS] Fetching all orders for admin...');
    
    const result = await orders.getAllOrders();
    
    console.log('[ORDERS] All orders fetched:', result.orders.length);
    
    return c.json({ orders: result.orders || [] });
  } catch (err: any) {
    console.error('[ORDERS] Exception in GET /admin/orders:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// UPDATE ORDER STATUS
// ==========================================
app.put("/make-server-0f4d2485/orders/:orderId/status", async (c) => {
  try {
    const orderId = c.req.param('orderId');
    const { status } = await c.req.json();
    
    console.log('[ORDERS] Updating order status:', { orderId, status });
    
    const result = await orders.updateOrderStatus(orderId, status);
    
    if (!result.success) {
      console.error('[ORDERS] Status update failed:', result.error);
      return c.json({ error: result.error }, 500);
    }
    
    console.log('[ORDERS] Status updated successfully');
    
    return c.json({ 
      success: true, 
      order: result.order 
    });
  } catch (err: any) {
    console.error('[ORDERS] Exception in PUT /orders/:orderId/status:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// GET ORDER BY NUMBER (TRACKING)
// ==========================================
app.get("/make-server-0f4d2485/orders/track/:orderNumber", async (c) => {
  try {
    const orderNumber = c.req.param('orderNumber');
    console.log('[ORDERS] Tracking order:', orderNumber);
    
    const result = await orders.getOrderByNumber(orderNumber);
    
    if (!result.success) {
      console.error('[ORDERS] Order not found:', orderNumber);
      return c.json({ error: 'Sipariş bulunamadı' }, 404);
    }
    
    console.log('[ORDERS] Order found:', orderNumber);
    
    return c.json({ 
      success: true, 
      order: result.order 
    });
  } catch (err: any) {
    console.error('[ORDERS] Exception in GET /orders/track/:orderNumber:', err);
    return c.json({ error: err.message }, 500);
  }
});

export default app;
