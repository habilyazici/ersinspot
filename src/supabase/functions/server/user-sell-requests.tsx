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

// GET /make-server-0f4d2485/user-sell-requests - Kullanıcının satış taleplerini getir
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
      // Henüz satış talebi oluşturmamış kullanıcı
      return c.json({ sellRequests: [] });
    }

    // Explicit column selection including new pickup appointment fields
    const { data: sellRequests, error } = await supabase
      .from('sell_requests')
      .select(`
        id,
        customer_id,
        product_category,
        brand,
        model,
        condition,
        purchase_year,
        has_box,
        has_accessories,
        description,
        status,
        created_at,
        updated_at,
        request_number,
        pickup_date,
        pickup_time,
        images:sell_request_images(id, image_url, order_num)
      `)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .order('order_num', { foreignTable: 'sell_request_images', ascending: true });

    if (error) {
      console.error('Error fetching sell requests:', error);
      return c.json({ error: 'Failed to fetch sell requests', details: error.message }, 500);
    }

    // Generate request_number for each request if not present
    const requestsWithNumbers = (sellRequests || []).map((req: any) => ({
      ...req,
      request_number: req.request_number || `#URN-${String(req.id).padStart(5, '0')}`
    }));

    return c.json({ sellRequests: requestsWithNumbers });
  } catch (error) {
    console.error('Unexpected error in GET /user-sell-requests:', error);
    return c.json({ error: 'Internal server error', details: String(error) }, 500);
  }
});

// POST /make-server-0f4d2485/user-sell-requests/cancel - Satış talebini iptal et
app.post('/cancel', async (c) => {
  try {
    console.log('[CANCEL SELL REQUEST] 🔵 Starting cancel request...');
    
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      console.log('[CANCEL SELL REQUEST] ❌ Unauthorized');
      return c.json({ error: 'Unauthorized - please login' }, 401);
    }

    console.log('[CANCEL SELL REQUEST] ✅ User verified:', user.email);

    const body = await c.req.json();
    console.log('[CANCEL SELL REQUEST] 📥 Request body:', body);
    
    const { requestId } = body;

    if (!requestId) {
      console.log('[CANCEL SELL REQUEST] ❌ No requestId provided');
      return c.json({ error: 'Request ID gerekli' }, 400);
    }

    console.log('[CANCEL SELL REQUEST] 🔍 Looking for request:', requestId);

    const supabase = getSupabaseClient();

    // Önce kullanıcının email'i ile customer'ı bul
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', user.email)
      .single();

    if (customerError || !customer) {
      console.log('[CANCEL SELL REQUEST] ❌ Customer not found:', customerError);
      return c.json({ error: 'Müşteri kaydı bulunamadı' }, 404);
    }

    console.log('[CANCEL SELL REQUEST] ✅ Customer found:', customer.id);

    // Talebi bul ve kullanıcıya ait olduğunu doğrula
    const { data: sellRequest, error: requestError } = await supabase
      .from('sell_requests')
      .select('id, status, customer_id')
      .eq('id', requestId)
      .single();

    if (requestError || !sellRequest) {
      console.error('[CANCEL SELL REQUEST] ❌ Request not found:', requestError);
      return c.json({ error: 'Satış talebi bulunamadı' }, 404);
    }

    console.log('[CANCEL SELL REQUEST] ✅ Request found:', sellRequest);

    // Kullanıcıya ait mi kontrol et
    if (sellRequest.customer_id !== customer.id) {
      console.log('[CANCEL SELL REQUEST] ❌ Permission denied - customer mismatch');
      return c.json({ error: 'Bu işlem için yetkiniz yok' }, 403);
    }

    console.log('[CANCEL SELL REQUEST] ✅ Permission verified');

    // İptal edilebilir durumda mı kontrol et
    const cancellableStatuses = ['pending', 'under_review', 'reviewing', 'offer_sent', 'counter_offer_sent'];
    if (!cancellableStatuses.includes(sellRequest.status)) {
      console.log('[CANCEL SELL REQUEST] ❌ Status not cancellable:', sellRequest.status);
      return c.json({ 
        error: 'Bu talep iptal edilemez',
        message: `${sellRequest.status} durumundaki talepler iptal edilemez` 
      }, 400);
    }

    console.log('[CANCEL SELL REQUEST] ✅ Status is cancellable:', sellRequest.status);

    // Talebi iptal et
    const now = new Date().toISOString();
    console.log('[CANCEL SELL REQUEST] 🔄 Preparing to update request...');
    
    // Önce sadece status'u güncellemeyi dene
    const updateData: any = {
      status: 'cancelled',
      updated_at: now
    };

    // Status history oluştur (eğer alan varsa)
    try {
      console.log('[CANCEL SELL REQUEST] 📝 Checking for status_history column...');
      // Mevcut history'yi çek (eğer varsa)
      const { data: currentData, error: fetchError } = await supabase
        .from('sell_requests')
        .select('status_history')
        .eq('id', requestId)
        .single();
      
      if (fetchError) {
        console.log('[CANCEL SELL REQUEST] ⚠️ Status history fetch error (column may not exist):', fetchError.message);
      } else {
        console.log('[CANCEL SELL REQUEST] ✅ Status history column exists');
        let statusHistory = [];
        if (currentData?.status_history) {
          statusHistory = Array.isArray(currentData.status_history) ? currentData.status_history : [];
          console.log('[CANCEL SELL REQUEST] 📋 Existing history entries:', statusHistory.length);
        }
        
        // Yeni history kaydı ekle
        statusHistory.push({
          status: 'cancelled',
          changed_at: now,
          note: 'Kullanıcı tarafından iptal edildi'
        });
        
        updateData.status_history = statusHistory;
        console.log('[CANCEL SELL REQUEST] 📝 Status history will be updated');
      }
    } catch (historyError) {
      // status_history column yoksa veya hata varsa, sadece status'u güncelleyelim
      console.log('[CANCEL SELL REQUEST] ⚠️ Status history error (will skip):', historyError);
    }

    console.log('[CANCEL SELL REQUEST] 💾 Updating request with data:', updateData);
    const { error: updateError } = await supabase
      .from('sell_requests')
      .update(updateData)
      .eq('id', requestId);

    if (updateError) {
      console.error('[CANCEL SELL REQUEST] ❌ Update error:', updateError);
      console.error('[CANCEL SELL REQUEST] ❌ Error details:', {
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint
      });
      return c.json({ error: 'Talep iptal edilemedi', details: updateError.message }, 500);
    }

    console.log(`[CANCEL SELL REQUEST] ✅ Request ${requestId} cancelled successfully by user ${user.email}`);
    return c.json({ 
      success: true, 
      message: 'Satış talebi başarıyla iptal edildi',
      requestId 
    });

  } catch (error) {
    console.error('[CANCEL SELL REQUEST] Unexpected error:', error);
    return c.json({ error: 'Internal server error', details: String(error) }, 500);
  }
});

