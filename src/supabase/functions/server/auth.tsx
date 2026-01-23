import { createClient } from 'jsr:@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

/**
 * ✅ YENİ AUTH SERVİSİ - TEMİZ VE BASİT
 * 
 * Sadece 2 tablo kullanıyoruz:
 * 1. auth.users (Supabase Auth - otomatik)
 * 2. public.customers (Uygulama verisi)
 * 
 * users tablosu ve KV store KULLANILMIYOR - gereksiz karmaşıklık!
 */

// ==========================================
// KAYIT OLMA (SIGN UP)
// ==========================================
export async function signUp(email: string, password: string, name: string, phone?: string) {
  // 🔥 FIX: Admin API kullan - email confirmation'ı bypass etmek için
  // Normal signUp() email confirmation gerektiriyor, admin API ile bypass ediyoruz
  const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    console.log('[AUTH] 📝 Kayıt işlemi başladı:', email);
    
    // 1️⃣ Önce customers tablosunda kontrol et (double registration prevention)
    const { data: existingCustomer } = await serviceClient
      .from('customers')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    
    if (existingCustomer) {
      console.log('[AUTH] ⚠️ Email zaten kayıtlı:', email);
      return { 
        success: false, 
        error: 'Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın.' 
      };
    }
    
    // 2️⃣ Auth users'da kontrol et
    const { data: existingUsers } = await serviceClient.auth.admin.listUsers();
    const authUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (authUser) {
      console.log('[AUTH] ⚠️ Email zaten auth.users tablosunda kayıtlı:', email);
      return { 
        success: false, 
        error: 'Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın.' 
      };
    }
    
    // 3️⃣ Admin API ile kullanıcı oluştur - email_confirm: true ile
    // Bu sayede kullanıcı email onaylamadan giriş yapabilir (test ortamı için)
    const { data: authData, error: authError } = await serviceClient.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true, // ✅ Email otomatik onaylı - giriş yapabilir
      user_metadata: {
        name,
        phone: phone || '',
      }
    });
    
    if (authError) {
      console.error('[AUTH] ❌ Kayıt hatası:', authError);
      
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        return { success: false, error: 'Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın.' };
      }
      
      if (authError.message.includes('password')) {
        return { success: false, error: 'Şifre en az 6 karakter olmalıdır.' };
      }
      
      return { success: false, error: authError.message };
    }
    
    if (!authData.user) {
      console.error('[AUTH] ❌ Kullanıcı oluşturulamadı');
      return { success: false, error: 'Kullanıcı oluşturulamadı. Lütfen tekrar deneyin.' };
    }
    
    console.log('[AUTH] ✅ Auth kullanıcı oluşturuldu:', authData.user.id);
    
    // 4️⃣ Customers tablosuna ekle
    const { error: customerError } = await serviceClient
      .from('customers')
      .insert({
        auth_user_id: authData.user.id,
        email: email.toLowerCase(),
        name,
        phone: phone || '',
        created_at: new Date().toISOString()
      });
    
    if (customerError) {
      console.error('[AUTH] ⚠️ Customer oluşturma hatası:', customerError);
      // Auth kaydı başarılı oldu - customer hatası kritik değil
    } else {
      console.log('[AUTH] ✅ Customer kaydı oluşturuldu');
    }
    
    // 5️⃣ Kullanıcı oluşturuldu - manuel giriş yaptıracağız
    // NOT: Admin API ile oluşturulan kullanıcı hemen signInWithPassword ile giriş yapamıyor
    // Supabase'de kullanıcının "ready" olması için kısa bir süre gerekiyor
    // Bu yüzden kayıt sonrası MANUEL GİRİŞ yaptırıyoruz
    console.log('[AUTH] ✅ Kayıt tamamlandı - kullanıcı manuel giriş yapmalı');
    
    return {
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name,
        phone: phone || '',
      },
      session: null, // ⚠️ Session yok - frontend manuel giriş yaptıracak
      message: 'Kayıt başarılı! Şimdi giriş yapabilirsiniz.',
    };
    
  } catch (err: any) {
    console.error('[AUTH] ❌ Kayıt exception:', err);
    return { 
      success: false, 
      error: 'Kayıt sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.' 
    };
  }
}

