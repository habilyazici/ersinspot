import { Hono } from 'npm:hono';
import { cors } from 'npm:hono/cors';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import * as kv from './kv_store.tsx';

const app = new Hono();

// Enable CORS
app.use('/*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
}));

// Supabase client
const getSupabaseClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
};

// Storage bucket name for moving images
const MOVING_IMAGES_BUCKET = 'make-0f4d2485-moving';

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

// ========================================
// KULLANICI ENDPOİNTLERİ
// ========================================

// POST /make-server-0f4d2485/moving/upload-image - Nakliye fotoğrafı yükle
app.post('/upload-image', async (c) => {
  try {
    const body = await c.req.json();
    const { image, filename } = body;
    
    if (!image) {
      return c.json({ error: 'No image provided' }, 400);
    }
    
    console.log('[MOVING UPLOAD] Uploading image:', filename);
    
    // Base64 string'i decode et
    let base64Data: string;
    
    // Data URL formatında mı kontrol et (data:image/jpeg;base64,...)
    if (image.includes(',')) {
      const parts = image.split(',');
      if (parts.length !== 2) {
        console.error('[MOVING UPLOAD] Invalid base64 format - multiple commas');
        return c.json({ error: 'Invalid image format' }, 400);
      }
      base64Data = parts[1];
    } else {
      base64Data = image;
    }
    
    // Base64 string'i temizle (whitespace ve newline karakterlerini kaldır)
    base64Data = base64Data.replace(/\s/g, '');
    
    // Base64 geçerlilik kontrolü
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
      console.error('[MOVING UPLOAD] Invalid base64 characters detected');
      return c.json({ error: 'Invalid base64 encoding' }, 400);
    }
    
    // Decode işlemi
    let binaryData: Uint8Array;
    try {
      const decodedString = atob(base64Data);
      binaryData = Uint8Array.from(decodedString, c => c.charCodeAt(0));
    } catch (decodeError: any) {
      console.error('[MOVING UPLOAD] Base64 decode error:', decodeError.message);
      return c.json({ error: 'Failed to decode base64', details: decodeError.message }, 400);
    }
    
    const supabase = getSupabaseClient();
    
    // Unique filename oluştur
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileExt = filename?.split('.').pop() || 'jpg';
    const uniqueFilename = `${timestamp}-${randomStr}.${fileExt}`;
    
    // Supabase Storage'a yükle
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(MOVING_IMAGES_BUCKET)
      .upload(uniqueFilename, binaryData, {
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        upsert: false
      });
    
    if (uploadError) {
      console.error('[MOVING UPLOAD] Upload error:', uploadError);
      return c.json({ error: uploadError.message }, 500);
    }
    
    // Public URL oluştur
    const { data: { publicUrl } } = supabase.storage
      .from(MOVING_IMAGES_BUCKET)
      .getPublicUrl(uniqueFilename);
    
    console.log('[MOVING UPLOAD] ✅ Image uploaded:', publicUrl);
    
    return c.json({ 
      success: true, 
      url: publicUrl,
      filename: uniqueFilename
    });
  } catch (err: any) {
    console.error('[MOVING UPLOAD] Exception:', err);
    return c.json({ error: 'Internal server error', details: err.message }, 500);
  }
});