// DELETE /make-server-0f4d2485/user-sell-requests/clear-history - Tamamlanmış/iptal edilmiş talepleri sil
app.delete('/clear-history', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized - please login' }, 401);
    }

    const supabase = getSupabaseClient();

    // Kullanıcının customer kaydını bul
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', user.email)
      .single();

    if (customerError || !customer) {
      return c.json({ error: 'Müşteri kaydı bulunamadı' }, 404);
    }

    console.log(`[CLEAR SELL REQUEST HISTORY] User ${user.email} (customer ${customer.id}) clearing history`);

    // Silinebilir durumları belirle (accepted, rejected, cancelled, completed)
    const deletableStatuses = ['accepted', 'rejected', 'cancelled', 'completed'];

    // İlgili talepleri bul
    const { data: requestsToDelete, error: fetchError } = await supabase
      .from('sell_requests')
      .select('id, status')
      .eq('customer_id', customer.id)
      .in('status', deletableStatuses);

    if (fetchError) {
      console.error('[CLEAR SELL REQUEST HISTORY] Fetch error:', fetchError);
      return c.json({ error: 'Talepler getirilemedi', details: fetchError.message }, 500);
    }

    const requestIds = (requestsToDelete || []).map(r => r.id);

    if (requestIds.length === 0) {
      console.log('[CLEAR SELL REQUEST HISTORY] No requests to delete');
      return c.json({ success: true, deletedCount: 0, message: 'Silinecek talep bulunamadı' });
    }

    console.log(`[CLEAR SELL REQUEST HISTORY] Deleting ${requestIds.length} requests:`, requestIds);

    // İlgili resimleri sil
    const { error: imagesDeleteError } = await supabase
      .from('sell_request_images')
      .delete()
      .in('sell_request_id', requestIds);

    if (imagesDeleteError) {
      console.error('[CLEAR SELL REQUEST HISTORY] Error deleting images:', imagesDeleteError);
      // Devam et, resimler silinmese bile talepleri silelim
    }

    // Talepleri sil
    const { error: deleteError } = await supabase
      .from('sell_requests')
      .delete()
      .in('id', requestIds);

    if (deleteError) {
      console.error('[CLEAR SELL REQUEST HISTORY] Delete error:', deleteError);
      return c.json({ error: 'Talepler silinemedi', details: deleteError.message }, 500);
    }

    console.log(`[CLEAR SELL REQUEST HISTORY] ✅ Successfully deleted ${requestIds.length} requests`);
    return c.json({ 
      success: true, 
      deletedCount: requestIds.length,
      message: `${requestIds.length} satış talebi başarıyla silindi` 
    });

  } catch (error) {
    console.error('[CLEAR SELL REQUEST HISTORY] Unexpected error:', error);
    return c.json({ error: 'Internal server error', details: String(error) }, 500);
  }
});

export default app;