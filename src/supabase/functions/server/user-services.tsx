import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

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

// GET /make-server-0f4d2485/user-services/technical - Teknik servis randevuları
app.get('/technical', async (c) => {
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
      // Henüz randevu almamış kullanıcı
      return c.json({ appointments: [] });
    }

    const { data: appointments, error } = await supabase
      .from('technical_service_appointments')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching technical service appointments:', error);
      return c.json({ error: 'Failed to fetch appointments', details: error.message }, 500);
    }

    return c.json({ appointments: appointments || [] });
  } catch (error) {
    console.error('Unexpected error in GET /user-services/technical:', error);
    return c.json({ error: 'Internal server error', details: String(error) }, 500);
  }
});

// GET /make-server-0f4d2485/user-services/moving - Nakliye randevuları
app.get('/moving', async (c) => {
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
      // Henüz randevu almamış kullanıcı
      return c.json({ appointments: [] });
    }

    const { data: appointments, error } = await supabase
      .from('moving_appointments')
      .select(`
        *,
        items:moving_items(id, item_name, quantity)
      `)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching moving appointments:', error);
      return c.json({ error: 'Failed to fetch appointments', details: error.message }, 500);
    }

    return c.json({ appointments: appointments || [] });
  } catch (error) {
    console.error('Unexpected error in GET /user-services/moving:', error);
    return c.json({ error: 'Internal server error', details: String(error) }, 500);
  }
});

export default app;