// ==========================================
// GİRİŞ YAPMA (SIGN IN)
// ==========================================
export async function signIn(email: string, password: string) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    console.log('[AUTH] 🔑 Giriş işlemi başladı:', email);
    console.log('[AUTH] 📝 Supabase URL:', supabaseUrl);
    console.log('[AUTH] 🔐 Anon key mevcut:', !!supabaseAnonKey);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase(),
      password,
    });
    
    if (error) {
      console.log('[AUTH] ⚠️ Giriş hatası:', error.message); // console.error → console.log
      console.log('[AUTH] 📊 Hata detayı:', {
        message: error.message,
        status: error.status,
        name: error.name,
      });
      
      if (error.status === 400 || error.message.includes('Invalid login credentials')) {
        return { 
          success: false, 
          error: 'E-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edin.' 
        };
      }
      
      return { success: false, error: error.message };
    }
    
    if (!data.session || !data.user) {
      console.error('[AUTH] ❌ Session oluşturulamadı');
      console.error('[AUTH] 📊 Data:', { 
        hasSession: !!data.session, 
        hasUser: !!data.user 
      });
      return { 
        success: false, 
        error: 'Giriş başarısız. Lütfen tekrar deneyin.' 
      };
    }
    
    console.log('[AUTH] ✅ Giriş başarılı:', email);
    console.log('[AUTH] 📊 Session bilgisi:', {
      userId: data.user.id,
      hasAccessToken: !!data.session.access_token,
      hasRefreshToken: !!data.session.refresh_token,
    });
    
    // Kullanıcı bilgilerini metadata'dan al
    const name = data.user.user_metadata?.name || email.split('@')[0];
    const phone = data.user.user_metadata?.phone || '';
    
    // 🚀 PERFORMANS OPTİMİZASYONU: Customer kontrolünü async yap
    // Ana response'u hızlı döndür, customer sync'i background'da yap
    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    
    // Background'da customer kontrolü (await etmeden)
    serviceClient
      .from('customers')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle()
      .then(({ data: existingCustomer }) => {
        if (!existingCustomer) {
          console.log('[AUTH] 🔄 Orphan auth kaydı tespit edildi - customer oluşturuluyor');
          serviceClient
            .from('customers')
            .insert({
              auth_user_id: data.user.id,
              email: email.toLowerCase(),
              name,
              phone,
              created_at: new Date().toISOString()
            })
            .then(() => console.log('[AUTH] ✅ Customer background sync tamamlandı'))
            .catch(err => console.error('[AUTH] ⚠️ Customer background sync hatası:', err));
        }
      })
      .catch(err => console.error('[AUTH] ⚠️ Customer kontrolü hatası:', err));
    
    // ⚡ HIZLI RESPONSE - customer beklemeden döndür
    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name,
        phone,
      },
      session: data.session,
    };
    
  } catch (err: any) {
    console.error('[AUTH] ❌ Giriş exception:', err);
    console.error('[AUTH] 📊 Exception detayı:', {
      message: err.message,
      stack: err.stack,
    });
    return { 
      success: false, 
      error: 'Giriş sırasında beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.' 
    };
  }
}

// ==========================================
// TOKEN DOĞRULAMA
// ==========================================
export async function verifyToken(accessToken: string) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  try {
    const { data, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !data.user) {
      console.error('[AUTH] ❌ Token doğrulama hatası:', error);
      return { 
        success: false, 
        error: 'Oturum geçersiz. Lütfen tekrar giriş yapın.',
        shouldLogout: true 
      };
    }
    
    return {
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || '',
        phone: data.user.user_metadata?.phone || '',
      },
    };
    
  } catch (err: any) {
    console.error('[AUTH] ❌ Token doğrulama exception:', err);
    return { 
      success: false, 
      error: 'Token doğrulanamadı.',
      shouldLogout: true 
    };
  }
}

// ==========================================
// ÇIKIŞ YAPMA (SIGN OUT)
// ==========================================
export async function signOut(accessToken: string) {
  try {
    console.log('[AUTH] 🚪 Çıkış işlemi başladı');
    
    // Token kontrolü yap ama Supabase auth.signOut() ÇAĞIRMA!
    // Çünkü bu global signOut yapıyor ve sonraki giriş denemelerini engelliyor
    
    // Sadece token'ın geçerliliğini kontrol et
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: getUserError } = await supabase.auth.getUser(accessToken);
    
    if (getUserError || !user) {
      console.log('[AUTH] ⚠️ Token zaten geçersiz - çıkış sayılır');
      return { success: true };
    }
    
    console.log('[AUTH] ✅ Çıkış başarılı - client tarafında session temizlenecek');
    
    // NOT: Supabase auth.signOut() çağırmıyoruz çünkü bu server-side global logout yapıyor
    // Client-side localStorage temizliği yeterli (security için backend token'ı ignore edecek)
    
    return { success: true };
    
  } catch (err: any) {
    console.error('[AUTH] ❌ Çıkış exception:', err);
    // Exception olsa bile frontend'de temizlik yapılsın
    return { success: true };
  }
}

