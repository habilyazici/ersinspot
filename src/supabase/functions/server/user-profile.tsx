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

// GET /make-server-0f4d2485/user-profile - Kullanıcı profilini getir
app.get('/', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized - please login' }, 401);
    }

    const supabase = getSupabaseClient();

    console.log('[USER-PROFILE] Fetching profile for:', user.email);

    // ✅ Customers tablosundan kullanıcı profilini getir
    const { data: profile, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', user.email?.toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('[USER-PROFILE] Error fetching customer profile:', error);
      return c.json({ error: 'Profil alınamadı', details: error.message }, 500);
    }

    if (!profile) {
      // Profil yoksa oluştur (orphan auth kaydı)
      console.log('[USER-PROFILE] No profile found, creating from auth metadata');
      
      const { data: newProfile, error: insertError } = await supabase
        .from('customers')
        .insert({
          email: user.email?.toLowerCase(),
          name: user.user_metadata?.name || user.email?.split('@')[0] || '',
          phone: user.user_metadata?.phone || '',
          city: 'İzmir',
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('[USER-PROFILE] Error creating profile:', insertError);
        return c.json({ error: 'Profil oluşturulamadı', details: insertError.message }, 500);
      }

      return c.json({ profile: newProfile });
    }

    return c.json({ profile });
  } catch (error) {
    console.error('[USER-PROFILE] Unexpected error in GET /user-profile:', error);
    return c.json({ error: 'Internal server error', details: String(error) }, 500);
  }
});

// PUT /make-server-0f4d2485/user-profile - Kullanıcı profilini güncelle
app.put('/', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized - please login' }, 401);
    }

    const body = await c.req.json();
    const { name, phone, address, district, city } = body;

    console.log('[USER-PROFILE] Updating profile for:', user.email, body);

    const supabase = getSupabaseClient();

    // ✅ Customers tablosunu güncelle
    const { data: profile, error } = await supabase
      .from('customers')
      .update({
        name,
        phone,
        address,
        district,
        city,
        updated_at: new Date().toISOString(),
      })
      .eq('email', user.email?.toLowerCase())
      .select()
      .single();

    if (error) {
      console.error('[USER-PROFILE] Error updating customer profile:', error);
      return c.json({ error: 'Profil güncellenemedi', details: error.message }, 500);
    }

    // Auth metadata'yı da güncelle
    await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: {
        name,
        phone,
      },
    });

    console.log('[USER-PROFILE] Profile updated successfully for:', user.email);

    return c.json({ 
      success: true,
      message: 'Profil başarıyla güncellendi', 
      profile 
    });
  } catch (error) {
    console.error('[USER-PROFILE] Unexpected error in PUT /user-profile:', error);
    return c.json({ error: 'Internal server error', details: String(error) }, 500);
  }
});

export default app;