// POST /make-server-0f4d2485/moving/request - Nakliye talebi oluştur
app.post('/request', async (c) => {
  try {
    console.log('[MOVING REQUEST] 🔵 Creating moving request...');
    
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      console.log('[MOVING REQUEST] ❌ Unauthorized');
      return c.json({ error: 'Unauthorized - please login' }, 401);
    }

    console.log('[MOVING REQUEST] ✅ User verified:', user.email);

    const body = await c.req.json();
    console.log('[MOVING REQUEST] 📥 Request body:', body);

    const {
      fromAddress,
      fromCity,
      fromDistrict,
      toAddress,
      toCity,
      toDistrict,
      movingDate,
      preferredTime,
      homeSize,
      floor,
      targetFloor,
      elevatorFrom,
      elevatorTo,
      items,
      description,
      estimatedPrice,
      distance,
      photos
    } = body;

    const supabase = getSupabaseClient();

    // Kullanıcının customer kaydını bul
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', user.email)
      .single();

    if (customerError || !customer) {
      console.log('[MOVING REQUEST] ❌ Customer not found');
      return c.json({ error: 'Customer not found' }, 404);
    }

    // Request number oluştur
    const requestNumber = `MR-${Date.now().toString().slice(-8)}`;

    // Nakliye talebini oluştur
    const { data: movingRequest, error: requestError } = await supabase
      .from('moving_requests')
      .insert({
        request_number: requestNumber,
        customer_id: customer.id,
        user_id: user.id,
        from_address: fromAddress,
        from_city: fromCity,
        from_district: fromDistrict,
        to_address: toAddress,
        to_city: toCity,
        to_district: toDistrict,
        moving_date: movingDate,
        preferred_time: preferredTime || null,
        home_size: homeSize,
        floor: floor,
        target_floor: targetFloor,
        elevator_from: elevatorFrom,
        elevator_to: elevatorTo,
        description: description,
        estimated_price: estimatedPrice,
        distance: distance,
        status: 'reviewing'
      })
      .select()
      .single();

    if (requestError) {
      console.error('[MOVING REQUEST] Error creating request:', requestError);
      
      // Tablo yoksa SQL komutlarını göster
      if (requestError.code === 'PGRST204' || requestError.code === '42P01') {
        return c.json({ 
          error: 'Table not found - moving_requests table does not exist',
          message: 'Please create the moving_requests tables in Supabase',
          hint: 'Go to Supabase Dashboard → SQL Editor and run the SQL commands',
          details: requestError.message,
          code: requestError.code,
          sql_commands: `
-- Run this SQL in Supabase Dashboard → SQL Editor:

-- 1. Nakliye Talepleri Tablosu
CREATE TABLE IF NOT EXISTS moving_requests (
  id BIGSERIAL PRIMARY KEY,
  request_number TEXT UNIQUE NOT NULL,
  customer_id BIGINT REFERENCES customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Adres Bilgileri
  from_address TEXT NOT NULL,
  from_city TEXT,
  from_district TEXT,
  to_address TEXT NOT NULL,
  to_city TEXT,
  to_district TEXT,
  
  -- Taşınma Detayları
  moving_date DATE NOT NULL,
  preferred_time TIME, -- Tercih edilen saat
  home_size TEXT NOT NULL, -- '1+1', '2+1', '3+1', vs.
  floor INTEGER DEFAULT 0,
  target_floor INTEGER DEFAULT 0,
  elevator_from BOOLEAN DEFAULT false,
  elevator_to BOOLEAN DEFAULT false,
  
  -- Ek Bilgiler
  description TEXT,
  estimated_price DECIMAL(10, 2),
  distance DECIMAL(10, 2), -- KM cinsinden
  
  -- Durum ve Fiyatlandırma
  status TEXT DEFAULT 'reviewing', -- 'reviewing', 'offer_sent', 'accepted', 'rejected', 'completed', 'cancelled'
  admin_price DECIMAL(10, 2),
  admin_notes TEXT,
  rejection_reason TEXT,
  
  -- Zaman Damgaları
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 2. Nakliye Eşyaları Tablosu
CREATE TABLE IF NOT EXISTS moving_request_items (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT REFERENCES moving_requests(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  item_type TEXT DEFAULT 'furniture', -- 'furniture', 'custom'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Nakliye Fotoğrafları Tablosu
CREATE TABLE IF NOT EXISTS moving_request_photos (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT REFERENCES moving_requests(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  file_path TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_moving_requests_customer_id ON moving_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_moving_requests_status ON moving_requests(status);
CREATE INDEX IF NOT EXISTS idx_moving_request_items_request_id ON moving_request_items(request_id);
CREATE INDEX IF NOT EXISTS idx_moving_request_photos_request_id ON moving_request_photos(request_id);

-- Row Level Security (RLS) Politikaları
ALTER TABLE moving_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE moving_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE moving_request_photos ENABLE ROW LEVEL SECURITY;

-- Service role her şeye erişebilir (backend için)
CREATE POLICY "Service role can do everything on moving_requests" ON moving_requests FOR ALL USING (true);
CREATE POLICY "Service role can do everything on moving_request_items" ON moving_request_items FOR ALL USING (true);
CREATE POLICY "Service role can do everything on moving_request_photos" ON moving_request_photos FOR ALL USING (true);
          `
        }, 500);
      }
      
      return c.json({ error: 'Failed to create moving request', details: requestError.message }, 500);
    }

    console.log('[MOVING REQUEST] ✅ Request created:', movingRequest);

    // Eşyaları ekle
    if (items && items.length > 0) {
      const itemsToInsert = items.map((item: any) => ({
        request_id: movingRequest.id,
        item_name: item.name,
        quantity: item.quantity,
        item_type: item.type || 'furniture'
      }));

      const { error: itemsError } = await supabase
        .from('moving_request_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('[MOVING REQUEST] Warning: Items insert failed:', itemsError);
      } else {
        console.log('[MOVING REQUEST] ✅ Items added:', items.length);
      }
    }

    // 📸 Fotoğrafları Supabase Storage'a yükle
    if (photos && photos.length > 0) {
      console.log('[MOVING REQUEST] 📸 Uploading photos:', photos.length);
      
      // Bucket var mı kontrol et, yoksa oluştur
      const bucketName = 'make-0f4d2485-moving-photos';
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
      
      if (!bucketExists) {
        await supabase.storage.createBucket(bucketName, {
          public: false,
          fileSizeLimit: 10485760, // 10MB
        });
        console.log('[MOVING REQUEST] ✅ Bucket created:', bucketName);
      }

      const photoUrls: string[] = [];

      for (let i = 0; i < photos.length; i++) {
        const photoBase64 = photos[i];
        
        // Base64'ten binary'ye çevir
        const base64Data = photoBase64.split(',')[1];
        const mimeType = photoBase64.split(',')[0].split(':')[1].split(';')[0];
        const extension = mimeType.split('/')[1];
        
        const buffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        
        // Dosya adı oluştur
        const fileName = `${movingRequest.id}_${Date.now()}_${i}.${extension}`;
        const filePath = `${fileName}`;

        // Storage'a yükle
        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(filePath, buffer, {
            contentType: mimeType,
            upsert: false
          });

        if (uploadError) {
          console.error('[MOVING REQUEST] Photo upload error:', uploadError);
          continue;
        }

        // Signed URL oluştur (7 gün geçerli)
        const { data: signedUrlData } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 yıl

        if (signedUrlData) {
          photoUrls.push(signedUrlData.signedUrl);
          
          // Veritabanına photo kaydı ekle
          await supabase.from('moving_request_photos').insert({
            request_id: movingRequest.id,
            photo_url: signedUrlData.signedUrl,
            file_path: filePath
          });
        }
      }

      console.log('[MOVING REQUEST] ✅ Photos uploaded:', photoUrls.length);
    }

    return c.json({
      success: true,
      requestNumber: requestNumber,
      requestId: movingRequest.id
    });

  } catch (error: any) {
    console.error('[MOVING REQUEST] ❌ Exception:', error);
    return c.json({ error: 'Internal server error', details: String(error) }, 500);
  }
});

