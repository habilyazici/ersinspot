import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Supabase client
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
};

// Auth middleware - kullanıcı doğrulama
async function verifyUser(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  const supabase = getSupabaseClient();
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    console.log('Auth error while verifying user:', error);
    return null;
  }

  return user;
}

// GET /make-server-0f4d2485/user-orders - Kullanıcının siparişlerini getir
app.get('/', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized - please login' }, 401);
    }

    const supabase = getSupabaseClient();

    // Önce kullanıcının email'i ile customer'ı bul
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', user.email)
      .single();

    if (customerError || !customer) {
      // Henüz sipariş vermemiş kullanıcı
      return c.json({ orders: [] });
    }

    // Customer'ın siparişlerini KV store'dan getir
    const orderKeys = await kv.getByPrefix(`order_by_customer:${customer.id}:`);
    
    // Sort by created_at descending
    const orders = orderKeys.sort((a: any, b: any) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    // Enrich with items
    for (const order of orders) {
      const items = await kv.get(`order_items:${order.id}`);
      order.items = items || [];
    }

    return c.json({ orders: orders || [] });
  } catch (error) {
    console.error('Unexpected error in GET /user-orders:', error);
    return c.json({ error: 'Internal server error', details: String(error) }, 500);
  }
});

export default app;