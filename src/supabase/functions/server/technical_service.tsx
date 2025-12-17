import { Hono } from 'npm:hono@4.0.2';
import { cors } from 'npm:hono/cors';
import { createClient } from 'jsr:@supabase/supabase-js@2';

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

// POST /make-server-0f4d2485/technical-service/upload-image - Fotoğraf yükle
app.post('/upload-image', async (c) => {
  try {
    console.log('[TECH SERVICE] 🔵 Uploading image...');
    
    const body = await c.req.json();
    const { image, filename } = body;
    
    if (!image) {
      return c.json({ error: 'No image provided' }, 400);
    }
    
    console.log('[TECH SERVICE UPLOAD] Uploading image:', filename);
    
    const supabase = getSupabaseClient();
    
    // Base64 string'i decode et
    const base64Data = image.split(',')[1] || image;
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // Unique filename oluştur
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileExt = filename?.split('.').pop() || 'jpg';
    const uniqueFilename = `${timestamp}-${randomStr}.${fileExt}`;
    
    // Bucket adı
    const bucketName = 'make-0f4d2485-service-photos';
    
    // Bucket var mı kontrol et
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      const { data: newBucket, error: bucketError } = await supabase.storage.createBucket(bucketName, {
        public: true, // Public olmalı ki fotoğraflar görünsün
        fileSizeLimit: 10485760, // 10MB
      });
      
      if (bucketError) {
        console.error('[TECH SERVICE] ❌ Bucket creation error:', bucketError);
        return c.json({ error: 'Failed to create storage bucket', details: bucketError.message }, 500);
      }
      
      console.log('[TECH SERVICE] ✅ Bucket created successfully:', bucketName);
    } else {
      console.log('[TECH SERVICE] ℹ️ Bucket already exists:', bucketName);
      
      // Bucket'ın public olduğundan emin olmak için güncelle
      try {
        await supabase.storage.updateBucket(bucketName, {
          public: true,
          fileSizeLimit: 10485760,
        });
        console.log('[TECH SERVICE] ✅ Bucket updated to public');
      } catch (updateError) {
        console.log('[TECH SERVICE] ⚠️ Bucket update failed (might already be public):', updateError);
      }
    }
    
    // Supabase Storage'a yükle
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(uniqueFilename, binaryData, {
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        upsert: false
      });
    
    if (uploadError) {
      console.error('[TECH SERVICE UPLOAD] Upload error:', uploadError);
      return c.json({ error: uploadError.message }, 500);
    }
    
    // Public URL oluştur
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(uniqueFilename);
    
    console.log('[TECH SERVICE UPLOAD] ✅ Image uploaded successfully');
    console.log('[TECH SERVICE UPLOAD] 📷 Public URL:', publicUrl);
    console.log('[TECH SERVICE UPLOAD] 📁 Filename:', uniqueFilename);
    
    return c.json({ 
      success: true, 
      url: publicUrl,
      filename: uniqueFilename
    });
  } catch (err: any) {
    console.error('[TECH SERVICE UPLOAD] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// POST /make-server-0f4d2485/technical-service/request - Teknik servis talebi oluştur
app.post('/request', async (c) => {
  try {
    console.log('[TECH SERVICE] 🔵 Creating technical service request...');
    
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      console.log('[TECH SERVICE] ❌ Unauthorized');
      return c.json({ error: 'Unauthorized - please login' }, 401);
    }

    console.log('[TECH SERVICE] ✅ User verified:', user.email);

    const body = await c.req.json();
    console.log('[TECH SERVICE] 📥 Request body received. Product:', body.productType, '| Photos:', body.photos?.length || 0);

    const {
      productType,
      productBrand,
      productModel,
      warrantyStatus,
      problemDescription,
      problemCategory,
      preferredDate,
      preferredTime,
      serviceAddress,
      serviceCity,
      serviceDistrict,
      serviceNeighborhood,
      serviceStreet,
      serviceBuildingNo,
      serviceApartmentNo,
      customerNotes,
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
      console.log('[TECH SERVICE] ❌ Customer not found');
      return c.json({ error: 'Customer not found' }, 404);
    }

    // Request number oluştur
    const requestNumber = `TS-${Date.now().toString().slice(-8)}`;

    // Teknik servis talebini oluştur
    // Adres detaylarını ana adres alanına ekleyelim (schema uyumluluğu ve geriye dönük uyumluluk için)
    let fullAddress = serviceAddress;
    if (serviceNeighborhood) fullAddress += `, Mahalle: ${serviceNeighborhood}`;
    if (serviceStreet) fullAddress += `, Sokak: ${serviceStreet}`;
    if (serviceBuildingNo) fullAddress += `, Bina No: ${serviceBuildingNo}`;
    if (serviceApartmentNo) fullAddress += `, Daire No: ${serviceApartmentNo}`;

    // Önce temel kolonlarla dene
    let serviceRequest;
    let requestError;
    
    try {
      // Tam kolon seti ile deneme (güncel schema)
      const fullInsertData: any = {
        request_number: requestNumber,
        customer_id: customer.id,
        user_id: user.id,
        product_type: productType,
        product_brand: productBrand,
        product_model: productModel,
        warranty_status: warrantyStatus,
        problem_description: problemDescription,
        problem_category: problemCategory,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        service_address: fullAddress,
        service_city: serviceCity,
        service_district: serviceDistrict,
        customer_notes: customerNotes,
        status: 'reviewing'
      };

      // Opsiyonel adres alanlarını ekle
      if (serviceNeighborhood) fullInsertData.service_neighborhood = serviceNeighborhood;
      if (serviceStreet) fullInsertData.service_street = serviceStreet;
      if (serviceBuildingNo) fullInsertData.service_building_no = serviceBuildingNo;
      if (serviceApartmentNo) fullInsertData.service_apartment_no = serviceApartmentNo;

      const result = await supabase
        .from('technical_service_requests')
        .insert(fullInsertData)
        .select()
        .single();
      
      serviceRequest = result.data;
      requestError = result.error;
    } catch (err: any) {
      console.log('[TECH SERVICE] ⚠️ Full schema insert failed, trying minimal:', err.message);
      
      // Minimal kolon seti ile tekrar dene (eski schema uyumluluğu)
      const minimalInsertData = {
        request_number: requestNumber,
        customer_id: customer.id,
        user_id: user.id,
        product_type: productType,
        product_brand: productBrand,
        product_model: productModel,
        warranty_status: warrantyStatus,
        problem_description: problemDescription,
        problem_category: problemCategory,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        service_address: fullAddress,
        service_city: serviceCity,
        service_district: serviceDistrict,
        customer_notes: customerNotes,
        status: 'reviewing'
      };

      const result = await supabase
        .from('technical_service_requests')
        .insert(minimalInsertData)
        .select()
        .single();
      
      serviceRequest = result.data;
      requestError = result.error;
    }

    if (requestError) {
      console.error('[TECH SERVICE] Error creating request:', requestError);
      return c.json({ error: 'Failed to create technical service request', details: requestError.message }, 500);
    }

    console.log('[TECH SERVICE] ✅ Request created:', serviceRequest);

    // 📸 Fotoğraf URL'lerini kaydet
    if (photos && photos.length > 0) {
      console.log('[TECH SERVICE] 📸 Starting to save photo URLs. Count:', photos.length);
      console.log('[TECH SERVICE] 📸 Photo URLs received:', JSON.stringify(photos, null, 2));
      
      // Frontend'den gelen fotoğraflar zaten yüklenmiş ve URL olarak gelmiş
      const photoInserts = photos.map((photoUrl: string, index: number) => {
        // URL'den file path'i çıkart (bucket adından sonraki kısım)
        const filePath = photoUrl.split('/storage/v1/object/public/')[1] || photoUrl;
        
        console.log(`[TECH SERVICE] 📸 Photo ${index + 1}:`, {
          original_url: photoUrl,
          extracted_path: filePath
        });
        
        return {
          request_id: serviceRequest.id,
          photo_url: photoUrl,
          file_path: filePath,
          photo_type: 'problem'
        };
      });

      console.log('[TECH SERVICE] 📸 Inserting photos to database:', JSON.stringify(photoInserts, null, 2));

      const { data: insertedPhotos, error: photoError } = await supabase
        .from('technical_service_photos')
        .insert(photoInserts)
        .select();

      if (photoError) {
        console.error('[TECH SERVICE] ❌ Photo save error:', photoError);
        console.error('[TECH SERVICE] ❌ Photo error details:', JSON.stringify(photoError, null, 2));
        // Hata olsa bile devam et, fotoğraflar kritik değil
      } else {
        console.log('[TECH SERVICE] ✅ Photo URLs saved successfully. Count:', insertedPhotos?.length || 0);
        console.log('[TECH SERVICE] ✅ Saved photos:', JSON.stringify(insertedPhotos, null, 2));
      }
    } else {
      console.log('[TECH SERVICE] ℹ️ No photos to save');
    }

    // İlk durum güncellemesi ekle
    await supabase.from('technical_service_updates').insert({
      request_id: serviceRequest.id,
      status: 'reviewing',
      note: 'Teknik servis talebiniz alındı ve inceleniyor.',
      created_by: 'system'
    });

    return c.json({
      success: true,
      requestNumber: requestNumber,
      requestId: serviceRequest.id
    });

  } catch (error: any) {
    console.error('[TECH SERVICE] ❌ Exception:', error);
    return c.json({ error: 'Internal server error', details: String(error) }, 500);
  }
});

// GET /make-server-0f4d2485/technical-service/my-requests - Kullanıcının servis taleplerini getir
app.get('/my-requests', async (c) => {
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
      return c.json({ requests: [] });
    }

    // Talepleri getir
    const { data: requests, error: requestsError } = await supabase
      .from('technical_service_requests')
      .select('*')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('[TECH SERVICE] Error fetching requests:', requestsError);
      return c.json({ error: 'Failed to fetch requests', details: requestsError }, 500);
    }

    // Fotoğrafları ayrı olarak al
    const requestIds = requests?.map(r => r.id) || [];
    const { data: photos } = await supabase
      .from('technical_service_photos')
      .select('*')
      .in('request_id', requestIds);

    // Güncellemeleri ayrı olarak al
    const { data: updates } = await supabase
      .from('technical_service_updates')
      .select('*')
      .in('request_id', requestIds)
      .order('created_at', { ascending: false });

    // Verileri birleştir
    const enrichedRequests = requests?.map(request => ({
      ...request,
      photos: photos?.filter(p => p.request_id === request.id) || [],
      updates: updates?.filter(u => u.request_id === request.id) || []
    }));

    return c.json({ requests: enrichedRequests || [] });

  } catch (error: any) {
    console.error('[TECH SERVICE] Exception:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// PUT /make-server-0f4d2485/technical-service/:id/respond - Fiyat teklifini kabul/reddet
app.put('/:id/respond', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized - please login' }, 401);
    }

    const requestId = c.req.param('id');
    const { response } = await c.req.json(); // 'approved' veya 'rejected'

    const supabase = getSupabaseClient();

    // Talebin kullanıcıya ait olduğunu doğrula
    const { data: request, error: fetchError } = await supabase
      .from('technical_service_requests')
      .select('id, user_id, status, estimated_price')
      .eq('id', requestId)
      .single();

    if (fetchError || !request || request.user_id !== user.id) {
      return c.json({ error: 'Request not found or unauthorized' }, 404);
    }

    if (request.status !== 'quoted') {
      return c.json({ error: 'Request is not in quoted status' }, 400);
    }

    const newStatus = response === 'approved' ? 'approved' : 'cancelled';

    // Durumu güncelle
    const { error: updateError } = await supabase
      .from('technical_service_requests')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) {
      return c.json({ error: 'Failed to update request' }, 500);
    }

    // Güncelleme notu ekle
    await supabase.from('technical_service_updates').insert({
      request_id: parseInt(requestId),
      status: newStatus,
      note: response === 'approved' 
        ? 'Müşteri fiyat teklifini kabul etti.' 
        : 'Müşteri fiyat teklifini reddetti.',
      created_by: 'customer'
    });

    return c.json({ success: true, newStatus });

  } catch (error: any) {
    console.error('[TECH SERVICE] Exception:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// PUT /make-server-0f4d2485/technical-service/:id/cancel - Talebi iptal et
app.put('/:id/cancel', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUser(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized - please login' }, 401);
    }

    const requestId = c.req.param('id');
    const supabase = getSupabaseClient();

    // Talebin kullanıcıya ait olduğunu doğrula
    const { data: request, error: fetchError } = await supabase
      .from('technical_service_requests')
      .select('id, user_id, status, request_number')
      .eq('id', requestId)
      .single();

    if (fetchError || !request || request.user_id !== user.id) {
      return c.json({ error: 'Request not found or unauthorized' }, 404);
    }

    // İptal edilebilir durumda mı kontrol et
    const nonCancellableStatuses = ['approved', 'completed', 'cancelled'];
    if (nonCancellableStatuses.includes(request.status)) {
      return c.json({ error: 'Request cannot be cancelled in its current status' }, 400);
    }

    // Durumu iptal olarak güncelle
    const { error: updateError } = await supabase
      .from('technical_service_requests')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('[TECH SERVICE] Error cancelling request:', updateError);
      return c.json({ error: 'Failed to cancel request' }, 500);
    }

    // Güncelleme notu ekle
    await supabase.from('technical_service_updates').insert({
      request_id: parseInt(requestId),
      status: 'cancelled',
      note: 'Müşteri talebi iptal etti.',
      created_by: 'customer'
    });

    console.log(`[TECH SERVICE] ✅ Request ${request.request_number} cancelled by user`);

    return c.json({ success: true, message: 'Request cancelled successfully' });

  } catch (error: any) {
    console.error('[TECH SERVICE] Exception while cancelling:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// ========================================
// ADMIN ENDPOİNTLERİ
// ========================================

// GET /make-server-0f4d2485/technical-service/admin/requests - Tüm talepleri getir (Admin)
app.get('/admin/requests', async (c) => {
  try {
    const supabase = getSupabaseClient();

    // Önce tüm talepleri al
    const { data: requests, error: requestsError } = await supabase
      .from('technical_service_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('[TECH SERVICE ADMIN] Error fetching requests:', requestsError);
      return c.json({ error: 'Failed to fetch requests' }, 500);
    }

    // Fotoğrafları al
    const { data: photos, error: photosError } = await supabase
      .from('technical_service_photos')
      .select('*');

    if (photosError) {
      console.error('[TECH SERVICE ADMIN] Error fetching photos:', photosError);
    }

    // Güncellemeleri al
    const { data: updates, error: updatesError } = await supabase
      .from('technical_service_updates')
      .select('*')
      .order('created_at', { ascending: false });

    if (updatesError) {
      console.error('[TECH SERVICE ADMIN] Error fetching updates:', updatesError);
    }

    // Customer ID'leri topla
    const customerIds = [...new Set(requests?.map(r => r.customer_id).filter(Boolean))];
    
    // Müşteri bilgilerini al
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, name, email, phone, district')
      .in('id', customerIds);

    if (customersError) {
      console.error('[TECH SERVICE ADMIN] Error fetching customers:', customersError);
    }

    // Verileri birleştir
    const enrichedRequests = requests?.map(request => {
      const customer = customers?.find(c => c.id === request.customer_id);
      const requestPhotos = photos?.filter(p => p.request_id === request.id) || [];
      const requestUpdates = updates?.filter(u => u.request_id === request.id) || [];

      return {
        ...request,
        customer: customer || null,
        photos: requestPhotos,
        updates: requestUpdates
      };
    });

    return c.json({ requests: enrichedRequests || [] });

  } catch (error: any) {
    console.error('[TECH SERVICE ADMIN] Exception:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// PUT /make-server-0f4d2485/technical-service/admin/:id/quote - Fiyat teklifi ver (Admin)
app.put('/admin/:id/quote', async (c) => {
  try {
    const requestId = c.req.param('id');
    const { estimatedPrice, adminNotes } = await c.req.json();

    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('technical_service_requests')
      .update({
        status: 'quoted',
        estimated_price: estimatedPrice,
        admin_notes: adminNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) {
      return c.json({ error: 'Failed to update request' }, 500);
    }

    // Güncelleme notu ekle
    await supabase.from('technical_service_updates').insert({
      request_id: parseInt(requestId),
      status: 'quoted',
      note: `Fiyat teklifi verildi: ${estimatedPrice} ₺${adminNotes ? ` - ${adminNotes}` : ''}`,
      created_by: 'admin'
    });

    return c.json({ success: true });

  } catch (error: any) {
    console.error('[TECH SERVICE ADMIN] Exception:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// PUT /make-server-0f4d2485/technical-service/admin/:id/status - Durum güncelle (Admin)
app.put('/admin/:id/status', async (c) => {
  try {
    const requestId = c.req.param('id');
    const { status, note, finalPrice } = await c.req.json();

    const supabase = getSupabaseClient();

    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (finalPrice) {
      updateData.final_price = finalPrice;
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('technical_service_requests')
      .update(updateData)
      .eq('id', requestId);

    if (error) {
      return c.json({ error: 'Failed to update request' }, 500);
    }

    // Güncelleme notu ekle
    await supabase.from('technical_service_updates').insert({
      request_id: parseInt(requestId),
      status,
      note: note || `Durum güncellendi: ${status}`,
      created_by: 'admin'
    });

    return c.json({ success: true });

  } catch (error: any) {
    console.error('[TECH SERVICE ADMIN] Exception:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// DELETE /make-server-0f4d2485/technical-service/admin/:id - Talebi sil (Admin)
app.delete('/admin/:id', async (c) => {
  try {
    const requestId = c.req.param('id');
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('technical_service_requests')
      .delete()
      .eq('id', requestId);

    if (error) {
      return c.json({ error: 'Failed to delete request' }, 500);
    }

    return c.json({ success: true });

  } catch (error: any) {
    console.error('[TECH SERVICE ADMIN] Exception:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default app;