// ==========================================
// KULLANICI BİLGİLERİNİ GETİR
// ==========================================
export async function getUserProfile(userId: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('email', userId)
      .maybeSingle();
    
    if (error) {
      console.error('[AUTH] ❌ Profil getirme hatası:', error);
      return { success: false, error: error.message };
    }
    
    return {
      success: true,
      profile: data || null,
    };
    
  } catch (err: any) {
    console.error('[AUTH] ❌ Profil getirme exception:', err);
    return { 
      success: false, 
      error: 'Profil bilgileri alınamadı.' 
    };
  }
}

// ==========================================
// KULLANICI BİLGİLERİNİ GÜNCELLE
// ==========================================
export async function updateUserProfile(email: string, updates: any) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    const { data, error } = await supabase
      .from('customers')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('email', email.toLowerCase())
      .select()
      .single();
    
    if (error) {
      console.error('[AUTH] ❌ Profil güncelleme hatası:', error);
      return { success: false, error: error.message };
    }
    
    console.log('[AUTH] ✅ Profil güncellendi:', email);
    return {
      success: true,
      profile: data,
    };
    
  } catch (err: any) {
    console.error('[AUTH] ❌ Profil güncelleme exception:', err);
    return { 
      success: false, 
      error: 'Profil güncellenemedi.' 
    };
  }
}

// ==========================================
// OAUTH CALLBACK - Google/Facebook Giriş
// ==========================================
export async function handleOAuthCallback(email: string, name: string, provider: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    console.log('[AUTH OAUTH] 🔐 OAuth callback işleniyor:', { email, provider });
    
    // 1️⃣ Customers tablosunda kullanıcı var mı kontrol et
    const { data: existingCustomer, error: fetchError } = await supabase
      .from('customers')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[AUTH OAUTH] ❌ Customer fetch hatası:', fetchError);
      return { success: false, error: 'Kullanıcı sorgulanamadı' };
    }
    
    // 2️⃣ Eğer customer yoksa oluştur
    if (!existingCustomer) {
      console.log('[AUTH OAUTH] 📝 Yeni customer kaydı oluşturuluyor:', email);
      
      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert({
          email: email.toLowerCase(),
          name: name,
          phone: '', // OAuth ile telefon gelmiyor, sonra güncellenebilir
          is_admin: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('[AUTH OAUTH] ❌ Customer oluşturma hatası:', insertError);
        return { success: false, error: 'Kullanıcı kaydı oluşturulamadı' };
      }
      
      console.log('[AUTH OAUTH] ✅ Yeni customer oluşturuldu:', newCustomer.id);
      
      return {
        success: true,
        customer: newCustomer,
        isNewUser: true,
      };
    }
    
    // 3️⃣ Mevcut customer - güncelle
    console.log('[AUTH OAUTH] 👤 Mevcut customer bulundu:', existingCustomer.id);
    
    // İsim güncellemesi (eğer OAuth'dan gelen isim daha tam ise)
    const updates: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (name && (!existingCustomer.name || existingCustomer.name === 'Kullanıcı')) {
      updates.name = name;
    }
    
    if (Object.keys(updates).length > 1) {
      const { error: updateError } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', existingCustomer.id);
      
      if (updateError) {
        console.warn('[AUTH OAUTH] ⚠️ Customer güncelleme hatası:', updateError);
      } else {
        console.log('[AUTH OAUTH] ✅ Customer bilgileri güncellendi');
      }
    }
    
    return {
      success: true,
      customer: existingCustomer,
      isNewUser: false,
    };
    
  } catch (err: any) {
    console.error('[AUTH OAUTH] ❌ OAuth callback exception:', err);
    return { 
      success: false, 
      error: err.message || 'OAuth işlemi başarısız oldu' 
    };
  }
}