// GET /make-server-0f4d2485/moving/my-requests - Kullanıcının nakliye taleplerini getir
app.get('/my-requests', async (c) => {
  try {
    console.log('[MOVING MY-REQUESTS] 📥 Fetching user requests...');
    
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      console.log('[MOVING MY-REQUESTS] ❌ Unauthorized');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log('[MOVING MY-REQUESTS] ✅ User verified:', user.email);

    const supabase = getSupabaseClient();

    // Kullanıcının customer bilgilerini al
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('email', user.email)
      .single();

    if (customerError || !customer) {
      console.error('[MOVING MY-REQUESTS] Customer not found:', user.email);
      return c.json({ requests: [] });
    }

    // Postgres'ten nakliye taleplerini al
    const { data: postgresRequests } = await supabase
      .from('moving_requests')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    // KV Store'dan tüm nakliye taleplerini al
    const kvRequests = await kv.getByPrefix('moving_request:');
    
    // Kullanıcının KV taleplerini filtrele
    const userKvRequests = kvRequests.filter((req: any) => req.customerId === customer.id);

    console.log('[MOVING MY-REQUESTS] 📊 Postgres:', postgresRequests?.length || 0, 'KV Store:', userKvRequests.length);

    // Her iki kaynaktan da talepleri birleştir
    const allUserRequests = [];

    // Postgres taleplerini formatla ve ekle
    if (postgresRequests) {
      for (const req of postgresRequests) {
        console.log('[MY-REQUESTS] 🔍 Processing Postgres request:', {
          request_number: req.request_number,
          admin_price: req.admin_price,
          status: req.status
        });
        
        // Eşyaları getir
        const { data: items } = await supabase
          .from('moving_request_items')
          .select('*')
          .eq('request_id', req.id);
        
        // Fotoğrafları getir
        const { data: photos } = await supabase
          .from('moving_request_photos')
          .select('*')
          .eq('request_id', req.id);
        
        allUserRequests.push({
          id: req.id,
          request_number: req.request_number,
          requestNumber: req.request_number,
          customer_id: req.customer_id,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          from_address: req.from_address,
          from_floor: req.floor,
          from_has_elevator: req.elevator_from,
          to_address: req.to_address,
          to_floor: req.target_floor,
          to_has_elevator: req.elevator_to,
          home_size: req.home_size,
          selected_items: (items || []).filter((item: any) => item.item_type === 'furniture'),
          custom_items: (items || []).filter((item: any) => item.item_type === 'custom'),
          images: photos || [],
          moving_date: req.moving_date,
          appointment_date: req.moving_date,
          preferred_time: req.preferred_time || '',
          appointment_time: req.preferred_time || '',
          notes: req.description || '',
          calculated_price: req.estimated_price,
          estimated_price: req.estimated_price,
          distance: req.distance,
          status: req.status,
          created_at: req.created_at,
          createdAt: req.created_at,
          admin_price: req.admin_price,  // ✅ PRIMARY - Database'deki gerçek kolon adı
          admin_offer: req.admin_price,  // Backward compatibility
          admin_offer_price: req.admin_price,  // Backward compatibility
          admin_notes: req.admin_notes || '',
          source: 'postgres'
        });
      }
    }

    // KV Store items dönüştürme fonksiyonu
    const convertItemsToObjects = (items: any[]) => {
      if (!items || items.length === 0) return [];
      if (typeof items[0] === 'object' && items[0].item_name) return items;
      return items.map((item: any) => ({
        item_name: typeof item === 'string' ? item : item.name || item.item_name,
        quantity: typeof item === 'object' ? (item.quantity || 1) : 1,
        item_type: typeof item === 'object' ? item.item_type : 'furniture'
      }));
    };

    // KV taleplerini formatla ve ekle
    for (const req of userKvRequests) {
      const selectedItemsConverted = convertItemsToObjects(req.selectedItems || []);
      const customItemsConverted = convertItemsToObjects(req.customItems || []);
      
      allUserRequests.push({
        id: req.requestNumber,
        request_number: req.requestNumber,
        requestNumber: req.requestNumber,
        customer_id: req.customerId,
        customer_name: req.customerName,
        customer_email: req.customerEmail,
        customer_phone: req.customerPhone,
        from_address: req.fromAddress,
        from_floor: req.fromFloor,
        from_has_elevator: req.fromHasElevator,
        to_address: req.toAddress,
        to_floor: req.toFloor,
        to_has_elevator: req.toHasElevator,
        home_size: req.homeSize,
        selected_items: selectedItemsConverted,
        custom_items: customItemsConverted,
        images: req.images,
        moving_date: req.appointmentDate,
        appointment_date: req.appointmentDate,
        preferred_time: req.appointmentTime,
        appointment_time: req.appointmentTime,
        notes: req.notes,
        calculated_price: req.calculatedPrice,
        estimated_price: req.calculatedPrice, // Frontend uyumluluğu için
        distance: req.distance,
        status: req.status,
        created_at: req.createdAt,
        createdAt: req.createdAt,
        admin_offer: req.adminOffer,
        admin_offer_price: req.adminOffer,
        admin_notes: req.adminNote,
        source: 'kv'
      });
    }

    // Tarihe göre sırala (yeniden eskiye)
    const userRequests = allUserRequests.sort((a: any, b: any) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    console.log('[MOVING MY-REQUESTS] ✅ Total requests:', userRequests.length);

    return c.json({ 
      success: true,
      requests: userRequests 
    });

  } catch (error: any) {
    console.error('[MOVING MY-REQUESTS] ❌ Exception:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// GET /make-server-0f4d2485/moving/request/:requestNumber - Tek bir nakliye talebini getir
app.get('/request/:requestNumber', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      console.log('[MOVING REQUEST DETAIL] ❌ Unauthorized');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const requestNumber = c.req.param('requestNumber');
    console.log('[MOVING REQUEST DETAIL] 📥 Fetching request:', requestNumber);

    const supabase = getSupabaseClient();

    // Kullanıcının customer bilgilerini al
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('email', user.email)
      .single();

    if (customerError || !customer) {
      console.error('[MOVING REQUEST DETAIL] Customer not found:', user.email);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Önce Postgres'ten talebi bul
    const { data: movingRequest, error: requestError } = await supabase
      .from('moving_requests')
      .select('*')
      .eq('request_number', requestNumber)
      .eq('customer_id', customer.id)
      .single();

    let request = null;

    if (movingRequest && !requestError) {
      console.log('[MOVING REQUEST DETAIL] ✅ Found in Postgres');
      
      // Eşyaları getir
      const { data: items } = await supabase
        .from('moving_request_items')
        .select('*')
        .eq('request_id', movingRequest.id);
      
      // Fotoğrafları getir
      const { data: photos } = await supabase
        .from('moving_request_photos')
        .select('*')
        .eq('request_id', movingRequest.id);

      // Postgres verisini frontend formatına çevir
      request = {
        requestNumber: movingRequest.request_number,
        customerId: movingRequest.customer_id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerPhone: customer.phone,
        fromAddress: movingRequest.from_address,
        fromCity: movingRequest.from_city || '',
        fromDistrict: movingRequest.from_district || '',
        fromFloor: movingRequest.floor || 0,
        fromHasElevator: movingRequest.elevator_from || false,
        toAddress: movingRequest.to_address,
        toCity: movingRequest.to_city || '',
        toDistrict: movingRequest.to_district || '',
        toFloor: movingRequest.target_floor || 0,
        toHasElevator: movingRequest.elevator_to || false,
        homeSize: movingRequest.home_size,
        appointmentDate: movingRequest.moving_date,
        appointmentTime: movingRequest.preferred_time || '',
        notes: movingRequest.description || '',
        calculatedPrice: movingRequest.estimated_price || 0,
        distance: movingRequest.distance || 0,
        status: movingRequest.status,
        createdAt: movingRequest.created_at,
        updatedAt: movingRequest.updated_at,
        adminOffer: movingRequest.admin_price || null,
        admin_offer: movingRequest.admin_price || null,
        admin_offer_price: movingRequest.admin_price || null,
        adminNote: movingRequest.admin_notes || '',
        admin_notes: movingRequest.admin_notes || '',
        selectedItems: (items || []).filter((item: any) => item.item_type === 'furniture'),
        customItems: (items || []).filter((item: any) => item.item_type === 'custom'),
        images: photos || [],
        updates: [],
      };
    } else {
      // Postgres'te yoksa KV Store'dan dene
      console.log('[MOVING REQUEST DETAIL] Not in Postgres, checking KV Store...');
      request = await kv.get(`moving_request:${requestNumber}`);
      
      if (!request) {
        console.error('[MOVING REQUEST DETAIL] Request not found:', requestNumber);
        return c.json({ error: 'Request not found' }, 404);
      }

      // Talebin bu kullanıcıya ait olup olmadığını kontrol et
      if (request.customerId !== customer.id) {
        console.error('[MOVING REQUEST DETAIL] Unauthorized access attempt');
        return c.json({ error: 'Unauthorized' }, 401);
      }
      
      console.log('[MOVING REQUEST DETAIL] ✅ Found in KV Store');
    }

    console.log('[MOVING REQUEST DETAIL] ✅ Request data prepared');

    // KV Store'daki items string array ise object array'e dönüştür
    const convertItemsToObjects = (items: any[]) => {
      if (!items || items.length === 0) return [];
      
      // Eğer zaten object ise (item_name property'si varsa) olduğu gibi dön
      if (typeof items[0] === 'object' && items[0].item_name) {
        return items;
      }
      
      // String array ise object array'e çevir
      return items.map((item: any) => ({
        item_name: typeof item === 'string' ? item : item.name || item.item_name,
        quantity: typeof item === 'object' ? (item.quantity || 1) : 1,
        item_type: typeof item === 'object' ? item.item_type : 'furniture'
      }));
    };

    const selectedItemsConverted = convertItemsToObjects(request.selectedItems || []);
    const customItemsConverted = convertItemsToObjects(request.customItems || []);

    // Veriyi frontend formatına çevir
    const formattedRequest = {
      id: request.requestNumber,
      request_number: request.requestNumber,
      requestNumber: request.requestNumber,
      customer_id: request.customerId,
      customer_name: request.customerName,
      customer_email: request.customerEmail,
      customer_phone: request.customerPhone,
      
      // Adres bilgileri
      from_address: request.fromAddress,
      from_district: request.fromDistrict || '',
      from_city: request.fromCity || '',
      from_floor: request.fromFloor,
      floor: request.fromFloor, // Frontend'de floor olarak kullanılıyor
      from_has_elevator: request.fromHasElevator,
      elevator_from: request.fromHasElevator, // Frontend'de elevator_from olarak kullanılıyor
      
      to_address: request.toAddress,
      to_district: request.toDistrict || '',
      to_city: request.toCity || '',
      to_floor: request.toFloor,
      target_floor: request.toFloor, // Frontend'de target_floor olarak kullanılıyor
      to_has_elevator: request.toHasElevator,
      elevator_to: request.toHasElevator, // Frontend'de elevator_to olarak kullanılıyor
      
      home_size: request.homeSize,
      selected_items: selectedItemsConverted,
      custom_items: customItemsConverted,
      items: [...selectedItemsConverted, ...customItemsConverted], // Tüm items birleşik
      images: request.images || [],
      photos: request.images || [], // Frontend'de photos olarak kullanılıyor
      
      moving_date: request.appointmentDate,
      appointment_date: request.appointmentDate,
      preferred_time: request.appointmentTime,
      appointment_time: request.appointmentTime,
      
      notes: request.notes || '',
      description: request.notes || '', // Frontend'de description olarak kullanılıyor
      
      calculated_price: request.calculatedPrice,
      estimated_price: request.calculatedPrice, // Frontend'de estimated_price olarak kullanılıyor
      distance: request.distance,
      
      status: request.status,
      created_at: request.createdAt,
      createdAt: request.createdAt,
      updated_at: request.updatedAt || request.createdAt,
      updatedAt: request.updatedAt || request.createdAt,
      
      admin_offer: request.adminOffer,
      admin_offer_price: request.adminOffer, // Frontend'de admin_offer_price olarak kullanılıyor
      admin_note: request.adminNote || '',
      admin_notes: request.adminNote || '', // Frontend'de admin_notes olarak kullanılıyor
      
      updates: request.updates || [],
      
      // Müşteri objesi
      customer: {
        id: customer.id,
        name: customer.name || request.customerName,
        email: customer.email || request.customerEmail,
        phone: customer.phone || request.customerPhone,
      }
    };

    return c.json({ 
      success: true,
      request: formattedRequest 
    });

  } catch (err: any) {
    console.error('[MOVING REQUEST DETAIL] ❌ Exception:', err);
    return c.json({ error: 'Internal server error', details: err.message }, 500);
  }
});

// POST /make-server-0f4d2485/moving/respond - Teklifi kabul/red et
app.post('/respond', async (c) => {
  try {
    console.log('[MOVING RESPOND] 🔵 Processing response...');
    
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      console.log('[MOVING RESPOND] ❌ Unauthorized');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { requestNumber, action } = body; // action: 'accept' | 'reject'

    console.log('[MOVING RESPOND] 📝 Request:', requestNumber, 'Action:', action);

    if (!requestNumber || !action) {
      return c.json({ error: 'Missing requestNumber or action' }, 400);
    }

    // KV Store'dan talebi al
    const request = await kv.get(`moving_request:${requestNumber}`);
    
    if (!request) {
      console.error('[MOVING RESPOND] Request not found:', requestNumber);
      return c.json({ error: 'Request not found' }, 404);
    }

    const supabase = getSupabaseClient();

    // Kullanıcının customer kaydını kontrol et
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', user.email)
      .single();

    if (customerError || !customer) {
      console.error('[MOVING RESPOND] Customer not found:', user.email);
      return c.json({ error: 'Customer not found' }, 404);
    }

    // Talebin bu kullanıcıya ait olduğunu doğrula
    if (request.customerId !== customer.id) {
      console.error('[MOVING RESPOND] Unauthorized access attempt');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Status kontrolü - sadece offer_sent durumunda yanıt verilebilir
    if (request.status !== 'offer_sent') {
      return c.json({ error: 'Request is not in offer_sent status' }, 400);
    }

    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    // Talebi güncelle
    const updatedRequest = {
      ...request,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };

    await kv.set(`moving_request:${requestNumber}`, updatedRequest);

    console.log(`[MOVING RESPOND] ✅ Request ${requestNumber} ${newStatus}`);

    return c.json({ 
      success: true, 
      status: newStatus 
    });

  } catch (error: any) {
    console.error('[MOVING RESPOND] ❌ Exception:', error);
    return c.json({ error: 'Internal server error', details: String(error) }, 500);
  }
});

// POST /make-server-0f4d2485/moving/:requestNumber/respond - Teklifi kabul/reddet
app.post('/:requestNumber/respond', async (c) => {
  try {
    console.log('[MOVING RESPOND USER] 🔵 Processing user response...');
    
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      console.log('[MOVING RESPOND USER] ❌ Unauthorized');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const requestNumber = c.req.param('requestNumber');
    const { action } = await c.req.json();
    
    console.log('[MOVING RESPOND USER] 📥 Request number:', requestNumber, 'Action:', action);

    if (!action || (action !== 'accept' && action !== 'reject')) {
      return c.json({ error: 'Invalid action. Must be "accept" or "reject"' }, 400);
    }

    const supabase = getSupabaseClient();

    // Kullanıcının customer bilgilerini al
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('email', user.email)
      .single();

    if (customerError || !customer) {
      console.error('[MOVING RESPOND USER] Customer not found:', user.email);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Önce Postgres'te var mı kontrol et
    const { data: pgRequest, error: pgError } = await supabase
      .from('moving_requests')
      .select('*')
      .eq('request_number', requestNumber)
      .eq('customer_id', customer.id)
      .single();

    if (pgRequest && !pgError) {
      // Postgres'te varsa
      console.log('[MOVING RESPOND USER] Found in Postgres');

      // Durumunu kontrol et - sadece offer_sent ise işlem yapılabilir
      if (pgRequest.status !== 'offer_sent') {
        console.error('[MOVING RESPOND USER] Cannot respond to request with status:', pgRequest.status);
        return c.json({ error: 'Bu talep için işlem yapılamaz' }, 400);
      }

      const newStatus = action === 'accept' ? 'accepted' : 'rejected';

      // Güncelle
      const { error: updateError } = await supabase
        .from('moving_requests')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('request_number', requestNumber);

      if (updateError) {
        console.error('[MOVING RESPOND USER] ❌ Update error:', updateError);
        return c.json({ error: 'Failed to update request' }, 500);
      }

      console.log('[MOVING RESPOND USER] ✅ Request updated (Postgres)');
      return c.json({ 
        success: true,
        status: newStatus,
        message: action === 'accept' ? 'Teklif kabul edildi' : 'Teklif reddedildi'
      });
    }

    // Postgres'te yoksa KV Store'da ara (eski randevular için)
    console.log('[MOVING RESPOND USER] Not in Postgres, checking KV Store...');
    
    const kvRequest = await kv.get(`moving_request:${requestNumber}`);
    
    if (!kvRequest) {
      console.error('[MOVING RESPOND USER] Request not found in KV Store either:', requestNumber);
      return c.json({ error: 'Request not found' }, 404);
    }
    
    console.log('[MOVING RESPOND USER] Found in KV Store');
    
    // Kullanıcının bu randevuya erişim yetkisi var mı kontrol et
    if (kvRequest.customerId !== customer.id) {
      console.error('[MOVING RESPOND USER] Unauthorized: customer mismatch');
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Durumunu kontrol et - sadece offer_sent ise işlem yapılabilir
    if (kvRequest.status !== 'offer_sent') {
      console.error('[MOVING RESPOND USER] Cannot respond to request with status:', kvRequest.status);
      return c.json({ error: 'Bu talep için işlem yapılamaz' }, 400);
    }
    
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';
    
    // KV Store'da güncelle
    const updatedRequest = {
      ...kvRequest,
      status: newStatus,
      updatedAt: new Date().toISOString()
    };
    
    await kv.set(`moving_request:${requestNumber}`, updatedRequest);
    
    console.log('[MOVING RESPOND USER] ✅ Request updated (KV Store)');
    return c.json({ 
      success: true,
      status: newStatus,
      message: action === 'accept' ? 'Teklif kabul edildi' : 'Teklif reddedildi'
    });

  } catch (error: any) {
    console.error('[MOVING RESPOND USER] ❌ Exception:', error);
    return c.json({ error: 'Internal server error', details: String(error) }, 500);
  }
});

// PUT /make-server-0f4d2485/moving/:requestNumber/cancel - Nakliye talebini iptal et
app.put('/:requestNumber/cancel', async (c) => {
  try {
    console.log('[MOVING CANCEL] 🔵 Cancelling request...');
    
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      console.log('[MOVING CANCEL] ❌ Unauthorized');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const requestNumber = c.req.param('requestNumber');
    console.log('[MOVING CANCEL] 📥 Canceling request:', requestNumber);

    const supabase = getSupabaseClient();

    // Kullanıcının customer bilgilerini al
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('email', user.email)
      .single();

    if (customerError || !customer) {
      console.error('[MOVING CANCEL] Customer not found:', user.email);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Önce Postgres'te var mı kontrol et
    const { data: pgRequest, error: pgError } = await supabase
      .from('moving_requests')
      .select('*')
      .eq('request_number', requestNumber)
      .eq('customer_id', customer.id)
      .single();

    if (pgRequest && !pgError) {
      // Postgres'te varsa
      console.log('[MOVING CANCEL] Found in Postgres');

      // Durumunu kontrol et
      if (pgRequest.status !== 'pending' && pgRequest.status !== 'reviewing' && pgRequest.status !== 'offer_sent') {
        console.error('[MOVING CANCEL] Cannot cancel request with status:', pgRequest.status);
        return c.json({ error: 'Bu talep iptal edilemez' }, 400);
      }

      // Güncelle
      const { error: updateError } = await supabase
        .from('moving_requests')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString()
        })
        .eq('request_number', requestNumber);

      if (updateError) {
        console.error('[MOVING CANCEL] ❌ Update error:', updateError);
        return c.json({ error: 'Failed to cancel request' }, 500);
      }

      console.log('[MOVING CANCEL] ✅ Request canceled (Postgres)');
      return c.json({ 
        success: true,
        message: 'Talep başarıyla iptal edildi' 
      });
    }

    // Postgres'te yoksa KV Store'dan dene
    console.log('[MOVING CANCEL] Checking KV Store...');
    const kvRequest = await kv.get(`moving_request:${requestNumber}`);
    
    if (!kvRequest) {
      console.error('[MOVING CANCEL] Request not found:', requestNumber);
      return c.json({ error: 'Request not found' }, 404);
    }

    // Talebin bu kullanıcıya ait olup olmadığını kontrol et
    if (kvRequest.customerId !== customer.id) {
      console.error('[MOVING CANCEL] Unauthorized access attempt');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Durumunu kontrol et
    if (kvRequest.status !== 'pending' && kvRequest.status !== 'reviewing' && kvRequest.status !== 'offer_sent') {
      console.error('[MOVING CANCEL] Cannot cancel request with status:', kvRequest.status);
      return c.json({ error: 'Bu talep iptal edilemez' }, 400);
    }

    // KV'de güncelle
    const updatedRequest = {
      ...kvRequest,
      status: 'rejected',
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`moving_request:${requestNumber}`, updatedRequest);
    
    console.log('[MOVING CANCEL] ✅ Request canceled (KV Store)');
    return c.json({ 
      success: true,
      message: 'Talep başarıyla iptal edildi' 
    });

  } catch (err: any) {
    console.error('[MOVING CANCEL] ❌ Exception:', err);
    return c.json({ error: 'Internal server error', details: err.message }, 500);
  }
});

// DELETE /make-server-0f4d2485/moving/clear-history - Geçmişi temizle (completed/rejected/cancelled)
app.delete('/clear-history', async (c) => {
  try {
    console.log('[MOVING CLEAR HISTORY] 🔵 Clearing history...');
    
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      console.log('[MOVING CLEAR HISTORY] ❌ Unauthorized');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();

    // Kullanıcının customer kaydını kontrol et
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', user.email)
      .single();

    if (customerError || !customer) {
      console.error('[MOVING CLEAR HISTORY] Customer not found:', user.email);
      return c.json({ error: 'Customer not found' }, 404);
    }

    // KV Store'dan tüm talepleri al
    const allRequests = await kv.getByPrefix('moving_request:');
    
    // Kullanıcının completed, rejected veya cancelled durumundaki taleplerini filtrele
    const requestsToDelete = allRequests.filter((req: any) => 
      req.customerId === customer.id && 
      (req.status === 'completed' || req.status === 'rejected' || req.status === 'cancelled')
    );

    // Talepleri sil
    let deletedCount = 0;
    for (const request of requestsToDelete) {
      await kv.del(`moving_request:${request.requestNumber}`);
      deletedCount++;
    }

    console.log(`[MOVING CLEAR HISTORY] ✅ ${deletedCount} requests cleared`);

    return c.json({ success: true, deletedCount });

  } catch (error: any) {
    console.error('[MOVING CLEAR HISTORY] ❌ Exception:', error);
    return c.json({ error: 'Internal server error', details: String(error) }, 500);
  }
});

// ========================================
// ADMİN ENDPOİNTLERİ
// ========================================

// GET /make-server-0f4d2485/moving/admin/requests - Tüm nakliye taleplerini getir (Admin)
app.get('/admin/requests', async (c) => {
  try {
    console.log('[ADMIN MOVING] 📥 Fetching all moving requests...');
    
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      console.log('[ADMIN MOVING] ❌ Unauthorized');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log('[ADMIN MOVING] ✅ Admin user verified:', user.email);

    const supabase = getSupabaseClient();

    // Postgres'ten tüm nakliye taleplerini al
    const { data: postgresRequests } = await supabase
      .from('moving_requests')
      .select(`
        *,
        items:moving_request_items(*),
        photos:moving_request_photos(*)
      `)
      .order('created_at', { ascending: false });

    // KV Store'dan tüm nakliye taleplerini al
    const kvRequests = await kv.getByPrefix('moving_request:');
    
    console.log('[ADMIN MOVING] 📊 Postgres:', postgresRequests?.length || 0, 'KV Store:', kvRequests.length);

    // Tüm talepleri birleştir
    const allCombinedRequests = [];

    // Postgres'ten talepleri formatla
    if (postgresRequests) {
      for (const req of postgresRequests) {
        allCombinedRequests.push({
          id: req.id,
          request_number: req.request_number,
          requestNumber: req.request_number,
          customer_id: req.customer_id,
          from_address: req.from_address,
          from_floor: req.floor,
          from_has_elevator: req.elevator_from,
          to_address: req.to_address,
          to_floor: req.target_floor,
          to_has_elevator: req.elevator_to,
          home_size: req.home_size,
          selected_items: req.items?.filter((i: any) => i.item_type === 'furniture') || [],
          custom_items: req.items?.filter((i: any) => i.item_type === 'custom') || [],
          images: req.photos || [],
          moving_date: req.moving_date,
          appointment_date: req.moving_date,
          preferred_time: req.preferred_time || '',
          appointment_time: req.preferred_time || '',
          notes: req.description || '',
          calculated_price: req.estimated_price,
          distance: req.distance,
          status: req.status,
          created_at: req.created_at,
          createdAt: req.created_at,
          admin_offer: req.admin_price,  // Database'deki gerçek kolon adı 'admin_price'
          admin_offer_price: req.admin_price,  // Database'deki gerçek kolon adı 'admin_price'
          admin_notes: req.admin_notes || '',
          customerId: req.customer_id,
          source: 'postgres'
        });
      }
    }

    // KV Store items dönüştürme fonksiyonu (admin için)
    const convertItemsToObjects = (items: any[]) => {
      if (!items || items.length === 0) return [];
      if (typeof items[0] === 'object' && items[0].item_name) return items;
      return items.map((item: any) => ({
        item_name: typeof item === 'string' ? item : item.name || item.item_name,
        quantity: typeof item === 'object' ? (item.quantity || 1) : 1,
        item_type: typeof item === 'object' ? item.item_type : 'furniture'
      }));
    };

    // KV'den talepleri ekle
    for (const req of kvRequests) {
      const selectedItemsConverted = convertItemsToObjects(req.selectedItems || []);
      const customItemsConverted = convertItemsToObjects(req.customItems || []);
      
      allCombinedRequests.push({
        id: req.requestNumber,
        request_number: req.requestNumber,
        requestNumber: req.requestNumber,
        customer_id: req.customerId,
        from_address: req.fromAddress,
        from_floor: req.fromFloor,
        from_has_elevator: req.fromHasElevator,
        to_address: req.toAddress,
        to_floor: req.toFloor,
        to_has_elevator: req.toHasElevator,
        home_size: req.homeSize,
        selected_items: selectedItemsConverted,
        custom_items: customItemsConverted,
        images: req.images || [],
        moving_date: req.appointmentDate,
        appointment_date: req.appointmentDate,
        preferred_time: req.appointmentTime || '',
        appointment_time: req.appointmentTime || '',
        notes: req.notes || '',
        calculated_price: req.calculatedPrice,
        estimated_price: req.calculatedPrice, // Frontend uyumluluğu için
        distance: req.distance,
        status: req.status,
        created_at: req.createdAt,
        createdAt: req.createdAt,
        admin_offer: req.adminOffer,
        admin_offer_price: req.adminOffer,
        admin_notes: req.adminNote || '',
        customerId: req.customerId,
        customerName: req.customerName,
        customerEmail: req.customerEmail,
        customerPhone: req.customerPhone,
        source: 'kv'
      });
    }

    // Customer ID'leri topla
    const customerIds = [...new Set(allCombinedRequests.map((req: any) => req.customerId || req.customer_id).filter(Boolean))];
    console.log('[ADMIN MOVING] 👥 Fetching customer details for IDs:', customerIds);
    
    // Müşteri bilgilerini al
    let customers: any[] = [];
    if (customerIds.length > 0) {
      const { data, error: customersError } = await supabase
        .from('customers')
        .select('id, name, email, phone, district')
        .in('id', customerIds);

      if (customersError) {
        console.error('[ADMIN MOVING] Error fetching customers:', customersError);
      } else {
        customers = data || [];
      }
    }

    // Verileri formatla ve birleştir
    const formattedRequests = allCombinedRequests
      .map((req: any) => {
        const customer = customers.find(c => c.id === (req.customerId || req.customer_id));
        
        return {
          id: req.id,
          request_number: req.request_number,
          requestNumber: req.requestNumber,
          customer_id: req.customerId || req.customer_id,
          customer_name: req.customerName || customer?.name || '',
          customer_email: req.customerEmail || customer?.email || '',
          customer_phone: req.customerPhone || customer?.phone || '',
          from_address: req.from_address,
          from_floor: req.from_floor,
          from_has_elevator: req.from_has_elevator,
          to_address: req.to_address,
          to_floor: req.to_floor,
          to_has_elevator: req.to_has_elevator,
          home_size: req.home_size,
          selected_items: req.selected_items,
          custom_items: req.custom_items,
          images: req.images,
          moving_date: req.moving_date,
          appointment_date: req.appointment_date,
          preferred_time: req.preferred_time,
          appointment_time: req.appointment_time,
          notes: req.notes,
          calculated_price: req.calculated_price,
          distance: req.distance,
          status: req.status,
          created_at: req.created_at,
          createdAt: req.createdAt,
          admin_offer: req.admin_offer,
          admin_offer_price: req.admin_offer_price,
          admin_notes: req.admin_notes,
          customer: customer || {
            id: req.customerId || req.customer_id,
            name: req.customerName || '',
            email: req.customerEmail || '',
            phone: req.customerPhone || '',
            district: null
          },
          items: [...(req.selected_items || []), ...(req.custom_items || [])], // Tüm items birleşik
          photos: req.images || [], // Frontend'de photos olarak kullanılıyor
          description: req.notes || '', // Frontend'de description olarak kullanılıyor
          source: req.source
        };
      })
      .sort((a: any, b: any) => {
        // Tarihe göre sırala (yeniden eskiye)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

    console.log('[ADMIN MOVING] ✅ Returning', formattedRequests.length, 'requests');
    return c.json({ requests: formattedRequests });
  } catch (error) {
    console.error('[ADMIN MOVING] ❌ Unexpected error:', error);
    return c.json({ error: 'Internal server error', details: String(error) }, 500);
  }
});

// PATCH /make-server-0f4d2485/moving/admin/requests/:requestNumber/offer - Teklif gönder (Admin)
app.patch('/admin/requests/:requestNumber/offer', async (c) => {
  try {
    console.log('[ADMIN MOVING OFFER] 🔵 Sending offer...');
    
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      console.log('[ADMIN MOVING OFFER] ❌ Unauthorized');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const requestNumber = c.req.param('requestNumber');
    const body = await c.req.json();
    const { offerPrice, adminNotes } = body;

    console.log('[ADMIN MOVING OFFER] 📝 Request:', requestNumber, 'Offer:', offerPrice);

    if (!offerPrice) {
      return c.json({ error: 'Offer price is required' }, 400);
    }

    const supabase = getSupabaseClient();

    // Önce Postgres'te var mı kontrol et
    const { data: pgRequest, error: pgError } = await supabase
      .from('moving_requests')
      .select('*')
      .eq('request_number', requestNumber)
      .single();

    if (pgRequest && !pgError) {
      // Postgres'te varsa orada güncelle
      console.log('[ADMIN MOVING OFFER] Updating in Postgres...');
      
      const { error: updateError } = await supabase
        .from('moving_requests')
        .update({
          admin_price: offerPrice,  // Database'deki gerçek kolon adı 'admin_price'
          admin_notes: adminNotes || null,
          status: 'offer_sent',
          updated_at: new Date().toISOString()
        })
        .eq('request_number', requestNumber);

      if (updateError) {
        console.error('[ADMIN MOVING OFFER] ❌ Update error:', updateError);
        return c.json({ error: 'Failed to update request' }, 500);
      }

      console.log('[ADMIN MOVING OFFER] ✅ Offer sent (Postgres)');
      return c.json({ success: true });
    }

    // Postgres'te yoksa KV Store'dan dene
    console.log('[ADMIN MOVING OFFER] Checking KV Store...');
    const kvRequest = await kv.get(`moving_request:${requestNumber}`);
    
    if (!kvRequest) {
      console.error('[ADMIN MOVING OFFER] ❌ Request not found:', requestNumber);
      return c.json({ error: 'Request not found' }, 404);
    }

    // KV'de güncelle
    const updatedRequest = {
      ...kvRequest,
      adminOffer: offerPrice,
      adminNote: adminNotes || null,
      status: 'offer_sent',
      updatedAt: new Date().toISOString()
    };

    await kv.set(`moving_request:${requestNumber}`, updatedRequest);

    console.log('[ADMIN MOVING OFFER] ✅ Offer sent (KV Store)');
    return c.json({ 
      success: true, 
      request: updatedRequest 
    });

  } catch (error: any) {
    console.error('[ADMIN MOVING OFFER] ❌ Exception:', error);
    return c.json({ error: 'Internal server error', details: String(error) }, 500);
  }
});

// PATCH /make-server-0f4d2485/moving/admin/requests/:requestNumber/status - Status güncelle (Admin)
app.patch('/admin/requests/:requestNumber/status', async (c) => {
  try {
    console.log('[ADMIN MOVING STATUS] 🔵 Updating status...');
    
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      console.log('[ADMIN MOVING STATUS] ❌ Unauthorized');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const requestNumber = c.req.param('requestNumber');
    const body = await c.req.json();
    const { status, adminNotes } = body;

    console.log('[ADMIN MOVING STATUS] 📝 Request:', requestNumber, 'New status:', status);

    if (!status) {
      return c.json({ error: 'Status is required' }, 400);
    }

    // Geçerli status'ler
    const validStatuses = ['pending', 'reviewing', 'offer_sent', 'accepted', 'rejected', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    const supabase = getSupabaseClient();

    // Önce Postgres'te var mı kontrol et
    const { data: pgRequest, error: pgError } = await supabase
      .from('moving_requests')
      .select('*')
      .eq('request_number', requestNumber)
      .single();

    if (pgRequest && !pgError) {
      // Postgres'te varsa orada güncelle
      console.log('[ADMIN MOVING STATUS] Updating in Postgres...');
      
      const updateData: any = {
        status: status,
        updated_at: new Date().toISOString()
      };

      if (adminNotes !== undefined) {
        updateData.admin_notes = adminNotes;
      }

      const { error: updateError } = await supabase
        .from('moving_requests')
        .update(updateData)
        .eq('request_number', requestNumber);

      if (updateError) {
        console.error('[ADMIN MOVING STATUS] ❌ Update error:', updateError);
        return c.json({ error: 'Failed to update status' }, 500);
      }

      console.log('[ADMIN MOVING STATUS] ✅ Status updated (Postgres)');
      return c.json({ success: true });
    }

    // Postgres'te yoksa KV Store'dan dene
    console.log('[ADMIN MOVING STATUS] Checking KV Store...');
    const kvRequest = await kv.get(`moving_request:${requestNumber}`);
    
    if (!kvRequest) {
      console.error('[ADMIN MOVING STATUS] ❌ Request not found:', requestNumber);
      return c.json({ error: 'Request not found' }, 404);
    }

    // KV'de güncelle
    const updatedRequest = {
      ...kvRequest,
      status: status,
      updatedAt: new Date().toISOString()
    };

    if (adminNotes !== undefined) {
      updatedRequest.adminNote = adminNotes;
    }

    await kv.set(`moving_request:${requestNumber}`, updatedRequest);

    console.log('[ADMIN MOVING STATUS] ✅ Status updated (KV Store)');
    return c.json({ 
      success: true, 
      request: updatedRequest 
    });

  } catch (error: any) {
    console.error('[ADMIN MOVING STATUS] ❌ Exception:', error);
    return c.json({ error: 'Internal server error', details: String(error) }, 500);
  }
});

// POST /make-server-0f4d2485/moving/admin/requests/:id/appointment - Randevu oluştur (Admin)
app.post('/admin/requests/:id/appointment', async (c) => {
  try {
    console.log('[ADMIN MOVING APPOINTMENT] 🔵 Creating appointment...');
    
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const requestId = c.req.param('id');
    const body = await c.req.json();
    const { appointmentDate, appointmentTime, notes } = body;

    if (!appointmentDate || !appointmentTime) {
      return c.json({ error: 'Appointment date and time are required' }, 400);
    }

    const supabase = getSupabaseClient();

    // Talebi kontrol et - accepted durumunda olmalı
    const { data: request, error: requestError } = await supabase
      .from('moving_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return c.json({ error: 'Request not found' }, 404);
    }

    if (request.status !== 'accepted') {
      return c.json({ error: 'Request must be accepted before creating appointment' }, 400);
    }

    // Randevu number oluştur
    const appointmentNumber = `MA-${Date.now().toString().slice(-8)}`;

    // Randevu oluştur
    const { data: appointment, error: appointmentError } = await supabase
      .from('moving_appointments')
      .insert({
        appointment_number: appointmentNumber,
        request_id: requestId,
        customer_id: request.customer_id,
        user_id: request.user_id,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        from_address: request.from_address,
        to_address: request.to_address,
        home_size: request.home_size,
        floor: request.floor,
        target_floor: request.target_floor,
        notes: notes || null,
        status: 'scheduled'
      })
      .select()
      .single();

    if (appointmentError) {
      console.error('[ADMIN MOVING APPOINTMENT] Error:', appointmentError);
      return c.json({ error: 'Failed to create appointment', details: appointmentError.message }, 500);
    }

    // Talebin status'unu completed olarak güncelle
    await supabase
      .from('moving_requests')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    console.log('[ADMIN MOVING APPOINTMENT] ✅ Appointment created:', appointment);

    return c.json({ 
      success: true, 
      appointment: appointment 
    });

  } catch (error: any) {
    console.error('[ADMIN MOVING APPOINTMENT] Exception:', error);
    return c.json({ error: 'Internal server error', details: String(error) }, 500);
  }
});

// GET /make-server-0f4d2485/moving/admin/appointments - Tüm randevuları getir (Admin)
app.get('/admin/appointments', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const supabase = getSupabaseClient();

    const { data: appointments, error } = await supabase
      .from('moving_appointments')
      .select(`
        *,
        customer:customers(id, name, email, phone),
        request:moving_requests(id, request_number, admin_price)
      `)
      .order('appointment_date', { ascending: true });

    if (error) {
      console.error('Error fetching moving appointments (admin):', error);
      return c.json({ error: 'Failed to fetch appointments', details: error.message }, 500);
    }

    return c.json({ appointments: appointments || [] });
  } catch (error) {
    console.error('Unexpected error in GET /moving/admin/appointments:', error);
    return c.json({ error: 'Internal server error', details: String(error) }, 500);
  }
});

// PATCH /make-server-0f4d2485/moving/admin/appointments/:id/status - Randevu status güncelle (Admin)
app.patch('/admin/appointments/:id/status', async (c) => {
  try {
    console.log('[ADMIN APPOINTMENT STATUS] 🔵 Updating appointment status...');
    
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const appointmentId = c.req.param('id');
    const body = await c.req.json();
    const { status, notes } = body;

    if (!status) {
      return c.json({ error: 'Status is required' }, 400);
    }

    // Geçerli status'ler
    const validStatuses = ['scheduled', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    const supabase = getSupabaseClient();

    const updateData: any = {
      status: status,
      updated_at: new Date().toISOString()
    };

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const { data: updatedAppointment, error: updateError } = await supabase
      .from('moving_appointments')
      .update(updateData)
      .eq('id', appointmentId)
      .select()
      .single();

    if (updateError) {
      console.error('[ADMIN APPOINTMENT STATUS] Error:', updateError);
      return c.json({ error: 'Failed to update status', details: updateError.message }, 500);
    }

    console.log('[ADMIN APPOINTMENT STATUS] ✅ Status updated:', appointmentId, status);

    return c.json({ 
      success: true, 
      appointment: updatedAppointment 
    });

  } catch (error: any) {
    console.error('[ADMIN APPOINTMENT STATUS] Exception:', error);
    return c.json({ error: 'Internal server error', details: String(error) }, 500);
  }
});

export default app;
