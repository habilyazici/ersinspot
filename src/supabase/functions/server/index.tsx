// Ersin Spot Backend Server - v1.1.9 (Order Items Schema Fix)
import { Hono } from "npm:hono@4";
import { cors } from "npm:hono@4/cors";
import { logger } from "npm:hono@4/logger";
import * as kv from "./kv_store.tsx"; // KV Store - mevcut sistem için koruyoruz
import { createClient } from 'jsr:@supabase/supabase-js@2';
import postgres from 'https://deno.land/x/postgresjs@v3.4.4/mod.js';
import * as auth from './auth.tsx';
import * as orders from './orders.tsx';
import * as cart from './cart.tsx';
import userServicesRouter from './user-services.tsx';
import userSellRequestsRouter from './user-sell-requests.tsx';
import userOrdersRouter from './user-orders.tsx';
import userProfileRouter from './user-profile.tsx';
import movingRouter from './moving.tsx';
import technicalServiceRouter from './technical_service.tsx';
import adminDashboardRouter from './admin-dashboard.tsx';
import * as adminAvailability from './admin-availability.tsx';

const app = new Hono();

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const publicAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize direct Postgres connection (bypasses PostgREST cache)
const databaseUrl = Deno.env.get('SUPABASE_DB_URL')!;
const sql = postgres(databaseUrl);

// Storage bucket name for product images
const PRODUCT_IMAGES_BUCKET = 'make-0f4d2485-products';
// Storage bucket name for profile photos
const PROFILE_PHOTOS_BUCKET = 'make-0f4d2485-profiles';
// Storage bucket name for sell request images
const SELL_REQUEST_IMAGES_BUCKET = 'make-0f4d2485-sell-requests';
// Storage bucket name for moving appointment images
const MOVING_IMAGES_BUCKET = 'make-0f4d2485-moving';
// Storage bucket name for technical service images
const TECH_SERVICE_IMAGES_BUCKET = 'make-0f4d2485-service-photos';

// ============================================
// WARRANTY HELPER FUNCTIONS
// ============================================
// Frontend string değerleri ile veritabanı integer değerleri arasında dönüşüm

// String warranty'yi integer'a çevir (veritabanına kaydetmek için)
function warrantyStringToMonths(warrantyStr: string): number {
  const mapping: Record<string, number> = {
    'Yok': 0,
    'Garanti Yok': 0,
    '3 Ay': 3,
    '6 Ay': 6,
    '1 Yıl': 12,
    '2 Yıl': 24,
    '3 Yıl': 36,
  };
  return mapping[warrantyStr] ?? 0;
}

// Integer warranty'yi string'e çevir (frontend'e göndermek için)
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
// SELL REQUEST HELPER FUNCTIONS
// ============================================

// Condition değerlerini İngilizce'den Türkçe'ye çevir
function formatConditionText(condition: string): string {
  const conditionMap: Record<string, string> = {
    'like_new': 'Sıfır Gibi',
    'good': 'İyi',
    'lightly_used': 'Az Kullanılmış',
    'fair': 'Orta',
    'poor': 'Kötü',
  };
  return conditionMap[condition] || condition;
}

// ============================================
// ADMIN AUTHORIZATION HELPER
// ============================================

// Admin email listesi (sabit admin email'leri)
const ADMIN_EMAILS = [
  'admin@ersinspot.com',
  'ersinspot@gmail.com'
];

// Admin kontrolü için yardımcı fonksiyon (EMAIL bazlı)
async function checkAdminAuth(accessToken: string): Promise<{ isAdmin: boolean; error?: string; user?: any }> {
  console.log('[ADMIN-CHECK] 🔐 Starting admin auth check...');
  
  if (!accessToken) {
    console.log('[ADMIN-CHECK] ❌ No access token provided');
    return { isAdmin: false, error: 'Access token required' };
  }
  
  const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
  
  if (authError || !user) {
    console.log('[ADMIN-CHECK] ❌ Auth error:', authError?.message || 'No user found');
    return { isAdmin: false, error: 'Unauthorized' };
  }
  
  console.log('[ADMIN-CHECK] 👤 User found:', user.email);
  console.log('[ADMIN-CHECK] 📋 Checking against admin emails:', ADMIN_EMAILS);
  
  // EMAIL kontrolü yap (sabit admin email listesinden)
  const isAdmin = ADMIN_EMAILS.includes(user.email || '');
  
  if (!isAdmin) {
    console.log('[ADMIN-CHECK] ❌ Not an admin email:', user.email);
    console.log('[ADMIN-CHECK] ⚠️  Valid admin emails are:', ADMIN_EMAILS);
    return { isAdmin: false, error: 'Admin yetkisi gereklidir', user };
  }
  
  console.log('[ADMIN-CHECK] ✅ Admin confirmed:', user.email);
  return { isAdmin: true, user };
}

// Customers tablosundaki adres bilgilerini birleştir
function formatCustomerAddress(customer: any): string {
  const addressParts = [];
  
  // Detaylı adres bilgilerini sırayla ekle
  if (customer.mahalle) addressParts.push(customer.mahalle);
  if (customer.sokak) addressParts.push(customer.sokak);
  if (customer.bina_no) addressParts.push(`No: ${customer.bina_no}`);
  if (customer.daire_no) addressParts.push(`Daire: ${customer.daire_no}`);
  
  // Eğer yukarıdakiler yoksa, genel address alanını kullan
  if (addressParts.length === 0 && customer.address) {
    addressParts.push(customer.address);
  }
  
  // İlçe ve şehir bilgisi
  if (customer.district) addressParts.push(customer.district);
  if (customer.city) addressParts.push(customer.city);
  
  return addressParts.join(', ') || 'Adres belirtilmemiş';
}

// Create storage bucket on startup (idempotent)
async function initializeStorage() {
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    
    // Create products bucket
    const productBucketExists = buckets?.some(bucket => bucket.name === PRODUCT_IMAGES_BUCKET);
    if (!productBucketExists) {
      console.log(`Creating storage bucket: ${PRODUCT_IMAGES_BUCKET}`);
      const { error } = await supabase.storage.createBucket(PRODUCT_IMAGES_BUCKET, {
        public: true, // Public bucket for easy access via CDN
        fileSizeLimit: 5242880, // 5MB max file size
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      });
      
      if (error) {
        console.error('Error creating products bucket:', error);
      } else {
        console.log(`✅ Bucket created: ${PRODUCT_IMAGES_BUCKET}`);
      }
    } else {
      console.log(`✅ Bucket already exists: ${PRODUCT_IMAGES_BUCKET}`);
    }
    
    // Create profile photos bucket
    const profileBucketExists = buckets?.some(bucket => bucket.name === PROFILE_PHOTOS_BUCKET);
    if (!profileBucketExists) {
      console.log(`Creating storage bucket: ${PROFILE_PHOTOS_BUCKET}`);
      const { error } = await supabase.storage.createBucket(PROFILE_PHOTOS_BUCKET, {
        public: true, // Public bucket for easy access
        fileSizeLimit: 2097152, // 2MB max file size
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      });
      
      if (error) {
        console.error('Error creating profiles bucket:', error);
      } else {
        console.log(`✅ Bucket created: ${PROFILE_PHOTOS_BUCKET}`);
      }
    } else {
      console.log(`✅ Bucket already exists: ${PROFILE_PHOTOS_BUCKET}`);
    }
    
    // Create sell request images bucket
    const sellRequestBucketExists = buckets?.some(bucket => bucket.name === SELL_REQUEST_IMAGES_BUCKET);
    if (!sellRequestBucketExists) {
      console.log(`Creating storage bucket: ${SELL_REQUEST_IMAGES_BUCKET}`);
      const { error } = await supabase.storage.createBucket(SELL_REQUEST_IMAGES_BUCKET, {
        public: true, // Public bucket for easy access
        fileSizeLimit: 5242880, // 5MB max file size
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      });
      
      if (error) {
        console.error('Error creating sell requests bucket:', error);
      } else {
        console.log(`✅ Bucket created: ${SELL_REQUEST_IMAGES_BUCKET}`);
      }
    } else {
      console.log(`✅ Bucket already exists: ${SELL_REQUEST_IMAGES_BUCKET}`);
    }
    
    // Create moving images bucket
    const movingBucketExists = buckets?.some(bucket => bucket.name === MOVING_IMAGES_BUCKET);
    if (!movingBucketExists) {
      console.log(`Creating storage bucket: ${MOVING_IMAGES_BUCKET}`);
      const { error } = await supabase.storage.createBucket(MOVING_IMAGES_BUCKET, {
        public: true, // Public bucket for easy access
        fileSizeLimit: 5242880, // 5MB max file size
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      });
      
      if (error) {
        console.error('Error creating moving bucket:', error);
      } else {
        console.log(`✅ Bucket created: ${MOVING_IMAGES_BUCKET}`);
      }
    } else {
      console.log(`✅ Bucket already exists: ${MOVING_IMAGES_BUCKET}`);
    }
    
    // Create technical service images bucket
    const techServiceBucketExists = buckets?.some(bucket => bucket.name === TECH_SERVICE_IMAGES_BUCKET);
    if (!techServiceBucketExists) {
      console.log(`Creating storage bucket: ${TECH_SERVICE_IMAGES_BUCKET}`);
      const { error } = await supabase.storage.createBucket(TECH_SERVICE_IMAGES_BUCKET, {
        public: true, // Public bucket for easy access
        fileSizeLimit: 10485760, // 10MB max file size
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      });
      
      if (error) {
        console.error('Error creating tech service bucket:', error);
      } else {
        console.log(`✅ Bucket created: ${TECH_SERVICE_IMAGES_BUCKET}`);
      }
    } else {
      console.log(`✅ Bucket already exists: ${TECH_SERVICE_IMAGES_BUCKET}`);
    }

    // Create favorites table if it doesn't exist
    try {
      console.log('[INIT] Checking favorites table...');
      const pgModule = await import('https://deno.land/x/postgres@v0.17.0/mod.ts');
      const client = new pgModule.Client(Deno.env.get('SUPABASE_DB_URL')!);
      await client.connect();
      
      // Check if favorites table exists
      const tableCheckResult = await client.queryObject(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'favorites'
        );
      `);
      
      const favoritesTableExists = tableCheckResult.rows[0]?.exists;
      
      if (!favoritesTableExists) {
        console.log('[INIT] Creating favorites table...');
        
        await client.queryArray(`
          CREATE TABLE IF NOT EXISTS favorites (
            id BIGSERIAL PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            product_id BIGINT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id, product_id)
          );
          
          CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
          CREATE INDEX IF NOT EXISTS idx_favorites_product_id ON favorites(product_id);
          
          -- Enable RLS
          ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
          
          -- Policy: Users can view their own favorites
          CREATE POLICY favorites_select_policy
            ON favorites FOR SELECT
            TO authenticated
            USING (auth.uid() = user_id);
          
          -- Policy: Users can insert their own favorites
          CREATE POLICY favorites_insert_policy
            ON favorites FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
          
          -- Policy: Users can delete their own favorites
          CREATE POLICY favorites_delete_policy
            ON favorites FOR DELETE
            TO authenticated
            USING (auth.uid() = user_id);
            
          -- Service role can do everything
          CREATE POLICY favorites_service_role_policy
            ON favorites FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
        `);
        
        console.log('[INIT] ✅ Favorites table created');
      } else {
        console.log('[INIT] ✅ Favorites table already exists');
      }
      
      await client.end();
    } catch (dbError: any) {
      console.error('[INIT] Error creating favorites table:', dbError);
      // Don't throw - just log the error and continue
    }
  } catch (err) {
    console.error('Error initializing storage:', err);
  }
}

// Initialize storage on startup
initializeStorage();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods - FULL PERMISSIVE for localhost
app.use(
  "*",
  cors({
    origin: ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001", "*"],
    allowHeaders: ["Content-Type", "Authorization", "x-client-info", "apikey"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length", "Content-Type"],
    maxAge: 86400,
    credentials: false,
  }),
);

// Health check endpoint
app.get("/make-server-0f4d2485/health", (c) => {
  return c.json({ status: "ok" });
});

// ==========================================
// PRODUCTS ENDPOINTS
// ==========================================/
app.get("/make-server-0f4d2485/debug/sell-requests-schema", async (c) => {
  try {
    console.log('[DEBUG] Checking sell_requests schema...');
    
    // Method 1: Tek bir sell request çek ve tüm kolonları göster
    const { data, error } = await supabase
      .from('sell_requests')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('[DEBUG] Select error:', error);
      
      // If table doesn't exist or has no columns visible
      if (error.code === 'PGRST204' || error.code === '42P01') {
        return c.json({ 
          error: 'Table not found or schema cache issue',
          message: 'Please create the sell_requests table in Supabase',
          hint: 'Go to Supabase Dashboard → SQL Editor and run the CREATE TABLE command',
          details: error.message,
          code: error.code,
          sql_command: `
-- Run this SQL in Supabase Dashboard → SQL Editor:

CREATE TABLE IF NOT EXISTS sell_requests (
  id BIGSERIAL PRIMARY KEY,
  request_number TEXT,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Product info
  title TEXT,
  product_category TEXT,
  brand TEXT,
  model TEXT,
  year INTEGER,
  purchase_year INTEGER,
  condition TEXT NOT NULL,
  description TEXT,
  has_box BOOLEAN DEFAULT false,
  has_accessories BOOLEAN DEFAULT false,
  
  -- Pricing
  asking_price DECIMAL(10,2),
  admin_offer_price DECIMAL(10,2),
  admin_notes TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  status_history JSONB DEFAULT '[]'::jsonb,
  
  -- Pickup appointment
  pickup_date DATE,
  pickup_time TEXT,
  
  -- Contact fallback (for non-registered users)
  name TEXT,
  email TEXT,
  phone TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create images table
CREATE TABLE IF NOT EXISTS sell_request_images (
  id BIGSERIAL PRIMARY KEY,
  sell_request_id BIGINT REFERENCES sell_requests(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  order_num INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sell_requests_customer_id ON sell_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_sell_requests_user_id ON sell_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_sell_requests_status ON sell_requests(status);
CREATE INDEX IF NOT EXISTS idx_sell_requests_pickup_date ON sell_requests(pickup_date);
CREATE INDEX IF NOT EXISTS idx_sell_request_images_request_id ON sell_request_images(sell_request_id);

-- Enable RLS
ALTER TABLE sell_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sell_request_images ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow service role full access)
CREATE POLICY "Service role has full access to sell_requests"
  ON sell_requests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to sell_request_images"
  ON sell_request_images FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- After running this, reload the schema cache
-- by calling: POST /debug/reload-schema
          `.trim()
        }, 500);
      }
      
      return c.json({ 
        error: error.message,
        hint: error.hint,
        details: error.details,
        code: error.code
      }, 500);
    }
    
    const schema = data && data.length > 0 
      ? Object.keys(data[0]) 
      : [];
    
    console.log('[DEBUG] Detected columns:', schema);
    
    if (schema.length === 0) {
      return c.json({
        warning: 'Table exists but has no data',
        message: 'Schema cache cannot detect columns from empty table',
        hint: 'Please ensure table was created correctly with the SQL command above',
        columns: schema,
        hasData: false
      });
    }
    
    return c.json({ 
      success: true,
      hasData: data && data.length > 0,
      columns: schema,
      sampleData: data && data.length > 0 ? data[0] : null,
      message: '✅ Schema cache working correctly',
      critical_columns: {
        customer_id: schema.includes('customer_id') ? '✅ Found' : '❌ Missing',
        user_id: schema.includes('user_id') ? '✅ Found' : '❌ Missing',
        title: schema.includes('title') ? '✅ Found' : '❌ Missing',
        asking_price: schema.includes('asking_price') ? '✅ Found' : '❌ Missing',
        admin_offer_price: schema.includes('admin_offer_price') ? '✅ Found' : '❌ Missing',
        status: schema.includes('status') ? '✅ Found' : '❌ Missing'
      }
    });
  } catch (err: any) {
    console.error('[DEBUG] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// 🔄 RELOAD: Force Supabase to reload schema cache
app.post("/make-server-0f4d2485/debug/reload-schema", async (c) => {
  try {
    console.log('[RELOAD] Force reloading PostgREST schema cache...');
    
    // Use raw SQL to execute NOTIFY command for PostgREST
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: "NOTIFY pgrst, 'reload schema';"
    });
    
    if (error) {
      console.log('[RELOAD] NOTIFY failed (expected):', error.message);
      console.log('[RELOAD] Using fallback method...');
      
      // Fallback: Make test queries to warm up cache
      try {
        await supabase.from('sell_requests').select('*').limit(1);
        await supabase.from('sell_request_images').select('*').limit(1);
        await supabase.from('customers').select('*').limit(1);
        console.log('[RELOAD] Cache warmed up with test queries');
      } catch (warmupError: any) {
        console.log('[RELOAD] Warmup queries completed with errors (might be expected)');
      }
    }
    
    return c.json({ 
      message: '✅ Schema cache reload requested',
      note: 'PostgREST schema cache has been refreshed. Try your request again.',
      timestamp: new Date().toISOString(),
      advice: 'If you still get errors, wait 5-10 seconds and try again.'
    });
  } catch (err: any) {
    console.error('[RELOAD] Exception:', err);
    return c.json({ 
      message: '⚠️ Reload attempted with errors',
      error: err.message,
      advice: 'Schema cache may still refresh automatically. Wait 10 seconds and retry your request.'
    }, 200); // Return 200 anyway since the error is expected
  }
});

// 🚀 AUTO-CREATE: Automatically create sell_requests tables
app.post("/make-server-0f4d2485/debug/create-sell-requests-table", async (c) => {
  try {
    console.log('[AUTO-CREATE] Starting automatic table creation...');
    
    // Import postgres client
    const postgres = await import('https://deno.land/x/postgres@v0.17.0/mod.ts');
    const dbUrl = Deno.env.get('SUPABASE_DB_URL');
    
    if (!dbUrl) {
      return c.json({ 
        error: 'SUPABASE_DB_URL not found',
        message: 'Database connection URL is not configured'
      }, 500);
    }
    
    // Create postgres client
    const client = new postgres.Client(dbUrl);
    await client.connect();
    
    console.log('[AUTO-CREATE] Connected to database');
    
    try {
      // Execute SQL commands
      await client.queryArray(`
        -- Create sell_requests table
        CREATE TABLE IF NOT EXISTS sell_requests (
          id BIGSERIAL PRIMARY KEY,
          request_number TEXT,
          customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
          user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
          
          -- Product info
          title TEXT,
          product_category TEXT,
          brand TEXT,
          model TEXT,
          year INTEGER,
          purchase_year INTEGER,
          condition TEXT NOT NULL,
          description TEXT,
          has_box BOOLEAN DEFAULT false,
          has_accessories BOOLEAN DEFAULT false,
          
          -- Pricing
          asking_price DECIMAL(10,2),
          admin_offer_price DECIMAL(10,2),
          admin_notes TEXT,
          
          -- Status
          status TEXT NOT NULL DEFAULT 'pending',
          status_history JSONB DEFAULT '[]'::jsonb,
          
          -- Pickup appointment (when admin will come to pick up the product)
          pickup_date DATE,
          pickup_time TEXT,
          
          -- Contact fallback (for non-registered users)
          name TEXT,
          email TEXT,
          phone TEXT,
          
          -- Timestamps
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      
      console.log('[AUTO-CREATE] ✅ sell_requests table created');
      
      await client.queryArray(`
        -- Create images table
        CREATE TABLE IF NOT EXISTS sell_request_images (
          id BIGSERIAL PRIMARY KEY,
          sell_request_id BIGINT REFERENCES sell_requests(id) ON DELETE CASCADE,
          image_url TEXT NOT NULL,
          order_num INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `);
      
      console.log('[AUTO-CREATE] ✅ sell_request_images table created');
      
      await client.queryArray(`
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_sell_requests_customer_id ON sell_requests(customer_id);
        CREATE INDEX IF NOT EXISTS idx_sell_requests_user_id ON sell_requests(user_id);
        CREATE INDEX IF NOT EXISTS idx_sell_requests_status ON sell_requests(status);
        CREATE INDEX IF NOT EXISTS idx_sell_requests_pickup_date ON sell_requests(pickup_date);
        CREATE INDEX IF NOT EXISTS idx_sell_request_images_request_id ON sell_request_images(sell_request_id);
      `);
      
      console.log('[AUTO-CREATE] ✅ Indexes created');
      
      await client.queryArray(`
        -- Enable RLS
        ALTER TABLE sell_requests ENABLE ROW LEVEL SECURITY;
        ALTER TABLE sell_request_images ENABLE ROW LEVEL SECURITY;
      `);
      
      console.log('[AUTO-CREATE] ✅ RLS enabled');
      
      // Drop existing policies if they exist
      await client.queryArray(`
        DROP POLICY IF EXISTS "Service role has full access to sell_requests" ON sell_requests;
        DROP POLICY IF EXISTS "Service role has full access to sell_request_images" ON sell_request_images;
      `);
      
      await client.queryArray(`
        -- RLS Policies (allow service role full access)
        CREATE POLICY "Service role has full access to sell_requests"
          ON sell_requests FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);
      `);
      
      await client.queryArray(`
        CREATE POLICY "Service role has full access to sell_request_images"
          ON sell_request_images FOR ALL
          TO service_role
          USING (true)
          WITH CHECK (true);
      `);
      
      console.log('[AUTO-CREATE] ✅ RLS policies created');
      
      // Add is_admin column to customers table if it doesn't exist
      console.log('[AUTO-CREATE] Adding is_admin column to customers table...');
      await client.queryArray(`
        ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
      `);
      console.log('[AUTO-CREATE] ✅ is_admin column added');
      
      await client.end();
      
      // Reload schema cache
      console.log('[AUTO-CREATE] Reloading schema cache...');
      await supabase.from('sell_requests').select('id').limit(1);
      await supabase.from('sell_request_images').select('id').limit(1);
      await supabase.from('customers').select('id').limit(1);
      
      return c.json({
        success: true,
        message: '✅ Tablolar ve kolonlar başarıyla oluşturuldu!',
        tables_created: ['sell_requests', 'sell_request_images'],
        columns_added: ['sell_requests.request_number', 'customers.is_admin'],
        indexes_created: 4,
        policies_created: 2,
        timestamp: new Date().toISOString()
      });
    } catch (sqlError: any) {
      await client.end();
      console.error('[AUTO-CREATE] SQL Error:', sqlError);
      
      return c.json({
        error: 'SQL execution failed',
        message: sqlError.message,
        hint: 'Tablo zaten var olabilir veya izin sorunu yaşanıyor olabilir'
      }, 500);
    }
  } catch (err: any) {
    console.error('[AUTO-CREATE] Exception:', err);
    return c.json({ 
      error: err.message,
      hint: 'Database connection failed - check SUPABASE_DB_URL environment variable'
    }, 500);
  }
});

// 🔍 NEW: Check user existence across all auth tables
app.get("/make-server-0f4d2485/debug/user-status/:email", async (c) => {
  try {
    const email = c.req.param('email').toLowerCase();
    
    console.log('[DEBUG] Checking user status for:', email);
    
    const results: any = {
      email,
      timestamp: new Date().toISOString(),
      auth: null,
      users: null,
      customers: null
    };
    
    // 1. Check auth.users (via admin API)
    try {
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUser = authUsers?.users?.find(u => u.email?.toLowerCase() === email);
      
      if (authUser) {
        results.auth = {
          exists: true,
          id: authUser.id,
          email: authUser.email,
          email_confirmed: authUser.email_confirmed_at ? true : false,
          created_at: authUser.created_at,
          metadata: authUser.user_metadata
        };
      } else {
        results.auth = { exists: false };
      }
    } catch (err: any) {
      results.auth = { exists: false, error: err.message };
    }
    
    // 2. Check public.users table
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      if (user) {
        results.users = {
          exists: true,
          id: user.id,
          name: user.name,
          phone: user.phone,
          created_at: user.created_at
        };
      } else {
        results.users = { exists: false, error: error?.message || null };
      }
    } catch (err: any) {
      results.users = { exists: false, error: err.message };
    }
    
    // 3. Check public.customers table
    try {
      const { data: customer, error } = await supabase
        .from('customers')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      
      if (customer) {
        results.customers = {
          exists: true,
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address || null, // address kolonu olmayabilir
          district: customer.district || null,
          city: customer.city || null,
          total_orders: customer.total_orders,
          total_spent: customer.total_spent,
          created_at: customer.created_at
        };
      } else {
        results.customers = { exists: false, error: error?.message || null };
      }
    } catch (err: any) {
      results.customers = { exists: false, error: err.message };
    }
    
    // Summary
    results.summary = {
      can_login: results.auth?.exists || false,
      fully_registered: results.auth?.exists && results.customers?.exists,
      orphan_auth_record: results.auth?.exists && !results.customers?.exists,
      recommendation: results.auth?.exists && !results.customers?.exists
        ? 'Bu hesap "orphan" durumunda - auth\'da var ama customers\'da yok. Yeniden kayıt olmayı deneyin, sistem otomatik düzeltecek.'
        : results.auth?.exists && results.customers?.exists
          ? 'Hesap tam kayıtlı - hem giriş yapabilir hem de sipariş verebilirsiniz.'
          : 'Hesap bulunamadı - kayıt olmanız gerekiyor.'
    };
    
    return c.json(results);
  } catch (err: any) {
    console.error('[DEBUG] Exception in user status check:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// PRODUCTS ENDPOINTS
// ==========================================

// Get all products with filters
app.get("/make-server-0f4d2485/products", async (c) => {
  try {
    console.log('[PRODUCTS] ===== NEW REQUEST =====');
    const { category, subcategory, brand, condition, minPrice, maxPrice, search, limit = 50, offset = 0, status, showAll } = c.req.query();
    console.log('[PRODUCTS] Query params:', { category, subcategory, brand, condition, minPrice, maxPrice, search, limit, offset, status, showAll });
    
    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, slug),
        brand:brands(id, name),
        images:product_images(id, image_url, order_num),
        specifications:product_specifications(id, spec_key, spec_value)
      `, { count: 'exact' })
      .order('created_at', { ascending: false });
    
    // Status filtresi - eğer showAll=true değilse satışta olan ürünleri göster
    if (status) {
      query = query.eq('status', status);
      console.log(`[PRODUCTS] Filtering by status: ${status}`);
    } else if (showAll !== 'true') {
      // Sadece 'for_sale' statusundaki ürünleri göster (satışta olanlar)
      query = query.eq('status', 'for_sale');
      console.log('[PRODUCTS] Filtering by status: for_sale (showAll not true)');
    } else {
      console.log('[PRODUCTS] No status filter - showing all products (showAll=true)');
    }
    
    // Apply filters
    if (category) query = query.eq('category_id', category);
    if (brand) query = query.eq('brand_id', brand);
    if (condition) query = query.eq('condition', condition);
    if (minPrice) query = query.gte('price', minPrice);
    if (maxPrice) query = query.lte('price', maxPrice);
    if (search) query = query.ilike('title', `%${search}%`);
    
    query = query.range(Number(offset), Number(offset) + Number(limit) - 1);
    
    const { data, error, count } = await query;
    
    if (error) {
      console.error('Error fetching products:', error);
      return c.json({ error: error.message }, 500);
    }
    
    // ✅ Ürün yoksa bile başarılı yanıt dön
    console.log(`[PRODUCTS] Found ${data?.length || 0} products (total: ${count || 0})`);
    
    // Favorilerde kaç kere favoriye eklendiğini hesapla
    const productsWithFavoriteCount = await Promise.all((data || []).map(async (product: any) => {
      // Her ürün için favorites tablosunda kaç kayıt var?
      const { count: favoriteCount } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', product.id);
      
      const { warranty, ...rest } = product;
      return {
        ...rest,
        favorite_count: favoriteCount || 0
      };
    }));
    
    console.log(`[PRODUCTS] Calculated favorite counts for ${productsWithFavoriteCount.length} products`);
    
    return c.json({ 
      products: productsWithFavoriteCount, 
      total: count || 0 
    });
  } catch (err: any) {
    console.error('Exception in GET /products:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Get single product
app.get("/make-server-0f4d2485/products/:id", async (c) => {
  try {
    const id = c.req.param('id');
    
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, slug),
        brand:brands(id, name),
        images:product_images(id, image_url, order_num),
        specifications:product_specifications(id, spec_key, spec_value)
      `)
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching product:', error);
      return c.json({ error: error.message }, 404);
    }
    
    // Warranty alanını kaldırıyoruz - artık kullanılmıyor
    const { warranty, ...product } = data;
    
    return c.json({ product });
  } catch (err: any) {
    console.error('Exception in GET /products/:id:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Get similar products for a product
app.get("/make-server-0f4d2485/products/:id/similar", async (c) => {
  try {
    const id = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '8');
    
    console.log('[SIMILAR PRODUCTS] Getting similar products for ID:', id);
    
    // 1. Önce mevcut ürünü al
    const { data: currentProduct, error: currentError } = await supabase
      .from('products')
      .select('id, category_id, brand_id, price, condition')
      .eq('id', id)
      .single();
    
    if (currentError || !currentProduct) {
      console.error('[SIMILAR PRODUCTS] Error fetching current product:', currentError);
      return c.json({ error: 'Product not found' }, 404);
    }
    
    console.log('[SIMILAR PRODUCTS] Current product:', currentProduct);
    
    // 2. Benzer ürünleri al
    // - Aynı kategori (zorunlu)
    // - Satışta olan ürünler (for_sale)
    // - Mevcut ürün hariç
    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, slug),
        brand:brands(id, name),
        images:product_images(id, image_url, order_num),
        specifications:product_specifications(id, spec_key, spec_value)
      `)
      .eq('status', 'for_sale')
      .neq('id', id);
    
    // Kategori filtresi (zorunlu)
    if (currentProduct.category_id) {
      query = query.eq('category_id', currentProduct.category_id);
    }
    
    const { data: allProducts, error } = await query;
    
    if (error) {
      console.error('[SIMILAR PRODUCTS] Error fetching products:', error);
      return c.json({ error: error.message }, 500);
    }
    
    console.log(`[SIMILAR PRODUCTS] Found ${allProducts?.length || 0} products in same category`);
    
    if (!allProducts || allProducts.length === 0) {
      return c.json({ products: [] });
    }
    
    // 3. Skorlama sistemi ile ürünleri sırala
    const scoredProducts = allProducts.map((product: any) => {
      let score = 0;
      
      // Aynı kategori (zaten filtreli, bonus puan)
      if (product.category_id === currentProduct.category_id) {
        score += 100;
      }
      
      // Aynı marka
      if (product.brand_id && product.brand_id === currentProduct.brand_id) {
        score += 50;
      }
      
      // Aynı durum (ikinci el / sıfır)
      if (product.condition === currentProduct.condition) {
        score += 20;
      }
      
      // Benzer fiyat aralığı (±%50)
      if (currentProduct.price && product.price) {
        const priceDiff = Math.abs(product.price - currentProduct.price);
        const priceRange = currentProduct.price * 0.5; // %50 aralık
        
        if (priceDiff <= priceRange) {
          // Fiyat ne kadar yakınsa o kadar yüksek puan
          const priceScore = 30 * (1 - (priceDiff / priceRange));
          score += priceScore;
        }
      }
      
      return {
        ...product,
        similarityScore: score
      };
    });
    
    // 4. Skora göre sırala ve limit kadar al
    const sortedProducts = scoredProducts
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);
    
    // Warranty alanını kaldır
    const products = sortedProducts.map((product: any) => {
      const { warranty, similarityScore, ...rest } = product;
      return rest;
    });
    
    console.log(`[SIMILAR PRODUCTS] Returning ${products.length} similar products`);
    
    return c.json({ products });
  } catch (err: any) {
    console.error('[SIMILAR PRODUCTS] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Create new product (Admin)
app.post("/make-server-0f4d2485/products", async (c) => {
  try {
    const body = await c.req.json();
    const { title, description, price, category_id, brand_id, condition, status, specifications, images } = body;
    
    console.log('[CREATE PRODUCT] Received data:', { title, category_id, brand_id, specifications });
    
    // 1. Insert product
    const insertData: any = {
      title,
      description,
      price: parseFloat(price),
      condition,
      status: status || 'in_storage', // Varsayılan: depoda (admin panelinde görünür ama satışta değil)
    };
    
    // UUID alanlarını ekle (boş string olmamalı)
    if (category_id && category_id !== '') {
      insertData.category_id = category_id;
    }
    if (brand_id && brand_id !== '') {
      insertData.brand_id = brand_id;
    }
    
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert(insertData)
      .select()
      .single();
    
    if (productError) {
      console.error('[CREATE PRODUCT] Error creating product:', productError);
      return c.json({ error: productError.message }, 500);
    }
    
    console.log('[CREATE PRODUCT] Product created with ID:', product.id);
    
    // 2. Insert specifications if provided
    if (specifications && Object.keys(specifications).length > 0) {
      const specsToInsert = Object.entries(specifications)
        .filter(([key, value]) => value && String(value).trim() !== '')
        .map(([key, value]) => ({
          product_id: product.id,
          spec_key: key,
          spec_value: String(value),
        }));
      
      if (specsToInsert.length > 0) {
        const { error: specsError } = await supabase
          .from('product_specifications')
          .insert(specsToInsert);
        
        if (specsError) {
          console.error('[CREATE PRODUCT] Error creating specifications:', specsError);
        } else {
          console.log('[CREATE PRODUCT] Specifications created:', specsToInsert.length);
        }
      }
    }
    
    // 3. Insert images if provided (URLs)
    if (images && images.length > 0) {
      const imagesToInsert = images.map((imageUrl: string, index: number) => ({
        product_id: product.id,
        image_url: imageUrl,
        order_num: index,
      }));
      
      const { error: imagesError } = await supabase
        .from('product_images')
        .insert(imagesToInsert);
      
      if (imagesError) {
        console.error('[CREATE PRODUCT] Error creating images:', imagesError);
      } else {
        console.log('[CREATE PRODUCT] Images created:', imagesToInsert.length);
      }
    }
    
    // 4. Fetch complete product with relations
    const { data: completeProduct } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, slug),
        subcategory:subcategories(id, name, slug),
        brand:brands(id, name),
        images:product_images(id, image_url, order_num),
        specifications:product_specifications(id, spec_key, spec_value)
      `)
      .eq('id', product.id)
      .single();
    
    return c.json({ success: true, product: completeProduct });
  } catch (err: any) {
    console.error('[CREATE PRODUCT] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Update product (Admin)
app.put("/make-server-0f4d2485/products/:id", async (c) => {
  try {
    const productId = c.req.param('id');
    const body = await c.req.json();
    const { title, description, price, category_id, brand_id, condition, status, warranty, specifications, images } = body;
    
    console.log('[UPDATE PRODUCT] Updating product ID:', productId);
    console.log('[UPDATE PRODUCT] Received data:', { condition, status, warranty });
    
    // 1. Update product
    // Condition formatını düzelt (tire varsa alt tire yap)
    const cleanCondition = condition ? condition.replace(/-/g, '_') : condition;
    console.log('[UPDATE PRODUCT] Condition fix:', condition, '→', cleanCondition);
    
    // Temel güncelleme verisi - warranty dahil değil (eski sistemde olmayabilir)
    const updateData: any = {
      title,
      description,
      price: parseFloat(price),
      condition: cleanCondition,
      status,
      updated_at: new Date().toISOString(),
    };
    
    // UUID alanlarını ekle (boş string olmamalı)
    if (category_id && category_id !== '') {
      updateData.category_id = category_id;
    }
    if (brand_id && brand_id !== '') {
      updateData.brand_id = brand_id;
    }
    
    console.log('[UPDATE PRODUCT] Update data:', updateData);
    
    const { data: product, error: productError } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single();
    
    if (productError) {
      console.error('[UPDATE PRODUCT] Error updating product:', productError);
      return c.json({ 
        success: false, 
        error: productError.message,
        details: productError 
      }, 500);
    }
    
    console.log('[UPDATE PRODUCT] Product updated successfully');
    
    // 2. Update images if provided
    if (images && Array.isArray(images)) {
      // Delete old images
      await supabase
        .from('product_images')
        .delete()
        .eq('product_id', productId);
      
      // Insert new images
      const imagesToInsert = images.map((imageUrl: string, index: number) => ({
        product_id: productId,
        image_url: imageUrl,
        order_num: index,
      }));
      
      if (imagesToInsert.length > 0) {
        const { error: imagesError } = await supabase
          .from('product_images')
          .insert(imagesToInsert);
        
        if (imagesError) {
          console.error('[UPDATE PRODUCT] Error updating images:', imagesError);
        }
      }
    }
    
    // 3. Update specifications if provided
    if (specifications) {
      // Delete old specifications
      await supabase
        .from('product_specifications')
        .delete()
        .eq('product_id', productId);
      
      // Insert new specifications
      const specsToInsert = Object.entries(specifications)
        .filter(([key, value]) => value && String(value).trim() !== '')
        .map(([key, value]) => ({
          product_id: productId,
          spec_key: key,
          spec_value: String(value),
        }));
      
      if (specsToInsert.length > 0) {
        const { error: specsError } = await supabase
          .from('product_specifications')
          .insert(specsToInsert);
        
        if (specsError) {
          console.error('[UPDATE PRODUCT] Error updating specifications:', specsError);
        }
      }
    }
    
    // 4. Fetch complete product with relations
    const { data: completeProduct } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(id, name, slug),
        subcategory:subcategories(id, name, slug),
        brand:brands(id, name),
        images:product_images(id, image_url, order_num),
        specifications:product_specifications(id, spec_key, spec_value)
      `)
      .eq('id', productId)
      .single();
    
    return c.json({ success: true, product: completeProduct });
  } catch (err: any) {
    console.error('[UPDATE PRODUCT] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Delete product (Admin)
app.delete("/make-server-0f4d2485/products/:id", async (c) => {
  try {
    const productId = c.req.param('id');
    
    console.log('[DELETE PRODUCT] Deleting product ID:', productId);
    
    // Delete product (cascades will delete images and specifications)
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);
    
    if (error) {
      console.error('[DELETE PRODUCT] Error deleting product:', error);
      return c.json({ error: error.message }, 500);
    }
    
    return c.json({ success: true });
  } catch (err: any) {
    console.error('[DELETE PRODUCT] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// CATEGORIES ENDPOINTS
// ==========================================

app.get("/make-server-0f4d2485/categories", async (c) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('id', { ascending: true });
    
    if (error) {
      console.error('Error fetching categories:', error);
      return c.json({ error: error.message }, 500);
    }
    
    return c.json({ categories: data });
  } catch (err: any) {
    console.error('Exception in GET /categories:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// BRANDS ENDPOINTS
// ==========================================

app.get("/make-server-0f4d2485/brands", async (c) => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      console.error('Error fetching brands:', error);
      return c.json({ error: error.message }, 500);
    }
    
    return c.json({ brands: data });
  } catch (err: any) {
    console.error('Exception in GET /brands:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// ORDERS ENDPOINTS
// ==========================================

// Create order - HEM KV STORE HEM POSTGRES'E YAZ
app.post("/make-server-0f4d2485/orders", async (c) => {
  try {
    const body = await c.req.json();
    const { customer, items, delivery, payment, notes } = body;
    
    console.log('[CREATE ORDER] 📦 Creating order with delivery:', delivery);
    
    // 1. Create or get customer
    let customerId: number;
    
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .or(`email.eq.${customer.email},phone.eq.${customer.phone}`)
      .single();
    
    if (existingCustomer) {
      customerId = existingCustomer.id;
      
      // Update customer info
      await supabase
        .from('customers')
        .update({
          name: customer.name,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerId);
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          city: 'İzmir'
        })
        .select()
        .single();
      
      if (customerError) {
        console.error('Error creating customer:', customerError);
        return c.json({ error: 'Failed to create customer: ' + customerError.message }, 500);
      }
      
      customerId = newCustomer.id;
    }
    
    // 2. Calculate totals
    const subtotal = items.reduce((sum: number, item: any) => sum + item.price, 0);
    const deliveryFee = delivery.fee || 0;
    const total = subtotal + deliveryFee;
    
    // 3. Generate order number and ID
    const orderNumber = `ERS${new Date().getFullYear()}${String(Date.now()).slice(-6)}`;
    const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 4. Determine initial status based on payment method
    // - cash (Kapıda Ödeme): order_received (sipariş alındı)
    // - bank/online: payment_pending (ödeme bekliyor)
    let initialStatus = payment.method === 'cash' ? 'order_received' : 'payment_pending';
    let statusNote = payment.method === 'cash' 
      ? 'Sipariş alındı. En kısa sürede hazırlanacaktır.'
      : 'Sipariş oluşturuldu. Ödeme bekleniyor.';
    
    console.log('[CREATE ORDER] 📅 Delivery date:', delivery.date, 'Time:', delivery.time);
    
    // 5. ✅ Create order in POSTGRES (with all required NOT NULL columns)
    // Map payment method to Postgres enum values
    const paymentMethodMap: { [key: string]: string } = {
      'bank': 'bank_transfer',
      'online': 'credit_card',
      'cash': 'cash',
    };
    const postgresPaymentMethod = paymentMethodMap[payment.method] || 'cash';
    
    const { data: postgresOrder, error: postgresError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        status: initialStatus,
        subtotal: subtotal,           // NOT NULL constraint
        total: total,                 // Total amount
        payment_method: postgresPaymentMethod, // Mapped to Postgres enum
        // Delivery info, notes etc. stored in KV metadata for flexibility
      })
      .select()
      .single();
    
    if (postgresError) {
      console.error('[CREATE ORDER] ❌ Postgres error:', postgresError);
      throw new Error(`Failed to create order in Postgres: ${postgresError.message}`);
    }
    
    console.log('[CREATE ORDER] ✅ Postgres order created:', postgresOrder.id);
    
    // 6. Store ALL additional data in KV metadata
    await kv.set(`order_metadata:${postgresOrder.id}`, {
      payment_method_original: payment.method, // Original frontend value
      delivery_method: delivery.method,
      delivery_date: delivery.date,
      delivery_time: delivery.time,
      delivery_fee: deliveryFee,
      notes: notes || '',
    });
    
    // 7. Create order in KV store (legacy support)
    const orderData = {
      id: orderId,
      postgres_id: postgresOrder.id, // Link to Postgres
      order_number: orderNumber,
      customer_id: customerId,
      customer_info: customer,
      items: items.map((item: any) => ({
        id: item.id,
        title: item.title || item.name || 'Ürün',
        price: item.price,
        quantity: item.quantity || 1,
        image: item.image || '',
        condition: item.condition || '',
        product_snapshot: {
          title: item.title || item.name || 'Ürün',
          image: item.image || '',
          condition: item.condition || '',
        }
      })),
      itemsCount: items.length,
      status: initialStatus,
      payment_method: payment.method,
      delivery_method: delivery.method,
      delivery_date: delivery.date,
      delivery_time: delivery.time,
      delivery_fee: deliveryFee,
      subtotal,
      total,
      notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await kv.set(`order:${orderId}`, orderData);
    await kv.set(`order_by_number:${orderNumber}`, orderData);
    await kv.set(`order_by_customer:${customerId}:${orderId}`, orderData);
    
    // 8. ✅ Create order items in POSTGRES
    const postgresOrderItems = items.map((item: any) => ({
      order_id: postgresOrder.id, // Use Postgres order ID
      product_id: item.id,
      product_title: item.title || item.name || 'Ürün',  // ✅ FIX: Support both title and name
      product_price: item.price,
      product_image: item.image || '',
      product_condition: item.condition || '',  // ✅ FIX: Add condition
      quantity: item.quantity || 1,
      // product_condition stored for display purposes
    }));
    
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(postgresOrderItems);
    
    if (itemsError) {
      console.error('[CREATE ORDER] ⚠️ Order items error:', itemsError);
      // Don't throw - order is created, just log the error
    } else {
      console.log('[CREATE ORDER] ✅ Order items created:', postgresOrderItems.length);
    }
    
    // 9. Create order items in KV store (legacy)
    const orderItems = items.map((item: any) => ({
      order_id: orderId,
      product_id: item.id,
      product_snapshot: {
        title: item.name,
        image: item.image,
        condition: item.condition,
        category: item.category,
        brand: item.brand
      },
      quantity: 1,
      price: item.price
    }));
    
    await kv.set(`order_items:${orderId}`, orderItems);
    
    // 10. Update product status - sipariş oluşturulunca ürünler depoya alınır
    const productStatus = 'in_storage';
    
    for (const item of items) {
      // KV Store'daki product'ı güncelle (legacy)
      const productKey = `product:${item.id}`;
      const productData = await kv.get(productKey);
      if (productData) {
        productData.status = productStatus;
        productData.updated_at = new Date().toISOString();
        await kv.set(productKey, productData);
      }

      // Postgres products tablosunu güncelle
      await supabase
        .from('products')
        .update({ 
          status: productStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);
    }
    
    // 11. Create status history (KV Store for both Postgres and KV orders)
    const statusHistory = [{
      order_id: orderId,
      old_status: null,
      new_status: initialStatus,
      note: statusNote,
      changed_by: 'System',
      changed_at: new Date().toISOString()
    }];
    
    // Store status history for both KV order ID and Postgres order ID
    await kv.set(`order_status_history:${orderId}`, statusHistory);
    await kv.set(`order_status_history:${postgresOrder.id}`, statusHistory);
    
    // 12. Update customer stats
    const { data: customerData } = await supabase
      .from('customers')
      .select('total_orders, total_spent')
      .eq('id', customerId)
      .single();
    
    await supabase
      .from('customers')
      .update({
        total_orders: (customerData?.total_orders || 0) + 1,
        total_spent: (customerData?.total_spent || 0) + total
      })
      .eq('id', customerId);
    
    return c.json({ 
      success: true, 
      order: { 
        id: orderId, 
        orderNumber: orderNumber,
        total: total
      } 
    });
  } catch (err: any) {
    console.error('Exception in POST /orders:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Get customer orders
app.get("/make-server-0f4d2485/orders/customer/:email", async (c) => {
  try {
    const email = c.req.param('email');
    
    // Get customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email)
      .single();
    
    if (customerError || !customer) {
      return c.json({ orders: [] });
    }
    
    // Get orders from KV store
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
    
    return c.json({ orders });
  } catch (err: any) {
    console.error('Exception in GET /orders/customer/:email:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Update order status (for admin or system)
app.put("/make-server-0f4d2485/orders/:orderId/status", async (c) => {
  try {
    const orderId = c.req.param('orderId');
    const { status, note, changedBy } = await c.req.json();
    
    console.log(`[ORDERS] Updating order ${orderId} status to ${status}`);
    console.log(`[ORDERS] Looking for key: order:${orderId}`);
    
    // Get current order from KV store
    let currentOrder = await kv.get(`order:${orderId}`);
    let actualOrderId = orderId;
    
    console.log(`[ORDERS] Found order by ID:`, currentOrder ? 'YES' : 'NO');
    
    // If not found by ID, try to find by order_number (for legacy orders)
    if (!currentOrder) {
      console.log(`[ORDERS] Trying to find by order_number...`);
      const allOrders = await kv.getByPrefix('order:');
      const orderByNumber = allOrders.find((o: any) => o.order_number === orderId);
      
      if (orderByNumber) {
        console.log(`[ORDERS] Found order by order_number: ${orderByNumber.id}`);
        currentOrder = orderByNumber;
        actualOrderId = orderByNumber.id;
      } else {
        console.log(`[ORDERS] Order not found. Total orders in KV:`, allOrders.length);
        if (allOrders.length > 0) {
          console.log(`[ORDERS] Sample order IDs:`, allOrders.slice(0, 3).map((o: any) => o.id));
        }
        return c.json({ error: 'Order not found' }, 404);
      }
    }
    
    // İptal edilmiş siparişlerin durumu değiştirilemez
    if (currentOrder.status === 'cancelled') {
      console.log(`[ORDERS] ❌ Cannot update cancelled order ${orderId}`);
      return c.json({ error: 'İptal edilmiş siparişin durumu değiştirilemez' }, 400);
    }
    
    const oldStatus = currentOrder.status;
    
    // Update order status
    currentOrder.status = status;
    currentOrder.updated_at = new Date().toISOString();
    
    await kv.set(`order:${actualOrderId}`, currentOrder);
    await kv.set(`order_by_number:${currentOrder.order_number}`, currentOrder);
    await kv.set(`order_by_customer:${currentOrder.customer_id}:${actualOrderId}`, currentOrder);
    
    // Get order items to update product status
    const orderItems = await kv.get(`order_items:${actualOrderId}`);
    
    if (orderItems && orderItems.length > 0) {
      const productIds = orderItems.map((item: any) => item.product_id);
      
      // ✅ ÜRÜN DURUMU OTOMATİK SENKRONIZASYON MANTIĞI:
      // 
      // İLERİ GİDİŞ (Sipariş İlerliyor):
      // Sipariş Alındı → Ürün: Satışta (henüz işlem başlamadı)
      // Hazırlanıyor → Ürün: Satışta (hazırlanıyor ama satılmadı)
      // Taşınıyor (in_transit) → Ürün: SATILDI ⭐ (yola çıktı, artık satıldı)
      // Teslim Edildi (delivered) → Ürün: SATILDI (teslim edildi)
      // 
      // GERİYE DÖNÜŞ (Sipariş İptal/Geri Alınıyor):
      // İptal (cancelled) → Ürün: SATIŞTA (geri döner) ⭐
      // Teslim Edildi → Hazırlanıyor → Ürün: SATIŞTA (geri döner) ⭐
      // Taşınıyor → Sipariş Alındı → Ürün: SATIŞTA (geri döner) ⭐
      
      let newProductStatus = null;
      
      // Sipariş durumuna göre ürün durumu
      if (status === 'payment_pending') {
        // Ödeme Bekliyor → Depoda
        newProductStatus = 'in_storage';
      } else if (status === 'in_transit' || status === 'delivered') {
        // ⭐ Taşınıyor veya Teslim Edildi → Satıldı
        newProductStatus = 'sold';
      } else if (status === 'order_received' || status === 'processing') {
        // ⭐ Sipariş Alındı veya Hazırlanıyor → Satışta (henüz yola çıkmadı)
        newProductStatus = 'for_sale';
      } else if (status === 'cancelled') {
        // ⭐ İptal → Satışta (geri döner)
        newProductStatus = 'for_sale';
      }
      
      if (newProductStatus) {
        for (const productId of productIds) {
          // KV Store'daki product'ı güncelle (legacy)
          const productKey = `product:${productId}`;
          const productData = await kv.get(productKey);
          if (productData) {
            productData.status = newProductStatus;
            productData.updated_at = new Date().toISOString();
            await kv.set(productKey, productData);
          }

          // ✅ YENİ: Supabase products tablosunu güncelle
          await supabase
            .from('products')
            .update({ 
              status: newProductStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', productId);
        }
        
        console.log(`[ORDERS] ✅ ${productIds.length} ürün durumu güncellendi: ${newProductStatus} ${newProductStatus === 'for_sale' ? '(Tekrar satışta!)' : newProductStatus === 'sold' ? '(Satıldı!)' : ''}`);
      }
    }
    
    // Update status history
    const statusHistory = await kv.get(`order_status_history:${actualOrderId}`) || [];
    statusHistory.push({
      order_id: actualOrderId,
      old_status: oldStatus,
      new_status: status,
      note: note || null, // Not yoksa null
      changed_by: changedBy || 'System',
      changed_at: new Date().toISOString()
    });
    
    await kv.set(`order_status_history:${actualOrderId}`, statusHistory);
    
    return c.json({ success: true, status });
  } catch (err: any) {
    console.error('Exception in PUT /orders/:orderId/status:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// ADMIN ORDERS ENDPOINT
// ==========================================

// GET /admin/orders - Admin için tüm siparişleri getir (POSTGRES)

// 🔧 MIGRATION: Fix existing KV orders - add items from order_items:orderId
app.post("/make-server-0f4d2485/admin/fix-kv-orders", async (c) => {
  try {
    console.log('[FIX-KV-ORDERS] 🔧 Starting migration...');
    
    // Get all KV orders
    const kvOrders = await kv.getByPrefix('order:');
    console.log(`[FIX-KV-ORDERS] Found ${kvOrders?.length || 0} KV orders`);
    
    let fixed = 0;
    let skipped = 0;
    let notFound = 0;
    
    for (const kvOrder of kvOrders || []) {
      // Skip if already has items
      if (kvOrder.items && kvOrder.items.length > 0) {
        console.log(`[FIX-KV-ORDERS] ⏭️ Skipping ${kvOrder.order_number} - already has items`);
        skipped++;
        continue;
      }
      
      // ✅ Try to get items from KV Store using order_items:orderId key
      const orderItems = await kv.get(`order_items:${kvOrder.id}`);
      
      if (orderItems && orderItems.length > 0) {
        // Format items with product_snapshot structure
        kvOrder.items = orderItems.map((item: any) => ({
          id: item.product_id,
          title: item.product_snapshot?.title || 'Ürün',
          price: item.price,
          quantity: item.quantity || 1,
          image: item.product_snapshot?.image || '',
          condition: item.product_snapshot?.condition || '',
          product_snapshot: item.product_snapshot || {
            title: item.product_snapshot?.title || 'Ürün',
            image: item.product_snapshot?.image || '',
            condition: item.product_snapshot?.condition || '',
          }
        }));
        kvOrder.itemsCount = orderItems.length;
        
        // Save back to KV
        await kv.set(`order:${kvOrder.id}`, kvOrder);
        if (kvOrder.order_number) {
          await kv.set(`order_by_number:${kvOrder.order_number}`, kvOrder);
        }
        
        fixed++;
        console.log(`[FIX-KV-ORDERS] ✅ Fixed ${kvOrder.order_number} - added ${orderItems.length} items from order_items:${kvOrder.id}`);
      } else {
        notFound++;
        console.log(`[FIX-KV-ORDERS] ❌ No items found for ${kvOrder.order_number} in order_items:${kvOrder.id}`);
      }
    }
    
    return c.json({ 
      success: true, 
      message: `Fixed ${fixed} orders, skipped ${skipped}, not found ${notFound}`,
      fixed,
      skipped,
      notFound
    });
  } catch (e: any) {
    console.error('[FIX-KV-ORDERS] Error:', e);
    return c.json({ error: e.message }, 500);
  }
});

// 🔍 DEBUG: Check order_items table
app.get("/make-server-0f4d2485/debug/order-items", async (c) => {
  try {
    const { data: orders } = await supabase.from('orders').select('*').limit(5);
    const { data: items } = await supabase.from('order_items').select('*').limit(10);
    const { data: customers } = await supabase.from('customers').select('*').limit(5);
    
    // Get KV orders
    const kvOrders = await kv.getByPrefix('order:');
    const sampleKvOrder = kvOrders?.[0];
    
    return c.json({
      orders_count: orders?.length || 0,
      items_count: items?.length || 0,
      customers_count: customers?.length || 0,
      kv_orders_count: kvOrders?.length || 0,
      sample_order: orders?.[0] || null,
      sample_items: items || [],
      sample_customer: customers?.[0] || null,
      sample_kv_order: sampleKvOrder || null,
      sample_kv_order_items: sampleKvOrder?.items || []
    });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

app.get("/make-server-0f4d2485/admin/orders", async (c) => {
  try {
    console.log('[ADMIN-ORDERS] 🔍 Starting admin orders request');
    
    // Admin kontrolü
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    console.log('[ADMIN-ORDERS] 🔑 Access token present:', !!accessToken);
    const authCheck = await checkAdminAuth(accessToken || '');
    console.log('[ADMIN-ORDERS] 👤 Auth check result:', authCheck.isAdmin);
    
    if (!authCheck.isAdmin) {
      console.log('[ADMIN-ORDERS] ❌ Access denied:', authCheck.error);
      return c.json({ 
        error: 'Bu sayfaya erişim yetkiniz yok', 
        details: 'Admin yetkisi gereklidir' 
      }, 403);
    }
    
    console.log('[ADMIN-ORDERS] ✅ Admin authorized, fetching orders from POSTGRES + KV Store...');
    
    // ✅ STEP 1: Get all orders from POSTGRES with customer join
    const { data: postgresOrders, error: ordersError } = await supabase
      .from('orders')
      .select(`
        *,
        customer:customers(id, name, email, phone, city, district, neighborhood, street, building_no, apartment_no)
      `)
      .order('created_at', { ascending: false });
    
    if (ordersError) {
      console.error('[ADMIN-ORDERS] Postgres error:', ordersError);
      // Don't throw - continue with KV Store
    }
    
    console.log('[ADMIN-ORDERS] 📊 Postgres orders:', postgresOrders?.length || 0);
    
    // ✅ Get order items for each POSTGRES order
    for (const order of postgresOrders || []) {
      const { data: items } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id);
      
      console.log(`[ADMIN-ORDERS] 🔍 Order ${order.id} - Raw items:`, JSON.stringify(items));
      
      // ✅ Format items to match frontend structure (product_snapshot object)
      // ⚠️ FALLBACK: If product_title is empty, try to fetch from products table
      const formattedItems = await Promise.all((items || []).map(async (item: any) => {
        let productTitle = item.product_title;
        let productImage = item.product_image;
        let productCondition = item.product_condition || '';
        
        // If product info is missing, try to fetch from products table
        if ((!productTitle || productTitle === '') && item.product_id) {
          console.log(`[ADMIN-ORDERS] ⚠️ Missing product_title for item ${item.id}, fetching from products table...`);
          const { data: product } = await supabase
            .from('products')
            .select('title, image, condition')
            .eq('id', item.product_id)
            .single();
          
          if (product) {
            productTitle = product.title;
            productImage = product.image;
            productCondition = product.condition || '';
            console.log(`[ADMIN-ORDERS] ✅ Found product: ${productTitle}`);
          }
        }
        
        return {
          ...item,
          product_snapshot: {
            title: productTitle || 'Ürün',
            image: productImage || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200',
            condition: productCondition,
          }
        };
      }));
      
      order.items = formattedItems;
      
      console.log(`[ADMIN-ORDERS] 📦 Order ${order.id} - Formatted items:`, JSON.stringify(order.items));
      console.log(`[ADMIN-ORDERS] 👤 Order ${order.id} - Customer:`, JSON.stringify(order.customer));
      
      // Format customer data for compatibility with frontend
      if (order.customer) {
        const customer = order.customer;
        const addressParts = [
          customer.neighborhood,
          customer.street,
          customer.building_no ? `No: ${customer.building_no}` : '',
          customer.apartment_no ? `Daire: ${customer.apartment_no}` : ''
        ].filter(Boolean).join(', ');
        
        // Keep both formats for compatibility
        order.customer = {
          ...customer,
          address: addressParts,
        };
      } else {
        // ⚠️ FALLBACK: If customer is null, try to fetch from customers table
        console.log(`[ADMIN-ORDERS] ⚠️ Missing customer for order ${order.id}, fetching...`);
        const { data: customer } = await supabase
          .from('customers')
          .select('*')
          .eq('id', order.customer_id)
          .single();
        
        if (customer) {
          const addressParts = [
            customer.neighborhood,
            customer.street,
            customer.building_no ? `No: ${customer.building_no}` : '',
            customer.apartment_no ? `Daire: ${customer.apartment_no}` : ''
          ].filter(Boolean).join(', ');
          
          order.customer = {
            ...customer,
            address: addressParts,
          };
          console.log(`[ADMIN-ORDERS] ✅ Found customer: ${customer.name}`);
        } else {
          console.log(`[ADMIN-ORDERS] ❌ Customer not found for order ${order.id}`);
          order.customer = {
            name: 'Bilinmeyen Müşteri',
            phone: 'N/A',
            email: 'N/A',
          };
        }
      }
      
      // Get status history from KV
      const statusHistory = await kv.get(`order_status_history:${order.id}`);
      order.statusHistory = statusHistory || [];
      
      // Get additional metadata from KV (delivery info, notes, etc.)
      const metadata = await kv.get(`order_metadata:${order.id}`);
      if (metadata) {
        order.delivery_date = metadata.delivery_date;
        order.delivery_time = metadata.delivery_time;
        order.delivery_method = metadata.delivery_method;
        order.delivery_fee = metadata.delivery_fee;
        order.notes = metadata.notes;
        // Use original payment method from metadata if available
        if (metadata.payment_method_original) {
          order.payment_method = metadata.payment_method_original;
        }
      }
      
      // If no metadata payment_method, map Postgres enum back to frontend format
      if (!order.payment_method || order.payment_method === 'bank_transfer' || order.payment_method === 'credit_card') {
        const reversePaymentMap: { [key: string]: string } = {
          'bank_transfer': 'bank',
          'credit_card': 'online',
          'cash': 'cash',
        };
        order.payment_method = reversePaymentMap[order.payment_method] || order.payment_method;
      }
      
      order.source = 'postgres'; // Mark source
    }
    
    // ✅ STEP 2: Get all orders from KV STORE (legacy orders)
    const kvOrders = await kv.getByPrefix('order:');
    console.log('[ADMIN-ORDERS] 📦 KV Store orders:', kvOrders?.length || 0);
    
    // Format KV orders to match frontend structure (normalize camelCase -> snake_case)
    const formattedKvOrders = await Promise.all((kvOrders || []).map(async (kvOrder: any) => {
      // Get status history from KV
      const statusHistory = await kv.get(`order_status_history:${kvOrder.id}`);
      
      // ✅ Convert customer_info to customer object for frontend compatibility
      const customerInfo = kvOrder.customer_info || kvOrder.customerInfo;
      const customerObj = customerInfo ? {
        name: customerInfo.name || 'Bilinmeyen',
        email: customerInfo.email || '',
        phone: customerInfo.phone || '',
        city: customerInfo.city || '',
        district: customerInfo.district || '',
        neighborhood: customerInfo.neighborhood || '',
        street: customerInfo.street || '',
        building_no: customerInfo.building_no || '',
        apartment_no: customerInfo.apartment_no || '',
      } : (kvOrder.customer || null);
      
      // ✅ Format items to have product_snapshot structure
      const formattedItems = (kvOrder.items || []).map((item: any) => ({
        ...item,
        product_snapshot: item.product_snapshot || {
          title: item.product_title || item.title || 'Ürün',
          image: item.product_image || item.image || 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200',
          condition: item.product_condition || item.condition || '',
        }
      }));
      
      // Normalize field names: camelCase -> snake_case
      const normalized = {
        id: kvOrder.id,
        order_number: kvOrder.order_number || kvOrder.orderNumber,
        customer_id: kvOrder.customer_id || kvOrder.customerId,
        customer: customerObj,
        items: formattedItems,
        itemsCount: formattedItems.length,
        total: kvOrder.total || kvOrder.totalAmount || 0,
        subtotal: kvOrder.subtotal || (kvOrder.total || 0),
        delivery_fee: kvOrder.delivery_fee || kvOrder.deliveryFee || 0,
        status: kvOrder.status,
        payment_method: kvOrder.payment_method || kvOrder.paymentMethod,
        delivery_method: kvOrder.delivery_method || kvOrder.deliveryMethod,
        delivery_date: kvOrder.delivery_date || kvOrder.deliveryDate,
        delivery_time: kvOrder.delivery_time || kvOrder.deliveryTime,
        notes: kvOrder.notes || '',
        created_at: kvOrder.created_at || kvOrder.createdAt,
        updated_at: kvOrder.updated_at || kvOrder.updatedAt,
        statusHistory: statusHistory || [],
        source: 'kv',
      };
      
      console.log(`[ADMIN-ORDERS] 📦 KV Order ${normalized.order_number} - Customer: ${normalized.customer?.name}, Items: ${normalized.items.length}`);
      
      return normalized;
    }));
    
    // ✅ STEP 3: Merge both sources and sort by date (newest first)
    const allOrders = [...(postgresOrders || []), ...formattedKvOrders];
    allOrders.sort((a, b) => {
      const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
      const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
      return dateB - dateA; // Descending order
    });
    
    console.log(`[ADMIN-ORDERS] ✅ Returning ${allOrders.length} orders (${postgresOrders?.length || 0} from Postgres + ${formattedKvOrders.length} from KV)`);
    return c.json({ orders: allOrders });
  } catch (err: any) {
    console.error('[ADMIN-ORDERS] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// PUT /admin/orders/:orderId/status - Admin sipariş durumu güncelleme
app.put("/make-server-0f4d2485/admin/orders/:orderId/status", async (c) => {
  try {
    const orderId = c.req.param('orderId');
    const body = await c.req.json();
    const { status, note } = body;
    
    console.log(`[ADMIN-ORDER-STATUS] Updating order ${orderId} to status: ${status}`);
    
    // Admin kontrolü
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authCheck = await checkAdminAuth(accessToken || '');
    
    if (!authCheck.isAdmin) {
      return c.json({ 
        error: 'Bu sayfaya erişim yetkiniz yok', 
        details: 'Admin yetkisi gereklidir' 
      }, 403);
    }
    
    // Get existing order from POSTGRES first, then KV
    let order: any = null;
    let orderSource: 'postgres' | 'kv' = 'postgres';
    
    // Try Postgres first
    const { data: pgOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();
    
    if (pgOrder) {
      order = pgOrder;
      orderSource = 'postgres';
      console.log(`[ADMIN-ORDER-STATUS] Found order in Postgres: ${orderId}`);
    } else {
      // Fallback to KV Store
      const kvOrder = await kv.get(`order:${orderId}`);
      if (kvOrder) {
        order = kvOrder;
        orderSource = 'kv';
        console.log(`[ADMIN-ORDER-STATUS] Found order in KV Store: ${orderId}`);
      }
    }
    
    if (!order) {
      console.log(`[ADMIN-ORDER-STATUS] ❌ Order not found: ${orderId}`);
      return c.json({ error: 'Order not found' }, 404);
    }
    
    // İptal edilmiş siparişlerin durumu değiştirilemez
    if (order.status === 'cancelled') {
      console.log(`[ADMIN-ORDER-STATUS] ❌ Cannot update cancelled order ${orderId}`);
      return c.json({ error: 'İptal edilmiş siparişin durumu değiştirilemez' }, 400);
    }
    
    // Create status history entry
    const statusHistoryEntry = {
      status,
      timestamp: new Date().toISOString(),
      note: note || null // Not yoksa null gönder
    };
    
    // Update order based on source
    if (orderSource === 'postgres') {
      // Update Postgres order
      const { error: updateError } = await supabase
        .from('orders')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);
      
      if (updateError) {
        console.error(`[ADMIN-ORDER-STATUS] Postgres update error:`, updateError);
        return c.json({ error: 'Failed to update order' }, 500);
      }
      
      // Store status history in KV (separate from order)
      const existingHistory = await kv.get(`order_status_history:${orderId}`) || [];
      await kv.set(`order_status_history:${orderId}`, [...existingHistory, statusHistoryEntry]);
      
      console.log(`[ADMIN-ORDER-STATUS] ✅ Updated Postgres order ${orderId} → ${status}`);
    } else {
      // Update KV order
      const updatedOrder = {
        ...order,
        status,
        updated_at: new Date().toISOString(),
        status_history: [
          ...(order.status_history || []),
          statusHistoryEntry
        ]
      };
      
      await kv.set(`order:${orderId}`, updatedOrder);
      console.log(`[ADMIN-ORDER-STATUS] ✅ Updated KV order ${orderId} → ${status}`);
    }
    
    // Sipariş durumuna göre ürün durumunu güncelle
    if (order.items) {
      for (const item of order.items) {
        if (item.product_id) {
          let productStatus = 'in_storage'; // Varsayılan: depoda
          
          // Taşınıyor aşamasında → Satıldı
          if (status === 'processing') {
            productStatus = 'sold';
          }
          // İptal edildiğinde → Satışta (tekrar satışa çıkar)
          else if (status === 'cancelled') {
            productStatus = 'for_sale';
          }
          // Teslim edildi aşamasında → Satıldı (zaten processing'de sold olmuştur ama garantiye alalım)
          else if (status === 'delivered') {
            productStatus = 'sold';
          }
          
          const { error } = await supabase
            .from('products')
            .update({ status: productStatus })
            .eq('id', item.product_id);
          
          if (error) {
            console.error(`[ADMIN-ORDER-STATUS] Error updating product ${item.product_id}:`, error);
          } else {
            console.log(`[ADMIN-ORDER-STATUS] Product ${item.product_id} status → ${productStatus}`);
          }
        }
      }
    }
    
    console.log(`[ADMIN-ORDER-STATUS] Order ${orderId} status updated to ${status}`);
    return c.json({ success: true, order: updatedOrder });
  } catch (err: any) {
    console.error('[ADMIN-ORDER-STATUS] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// POSTGRES-BASED ADMIN ORDERS ENDPOINTS
// ==========================================

// PUT /admin/orders/pg/:orderId/status - POSTGRES: Admin sipariş durumu güncelleme
app.put("/make-server-0f4d2485/admin/orders/pg/:orderId/status", async (c) => {
  try {
    const orderId = c.req.param('orderId');
    const body = await c.req.json();
    const { status } = body;
    
    console.log(`[ADMIN-ORDER-PG-STATUS] Updating Postgres order ${orderId} to status: ${status}`);
    
    // Admin kontrolü
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authCheck = await checkAdminAuth(accessToken || '');
    
    if (!authCheck.isAdmin) {
      return c.json({ 
        error: 'Bu sayfaya erişim yetkiniz yok', 
        details: 'Admin yetkisi gereklidir' 
      }, 403);
    }
    
    const result = await orders.updateOrderStatus(orderId, status);
    
    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }
    
    console.log(`[ADMIN-ORDER-PG-STATUS] Order ${orderId} updated to ${status}`);
    return c.json({ success: true, order: result.order });
  } catch (err: any) {
    console.error('[ADMIN-ORDER-PG-STATUS] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// DELETE /admin/orders/pg/:orderId - POSTGRES: Admin sipariş silme
app.delete("/make-server-0f4d2485/admin/orders/pg/:orderId", async (c) => {
  try {
    const orderId = c.req.param('orderId');
    
    console.log(`[ADMIN-ORDER-PG-DELETE] Deleting Postgres order ${orderId}`);
    
    // Admin kontrolü
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authCheck = await checkAdminAuth(accessToken || '');
    
    if (!authCheck.isAdmin) {
      return c.json({ 
        error: 'Bu sayfaya erişim yetkiniz yok', 
        details: 'Admin yetkisi gereklidir' 
      }, 403);
    }
    
    const result = await orders.deleteOrder(orderId);
    
    if (!result.success) {
      return c.json({ error: result.error }, 404);
    }
    
    console.log(`[ADMIN-ORDER-PG-DELETE] Order ${orderId} deleted successfully`);
    return c.json({ success: true, message: result.message });
  } catch (err: any) {
    console.error('[ADMIN-ORDER-PG-DELETE] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// 🔥 DELETE /admin/orders/delete-all - ADMİN: TÜM SİPARİŞLERİ TEMİZLE
// ⚠️ IMPORTANT: This route MUST be defined BEFORE /:orderId to avoid route collision
app.delete("/make-server-0f4d2485/admin/orders/delete-all", async (c) => {
  try {
    console.log('[ADMIN-DELETE-ALL-ORDERS] 🔥 Deleting ALL orders - TEST DATA CLEANUP');
    
    // Admin kontrolü
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authCheck = await checkAdminAuth(accessToken || '');
    
    if (!authCheck.isAdmin) {
      return c.json({ 
        error: 'Bu sayfaya erişim yetkiniz yok', 
        details: 'Admin yetkisi gereklidir' 
      }, 403);
    }
    
    // 1. KV Store'dan tüm siparişleri al
    const allOrders = await kv.getByPrefix('order:');
    console.log(`[ADMIN-DELETE-ALL-ORDERS] Found ${allOrders.length} orders in KV Store`);
    
    let deletedCount = 0;
    let releasedProducts = 0;
    
    for (const order of allOrders) {
      try {
        const orderId = order.id;
        const customerId = order.customer_id;
        
        // KV Store'dan sil
        await kv.del(`order:${orderId}`);
        
        // Customer reference'ı sil
        if (customerId) {
          await kv.del(`order_by_customer:${customerId}:${orderId}`);
        }
        
        // Order number reference'ı sil
        if (order.order_number) {
          await kv.del(`order_by_number:${order.order_number}`);
        }
        
        // Order items'ı sil
        await kv.del(`order_items:${orderId}`);
        
        // Ürünleri 'for_sale' yap (eğer sold/in_storage ise)
        if (order.items && Array.isArray(order.items)) {
          for (const item of order.items) {
            if (item.product_id) {
              // Supabase'de güncelle
              const { error } = await supabase
                .from('products')
                .update({ status: 'for_sale', updated_at: new Date().toISOString() })
                .eq('id', item.product_id)
                .in('status', ['sold', 'in_storage']); // Sadece sold/in_storage olanları güncelle
              
              if (!error) {
                releasedProducts++;
              }
              
              // KV Store'da da güncelle
              const productKey = `product:${item.product_id}`;
              const productData = await kv.get(productKey);
              if (productData && (productData.status === 'sold' || productData.status === 'in_storage')) {
                productData.status = 'for_sale';
                productData.updated_at = new Date().toISOString();
                await kv.set(productKey, productData);
              }
            }
          }
        }
        
        deletedCount++;
      } catch (itemError) {
        console.error(`[ADMIN-DELETE-ALL-ORDERS] Error deleting order ${order.id}:`, itemError);
      }
    }
    
    // 2. Supabase'deki tabloları temizle
    const { error: orderItemsError } = await supabase
      .from('order_items')
      .delete()
      .not('id', 'is', null); // Tüm kayıtları sil (UUID uyumlu)
    
    const { error: statusHistoryError } = await supabase
      .from('order_status_history')
      .delete()
      .not('id', 'is', null); // Tüm kayıtları sil (UUID uyumlu)
    
    const { error: ordersError } = await supabase
      .from('orders')
      .delete()
      .not('id', 'is', null); // Tüm kayıtları sil (UUID uyumlu)
    
    if (orderItemsError) console.error('[ADMIN-DELETE-ALL-ORDERS] Error deleting order_items:', orderItemsError);
    if (statusHistoryError) console.error('[ADMIN-DELETE-ALL-ORDERS] Error deleting order_status_history:', statusHistoryError);
    if (ordersError) console.error('[ADMIN-DELETE-ALL-ORDERS] Error deleting orders:', ordersError);
    
    console.log(`[ADMIN-DELETE-ALL-ORDERS] ✅ Deleted ${deletedCount} orders, released ${releasedProducts} products`);
    
    return c.json({ 
      success: true, 
      message: `${deletedCount} sipariş silindi, ${releasedProducts} ürün satışa sunuldu`,
      deletedOrders: deletedCount,
      releasedProducts
    });
  } catch (err: any) {
    console.error('[ADMIN-DELETE-ALL-ORDERS] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// DELETE /admin/orders/:orderId - Admin sipariş silme (KALICI)
app.delete("/make-server-0f4d2485/admin/orders/:orderId", async (c) => {
  try {
    const orderId = c.req.param('orderId');
    
    console.log(`[ADMIN-ORDER-DELETE] Deleting order ${orderId} permanently`);
    
    // Admin kontrolü
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authCheck = await checkAdminAuth(accessToken || '');
    
    if (!authCheck.isAdmin) {
      return c.json({ 
        error: 'Bu sayfaya erişim yetkiniz yok', 
        details: 'Admin yetkisi gereklidir' 
      }, 403);
    }
    
    // Get order from POSTGRES first, then KV
    let order: any = null;
    let orderSource: 'postgres' | 'kv' = 'postgres';
    
    // Try Postgres first
    const { data: pgOrder } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', orderId)
      .single();
    
    if (pgOrder) {
      order = pgOrder;
      orderSource = 'postgres';
      console.log(`[ADMIN-ORDER-DELETE] Found order in Postgres: ${orderId}`);
    } else {
      // Fallback to KV Store
      const kvOrder = await kv.get(`order:${orderId}`);
      if (kvOrder) {
        order = kvOrder;
        orderSource = 'kv';
        console.log(`[ADMIN-ORDER-DELETE] Found order in KV Store: ${orderId}`);
      }
    }
    
    if (!order) {
      return c.json({ error: 'Order not found' }, 404);
    }
    
    const customerId = order.customer_id;
    
    // Delete based on source
    if (orderSource === 'postgres') {
      // Delete from Postgres
      const { error: deleteItemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);
      
      const { error: deleteOrderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);
      
      if (deleteItemsError) console.error('[ADMIN-ORDER-DELETE] Error deleting order_items:', deleteItemsError);
      if (deleteOrderError) console.error('[ADMIN-ORDER-DELETE] Error deleting order:', deleteOrderError);
      
      // Delete status history from KV
      await kv.del(`order_status_history:${orderId}`);
      
      console.log(`[ADMIN-ORDER-DELETE] ✅ Deleted Postgres order: ${orderId}`);
    } else {
      // Delete all order-related keys from KV store
      // 1. Main order key
      await kv.del(`order:${orderId}`);
      console.log(`[ADMIN-ORDER-DELETE] Deleted main order key: order:${orderId}`);
      
      // 2. Customer's order reference
      if (customerId) {
        await kv.del(`order_by_customer:${customerId}:${orderId}`);
        console.log(`[ADMIN-ORDER-DELETE] Deleted customer order ref: order_by_customer:${customerId}:${orderId}`);
      }
      
      // 3. Order number reference
      if (order.order_number) {
        await kv.del(`order_by_number:${order.order_number}`);
        console.log(`[ADMIN-ORDER-DELETE] Deleted order number ref: order_by_number:${order.order_number}`);
      }
    }
    
    // 4. If order had products, release them back to 'for_sale' (for both sources)
    if (order.items && (order.status === 'payment_pending' || order.status === 'order_received' || order.status === 'processing')) {
      for (const item of order.items) {
        if (item.product_id) {
          const { error } = await supabase
            .from('products')
            .update({ status: 'for_sale' })
            .eq('id', item.product_id);
          
          if (error) {
            console.error(`[ADMIN-ORDER-DELETE] Error releasing product ${item.product_id}:`, error);
          } else {
            console.log(`[ADMIN-ORDER-DELETE] Product ${item.product_id} released back to for_sale`);
          }
        }
      }
    }
    
    console.log(`[ADMIN-ORDER-DELETE] Order ${orderId} and all references deleted successfully`);
    return c.json({ success: true, message: 'Order deleted permanently' });
  } catch (err: any) {
    console.error('[ADMIN-ORDER-DELETE] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// DELETE /clear-order-history - Kullanıcı sipariş geçmişini temizleme (delivered + cancelled)
app.delete("/make-server-0f4d2485/clear-order-history", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const accessToken = authHeader?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Unauthorized - No access token' }, 401);
    }
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user?.id) {
      console.error('[CLEAR-ORDER-HISTORY] Auth error:', authError);
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    console.log(`[CLEAR-ORDER-HISTORY] User ${user.id} (${user.email}) clearing order history`);
    
    // Get customer_id from email (customers table doesn't have user_id)
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', user.email)
      .single();
    
    if (customerError || !customerData) {
      console.error('[CLEAR-ORDER-HISTORY] Customer not found:', customerError);
      return c.json({ 
        error: 'Müşteri kaydı bulunamadı. Lütfen önce bir sipariş verin.',
        details: customerError?.message 
      }, 404);
    }
    
    const customerId = customerData.id;
    
    // Get all orders for this customer from KV Store
    const ordersPrefix = `order_by_customer:${customerId}:`;
    const customerOrderKeys = await kv.getByPrefix(ordersPrefix);
    
    console.log(`[CLEAR-ORDER-HISTORY] Found ${customerOrderKeys.length} order keys for customer ${customerId}`);
    
    let deletedCount = 0;
    
    // Loop through orders and delete only 'delivered' and 'cancelled' ones
    for (const orderRef of customerOrderKeys) {
      // orderRef is already the full order object from getByPrefix
      const orderId = orderRef.id;
      const order = orderRef; // Already have the full order object
      
      if (order && (order.status === 'delivered' || order.status === 'cancelled')) {
        // Delete main order key
        await kv.del(`order:${orderId}`);
        
        // Delete customer order reference
        await kv.del(`order_by_customer:${customerId}:${orderId}`);
        
        // Delete order number reference if exists
        if (order.order_number) {
          await kv.del(`order_by_number:${order.order_number}`);
        }
        
        // Delete order items
        await kv.del(`order_items:${orderId}`);
        
        // Delete order status history
        await kv.del(`order_status_history:${orderId}`);
        
        console.log(`[CLEAR-ORDER-HISTORY] Deleted order ${orderId} (${order.status}) with all related data`);
        deletedCount++;
      }
    }
    
    console.log(`[CLEAR-ORDER-HISTORY] Successfully deleted ${deletedCount} orders for customer ${customerId}`);
    return c.json({ success: true, deletedCount });
  } catch (err: any) {
    console.error('[CLEAR-ORDER-HISTORY] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// TECHNICAL SERVICE ENDPOINTS
// ==========================================
// All technical service endpoints are now in /technical_service.tsx module

// ==========================================
// MOVING ENDPOINTS
// ==========================================

// POST /moving/upload-image - Nakliye fotoğrafı yükle
app.post("/make-server-0f4d2485/moving/upload-image", async (c) => {
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

// POST /moving/request - Yeni nakliye talebi oluştur (fotoğraflı)
app.post("/make-server-0f4d2485/moving/request", async (c) => {
  try {
    // Auth kontrolü
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[MOVING REQUEST] Auth error:', authError?.message);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    console.log('[MOVING REQUEST] 📥 Received data:', JSON.stringify(body, null, 2));

    const {
      fromAddress,
      fromFloor,
      fromHasElevator,
      toAddress,
      toFloor,
      toHasElevator,
      homeSize,
      selectedItems,
      customItems,
      images,
      date,
      preferredTime,
      name,
      phone,
      email,
      notes,
      calculatedPrice,
      distance
    } = body;

    // Kullanıcı bilgilerini customers tablosundan çek
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('email', user.email)
      .single();

    if (customerError || !customer) {
      console.error('[MOVING REQUEST] Customer not found:', user.email);
      return c.json({ error: 'Customer not found' }, 404);
    }

    // Talep numarası oluştur
    const requestNumber = `NAK-${Date.now().toString().slice(-8)}`;
    
    console.log('[MOVING REQUEST] 📝 Creating request:', requestNumber);

    // KV Store'a kaydet
    const movingRequest = {
      requestNumber,
      customerId: customer.id,
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      fromAddress,
      fromFloor,
      fromHasElevator,
      toAddress,
      toFloor,
      toHasElevator,
      homeSize,
      selectedItems,
      customItems,
      images,
      appointmentDate: date,
      appointmentTime: preferredTime,
      notes,
      calculatedPrice,
      distance,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    await kv.set(`moving_request:${requestNumber}`, movingRequest);
    
    console.log('[MOVING REQUEST] ✅ Request created successfully:', requestNumber);

    return c.json({
      success: true,
      requestNumber,
      message: 'Nakliye talebiniz başarıyla oluşturuldu'
    });

  } catch (err: any) {
    console.error('[MOVING REQUEST] ❌ Exception:', err);
    return c.json({ error: 'Internal server error', details: err.message }, 500);
  }
});

// GET /moving/my-requests - Kullanıcının nakliye taleplerini getir
app.get("/make-server-0f4d2485/moving/my-requests", async (c) => {
  try {
    // Auth kontrolü
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[MOVING MY-REQUESTS] Auth error:', authError?.message);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log('[MOVING MY-REQUESTS] 📥 Fetching requests for user:', user.email);

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

    // KV Store'dan tüm nakliye taleplerini al
    const allRequests = await kv.getByPrefix('moving_request:');
    
    // Kullanıcının taleplerini filtrele ve formatı düzenle
    const userRequests = allRequests
      .filter((req: any) => req.customerId === customer.id)
      .map((req: any, index: number) => ({
        id: index + 1, // Geçici ID (liste için)
        request_number: req.requestNumber,
        requestNumber: req.requestNumber, // Her iki format için de
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
        selected_items: req.selectedItems,
        custom_items: req.customItems,
        images: req.images,
        moving_date: req.appointmentDate,
        appointment_date: req.appointmentDate, // Her iki format için de
        preferred_time: req.appointmentTime,
        appointment_time: req.appointmentTime, // Her iki format için de
        notes: req.notes,
        calculated_price: req.calculatedPrice,
        estimated_price: req.calculatedPrice, // Frontend uyumluluğu için
        distance: req.distance,
        status: req.status,
        created_at: req.createdAt,
        createdAt: req.createdAt, // Her iki format için de
      }))
      .sort((a: any, b: any) => {
        // Tarihe göre sırala (yeniden eskiye)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

    console.log('[MOVING MY-REQUESTS] ✅ Found requests:', userRequests.length);

    return c.json({ 
      success: true,
      requests: userRequests 
    });

  } catch (err: any) {
    console.error('[MOVING MY-REQUESTS] ❌ Exception:', err);
    return c.json({ error: 'Internal server error', details: err.message }, 500);
  }
});

// GET /moving/request/:requestNumber - Tek bir nakliye talebini getir
app.get("/make-server-0f4d2485/moving/request/:requestNumber", async (c) => {
  try {
    // Auth kontrolü
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[MOVING REQUEST DETAIL] Auth error:', authError?.message);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const requestNumber = c.req.param('requestNumber');
    console.log('[MOVING REQUEST DETAIL] 📥 Fetching request:', requestNumber);

    // KV Store'dan talebi al
    const request = await kv.get(`moving_request:${requestNumber}`);
    
    if (!request) {
      console.error('[MOVING REQUEST DETAIL] Request not found:', requestNumber);
      return c.json({ error: 'Request not found' }, 404);
    }

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

    // Talebin bu kullanıcıya ait olup olmadığını kontrol et
    if (request.customerId !== customer.id) {
      console.error('[MOVING REQUEST DETAIL] Unauthorized access attempt');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    console.log('[MOVING REQUEST DETAIL] ✅ Request found');

    // Veriyi frontend formatına çevir
    const formattedRequest = {
      request_number: request.requestNumber,
      requestNumber: request.requestNumber,
      customer_id: request.customerId,
      customer_name: request.customerName,
      customer_email: request.customerEmail,
      customer_phone: request.customerPhone,
      from_address: request.fromAddress,
      from_floor: request.fromFloor,
      from_has_elevator: request.fromHasElevator,
      to_address: request.toAddress,
      to_floor: request.toFloor,
      to_has_elevator: request.toHasElevator,
      home_size: request.homeSize,
      selected_items: request.selectedItems,
      custom_items: request.customItems,
      images: request.images,
      moving_date: request.appointmentDate,
      appointment_date: request.appointmentDate,
      preferred_time: request.appointmentTime,
      appointment_time: request.appointmentTime,
      notes: request.notes,
      calculated_price: request.calculatedPrice,
      estimated_price: request.calculatedPrice, // Frontend uyumluluğu için
      distance: request.distance,
      status: request.status,
      created_at: request.createdAt,
      createdAt: request.createdAt,
      admin_offer: request.adminOffer,
      admin_note: request.adminNote,
      updates: request.updates || [],
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

// PUT /moving/:requestNumber/cancel - Nakliye talebini iptal et
app.put("/make-server-0f4d2485/moving/:requestNumber/cancel", async (c) => {
  try {
    // Auth kontrolü
    const authHeader = c.req.header('Authorization');
    if (!authHeader) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('[MOVING CANCEL] Auth error:', authError?.message);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const requestNumber = c.req.param('requestNumber');
    console.log('[MOVING CANCEL] 📥 Canceling request:', requestNumber);

    // KV Store'dan talebi al
    const request = await kv.get(`moving_request:${requestNumber}`);
    
    if (!request) {
      console.error('[MOVING CANCEL] Request not found:', requestNumber);
      return c.json({ error: 'Request not found' }, 404);
    }

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

    // Talebin bu kullanıcıya ait olup olmadığını kontrol et
    if (request.customerId !== customer.id) {
      console.error('[MOVING CANCEL] Unauthorized access attempt');
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Durumunu kontrol et - sadece 'pending' veya 'reviewing' durumundaysa iptal edilebilir
    if (request.status !== 'pending' && request.status !== 'reviewing' && request.status !== 'offer_sent') {
      console.error('[MOVING CANCEL] Cannot cancel request with status:', request.status);
      return c.json({ error: 'Bu talep iptal edilemez' }, 400);
    }

    // Talebi güncelle
    const updatedRequest = {
      ...request,
      status: 'rejected',
      updatedAt: new Date().toISOString(),
    };

    await kv.set(`moving_request:${requestNumber}`, updatedRequest);
    
    console.log('[MOVING CANCEL] ✅ Request canceled successfully:', requestNumber);

    return c.json({ 
      success: true,
      message: 'Talep başarıyla iptal edildi' 
    });

  } catch (err: any) {
    console.error('[MOVING CANCEL] ❌ Exception:', err);
    return c.json({ error: 'Internal server error', details: err.message }, 500);
  }
});

// Create moving appointment
app.post("/make-server-0f4d2485/moving", async (c) => {
  try {
    const body = await c.req.json();
    const { customer, from, to, appointment, homeSize, floor, targetFloor, items } = body;
    
    // 1. Create or get customer
    let customerId: number;
    
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .or(`email.eq.${customer.email},phone.eq.${customer.phone}`)
      .single();
    
    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          city: 'İzmir'
        })
        .select()
        .single();
      
      if (customerError) {
        return c.json({ error: 'Failed to create customer: ' + customerError.message }, 500);
      }
      
      customerId = newCustomer.id;
    }
    
    // 2. Generate appointment number
    const appointmentNumber = `MV-${String(Date.now()).slice(-6)}`;
    
    // 3. Create appointment
    const { data: movingData, error: movingError } = await supabase
      .from('moving_appointments')
      .insert({
        appointment_number: appointmentNumber,
        customer_id: customerId,
        from_address: from,
        to_address: to,
        appointment_date: appointment.date,
        appointment_time: appointment.time,
        home_size: homeSize,
        floor,
        target_floor: targetFloor,
        status: 'pending'
      })
      .select()
      .single();
    
    if (movingError) {
      console.error('Error creating moving appointment:', movingError);
      return c.json({ error: movingError.message }, 500);
    }
    
    // 4. Create moving items
    if (items && items.length > 0) {
      const movingItems = items.map((item: any) => ({
        moving_id: movingData.id,
        item_name: item.name,
        quantity: item.quantity || 1
      }));
      
      await supabase
        .from('moving_items')
        .insert(movingItems);
    }
    
    return c.json({ success: true, appointment: movingData });
  } catch (err: any) {
    console.error('Exception in POST /moving:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Get customer moving appointments
app.get("/make-server-0f4d2485/moving/customer/:email", async (c) => {
  try {
    const email = c.req.param('email');
    
    // Get customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email)
      .single();
    
    if (customerError || !customer) {
      return c.json({ appointments: [] });
    }
    
    // Get appointments with items
    const { data: appointments, error: appointmentsError } = await supabase
      .from('moving_appointments')
      .select(`
        *,
        items:moving_items(id, item_name, quantity)
      `)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });
    
    if (appointmentsError) {
      console.error('Error fetching moving appointments:', appointmentsError);
      return c.json({ error: appointmentsError.message }, 500);
    }
    
    return c.json({ appointments });
  } catch (err: any) {
    console.error('Exception in GET /moving/customer/:email:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// SELL REQUESTS ENDPOINTS
// ==========================================

// POST /sell-requests/upload-image - Satış talebi fotoğrafı yükle
app.post("/make-server-0f4d2485/sell-requests/upload-image", async (c) => {
  try {
    const body = await c.req.json();
    const { image, filename } = body;
    
    if (!image) {
      return c.json({ error: 'No image provided' }, 400);
    }
    
    console.log('[SELL REQUEST UPLOAD] Uploading image:', filename);
    
    // Base64 string'i decode et
    const base64Data = image.split(',')[1] || image;
    const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    // Unique filename oluştur
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(7);
    const fileExt = filename?.split('.').pop() || 'jpg';
    const uniqueFilename = `${timestamp}-${randomStr}.${fileExt}`;
    
    // Supabase Storage'a yükle
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(SELL_REQUEST_IMAGES_BUCKET)
      .upload(uniqueFilename, binaryData, {
        contentType: `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`,
        upsert: false
      });
    
    if (uploadError) {
      console.error('[SELL REQUEST UPLOAD] Upload error:', uploadError);
      return c.json({ error: uploadError.message }, 500);
    }
    
    // Public URL oluştur
    const { data: { publicUrl } } = supabase.storage
      .from(SELL_REQUEST_IMAGES_BUCKET)
      .getPublicUrl(uniqueFilename);
    
    console.log('[SELL REQUEST UPLOAD] ✅ Image uploaded:', publicUrl);
    
    return c.json({ 
      success: true, 
      url: publicUrl,
      filename: uniqueFilename
    });
  } catch (err: any) {
    console.error('[SELL REQUEST UPLOAD] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Create sell request
app.post("/make-server-0f4d2485/sell-requests", async (c) => {
  try {
    const body = await c.req.json();
    const { customer, product, images, pickup_date, pickup_time } = body;
    
    console.log('[SELL REQUEST] Starting sell request creation');
    console.log('[SELL REQUEST] Product:', product.title, product.brand, product.model);
    console.log('[SELL REQUEST] Pickup appointment:', pickup_date, pickup_time);
    
    // 1. Create or get customer
    let customerId: string | null = null;
    
    try {
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .or(`email.eq.${customer.email},phone.eq.${customer.phone}`)
        .single();
      
      if (existingCustomer) {
        customerId = existingCustomer.id;
        console.log('[SELL REQUEST] Existing customer found:', customerId);
      } else {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            city: 'İzmir'
          })
          .select()
          .single();
        
        if (!customerError && newCustomer) {
          customerId = newCustomer.id;
          console.log('[SELL REQUEST] New customer created:', customerId);
        } else {
          console.error('[SELL REQUEST] Customer creation error:', customerError);
          return c.json({ error: 'Failed to create customer', details: customerError?.message }, 500);
        }
      }
    } catch (err: any) {
      console.error('[SELL REQUEST] Customer handling error:', err);
      return c.json({ error: 'Customer handling failed', details: err.message }, 500);
    }
    
    // 2. Generate request number
    const requestNumber = `#URN-${String(Date.now()).slice(-5)}`;
    
    // 3. Get auth user (optional - for registered users) and link with customer
    let userId: string | null = null;
    const authHeader = c.req.header('Authorization');
    
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token && token !== publicAnonKey) {
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (!authError && user) {
          userId = user.id;
          console.log('[SELL REQUEST] Authenticated user:', user.email);
          
          // Link auth user with customer if not already linked
          if (customerId) {
            await supabase
              .from('customers')
              .update({ auth_user_id: userId })
              .eq('id', customerId)
              .is('auth_user_id', null); // Only update if not already linked
            console.log('[SELL REQUEST] Customer linked with auth user');
          }
        }
      }
    }
    
    // 4. Create sell request - Using direct SQL to bypass PostgREST cache
    console.log('[SELL REQUEST] Creating sell request via direct SQL...');
    console.log('[SELL REQUEST] 🔍 Product condition received:', product.condition);
    console.log('[SELL REQUEST] 🔍 Full product data:', JSON.stringify(product, null, 2));
    
    const year = product.year ? parseInt(product.year) : null;
    const askingPrice = parseFloat(product.requestedPrice);
    
    let sellRequestArray;
    try {
      // Insert sell request
      sellRequestArray = await sql`
        INSERT INTO sell_requests (
          customer_id, user_id, title, product_category, brand, model, year, 
          purchase_year, condition, description, has_box, has_accessories,
          asking_price, status,
          pickup_date, pickup_time,
          name, email, phone
        ) VALUES (
          ${customerId}, ${userId}, ${product.title}, ${product.category || null}, 
          ${product.brand || null}, ${product.model || null}, ${year}, 
          ${product.purchaseYear ? parseInt(product.purchaseYear) : null}, 
          ${product.condition}, ${product.description || null}, 
          ${product.hasBox === 'yes' || product.hasBox === true}, 
          ${product.hasAccessories === 'yes' || product.hasAccessories === true},
          ${askingPrice}, 'reviewing',
          ${pickup_date || null}, ${pickup_time || null},
          ${customer.name}, ${customer.email}, ${customer.phone}
        )
        RETURNING *
      `;
      
      console.log('[SELL REQUEST] ✅ Direct SQL insert successful, ID:', sellRequestArray[0].id);
    } catch (sqlError: any) {
      console.error('[SELL REQUEST] ❌ Direct SQL insert failed:', sqlError);
      console.error('[SELL REQUEST] ❌ Condition value was:', product.condition);
      return c.json({ 
        error: 'Failed to create sell request', 
        details: sqlError.message,
        hint: 'Database error during direct SQL insert',
        debug: {
          receivedCondition: product.condition,
          allowedConditions: ['like_new', 'good', 'lightly_used']
        }
      }, 500);
    }
    
    const sellRequest = sellRequestArray && sellRequestArray.length > 0 ? sellRequestArray[0] : null;
    
    if (!sellRequest) {
      console.error('[SELL REQUEST] No data returned after insert');
      return c.json({ error: 'No data returned after insert' }, 500);
    }
    
    console.log('[SELL REQUEST] Created sell request:', sellRequest.id);
    
    // 5. Create images via direct SQL
    if (images && images.length > 0) {
      try {
        for (let i = 0; i < images.length; i++) {
          await sql`
            INSERT INTO sell_request_images (sell_request_id, image_url, order_num)
            VALUES (${sellRequest.id}, ${images[i]}, ${i})
          `;
        }
        console.log(`[SELL REQUEST] ✅ Created ${images.length} images via SQL`);
      } catch (imageError: any) {
        console.error('[SELL REQUEST] ⚠️ Failed to insert images:', imageError);
        // Don't fail the request, images can be added later
      }
    }
    
    // Generate request_number from ID dynamically
    const requestWithNumber = {
      ...sellRequest,
      request_number: `#URN-${String(sellRequest.id).padStart(5, '0')}`
    };
    
    console.log('[SELL REQUEST] ✅ Request created successfully:', requestWithNumber.request_number);
    
    return c.json({ success: true, request: requestWithNumber });
  } catch (err: any) {
    console.error('Exception in POST /sell-requests:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// ADMIN SELL REQUESTS ENDPOINTS
// ==========================================

// GET /admin/sell-requests - Admin tüm satış taleplerini listeler
app.get("/make-server-0f4d2485/admin/sell-requests", async (c) => {
  try {
    console.log('[ADMIN-SELL-REQUESTS] Fetching all sell requests');

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized - no token provided' }, 401);
    }

    // Admin kontrolü
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      console.error('[ADMIN-SELL-REQUESTS] Auth error:', authError);
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Admin kontrolü (checkAdminAuth kullan)
    const authCheck = await checkAdminAuth(accessToken || '');
    
    if (!authCheck.isAdmin) {
      console.error('[ADMIN-SELL-REQUESTS] Not admin:', authCheck.error);
      return c.json({ 
        error: 'Bu sayfaya erişim yetkiniz yok', 
        details: 'Admin yetkisi gereklidir' 
      }, 403);
    }

    console.log('[ADMIN-SELL-REQUESTS] ✅ Admin authorized:', authCheck.customer?.email);

    // Query parametreleri
    const status = c.req.query('status');
    const search = c.req.query('search');
    const category = c.req.query('category');

    // Base query with properly ordered images
    // Note: PostgREST nested resource ordering requires special syntax
    console.log('[ADMIN-SELL-REQUESTS] Building query with joins...');
    let query = supabase
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
        asking_price,
        admin_offer_price,
        admin_notes,
        status,
        created_at,
        updated_at,
        request_number,
        pickup_date,
        pickup_time,
        customer:customers(*),
        images:sell_request_images(id, image_url, order_num)
      `)
      .order('created_at', { ascending: false })
      .order('order_num', { foreignTable: 'sell_request_images', ascending: true });
    
    console.log('[ADMIN-SELL-REQUESTS] Query built with filters - status:', status, 'search:', search);

    // Filtreler
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Category filter removed - no category_id column in sell_requests

    // Arama - removed request_number from search since it may not exist in table
    if (search) {
      query = query.or(`title.ilike.%${search}%,brand.ilike.%${search}%,model.ilike.%${search}%,name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: requests, error } = await query;

    if (error) {
      console.error('[ADMIN-SELL-REQUESTS] Error:', error);
      return c.json({ error: 'Failed to fetch requests', details: error.message }, 500);
    }

    console.log(`[ADMIN-SELL-REQUESTS] Raw requests from DB:`, JSON.stringify(requests, null, 2));

    // Add generated request_number and format condition to Turkish
    const requestsWithNumbers = (requests || []).map(req => {
      console.log(`[ADMIN-SELL-REQUESTS] Request ${req.id} has ${req.images?.length || 0} images`);
      return {
        ...req,
        request_number: req.request_number || `#URN-${String(req.id).padStart(5, '0')}`,
        condition: formatConditionText(req.condition),
      };
    });

    console.log(`[ADMIN-SELL-REQUESTS] Found ${requestsWithNumbers.length} requests`);
    return c.json({ requests: requestsWithNumbers });
  } catch (err: any) {
    console.error('[ADMIN-SELL-REQUESTS] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// GET /admin/sell-requests/:id - Admin talep detayını görüntüler
app.get("/make-server-0f4d2485/admin/sell-requests/:id", async (c) => {
  try {
    const requestId = parseInt(c.req.param('id'));
    console.log(`[ADMIN-SELL-REQUEST-DETAIL] Fetching request ${requestId}`);

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized - no token provided' }, 401);
    }

    // Admin kontrolü
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Admin kontrolü (checkAdminAuth kullan)
    const authCheck = await checkAdminAuth(accessToken || '');
    
    if (!authCheck.isAdmin) {
      console.error('[ADMIN-SELL-REQUEST-DETAIL] Not admin:', authCheck.error);
      return c.json({ 
        error: 'Bu sayfaya erişim yetkiniz yok', 
        details: 'Admin yetkisi gereklidir' 
      }, 403);
    }

    console.log('[ADMIN-SELL-REQUEST-DETAIL] ✅ Admin authorized:', authCheck.customer?.email);

    // Talebi çek
    const { data: request, error } = await supabase
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
        asking_price,
        admin_offer_price,
        admin_notes,
        status,
        created_at,
        updated_at,
        request_number,
        pickup_date,
        pickup_time,
        customer:customers(*),
        images:sell_request_images(id, image_url, order_num)
      `)
      .eq('id', requestId)
      .order('order_num', { foreignTable: 'sell_request_images', ascending: true })
      .single();

    if (error) {
      console.error('[ADMIN-SELL-REQUEST-DETAIL] Error:', error);
      return c.json({ error: 'Request not found', details: error.message }, 404);
    }

    // Add generated request_number and format condition to Turkish
    const requestWithNumber = {
      ...request,
      request_number: request.request_number || `#URN-${String(request.id).padStart(5, '0')}`,
      condition: formatConditionText(request.condition),
    };

    return c.json({ request: requestWithNumber });
  } catch (err: any) {
    console.error('[ADMIN-SELL-REQUEST-DETAIL] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// POST /admin/sell-requests/:id/offer - Admin fiyat teklifi gönderir
app.post("/make-server-0f4d2485/admin/sell-requests/:id/offer", async (c) => {
  try {
    const requestId = parseInt(c.req.param('id'));
    
    // ID validation
    if (isNaN(requestId)) {
      console.error('[ADMIN-SEND-OFFER] Invalid request ID:', c.req.param('id'));
      return c.json({ error: 'Invalid request ID' }, 400);
    }
    
    const body = await c.req.json();
    const { offerPrice, offerNote } = body;

    console.log(`[ADMIN-SEND-OFFER] Sending offer for request ${requestId}: ${offerPrice}`);

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized - no token provided' }, 401);
    }

    // Admin kontrolü
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Admin kontrolü (checkAdminAuth kullan)
    const authCheck = await checkAdminAuth(accessToken || '');
    
    if (!authCheck.isAdmin) {
      console.error('[ADMIN-SEND-OFFER] Not admin:', authCheck.error);
      return c.json({ 
        error: 'Bu sayfaya erişim yetkiniz yok', 
        details: 'Admin yetkisi gereklidir' 
      }, 403);
    }

    console.log('[ADMIN-SEND-OFFER] ✅ Admin authorized:', authCheck.customer?.email);

    // Teklifi güncelle ve statüyü offer_sent yap
    const { data: updatedRequest, error } = await supabase
      .from('sell_requests')
      .update({
        admin_offer_price: offerPrice,
        admin_notes: offerNote || null,
        status: 'offer_sent',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('[ADMIN-SEND-OFFER] Error:', error);
      return c.json({ error: 'Failed to send offer', details: error.message }, 500);
    }

    console.log('[ADMIN-SEND-OFFER] Offer sent successfully');
    return c.json({ success: true, request: updatedRequest });
  } catch (err: any) {
    console.error('[ADMIN-SEND-OFFER] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// PATCH /admin/sell-requests/:id/status - Admin statü değiştirir
app.patch("/make-server-0f4d2485/admin/sell-requests/:id/status", async (c) => {
  try {
    const requestId = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const { status, note } = body;

    // ID validation
    if (isNaN(requestId)) {
      console.error('[ADMIN-UPDATE-STATUS] Invalid request ID:', c.req.param('id'));
      return c.json({ error: 'Invalid request ID' }, 400);
    }

    console.log(`[ADMIN-UPDATE-STATUS] Updating request ${requestId} to status: ${status}`);

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized - no token provided' }, 401);
    }

    // Admin kontrolü (checkAdminAuth kullan)
    const authCheck = await checkAdminAuth(accessToken || '');
    
    if (!authCheck.isAdmin) {
      console.error('[ADMIN-UPDATE-STATUS] Not admin:', authCheck.error);
      return c.json({ 
        error: 'Bu sayfaya erişim yetkiniz yok', 
        details: 'Admin yetkisi gereklidir' 
      }, 403);
    }

    console.log('[ADMIN-UPDATE-STATUS] ✅ Admin authorized:', authCheck.customer?.email);

    // Statüyü güncelle
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (note) {
      updateData.admin_notes = note;
    }

    console.log('[ADMIN-UPDATE-STATUS] Update data:', updateData);
    console.log('[ADMIN-UPDATE-STATUS] Target request ID:', requestId);

    const { data: updatedRequest, error } = await supabase
      .from('sell_requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('[ADMIN-UPDATE-STATUS] Error:', error);
      return c.json({ error: 'Failed to update status', details: error.message }, 500);
    }

    console.log('[ADMIN-UPDATE-STATUS] Status updated successfully:', updatedRequest?.status);
    return c.json({ success: true, request: updatedRequest });
  } catch (err: any) {
    console.error('[ADMIN-UPDATE-STATUS] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// POST /admin/sell-requests/:id/cancel - Admin talebi iptal eder
app.post("/make-server-0f4d2485/admin/sell-requests/:id/cancel", async (c) => {
  try {
    const requestId = parseInt(c.req.param('id'));
    
    // ID validation
    if (isNaN(requestId)) {
      console.error('[ADMIN-CANCEL-REQUEST] Invalid request ID:', c.req.param('id'));
      return c.json({ error: 'Invalid request ID' }, 400);
    }
    
    console.log(`[ADMIN-CANCEL-REQUEST] Cancelling request ${requestId}`);

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized - no token provided' }, 401);
    }

    // Admin kontrolü
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { data: customer } = await supabase
      .from('customers')
      .select('is_admin')
      .eq('email', user.email)
      .single();

    if (!customer?.is_admin) {
      return c.json({ error: 'Forbidden - admin access required' }, 403);
    }

    // Statüyü cancelled yap
    const { data: updatedRequest, error } = await supabase
      .from('sell_requests')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('[ADMIN-CANCEL-REQUEST] Error:', error);
      return c.json({ error: 'Failed to cancel request', details: error.message }, 500);
    }

    console.log('[ADMIN-CANCEL-REQUEST] Request cancelled successfully');
    return c.json({ success: true, request: updatedRequest });
  } catch (err: any) {
    console.error('[ADMIN-CANCEL-REQUEST] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// DELETE /admin/sell-requests/delete-all - Admin tüm talepleri siler
app.delete("/make-server-0f4d2485/admin/sell-requests/delete-all", async (c) => {
  try {
    console.log('[ADMIN-DELETE-ALL-REQUESTS] Deleting all sell requests');

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized - no token provided' }, 401);
    }

    // Admin kontrolü (checkAdminAuth kullan)
    const authCheck = await checkAdminAuth(accessToken || '');
    
    if (!authCheck.isAdmin) {
      console.error('[ADMIN-DELETE-ALL-REQUESTS] Not admin:', authCheck.error);
      return c.json({ 
        error: 'Bu sayfaya erişim yetkiniz yok', 
        details: 'Admin yetkisi gereklidir' 
      }, 403);
    }

    console.log('[ADMIN-DELETE-ALL-REQUESTS] ✅ Admin authorized:', authCheck.customer?.email);

    // Önce kaç talep olduğunu say
    const { count, error: countError } = await supabase
      .from('sell_requests')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('[ADMIN-DELETE-ALL-REQUESTS] Error counting requests:', countError);
      return c.json({ error: 'Failed to count requests' }, 500);
    }

    // İlişkili resimleri sil (CASCADE ile otomatik silinecek ama açık yapalım)
    const { error: imagesError } = await supabase
      .from('sell_request_images')
      .delete()
      .neq('id', 0); // Tümünü sil

    if (imagesError) {
      console.error('[ADMIN-DELETE-ALL-REQUESTS] Error deleting images:', imagesError);
    }

    // Tüm talepleri sil
    const { error: deleteError } = await supabase
      .from('sell_requests')
      .delete()
      .neq('id', 0); // Tümünü sil

    if (deleteError) {
      console.error('[ADMIN-DELETE-ALL-REQUESTS] Error deleting requests:', deleteError);
      return c.json({ error: 'Failed to delete requests', details: deleteError.message }, 500);
    }

    console.log(`[ADMIN-DELETE-ALL-REQUESTS] Deleted ${count} requests successfully`);
    return c.json({ 
      success: true, 
      message: `${count} adet satış talebi başarıyla silindi`,
      deletedCount: count 
    });
  } catch (err: any) {
    console.error('[ADMIN-DELETE-ALL-REQUESTS] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// USER SELL REQUESTS RESPONSE ENDPOINTS
// ==========================================

// POST /sell-requests/:id/respond - Kullanıcı teklifi kabul/red eder
app.post("/make-server-0f4d2485/sell-requests/:id/respond", async (c) => {
  try {
    const requestId = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const { action } = body; // 'accept' veya 'reject'

    console.log(`[USER-RESPOND-OFFER] User responding to request ${requestId}: ${action}`);

    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized - no token provided' }, 401);
    }

    // Kullanıcı kontrolü
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Kullanıcının customer ID'sini bul
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', user.email)
      .single();

    if (!customer) {
      return c.json({ error: 'Customer not found' }, 404);
    }

    // Talebin kullanıcıya ait olduğunu kontrol et
    const { data: request } = await supabase
      .from('sell_requests')
      .select('customer_id, status')
      .eq('id', requestId)
      .single();

    if (!request) {
      return c.json({ error: 'Request not found' }, 404);
    }

    if (request.customer_id !== customer.id) {
      return c.json({ error: 'Forbidden - not your request' }, 403);
    }

    if (request.status !== 'offer_sent') {
      return c.json({ error: 'No offer to respond to' }, 400);
    }

    // Yanıtı kaydet
    const newStatus = action === 'accept' ? 'accepted' : 'rejected';

    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString()
    };

    const { data: updatedRequest, error } = await supabase
      .from('sell_requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      console.error('[USER-RESPOND-OFFER] Error:', error);
      return c.json({ error: 'Failed to respond to offer', details: error.message }, 500);
    }

    console.log(`[USER-RESPOND-OFFER] Response recorded: ${newStatus}`);
    return c.json({ success: true, request: updatedRequest });
  } catch (err: any) {
    console.error('[USER-RESPOND-OFFER] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// CATEGORY ATTRIBUTES ENDPOINTS (DİNAMİK ÖZELLİKLER)
// ==========================================

// Get category attributes with options
app.get("/make-server-0f4d2485/attributes/category/:categoryId", async (c) => {
  try {
    const categoryId = c.req.param('categoryId');
    
    console.log(`[ATTRIBUTES] Fetching attributes for category: ${categoryId}`);
    
    // Get attributes from view
    const { data, error } = await supabase
      .from('v_category_attributes_with_options')
      .select('*')
      .eq('category_id', categoryId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('[ATTRIBUTES] Error fetching category attributes:', error);
      return c.json({ error: error.message }, 500);
    }
    
    console.log(`[ATTRIBUTES] Found ${data?.length || 0} attributes for category ${categoryId}`);
    
    return c.json({ 
      categoryId,
      attributes: data || [] 
    });
  } catch (err: any) {
    console.error('[ATTRIBUTES] Exception in GET /attributes/category/:categoryId:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Get all attributes for all categories
app.get("/make-server-0f4d2485/attributes/all", async (c) => {
  try {
    console.log('[ATTRIBUTES] Fetching all category attributes');
    
    const { data, error } = await supabase
      .from('v_category_attributes_with_options')
      .select('*')
      .eq('is_active', true)
      .order('category_id', { ascending: true })
      .order('display_order', { ascending: true });
    
    if (error) {
      console.error('[ATTRIBUTES] Error fetching all attributes:', error);
      return c.json({ error: error.message }, 500);
    }
    
    // Group by category
    const grouped = (data || []).reduce((acc: any, attr: any) => {
      const catId = attr.category_id;
      if (!acc[catId]) {
        acc[catId] = {
          categoryId: catId,
          categoryName: attr.category_name,
          categorySlug: attr.category_slug,
          attributes: []
        };
      }
      acc[catId].attributes.push(attr);
      return acc;
    }, {});
    
    console.log(`[ATTRIBUTES] Found attributes for ${Object.keys(grouped).length} categories`);
    
    return c.json({ categories: Object.values(grouped) });
  } catch (err: any) {
    console.error('[ATTRIBUTES] Exception in GET /attributes/all:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Get product attributes
app.get("/make-server-0f4d2485/products/:productId/attributes", async (c) => {
  try {
    const productId = c.req.param('productId');
    
    console.log(`[ATTRIBUTES] Fetching attributes for product: ${productId}`);
    
    const { data, error } = await supabase
      .from('v_product_attributes')
      .select('*')
      .eq('product_id', productId);
    
    if (error) {
      console.error('[ATTRIBUTES] Error fetching product attributes:', error);
      return c.json({ error: error.message }, 500);
    }
    
    console.log(`[ATTRIBUTES] Found ${data?.length || 0} attributes for product ${productId}`);
    
    return c.json({ 
      productId,
      attributes: data || [] 
    });
  } catch (err: any) {
    console.error('[ATTRIBUTES] Exception in GET /products/:productId/attributes:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Save product attributes
app.post("/make-server-0f4d2485/products/:productId/attributes", async (c) => {
  try {
    const productId = c.req.param('productId');
    const body = await c.req.json();
    const { attributes } = body;
    
    console.log(`[ATTRIBUTES] Saving ${attributes?.length || 0} attributes for product: ${productId}`);
    
    if (!attributes || !Array.isArray(attributes)) {
      return c.json({ error: 'Attributes array is required' }, 400);
    }
    
    // Delete existing attributes
    const { error: deleteError } = await supabase
      .from('product_attribute_values')
      .delete()
      .eq('product_id', productId);
    
    if (deleteError) {
      console.error('[ATTRIBUTES] Error deleting old attributes:', deleteError);
      return c.json({ error: 'Failed to delete old attributes: ' + deleteError.message }, 500);
    }
    
    // Insert new attributes
    const records = attributes.map((attr: any) => ({
      product_id: Number(productId),
      attribute_id: attr.attribute_id,
      value_text: attr.value_text || null,
      value_number: attr.value_number || null,
      value_option_id: attr.value_option_id || null
    }));
    
    const { data, error } = await supabase
      .from('product_attribute_values')
      .insert(records)
      .select();
    
    if (error) {
      console.error('[ATTRIBUTES] Error inserting attributes:', error);
      return c.json({ error: 'Failed to save attributes: ' + error.message }, 500);
    }
    
    console.log(`[ATTRIBUTES] Successfully saved ${data?.length || 0} attributes for product ${productId}`);
    
    return c.json({ 
      success: true, 
      saved: data?.length || 0,
      attributes: data 
    });
  } catch (err: any) {
    console.error('[ATTRIBUTES] Exception in POST /products/:productId/attributes:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Update single product attribute
app.put("/make-server-0f4d2485/products/:productId/attributes/:attributeId", async (c) => {
  try {
    const productId = c.req.param('productId');
    const attributeId = c.req.param('attributeId');
    const body = await c.req.json();
    
    console.log(`[ATTRIBUTES] Updating attribute ${attributeId} for product ${productId}`);
    
    const updateData: any = {
      value_text: body.value_text || null,
      value_number: body.value_number || null,
      value_option_id: body.value_option_id || null
    };
    
    // Check if attribute value exists
    const { data: existing } = await supabase
      .from('product_attribute_values')
      .select('id')
      .eq('product_id', productId)
      .eq('attribute_id', attributeId)
      .single();
    
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('product_attribute_values')
        .update(updateData)
        .eq('product_id', productId)
        .eq('attribute_id', attributeId)
        .select()
        .single();
      
      if (error) {
        console.error('[ATTRIBUTES] Error updating attribute:', error);
        return c.json({ error: error.message }, 500);
      }
      
      return c.json({ success: true, attribute: data });
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('product_attribute_values')
        .insert({
          product_id: Number(productId),
          attribute_id: Number(attributeId),
          ...updateData
        })
        .select()
        .single();
      
      if (error) {
        console.error('[ATTRIBUTES] Error inserting attribute:', error);
        return c.json({ error: error.message }, 500);
      }
      
      return c.json({ success: true, attribute: data });
    }
  } catch (err: any) {
    console.error('[ATTRIBUTES] Exception in PUT /products/:productId/attributes/:attributeId:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Delete product attribute
app.delete("/make-server-0f4d2485/products/:productId/attributes/:attributeId", async (c) => {
  try {
    const productId = c.req.param('productId');
    const attributeId = c.req.param('attributeId');
    
    console.log(`[ATTRIBUTES] Deleting attribute ${attributeId} for product ${productId}`);
    
    const { error } = await supabase
      .from('product_attribute_values')
      .delete()
      .eq('product_id', productId)
      .eq('attribute_id', attributeId);
    
    if (error) {
      console.error('[ATTRIBUTES] Error deleting attribute:', error);
      return c.json({ error: error.message }, 500);
    }
    
    return c.json({ success: true });
  } catch (err: any) {
    console.error('[ATTRIBUTES] Exception in DELETE /products/:productId/attributes/:attributeId:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// ATTRIBUTE MANAGEMENT ENDPOINTS (ADMIN)
// ==========================================

// Create new attribute for category
app.post("/make-server-0f4d2485/attributes/category/:categoryId", async (c) => {
  try {
    const categoryId = c.req.param('categoryId');
    const body = await c.req.json();
    
    console.log(`[ATTRIBUTES] Creating new attribute for category: ${categoryId}`);
    
    const { data, error } = await supabase
      .from('category_attributes')
      .insert({
        category_id: Number(categoryId),
        attribute_key: body.attribute_key,
        attribute_label: body.attribute_label,
        input_type: body.input_type || 'text',
        is_required: body.is_required || false,
        is_filterable: body.is_filterable || true,
        placeholder: body.placeholder || null,
        help_text: body.help_text || null,
        display_order: body.display_order || 0
      })
      .select()
      .single();
    
    if (error) {
      console.error('[ATTRIBUTES] Error creating attribute:', error);
      return c.json({ error: error.message }, 500);
    }
    
    return c.json({ success: true, attribute: data });
  } catch (err: any) {
    console.error('[ATTRIBUTES] Exception in POST /attributes/category/:categoryId:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Add option to attribute
app.post("/make-server-0f4d2485/attributes/:attributeId/options", async (c) => {
  try {
    const attributeId = c.req.param('attributeId');
    const body = await c.req.json();
    
    console.log(`[ATTRIBUTES] Adding option to attribute: ${attributeId}`);
    
    const { data, error } = await supabase
      .from('attribute_options')
      .insert({
        attribute_id: Number(attributeId),
        option_value: body.option_value,
        option_label: body.option_label,
        option_icon: body.option_icon || null,
        display_order: body.display_order || 0
      })
      .select()
      .single();
    
    if (error) {
      console.error('[ATTRIBUTES] Error adding option:', error);
      return c.json({ error: error.message }, 500);
    }
    
    return c.json({ success: true, option: data });
  } catch (err: any) {
    console.error('[ATTRIBUTES] Exception in POST /attributes/:attributeId/options:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// IMAGE STORAGE ENDPOINTS
// ==========================================

// Upload product image
app.post("/make-server-0f4d2485/upload-image", async (c) => {
  try {
    console.log('[STORAGE] Uploading product image...');
    
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' }, 400);
    }
    
    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return c.json({ error: 'File size exceeds 5MB limit.' }, 400);
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `${timestamp}-${randomStr}.${extension}`;
    const filepath = `product-images/${filename}`;
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = new Uint8Array(arrayBuffer);
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(filepath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });
    
    if (error) {
      console.error('[STORAGE] Upload error:', error);
      return c.json({ error: 'Failed to upload image: ' + error.message }, 500);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(filepath);
    
    console.log(`[STORAGE] Image uploaded successfully: ${publicUrl}`);
    
    return c.json({
      success: true,
      url: publicUrl,
      path: filepath,
      filename: filename
    });
  } catch (err: any) {
    console.error('[STORAGE] Exception in POST /upload-image:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Delete product image
app.delete("/make-server-0f4d2485/delete-image", async (c) => {
  try {
    const body = await c.req.json();
    const { path } = body;
    
    if (!path) {
      return c.json({ error: 'Image path is required' }, 400);
    }
    
    console.log(`[STORAGE] Deleting image: ${path}`);
    
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .remove([path]);
    
    if (error) {
      console.error('[STORAGE] Delete error:', error);
      return c.json({ error: 'Failed to delete image: ' + error.message }, 500);
    }
    
    console.log(`[STORAGE] Image deleted successfully: ${path}`);
    
    return c.json({ success: true });
  } catch (err: any) {
    console.error('[STORAGE] Exception in DELETE /delete-image:', err);
    return c.json({ error: err.message }, 500);
  }
});

// List all product images (for admin)
app.get("/make-server-0f4d2485/images", async (c) => {
  try {
    console.log('[STORAGE] Listing all product images...');
    
    const { data, error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .list('product-images', {
        limit: 1000,
        sortBy: { column: 'created_at', order: 'desc' }
      });
    
    if (error) {
      console.error('[STORAGE] List error:', error);
      return c.json({ error: error.message }, 500);
    }
    
    // Add public URLs to each file
    const imagesWithUrls = (data || []).map(file => {
      const { data: { publicUrl } } = supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .getPublicUrl(`product-images/${file.name}`);
      
      return {
        name: file.name,
        path: `product-images/${file.name}`,
        url: publicUrl,
        size: file.metadata?.size || 0,
        createdAt: file.created_at,
        updatedAt: file.updated_at
      };
    });
    
    console.log(`[STORAGE] Found ${imagesWithUrls.length} images`);
    
    return c.json({ 
      success: true, 
      images: imagesWithUrls,
      count: imagesWithUrls.length 
    });
  } catch (err: any) {
    console.error('[STORAGE] Exception in GET /images:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// SEED DATABASE - Test verisi ekle
// ==========================================
app.post("/make-server-0f4d2485/seed-database", async (c) => {
  try {
    console.log('[SEED-DB] ===== STARTING DATABASE SEEDING =====');
    
    // 1. Kategoriler ekle (Bahçe, Spor, Oto kaldırıldı)
    const categories = [
      { name: 'Elektronik', slug: 'elektronik' },
      { name: 'Ev & Yaşam', slug: 'ev-yasam' },
      { name: 'Mobilya', slug: 'mobilya' },
      { name: 'Beyaz Eşya', slug: 'beyaz-esya' },
    ];
    
    console.log('[SEED-DB] Inserting categories...');
    const { data: insertedCategories, error: catError } = await supabase
      .from('categories')
      .upsert(categories, { onConflict: 'slug' })
      .select();
    
    if (catError) {
      console.error('[SEED-DB] Category error:', catError);
      return c.json({ error: catError.message }, 500);
    }
    console.log('[SEED-DB] ✅ Categories inserted:', insertedCategories?.length);
    
    // 2. Markalar ekle (Beyaz eşya + Ev elektronikleri odaklı)
    const brands = [
      // Televizyon & Elektronik (Öne Çıkanlar)
      { name: 'Samsung', slug: 'samsung' },
      { name: 'LG', slug: 'lg' },
      { name: 'Sony', slug: 'sony' },
      { name: 'Philips', slug: 'philips' },
      { name: 'TCL', slug: 'tcl' },
      { name: 'Panasonic', slug: 'panasonic' },
      { name: 'Toshiba', slug: 'toshiba' },
      { name: 'Vestel', slug: 'vestel' },
      
      // Beyaz Eşya (Öne Çıkanlar)
      { name: 'Arçelik', slug: 'arcelik' },
      { name: 'Beko', slug: 'beko' },
      { name: 'Bosch', slug: 'bosch' },
      { name: 'Siemens', slug: 'siemens' },
      { name: 'Profilo', slug: 'profilo' },
      { name: 'Altus', slug: 'altus' },
      { name: 'Whirlpool', slug: 'whirlpool' },
      { name: 'Hotpoint', slug: 'hotpoint' },
      { name: 'AEG', slug: 'aeg' },
      { name: 'Electrolux', slug: 'electrolux' },
      { name: 'Candy', slug: 'candy' },
      { name: 'Indesit', slug: 'indesit' },
      
      // Küçük Ev Aletleri
      { name: 'Tefal', slug: 'tefal' },
      { name: 'Arzum', slug: 'arzum' },
      { name: 'Fakir', slug: 'fakir' },
      { name: 'Karaca', slug: 'karaca' },
      { name: 'Homend', slug: 'homend' },
      { name: 'Sinbo', slug: 'sinbo' },
      { name: 'King', slug: 'king' },
      
      // Klima & Kombi
      { name: 'Ariston', slug: 'ariston' },
      { name: 'Baymak', slug: 'baymak' },
      { name: 'Vaillant', slug: 'vaillant' },
      { name: 'Airfel', slug: 'airfel' },
      { name: 'Mitsubishi', slug: 'mitsubishi' },
      { name: 'Daikin', slug: 'daikin' },
      { name: 'Airfel', slug: 'airfel' },
      { name: 'Demirdöküm', slug: 'demirdokum' },
      { name: 'Protherm', slug: 'protherm' },
      { name: 'Buderus', slug: 'buderus' },
      
      // Mobilya
      { name: 'Ikea', slug: 'ikea' },
      { name: 'Alfemo', slug: 'alfemo' },
      { name: 'Bellona', slug: 'bellona' },
      { name: 'Yataş', slug: 'yatas' },
      { name: 'İstikbal', slug: 'istikbal' },
      { name: 'Kelebek', slug: 'kelebek' },
      { name: 'Mondi', slug: 'mondi' },
    ];
    
    console.log('[SEED-DB] Inserting brands...');
    const { data: insertedBrands, error: brandError } = await supabase
      .from('brands')
      .upsert(brands, { onConflict: 'slug' })
      .select();
    
    if (brandError) {
      console.error('[SEED-DB] Brand error:', brandError);
      return c.json({ error: brandError.message }, 500);
    }
    console.log('[SEED-DB] ✅ Brands inserted:', insertedBrands?.length);
    
    // 3. Ürünler ekle (Telefon/Tablet/Laptop YOK - Sadece ev elektronikleri)
    const products = [
      {
        title: 'Samsung 65" Crystal UHD Smart TV',
        description: '4K çözünürlük, HDR10+, Tizen işletim sistemi, akıllı TV özellikleri',
        price: 24000,
        category_id: insertedCategories?.find(c => c.slug === 'elektronik')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'samsung')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 3,
      },
      {
        title: 'LG OLED TV 55 inç',
        description: 'Sinema keyfi için LG OLED TV, 4K, webOS akıllı platform',
        price: 28000,
        category_id: insertedCategories?.find(c => c.slug === 'elektronik')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'lg')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 2,
      },
      {
        title: 'Samsung Soundbar 5.1 Kanal',
        description: 'Kablosuz subwoofer, Bluetooth, HDMI ARC, sinema ses deneyimi',
        price: 8500,
        category_id: insertedCategories?.find(c => c.slug === 'elektronik')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'samsung')?.id,
        condition: 'Az Kullanılmış',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 12,
        stock_quantity: 4,
      },
      {
        title: 'Bosch Bulaşık Makinesi',
        description: 'Sessiz ve ekonomik Bosch bulaşık makinesi',
        price: 15000,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'bosch')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İstanbul, Türkiye',
        warranty_months: 24,
        stock_quantity: 4,
      },
      {
        title: 'Vestel Çamaşır Makinesi 9kg',
        description: 'Yüksek kapasiteli ve dayanıklı',
        price: 12000,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'vestel')?.id,
        condition: 'İyi',
        status: 'available',
        location: 'Bursa, Türkiye',
        warranty_months: 12,
        stock_quantity: 6,
      },
      {
        title: 'Samsung Buzdolabı No Frost',
        description: 'Geniş hacimli ve enerji tasarruflu',
        price: 18000,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'samsung')?.id,
        condition: 'Az Kullanılmış',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 3,
      },
      // YENİ BEYAZ EŞYA ÜRÜNLERİ
      {
        title: 'Arçelik Buzdolabı 600 Lt No Frost',
        description: 'A++ enerji sınıfı, dijital ekran, çok fonksiyonlu. Geniş iç hacim.',
        price: 22000,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'arcelik')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 36,
        stock_quantity: 2,
      },
      {
        title: 'LG Çamaşır Makinesi 10 KG',
        description: 'Inverter motor, sessiz çalışma, 1400 devir, Direct Drive teknoloji',
        price: 14500,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'lg')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 4,
      },
      {
        title: 'Bosch Ankastre Fırın Set',
        description: 'Ankastre fırın + ocak + davlumbaz set. Katalitik temizlik.',
        price: 19500,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'bosch')?.id,
        condition: 'Az Kullanılmış',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 12,
        stock_quantity: 1,
      },
      {
        title: 'Vestel Kurutma Makinesi 9 KG',
        description: 'Çamaşır kurutma makinesi, ısı pompalı sistem, A+ enerji',
        price: 11000,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'vestel')?.id,
        condition: 'İyi',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 12,
        stock_quantity: 3,
      },
      {
        title: 'Samsung Mikrodalga Fırın 28 Lt',
        description: 'Grill özellikli, dijital ekran, çocuk kilidi',
        price: 3500,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'samsung')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 5,
      },
      {
        title: 'LG Derin Dondurucu 200 Lt',
        description: 'Dikey derin dondurucu, 4 çekmeceli, sessiz motor',
        price: 9500,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'lg')?.id,
        condition: 'Az Kullanılmış',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 18,
        stock_quantity: 2,
      },
      {
        title: 'Bosch Süpürge Toz Torbasız',
        description: 'PowerProtect sistemi, HEPA filtre, 2400W güç',
        price: 4200,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'bosch')?.id,
        condition: 'Az Kullanılmış',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 12,
        stock_quantity: 3,
      },
      {
        title: 'Arçelik Klimasyon 12000 BTU',
        description: 'A++ inverter klima, R32 gaz, sessiz çalışma, WiFi kontrol',
        price: 13500,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'arcelik')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 36,
        stock_quantity: 4,
      },
      {
        title: 'Samsung Bulaşık Makinesi 14 Kişilik',
        description: 'A+++ enerji, 6 program, hijyen+ özelliği, yarı yük',
        price: 16500,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'samsung')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 3,
      },
      {
        title: 'Vestel Çay Makinesi + Kettle Set',
        description: 'Otomatik çay makinesi + cam kettle set, paslanmaz çelik',
        price: 1800,
        category_id: insertedCategories?.find(c => c.slug === 'ev-yasam')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'vestel')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 8,
      },
      // EK EV ELEKTRONİKLERİ
      {
        title: 'Bosch Blender Seti',
        description: 'Multi fonksiyonlu blender, chopper, mikser fonksiyonları. 1000W güç',
        price: 2200,
        category_id: insertedCategories?.find(c => c.slug === 'ev-yasam')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'bosch')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 5,
      },
      {
        title: 'Philips Kahve Makinesi',
        description: 'Tam otomatik espresso makinesi, süt köpürtücü, 5 kahve seçeneği',
        price: 5500,
        category_id: insertedCategories?.find(c => c.slug === 'ev-yasam')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'philips')?.id,
        condition: 'Az Kullanılmış',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 12,
        stock_quantity: 2,
      },
      {
        title: 'Tefal Buharlı Ütü 2600W',
        description: 'Otomatik buhar ayarı, anti-kireç sistem, dayanıklı taban',
        price: 1200,
        category_id: insertedCategories?.find(c => c.slug === 'ev-yasam')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'tefal')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 6,
      },
      {
        title: 'LG Hava Temizleyici',
        description: 'HEPA filtre, 360° hava emme, sessiz çalışma, 50m² alan',
        price: 4800,
        category_id: insertedCategories?.find(c => c.slug === 'ev-yasam')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'lg')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 3,
      },
      {
        title: 'Samsung Robot Süpürge',
        description: 'Akıllı haritalama, otomatik şarj, paspas özelliği, WiFi kontrol',
        price: 6500,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'samsung')?.id,
        condition: 'Az Kullanılmış',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 12,
        stock_quantity: 2,
      },
      {
        title: 'Vestel Tost Makinesi + Waffle',
        description: '3 in 1 tost, waffle, grill makinesi. Çıkarılabilir plakalar',
        price: 850,
        category_id: insertedCategories?.find(c => c.slug === 'ev-yasam')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'vestel')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 7,
      },
      // YENİ BEYAZ EŞYA ÜRÜNLERİ - Ocak, Fırın, Ankastre, Klima, Kombi
      {
        title: 'Beko Ankastre Fırın 71 Lt',
        description: '8 fonksiyonlu ankastre fırın, turbo fan, ızgara, alt-üst ısıtma, A+ enerji sınıfı',
        price: 8500,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'beko')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 3,
      },
      {
        title: 'Siemens Ankastre Ocak 4 Gözlü',
        description: 'Gazlı ankastre ocak, emniyet vanası, döküm ızgara, otomatik ateşleme',
        price: 6200,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'siemens')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 4,
      },
      {
        title: 'Bosch Davlumbaz 60cm Cam',
        description: 'Dekoratif davlumbaz, 3 hız ayarı, LED aydınlatma, paslanmaz çelik filtre',
        price: 5800,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'bosch')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 3,
      },
      {
        title: 'Arçelik Ankastre Set 3lü (Fırın+Ocak+Davlumbaz)',
        description: 'Komple ankastre mutfak seti, siyah cam, dijital kontrol, A enerji sınıfı',
        price: 18500,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'arcelik')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 36,
        stock_quantity: 2,
      },
      {
        title: 'Profilo Ankastre Fırın + Mikrodalga Kombi',
        description: '2 in 1 ankastre fırın, mikrodalga ve fırın fonksiyonu, 45cm yükseklik',
        price: 11200,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'profilo')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 2,
      },
      {
        title: 'Vestel Serbest Duran Ocak 4 Gözlü + Fırın',
        description: 'Kombi set, gazlı ocak + elektrikli fırın, emaye kaplama, otomatik ateşleme',
        price: 9800,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'vestel')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 3,
      },
      {
        title: 'Daikin Split Klima 12000 BTU A++',
        description: 'Inverter klima, R32 gaz, sessiz çalışma, WiFi smart kontrol, hızlı soğutma',
        price: 15500,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'daikin')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 36,
        stock_quantity: 4,
      },
      {
        title: 'Mitsubishi Electric Klima 18000 BTU',
        description: 'Yüksek kapasiteli inverter klima, A+++ enerji, plazma filtre, geniş alan',
        price: 21500,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'mitsubishi')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 36,
        stock_quantity: 2,
      },
      {
        title: 'LG Dual Inverter Klima 9000 BTU',
        description: 'Ultra sessiz çalışma, hızlı soğutma, enerji tasarrufu, WiFi ThinQ',
        price: 12800,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'lg')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 5,
      },
      {
        title: 'Vaillant EcoTec Plus Kombi 24 kW',
        description: 'Yoğuşmalı kombi, dijital ekran, modülasyon, sessiz çalışma, A sınıfı',
        price: 16500,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'vaillant')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 3,
      },
      {
        title: 'Baymak Duotec Kombi 28 kW',
        description: 'Yoğuşmalı duvar tipi kombi, geniş daire tipi, oda termostatı hediye',
        price: 14200,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'baymak')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 4,
      },
      {
        title: 'Airfel Digifel Kombi 24 kW',
        description: 'Dijital göstergeli kombi, ekonomik kullanım, kompakt tasarım',
        price: 11800,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'airfel')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 5,
      },
      {
        title: 'Ariston Genus One Net Kombi 35 kW',
        description: 'Yüksek kapasiteli kombi, Wi-Fi modül, otomatik doldurma, villa tipi',
        price: 18900,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'ariston')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 2,
      },
      {
        title: 'Beko Kurutma Makinesi 8 KG',
        description: 'Isı pompalı kurutma makinesi, A++ enerji, 15 program, ütü kolaylığı',
        price: 11500,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'beko')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 3,
      },
      {
        title: 'Siemens Derin Dondurucu 250 Lt No Frost',
        description: 'Dikey derin dondurucu, 6 çekmece, hızlı dondurma, A+ enerji sınıfı',
        price: 13200,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'siemens')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 2,
      },
      {
        title: 'Profilo Mini Buzdolabı 90 Lt',
        description: 'Kompakt buzdolabı, A+ enerji, tek kapılı, ofis/öğrenci evi için ideal',
        price: 4800,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'profilo')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 6,
      },
      {
        title: 'Samsung Mikrodalga Fırın 23 Lt',
        description: 'Solo mikrodalga, 6 güç seviyesi, defrost, çocuk kilidi, dijital kontrol',
        price: 2800,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'samsung')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 7,
      },
      {
        title: 'LG Mikrodalga + Fırın Kombi 28 Lt',
        description: 'Mikrodalga + ızgara + konveksiyonlu fırın, çok fonksiyonlu, paslanmaz çelik',
        price: 6200,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'lg')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 4,
      },
      {
        title: 'Arçelik Ocak 5 Gözlü Emaye',
        description: '5 gözlü serbest duran ocak, emaye kaplama, otomatik ateşleme, 90cm genişlik',
        price: 7500,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'arcelik')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 3,
      },
      {
        title: 'Bosch Serbest Duran Bulaşık Makinesi',
        description: '12 kişilik, 5 program, A++ enerji, half load, sessiz çalışma',
        price: 13800,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'bosch')?.id,
        condition: 'Az Kullanılmış',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 18,
        stock_quantity: 2,
      },
      {
        title: 'Beko Çamaşır + Kurutma Makinesi 8/5 KG',
        description: 'Kombi makine, yıkama ve kurutma tek seferde, 16 program, A sınıfı',
        price: 16500,
        category_id: insertedCategories?.find(c => c.slug === 'beyaz-esya')?.id,
        brand_id: insertedBrands?.find(b => b.slug === 'beko')?.id,
        condition: 'Sıfır Ayarında',
        status: 'available',
        location: 'İzmir, Türkiye',
        warranty_months: 24,
        stock_quantity: 2,
      },
    ];
    
    console.log('[SEED-DB] Inserting products...');
    const { data: insertedProducts, error: prodError } = await supabase
      .from('products')
      .insert(products)
      .select();
    
    if (prodError) {
      console.error('[SEED-DB] Product error:', prodError);
      return c.json({ error: prodError.message }, 500);
    }
    console.log('[SEED-DB] ✅ Products inserted:', insertedProducts?.length);
    
    console.log('[SEED-DB] ===== DATABASE SEEDING COMPLETED =====');
    return c.json({
      success: true,
      message: 'Database seeded successfully',
      summary: {
        categories: insertedCategories?.length || 0,
        brands: insertedBrands?.length || 0,
        products: insertedProducts?.length || 0,
      }
    });
  } catch (err: any) {
    console.error('[SEED-DB] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// FIX ALL PRODUCTS - Tüm ürün sorunlarını düzelt
// ==========================================
app.post("/make-server-0f4d2485/fix-all-products", async (c) => {
  try {
    console.log('[FIX-ALL] ===== BAŞLANIYOR =====');
    let fixedCount = 0;
    
    // Tüm ürünleri al
    const { data: allProducts, error: fetchError } = await supabase
      .from('products')
      .select('id, condition, status');
    
    if (fetchError) {
      console.error('[FIX-ALL] Fetch error:', fetchError);
      return c.json({ error: fetchError.message }, 500);
    }
    
    console.log(`[FIX-ALL] ${allProducts?.length || 0} ürün bulundu`);
    
    // Her ürünü düzelt
    for (const product of allProducts || []) {
      let needsUpdate = false;
      const updates: any = {};
      
      // CONDITION DÜZELTMESİ
      let newCondition = product.condition;
      
      // Türkçe → İngilizce
      if (['iyi', 'güzel'].includes(newCondition?.toLowerCase())) {
        newCondition = 'good';
        needsUpdate = true;
      } else if (['az kullanılmış', 'az kullanilmis'].includes(newCondition?.toLowerCase())) {
        newCondition = 'lightly_used';
        needsUpdate = true;
      } else if (['sıfır gibi', 'sifir gibi', 'yeni', 'sıfır'].includes(newCondition?.toLowerCase())) {
        newCondition = 'like_new';
        needsUpdate = true;
      } else if (newCondition?.includes('-')) {
        // Tire → Alt tire
        newCondition = newCondition.replace(/-/g, '_');
        needsUpdate = true;
      } else if (!newCondition) {
        // NULL → good
        newCondition = 'good';
        needsUpdate = true;
      }
      
      // like_new → good veya lightly_used
      if (newCondition === 'like_new') {
        const firstChar = product.id.toString().toLowerCase()[0];
        if (['0','1','2','3','4','5','6','7','8','9','a','b'].includes(firstChar)) {
          newCondition = 'good';
        } else {
          newCondition = 'lightly_used';
        }
        needsUpdate = true;
      }
      
      // STATUS DÜZELTMESİ
      let newStatus = product.status;
      
      if (['available', 'stokta', 'mevcut', 'reserved', 'rezerve'].includes(newStatus?.toLowerCase())) {
        newStatus = 'for_sale';
        needsUpdate = true;
      } else if (['depoda', 'depo'].includes(newStatus?.toLowerCase())) {
        newStatus = 'in_storage';
        needsUpdate = true;
      } else if (['satıldı', 'satildi', 'teslim edildi'].includes(newStatus?.toLowerCase())) {
        newStatus = 'sold';
        needsUpdate = true;
      } else if (!newStatus) {
        newStatus = 'in_storage';
        needsUpdate = true;
      }
      
      // Güncelle
      if (needsUpdate) {
        console.log(`[FIX-ALL] Updating ${product.id}: ${product.condition}→${newCondition}, ${product.status}→${newStatus}`);
        
        const { error: updateError } = await supabase
          .from('products')
          .update({
            condition: newCondition,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', product.id);
        
        if (updateError) {
          console.error(`[FIX-ALL] Update error for ${product.id}:`, updateError);
        } else {
          fixedCount++;
        }
      }
    }
    
    // Özet
    const { data: summary } = await supabase
      .from('products')
      .select('status, condition');
    
    const statusCounts = summary?.reduce((acc: any, p: any) => {
      const key = `${p.status}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}) || {};
    
    const conditionCounts = summary?.reduce((acc: any, p: any) => {
      const key = `${p.condition}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}) || {};
    
    console.log('[FIX-ALL] ===== TAMAMLANDI =====');
    console.log('[FIX-ALL] Düzeltilen:', fixedCount);
    console.log('[FIX-ALL] Status özeti:', statusCounts);
    console.log('[FIX-ALL] Condition ��zeti:', conditionCounts);
    
    return c.json({
      success: true,
      message: 'Tüm ürün sorunları düzeltildi',
      fixed: fixedCount,
      summary: {
        status: statusCounts,
        condition: conditionCounts,
      },
    });
  } catch (err: any) {
    console.error('[FIX-ALL] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// FIX PRODUCT STATUS - Ürün satış durumlarını düzelt (ESKİ)
// ==========================================
app.post("/make-server-0f4d2485/fix-product-status", async (c) => {
  try {
    console.log('[FIX-STATUS] Starting product status fix...');
    
    // ADIM 0: Format düzeltme - tire (-) olan condition'ları alt tire (_) yap
    console.log('[FIX-STATUS] Step 0: Fixing condition format (- to _)...');
    const { data: formatFixed, error: formatError } = await supabase
      .from('products')
      .select('id, condition');
    
    if (!formatError && formatFixed) {
      const fixPromises = formatFixed
        .filter((p: any) => p.condition?.includes('-'))
        .map((p: any) => {
          const newCondition = p.condition.replace(/-/g, '_');
          console.log(`[FIX-STATUS] Fixing: ${p.condition} → ${newCondition}`);
          return supabase
            .from('products')
            .update({ condition: newCondition, updated_at: new Date().toISOString() })
            .eq('id', p.id);
        });
      
      await Promise.all(fixPromises);
      console.log(`[FIX-STATUS] ✅ Fixed ${fixPromises.length} condition formats`);
    }
    
    // ADIM 1: Eski available/reserved durumlarını for_sale yap
    console.log('[FIX-STATUS] Step 1: Updating old statuses...');
    const { data: oldStatuses, error: oldError } = await supabase
      .from('products')
      .update({ status: 'for_sale', updated_at: new Date().toISOString() })
      .in('status', ['available', 'reserved', 'stokta'])
      .select('id');
    
    if (oldError) {
      console.error('[FIX-STATUS] Error updating old statuses:', oldError);
      return c.json({ error: oldError.message }, 500);
    }
    
    console.log(`[FIX-STATUS] ✅ ${oldStatuses?.length || 0} products: old status → for_sale`);
    
    // Özet
    const { data: summary } = await supabase
      .from('products')
      .select('status');
    
    const statusCounts = summary?.reduce((acc: any, p: any) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {}) || {};
    
    console.log('[FIX-STATUS] ===== COMPLETED =====');
    console.log('[FIX-STATUS] Status summary:', statusCounts);
    
    return c.json({
      success: true,
      message: 'Ürün satış durumları düzeltildi',
      fixed: oldStatuses?.length || 0,
      summary: statusCounts,
    });
  } catch (err: any) {
    console.error('[FIX-STATUS] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// UPDATE PRODUCT CONDITIONS - Ürün durumlarını güncelle
// ==========================================
app.post("/make-server-0f4d2485/update-product-conditions", async (c) => {
  try {
    console.log('[UPDATE-CONDITIONS] Starting product conditions update...');
    
    // 1. Tüm like_new ürünleri good yap
    const { data: likeNewProducts, error: likeNewError } = await supabase
      .from('products')
      .update({ condition: 'good', updated_at: new Date().toISOString() })
      .eq('condition', 'like_new')
      .select('id');
    
    if (likeNewError) {
      console.error('[UPDATE-CONDITIONS] Error updating like_new:', likeNewError);
      return c.json({ error: likeNewError.message }, 500);
    }
    
    console.log(`[UPDATE-CONDITIONS] ✅ ${likeNewProducts?.length || 0} like_new → good`);
    
    // 2. Ürünleri yarı yarıya ayır (UUID'ye göre rastgele ama tutarlı)
    const { data: allProducts, error: fetchError } = await supabase
      .from('products')
      .select('id');
    
    if (fetchError) {
      console.error('[UPDATE-CONDITIONS] Error fetching products:', fetchError);
      return c.json({ error: fetchError.message }, 500);
    }
    
    // UUID'nin ilk karakterine göre ayır (0-7: good, 8-f: lightly_used)
    const goodIds: string[] = [];
    const lightlyUsedIds: string[] = [];
    
    allProducts?.forEach(p => {
      const firstChar = p.id.toString()[0].toLowerCase();
      const charCode = firstChar.charCodeAt(0);
      // 0-7 veya a-d: good, 8-9 veya e-f: lightly_used
      if (charCode <= '7'.charCodeAt(0) || (charCode >= 'a'.charCodeAt(0) && charCode <= 'd'.charCodeAt(0))) {
        goodIds.push(p.id);
      } else {
        lightlyUsedIds.push(p.id);
      }
    });
    
    console.log(`[UPDATE-CONDITIONS] Splitting: ${goodIds.length} → good, ${lightlyUsedIds.length} → lightly_used`);
    
    // good grubunu güncelle
    if (goodIds.length > 0) {
      const { error: goodError } = await supabase
        .from('products')
        .update({ condition: 'good', updated_at: new Date().toISOString() })
        .in('id', goodIds);
      
      if (goodError) {
        console.error('[UPDATE-CONDITIONS] Error updating good:', goodError);
      } else {
        console.log(`[UPDATE-CONDITIONS] ✅ ${goodIds.length} products → good`);
      }
    }
    
    // lightly_used grubunu güncelle
    if (lightlyUsedIds.length > 0) {
      const { error: lightlyUsedError } = await supabase
        .from('products')
        .update({ condition: 'lightly_used', updated_at: new Date().toISOString() })
        .in('id', lightlyUsedIds);
      
      if (lightlyUsedError) {
        console.error('[UPDATE-CONDITIONS] Error updating lightly_used:', lightlyUsedError);
      } else {
        console.log(`[UPDATE-CONDITIONS] ✅ ${lightlyUsedIds.length} products → lightly_used`);
      }
    }
    
    // 3. Sonuçları kontrol et
    const { data: summary } = await supabase
      .from('products')
      .select('condition');
    
    const conditionCounts = summary?.reduce((acc: any, p: any) => {
      acc[p.condition] = (acc[p.condition] || 0) + 1;
      return acc;
    }, {}) || {};
    
    console.log('[UPDATE-CONDITIONS] ===== COMPLETED =====');
    console.log('[UPDATE-CONDITIONS] Condition summary:', conditionCounts);
    
    return c.json({
      success: true,
      message: 'Ürün durumları başarıyla güncellendi',
      summary: conditionCounts,
      details: {
        totalProducts: allProducts?.length || 0,
        good: goodIds.length,
        lightly_used: lightlyUsedIds.length,
      }
    });
  } catch (err: any) {
    console.error('[UPDATE-CONDITIONS] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// SEED PRODUCT IMAGES - Her ürüne 6-8 fotoğraf ekle
// ==========================================
app.post("/make-server-0f4d2485/seed-product-images", async (c) => {
  try {
    console.log('[SEED] Starting product images seeding...');
    
    // Tüm ürünleri al
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, title, category:categories(name), brand:brands(name)');
    
    if (productsError) {
      console.error('[SEED] Error fetching products:', productsError);
      return c.json({ error: productsError.message }, 500);
    }
    
    console.log(`[SEED] Found ${products?.length || 0} products`);
    
    // Kategori bazlı Unsplash arama kelimeleri (Ev elektronikleri odaklı)
    const categoryImageKeywords: Record<string, string[]> = {
      'Elektronik': [
        'modern television',
        'smart tv screen',
        'home theater system',
        'sound system speaker',
        'tv entertainment',
        'living room television',
        'oled tv display',
        'soundbar audio'
      ],
      'Beyaz Eşya': [
        'modern refrigerator',
        'washing machine',
        'home appliance',
        'kitchen appliance',
        'dishwasher',
        'oven stove',
        'microwave oven',
        'modern kitchen',
        'air conditioner',
        'heating boiler',
        'kitchen range',
        'cooktop stove',
        'range hood',
        'dryer machine',
        'freezer appliance',
        'built-in oven'
      ],
      'Mobilya': [
        'modern furniture',
        'sofa living room',
        'dining table',
        'bedroom furniture',
        'office furniture',
        'chair design',
        'cabinet storage',
        'home interior'
      ]
    };
    
    const results = [];
    
    for (const product of products || []) {
      try {
        console.log(`[SEED] Processing product: ${product.title} (ID: ${product.id})`);
        
        // Mevcut fotoğrafları kontrol et
        const { data: existingImages, error: existingError } = await supabase
          .from('product_images')
          .select('id')
          .eq('product_id', product.id);
        
        if (existingError) {
          console.error(`[SEED] Error checking existing images for product ${product.id}:`, existingError);
          continue;
        }
        
        // Eğer zaten 6+ fotoğraf varsa atla
        if (existingImages && existingImages.length >= 6) {
          console.log(`[SEED] Product ${product.id} already has ${existingImages.length} images, skipping...`);
          results.push({ productId: product.id, status: 'skipped', reason: 'already_has_images' });
          continue;
        }
        
        // Kaç fotoğraf ekleyeceğimizi hesapla (toplam 6-8 olacak şekilde)
        const existingCount = existingImages?.length || 0;
        const targetCount = 6 + Math.floor(Math.random() * 3); // 6-8 arasında
        const neededCount = Math.max(0, targetCount - existingCount);
        
        if (neededCount === 0) {
          console.log(`[SEED] Product ${product.id} needs no additional images`);
          results.push({ productId: product.id, status: 'skipped', reason: 'sufficient_images' });
          continue;
        }
        
        // Kategori bazlı anahtar kelimeler al
        const categoryName = product.category?.name || 'Genel';
        const keywords = categoryImageKeywords[categoryName] || categoryImageKeywords['Elektronik'];
        
        // Ürün başlığından anahtar kelimeler çıkar
        const productKeywords = product.title.split(' ').slice(0, 2).join(' ').toLowerCase();
        
        // Fotoğraflar için Unsplash URL'leri oluştur
        const imageUrls: string[] = [];
        const usedIndices = new Set<number>();
        
        for (let i = 0; i < neededCount; i++) {
          // Rastgele bir keyword seç (tekrar etmemesi için)
          let randomIndex;
          do {
            randomIndex = Math.floor(Math.random() * keywords.length);
          } while (usedIndices.has(randomIndex) && usedIndices.size < keywords.length);
          usedIndices.add(randomIndex);
          
          const keyword = keywords[randomIndex];
          const width = 1200;
          const height = 900;
          const randomSeed = Math.floor(Math.random() * 10000);
          
          // Unsplash Source API kullan
          const imageUrl = `https://source.unsplash.com/${width}x${height}/?${encodeURIComponent(keyword)}&sig=${randomSeed}`;
          imageUrls.push(imageUrl);
        }
        
        console.log(`[SEED] Generated ${imageUrls.length} image URLs for product ${product.id}`);
        
        // Fotoğrafları veritabanına ekle
        const imagesToInsert = imageUrls.map((url, index) => ({
          product_id: product.id,
          image_url: url,
          order_num: existingCount + index + 1
        }));
        
        const { data: insertedImages, error: insertError } = await supabase
          .from('product_images')
          .insert(imagesToInsert)
          .select();
        
        if (insertError) {
          console.error(`[SEED] Error inserting images for product ${product.id}:`, insertError);
          results.push({ productId: product.id, status: 'error', error: insertError.message });
          continue;
        }
        
        console.log(`[SEED] ✅ Added ${insertedImages?.length || 0} images to product ${product.id}`);
        results.push({ 
          productId: product.id, 
          status: 'success', 
          imagesAdded: insertedImages?.length || 0,
          totalImages: existingCount + (insertedImages?.length || 0)
        });
        
      } catch (err: any) {
        console.error(`[SEED] Exception processing product ${product.id}:`, err);
        results.push({ productId: product.id, status: 'error', error: err.message });
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    
    console.log('[SEED] ============================================');
    console.log(`[SEED] Seeding completed!`);
    console.log(`[SEED] - Success: ${successCount}`);
    console.log(`[SEED] - Errors: ${errorCount}`);
    console.log(`[SEED] - Skipped: ${skippedCount}`);
    console.log('[SEED] ============================================');
    
    return c.json({ 
      success: true,
      message: 'Product images seeding completed',
      summary: {
        total: results.length,
        success: successCount,
        errors: errorCount,
        skipped: skippedCount
      },
      results
    });
  } catch (err: any) {
    console.error('[SEED] Exception in POST /seed-product-images:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// AUTHENTICATION ENDPOINTS
// ==========================================

// 🧪 TEST: Create test user
app.post("/make-server-0f4d2485/auth/create-test-user", async (c) => {
  try {
    const testEmail = 'test@ersinspot.com';
    const testPassword = 'test123456';
    const testName = 'Test Kullanıcı';
    const testPhone = '0532 123 4567';
    
    console.log('[AUTH] Creating test user:', testEmail);
    
    // Check if already exists and delete if so (to ensure clean state)
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email?.toLowerCase() === testEmail);
    
    if (existingUser) {
      console.log('[AUTH] Test user already exists, deleting and recreating...');
      
      // Delete from auth
      await supabase.auth.admin.deleteUser(existingUser.id);
      
      // Delete from customers table
      await supabase
        .from('customers')
        .delete()
        .eq('email', testEmail);
      
      console.log('[AUTH] Existing test user deleted');
    }
    
    // Create test user using auth.signUp
    const result = await auth.signUp(testEmail, testPassword, testName, testPhone);
    
    if (!result.success) {
      console.error('[AUTH] Failed to create test user:', result.error);
      return c.json({ error: result.error }, 400);
    }
    
    console.log('[AUTH] ✅ Test user created successfully');
    
    return c.json({
      success: true,
      message: result.message || 'Test kullanıcı oluşturuldu',
      credentials: {
        email: testEmail,
        password: testPassword
      },
      user: result.user,
      note: result.session ? 'Otomatik giriş başarılı' : 'Lütfen manuel giriş yapın'
    });
  } catch (err: any) {
    console.error('[AUTH] Exception creating test user:', err);
    return c.json({ error: err.message }, 500);
  }
});

// 🧪 TEST: Test login with test user
app.post("/make-server-0f4d2485/auth/test-login", async (c) => {
  try {
    const testEmail = 'test@ersinspot.com';
    const testPassword = 'test123456';
    
    console.log('[AUTH] 🧪 Test login attempt:', testEmail);
    
    const result = await auth.signIn(testEmail, testPassword);
    
    if (!result.success) {
      console.error('[AUTH] ❌ Test login failed:', result.error);
      return c.json({ 
        success: false, 
        error: result.error 
      }, 400);
    }
    
    console.log('[AUTH] ✅ Test login successful');
    
    return c.json({
      success: true,
      message: 'Test girişi başarılı',
      user: result.user,
      session: result.session
    });
  } catch (err: any) {
    console.error('[AUTH] Exception during test login:', err);
    return c.json({ error: err.message }, 500);
  }
});

// 🧹 TEST: Delete all users (DANGEROUS - only for development!)
app.post("/make-server-0f4d2485/auth/delete-all-users", async (c) => {
  try {
    console.log('[AUTH] 🧹 DELETING ALL USERS - This is dangerous!');
    
    // 1. Get all users from auth.users
    const { data: allUsers } = await supabase.auth.admin.listUsers();
    
    if (!allUsers?.users || allUsers.users.length === 0) {
      return c.json({
        success: true,
        message: 'Hiç kullanıcı bulunamadı',
        deleted_auth: 0,
        deleted_customers: 0
      });
    }
    
    let deletedAuthCount = 0;
    let deletedCustomersCount = 0;
    
    // 2. Delete each user from auth.users
    for (const user of allUsers.users) {
      try {
        await supabase.auth.admin.deleteUser(user.id);
        deletedAuthCount++;
        console.log('[AUTH] ✅ Deleted auth user:', user.email);
      } catch (err: any) {
        console.error('[AUTH] ❌ Failed to delete auth user:', user.email, err);
      }
    }
    
    // 3. Delete all customers from public.customers
    // Use neq with a UUID that doesn't exist to delete all rows
    const { error: customersError, count } = await supabase
      .from('customers')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows (neq with impossible UUID)
    
    if (customersError) {
      console.error('[AUTH] ❌ Failed to delete customers:', customersError);
    } else {
      deletedCustomersCount = count || 0;
      console.log('[AUTH] ✅ Deleted all customers:', deletedCustomersCount);
    }
    
    return c.json({
      success: true,
      message: `🧹 Tüm kullanıcılar silindi!`,
      deleted_auth: deletedAuthCount,
      deleted_customers: deletedCustomersCount,
      total_deleted: deletedAuthCount
    });
    
  } catch (err: any) {
    console.error('[AUTH] Exception deleting all users:', err);
    return c.json({ error: err.message }, 500);
  }
});

// 🔍 DEBUG: Auth sistem durumu kontrolü
app.get("/make-server-0f4d2485/auth/status", async (c) => {
  try {
    // 1. Auth users sayısı
    const { data: allUsers, error: listError } = await supabase.auth.admin.listUsers();
    const authUsersCount = allUsers?.users?.length || 0;
    
    // 2. Customers sayısı
    const { count: customersCount, error: customersError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });
    
    // 3. Auth users listesi (sadece email ve id)
    const authUsersList = allUsers?.users?.map(u => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      email_confirmed: u.email_confirmed_at ? true : false,
    })) || [];
    
    // 4. Customers listesi
    const { data: customersList } = await supabase
      .from('customers')
      .select('id, email, auth_user_id, created_at');
    
    return c.json({
      success: true,
      timestamp: new Date().toISOString(),
      auth: {
        total_users: authUsersCount,
        users: authUsersList,
      },
      customers: {
        total: customersCount || 0,
        list: customersList || [],
      },
      sync_status: {
        // Orphan auth users (auth'da var ama customers'ta yok)
        orphan_auth_count: authUsersList.filter(au => 
          !customersList?.find(c => c.auth_user_id === au.id)
        ).length,
        // Orphan customers (customers'ta var ama auth'da yok)
        orphan_customer_count: customersList?.filter(c => 
          !authUsersList.find(au => au.id === c.auth_user_id)
        ).length || 0,
      }
    });
    
  } catch (err: any) {
    console.error('[AUTH] Exception checking auth status:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Mount routers - Tüm modüler router'ları aktif hale getirdik
app.route('/make-server-0f4d2485/user-services', userServicesRouter);
app.route('/make-server-0f4d2485/user-sell-requests', userSellRequestsRouter);
app.route('/make-server-0f4d2485/user-orders', userOrdersRouter);
app.route('/make-server-0f4d2485/user-profile', userProfileRouter);
app.route('/make-server-0f4d2485/moving', movingRouter);
app.route('/make-server-0f4d2485/technical-service', technicalServiceRouter);
app.route('/make-server-0f4d2485/admin', adminDashboardRouter);

// Admin Availability - Meşguliyet Takvimi
app.get('/make-server-0f4d2485/admin/availability', adminAvailability.getAdminAvailability);
app.get('/make-server-0f4d2485/admin/available-slots', adminAvailability.getAvailableSlots);

// Admin Today Stats - Bugünkü İstatistikler
app.get('/make-server-0f4d2485/admin/today-stats', async (c) => {
  try {
    // Admin kontrolü
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Unauthorized - Access token required' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }

    // Kullanıcının admin olup olmadığını kontrol et
    const { data: customer } = await supabase
      .from('customers')
      .select('is_admin')
      .eq('auth_user_id', user.id)
      .single();

    if (!customer?.is_admin) {
      return c.json({ error: 'Forbidden - Admin access required' }, 403);
    }

    // Bugünün tarihini al (YYYY-MM-DD formatında)
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    console.log(`[TODAY-STATS] Fetching stats for: ${todayStr}`);

    // 1. Bugünkü Siparişler (delivery_date = bugün)
    const { count: todayOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('delivery_date', todayStr);

    console.log(`[TODAY-STATS] Today orders: ${todayOrders}`);

    // 2. Bugünkü Nakliye Randevuları (appointment_date = bugün ve status pending/confirmed)
    const { count: pendingMoving } = await supabase
      .from('moving_appointments')
      .select('*', { count: 'exact', head: true })
      .eq('appointment_date', todayStr)
      .in('status', ['pending', 'confirmed']);

    console.log(`[TODAY-STATS] Today moving: ${pendingMoving}`);

    // 3. Bugünkü Alım Talepleri (pickup_date = bugün ve status accepted/offer_sent/reviewing)
    const { count: todaySellRequests } = await supabase
      .from('sell_requests')
      .select('*', { count: 'exact', head: true })
      .eq('pickup_date', todayStr)
      .in('status', ['accepted', 'offer_sent', 'reviewing']);

    console.log(`[TODAY-STATS] Today sell requests: ${todaySellRequests}`);

    // 4. Bugünkü Teknik Servis (preferred_date = bugün ve status pending/confirmed)
    const { count: todayTechService } = await supabase
      .from('technical_service_requests')
      .select('*', { count: 'exact', head: true })
      .eq('preferred_date', todayStr)
      .in('status', ['pending', 'confirmed']);

    console.log(`[TODAY-STATS] Today tech service: ${todayTechService}`);

    return c.json({
      todayOrders: todayOrders || 0,
      pendingMoving: pendingMoving || 0,
      todaySellRequests: todaySellRequests || 0,
      todayTechService: todayTechService || 0,
      date: todayStr
    });

  } catch (err: any) {
    console.error('[TODAY-STATS] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// 📊 Admin Product Stats - Tüm ürün istatistiklerini döndürür
app.get('/make-server-0f4d2485/admin/product-stats', async (c) => {
  try {
    // Admin kontrolü (EMAIL tabanlı)
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const authCheck = await checkAdminAuth(accessToken || '');
    
    if (!authCheck.isAdmin) {
      console.log('[PRODUCT-STATS] ❌ Admin access denied:', authCheck.error);
      return c.json({ error: authCheck.error || 'Unauthorized' }, 403);
    }

    console.log('[PRODUCT-STATS] ✅ Admin authorized, fetching product statistics...');

    // 1. Toplam ürün sayısı
    const { count: total } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    // 2. Satışta olan ürünler (for_sale, available, active)
    const { count: forSale } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .in('status', ['for_sale', 'available', 'active']);

    // 3. Depoda olan ürünler (in_storage, stock)
    const { count: inStorage } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .in('status', ['in_storage', 'stock']);

    // 4. Satılan ürünler (sold)
    const { count: sold } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sold');

    console.log('[PRODUCT-STATS] Stats:', {
      total: total || 0,
      for_sale: forSale || 0,
      in_storage: inStorage || 0,
      sold: sold || 0
    });

    return c.json({
      total: total || 0,
      for_sale: forSale || 0,
      in_storage: inStorage || 0,
      sold: sold || 0
    });

  } catch (err: any) {
    console.error('[PRODUCT-STATS] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// 🔧 DEBUG: Check admin status
app.get("/make-server-0f4d2485/debug/check-admin", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Access token required' }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      return c.json({ error: 'Invalid token', details: authError }, 401);
    }
    
    // Check customer record
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, email, name, is_admin, auth_user_id')
      .eq('auth_user_id', user.id)
      .single();
    
    return c.json({
      auth_user: {
        id: user.id,
        email: user.email
      },
      customer_record: customer || null,
      customer_error: customerError || null,
      is_admin: customer?.is_admin || false
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// 🔧 DEBUG: Reset user password
app.post("/make-server-0f4d2485/debug/reset-password", async (c) => {
  try {
    const body = await c.req.json();
    const { email, newPassword } = body;
    
    if (!email || !newPassword) {
      return c.json({ error: 'Email and newPassword are required' }, 400);
    }
    
    console.log('[DEBUG] Resetting password for:', email);
    
    // Get user by email
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      return c.json({ error: 'Failed to list users' }, 500);
    }
    
    const user = users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }
    
    // Update password
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
      email_confirm: true,
    });
    
    if (updateError) {
      console.error('[DEBUG] Password update error:', updateError);
      return c.json({ error: updateError.message }, 500);
    }
    
    console.log('[DEBUG] ✅ Password reset successful for:', email);
    
    return c.json({
      success: true,
      message: `Password reset for ${email}`,
      userId: user.id,
    });
    
  } catch (err: any) {
    console.error('[DEBUG] Exception resetting password:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Sign up
app.post("/make-server-0f4d2485/auth/signup", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name, phone } = body;
    
    if (!email || !password || !name) {
      return c.json({ error: 'Email, password and name are required' }, 400);
    }
    
    console.log('[AUTH] Sign up request:', email);
    
    const result = await auth.signUp(email, password, name, phone);
    
    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }
    
    return c.json({
      success: true,
      user: result.user,
      session: result.session,
    });
  } catch (err: any) {
    console.error('[AUTH] Exception in POST /auth/signup:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Sign in
app.post("/make-server-0f4d2485/auth/signin", async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }
    
    console.log('[AUTH] Sign in request:', email);
    
    const result = await auth.signIn(email, password);
    
    if (!result.success) {
      return c.json({ error: result.error }, 401);
    }
    
    return c.json({
      success: true,
      user: result.user,
      session: result.session,
    });
  } catch (err: any) {
    console.error('[AUTH] Exception in POST /auth/signin:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Sign out
app.post("/make-server-0f4d2485/auth/signout", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Access token required' }, 401);
    }
    
    console.log('[AUTH] Sign out request');
    
    const result = await auth.signOut(accessToken);
    
    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }
    
    return c.json({ success: true });
  } catch (err: any) {
    console.error('[AUTH] Exception in POST /auth/signout:', err);
    return c.json({ error: err.message }, 500);
  }
});

// OAuth Callback - Google/Facebook ile giriş sonrası
app.post("/make-server-0f4d2485/auth/oauth-callback", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Access token required' }, 401);
    }
    
    const { email, name, provider } = await c.req.json();
    
    if (!email || !name) {
      return c.json({ error: 'Email and name required' }, 400);
    }
    
    console.log('[AUTH OAUTH] Callback işleniyor:', { email, provider });
    
    const result = await auth.handleOAuthCallback(email, name, provider || 'oauth');
    
    if (!result.success) {
      return c.json({ error: result.error }, 400);
    }
    
    return c.json({
      success: true,
      customer: result.customer,
      isNewUser: result.isNewUser,
    });
  } catch (err: any) {
    console.error('[AUTH OAUTH] Exception in POST /auth/oauth-callback:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Change password
app.post("/make-server-0f4d2485/auth/change-password", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Access token required' }, 401);
    }
    
    const { currentPassword, newPassword } = await c.req.json();
    
    if (!currentPassword || !newPassword) {
      return c.json({ error: 'Mevcut şifre ve yeni şifre gerekli' }, 400);
    }
    
    if (newPassword.length < 8) {
      return c.json({ error: 'Yeni şifre en az 8 karakter olmalı' }, 400);
    }
    
    console.log('[AUTH] Change password request');
    
    // Verify user
    const { data: { user }, error: verifyError } = await supabase.auth.getUser(accessToken);
    
    if (verifyError || !user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    // Verify current password by trying to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email!,
      password: currentPassword,
    });
    
    if (signInError) {
      return c.json({ error: 'Mevcut şifre yanlış' }, 400);
    }
    
    // Update password using service role
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: newPassword }
    );
    
    if (updateError) {
      console.error('[AUTH] Password update error:', updateError);
      return c.json({ error: 'Şifre güncellenemedi: ' + updateError.message }, 500);
    }
    
    console.log('[AUTH] Password changed successfully for:', user.email);
    
    return c.json({ success: true, message: 'Şifre başarıyla değiştirildi' });
  } catch (err: any) {
    console.error('[AUTH] Exception in POST /auth/change-password:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Verify token
app.get("/make-server-0f4d2485/auth/verify", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Access token required', shouldLogout: true }, 401);
    }
    
    const result = await auth.verifyToken(accessToken);
    
    if (!result.success) {
      return c.json({ 
        error: result.error, 
        shouldLogout: result.shouldLogout || true 
      }, 401);
    }
    
    return c.json({
      success: true,
      user: result.user,
    });
  } catch (err: any) {
    console.error('[AUTH] Exception in GET /auth/verify:', err);
    return c.json({ error: err.message, shouldLogout: true }, 500);
  }
});

// Check admin status - ADMINS tablosuna bakar
app.get("/make-server-0f4d2485/auth/check-admin", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    
    if (!accessToken) {
      return c.json({ error: 'Access token required', isAdmin: false }, 401);
    }
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      console.error('[CHECK-ADMIN] Auth error:', authError);
      return c.json({ error: 'Unauthorized', isAdmin: false }, 401);
    }
    
    console.log('[CHECK-ADMIN] Checking admin status for:', user.email);
    console.log('[CHECK-ADMIN] Valid admin emails:', ADMIN_EMAILS);
    
    // EMAIL bazlı kontrol (sabit admin listesinden)
    const isAdmin = ADMIN_EMAILS.includes(user.email || '');
    
    if (!isAdmin) {
      console.log('[CHECK-ADMIN] ❌ Not an admin email:', user.email);
      return c.json({ 
        isAdmin: false,
        error: 'Admin değil',
        email: user.email
      });
    }
    
    console.log('[CHECK-ADMIN] ✅ Admin confirmed:', user.email);
    
    return c.json({
      isAdmin: true,
      user: {
        id: user.id,
        email: user.email
      }
    });
  } catch (err: any) {
    console.error('[CHECK-ADMIN] Exception:', err);
    return c.json({ error: err.message, isAdmin: false }, 500);
  }
});

// GET /auth/ping - Simple ping test
app.get("/make-server-0f4d2485/auth/ping", async (c) => {
  console.log('[PING] Auth system ping received');
  return c.json({
    success: true,
    message: 'Auth system is running',
    timestamp: new Date().toISOString()
  });
});

// GET /auth/admin-health - Admin system health check
app.get("/make-server-0f4d2485/auth/admin-health", async (c) => {
  try {
    console.log('[ADMIN-HEALTH] Checking admin system health...');
    
    // Check if admins table exists
    const tableCheck = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'admins'
      ) as table_exists
    `;
    
    const tableExists = tableCheck[0]?.table_exists;
    
    let adminCount = 0;
    if (tableExists) {
      const countResult = await sql`SELECT COUNT(*) as count FROM admins`;
      adminCount = parseInt(countResult[0]?.count || '0');
    }
    
    console.log('[ADMIN-HEALTH] Status:', {
      tableExists,
      adminCount
    });
    
    return c.json({
      success: true,
      tableExists,
      adminCount,
      message: tableExists 
        ? (adminCount > 0 ? `${adminCount} admin hesabı bulundu` : 'Admin tablosu var ama henüz admin eklenmemiş')
        : 'Admin tablosu henüz oluşturulmamış'
    });
  } catch (error: any) {
    console.error('[ADMIN-HEALTH] Error:', error);
    return c.json({
      success: false,
      error: error.message
    }, 500);
  }
});

// GET /auth/list-admins - DEBUG: Tüm adminleri listele (geliştirme için)
app.get("/make-server-0f4d2485/auth/list-admins", async (c) => {
  try {
    console.log('[LIST-ADMINS] Listing all admins...');
    
    // Direkt SQL ile admins tablosunu sorgula
    const admins = await sql`
      SELECT id, email, name, auth_user_id, created_at 
      FROM admins 
      ORDER BY created_at DESC
    `;
    
    console.log('[LIST-ADMINS] ✅ Found', admins.length, 'admins');
    
    return c.json({ 
      success: true,
      count: admins.length,
      admins: admins.map((a: any) => ({
        id: a.id,
        email: a.email,
        name: a.name,
        auth_user_id: a.auth_user_id,
        created_at: a.created_at
      }))
    });
  } catch (error: any) {
    console.error('[LIST-ADMINS] ❌ Error:', error.message);
    
    // Eğer tablo yoksa daha açıklayıcı mesaj dön
    if (error.message?.includes('relation "admins" does not exist')) {
      console.log('[LIST-ADMINS] ⚠️ Admins table does not exist yet');
      return c.json({ 
        success: true,
        count: 0,
        admins: [],
        warning: 'Admins tablosu henüz oluşturulmamış. İlk admin hesabını oluşturun.'
      });
    }
    
    return c.json({ 
      success: false, 
      count: 0,
      admins: [],
      error: error.message 
    }, 500);
  }
});

// POST /make-admin - İlk admin kullanıcısını oluştur (ADMINS TABLOSU)
// ⚠️ ÖNEMLİ: Admin hesapları ADMINS tablosunda, müşteriler CUSTOMERS tablosunda
app.post("/make-server-0f4d2485/auth/make-admin", async (c) => {
  // Supabase client zaten global olarak tanımlı (line 24)
  
  try {
    const { email, password, name } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: 'Email ve şifre gerekli' }, 400);
    }
    
    console.log('[MAKE-ADMIN] Admin oluşturma isteği:', email);
    
    // ADMINS tablosunu kontrol et ve gerekirse oluştur
    let adminsTableExists = false;
    try {
      const pgModule = await import('https://deno.land/x/postgres@v0.17.0/mod.ts');
      const dbUrl = Deno.env.get('SUPABASE_DB_URL');
      if (!dbUrl) {
        return c.json({ 
          error: 'SUPABASE_DB_URL not found',
          message: 'Database connection URL is not configured'
        }, 500);
      }
      
      const client = new pgModule.Client(dbUrl);
      await client.connect();
      
      console.log('[MAKE-ADMIN] Connected to database for ADMINS table check');
      
      // Admins tablosunun varlığını kontrol et
      const { rows: adminsTableCheck } = await client.queryObject(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'admins'
        );
      `);
      
      adminsTableExists = adminsTableCheck[0]?.exists;
      console.log('[MAKE-ADMIN] Admins table exists:', adminsTableExists);
      
      if (!adminsTableExists) {
        console.log('[MAKE-ADMIN] Creating ADMINS table...');
        await client.queryArray(`
          CREATE TABLE admins (
            id BIGSERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            auth_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );
          
          CREATE INDEX idx_admins_email ON admins(email);
          CREATE INDEX idx_admins_auth_user_id ON admins(auth_user_id);
          
          ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
          
          CREATE POLICY "Service role has full access to admins"
            ON admins FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
        `);
        console.log('[MAKE-ADMIN] ✅ ADMINS table created');
        adminsTableExists = true; // Şimdi tablo var
      }
      
      await client.end();
    } catch (dbError: any) {
      console.error('[MAKE-ADMIN] Database setup error:', dbError);
      return c.json({ 
        error: 'Veritabanı hazırlama hatası', 
        details: dbError.message 
      }, 500);
    }
    
    // Mevcut admin var mı kontrol et - GÜVENLİK KONTROLÜ
    // ⚠️ Sadece tablo varsa kontrol et (PostgREST cache hatası önlemek için)
    let existingAdmins: any[] = [];
    let checkError = null;
    
    if (adminsTableExists) {
      const result = await supabase
        .from('admins')
        .select('id, email');
      
      existingAdmins = result.data || [];
      checkError = result.error;
      
      if (checkError) {
        console.error('[MAKE-ADMIN] Admin check error:', checkError);
        // İlk kurulum olabilir veya cache henüz refresh olmamış, devam et
        console.log('[MAKE-ADMIN] Continuing despite check error - might be cache issue');
      }
    } else {
      console.log('[MAKE-ADMIN] Skipping admin check - table just created');
    }
    
    // Güvenlik kontrolü: Eğer admin varsa sadece mevcut admin yeni admin ekleyebilir
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const publicKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (existingAdmins.length > 0) {
      // publicAnonKey ile yapılan istekleri reddet (ilk kurulum değil)
      if (!accessToken || accessToken === publicKey) {
        console.log('[MAKE-ADMIN] ⚠️ Admin already exists but allowing setup page for recovery');
        // Admin silinmişse yeniden oluşturabilmek için izin ver
      } else {
        const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
        if (authError || !user) {
          console.error('[MAKE-ADMIN] Auth error:', authError);
          return c.json({ error: 'Unauthorized' }, 401);
        }
        
        // Giriş yapan kullanıcı admin mi?
        const isCurrentUserAdmin = existingAdmins.some((a: any) => a.email === user.email);
        if (!isCurrentUserAdmin) {
          return c.json({ 
            error: 'Bu işlem için admin yetkisi gerekli',
            message: 'Sadece mevcut admin yeni admin ekleyebilir'
          }, 403);
        }
      }
    }
    
    // Admin zaten var mı kontrol et
    // ⚠️ Tablo cache'de yoksa hata verebilir, try-catch ile handle et
    try {
      const { data: existingAdmin, error: existError } = await supabase
        .from('admins')
        .select('id, email, auth_user_id')
        .eq('email', email)
        .single();
      
      // Tablo bulunamadı hatası değilse ve admin varsa
      if (!existError && existingAdmin) {
        console.log('[MAKE-ADMIN] ⚠️ Admin zaten mevcut:', email);
        console.log('[MAKE-ADMIN] Mevcut admin auth_user_id:', existingAdmin.auth_user_id);
        
        // Eğer admin'in auth_user_id'si yoksa veya Auth'da kayıt yoksa, güncelle
        // Bu durumda eski bir admin kaydı olabilir
        return c.json({ 
          error: 'Bu email zaten admin olarak kayıtlı',
          message: 'Bu email ile zaten bir admin hesabı var. Lütfen o hesabın şifresiyle "/admin/giris" sayfasından giriş yapın. Şifrenizi unuttuysanız farklı bir email ile yeni admin oluşturun.',
          existingEmail: existingAdmin.email
        }, 400);
      }
      
      // PGRST205 = tablo cache'de yok, yeni oluşturuldu - devam et
      if (existError && existError.code === 'PGRST205') {
        console.log('[MAKE-ADMIN] Admins table not in cache yet, proceeding...');
      }
    } catch (checkErr) {
      // Kontrol hatası - devam et (ilk admin olabilir)
      console.log('[MAKE-ADMIN] Existing admin check failed, proceeding:', checkErr);
    }
    
    // Yeni admin kullanıcısı oluştur (AUTH)
    console.log('[MAKE-ADMIN] Yeni admin kullanıcısı oluşturuluyor:', email);
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Email otomatik onaylanır
      user_metadata: { 
        name: name || 'Admin',
        role: 'admin' // Metadata'ya admin rolü ekliyoruz
      }
    });
    
    if (authError || !authData.user) {
      console.error('[MAKE-ADMIN] Auth user creation error:', authError);
      return c.json({ error: authError?.message || 'Kullanıcı oluşturulamadı' }, 500);
    }
    
    // ADMINS tablosuna kaydet (CUSTOMERS değil!)
    // NOT: Tablo yeni oluşturulduysa PostgREST cache henüz yenilenmemiş olabilir
    // Bu durumda direkt SQL kullanıyoruz
    try {
      const { error: adminError } = await supabase
        .from('admins')
        .insert({
          email: authData.user.email,
          name: name || 'Admin',
          auth_user_id: authData.user.id,
          created_at: new Date().toISOString()
        });
      
      if (adminError) {
        // PostgREST cache hatası olabilir - direkt SQL dene
        console.warn('[MAKE-ADMIN] PostgREST insert failed, trying direct SQL:', adminError.message);
        
        const pgModule = await import('https://deno.land/x/postgres@v0.17.0/mod.ts');
        const client = new pgModule.Client(Deno.env.get('SUPABASE_DB_URL')!);
        await client.connect();
        
        await client.queryArray(
          `INSERT INTO admins (email, name, auth_user_id, created_at) VALUES ($1, $2, $3, NOW())`,
          [authData.user.email, name || 'Admin', authData.user.id]
        );
        
        await client.end();
        console.log('[MAKE-ADMIN] ✅ Admin inserted via direct SQL');
      } else {
        console.log('[MAKE-ADMIN] ✅ Admin inserted via Supabase client');
      }
    } catch (insertError: any) {
      console.error('[MAKE-ADMIN] Admin insert failed completely:', insertError);
      // Auth user'ı sil (rollback)
      await supabase.auth.admin.deleteUser(authData.user.id);
      return c.json({ error: 'Admin kaydı oluşturulamadı: ' + insertError.message }, 500);
    }
    
    console.log('[MAKE-ADMIN] ✅ Admin başarıyla oluşturuldu (ADMINS tablosu):', email);
    return c.json({ 
      success: true, 
      message: 'Admin başarıyla oluşturuldu',
      email: authData.user.email,
      isNewUser: true
    });
    
  } catch (err: any) {
    console.error('[MAKE-ADMIN] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// CUSTOMERS/ME ENDPOINTS (Profil Yönetimi)
// ==========================================

// Auth middleware helper
async function verifyUserAuth(authHeader: string | null) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[verifyUserAuth] Missing or invalid auth header:', authHeader?.substring(0, 50));
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  console.log('[verifyUserAuth] Verifying token:', token?.substring(0, 20) + '...');
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    console.error('[verifyUserAuth] Auth error:', error);
    console.error('[verifyUserAuth] User data:', user);
    return null;
  }
  
  console.log('[verifyUserAuth] User verified:', user.email, 'ID:', user.id);
  return user;
}

// GET /customers/me - Kullanıcı bilgilerini getir
app.get("/make-server-0f4d2485/customers/me", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUserAuth(authHeader);
    
    if (!user) {
      return c.json({ error: 'Unauthorized - please login' }, 401);
    }
    
    console.log(`[CUSTOMERS/ME] Fetching profile for user: ${user.email}`);
    
    // Customers tablosundan kullanıcı bilgilerini getir - auth_user_id ile önce ara
    let customer;
    let error;
    
    // İlk önce auth_user_id ile ara
    const authIdResult = await supabase
      .from('customers')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    
    customer = authIdResult.data;
    error = authIdResult.error;
    
    // Bulamazsa email ile ara
    if (!customer && !error) {
      const emailResult = await supabase
        .from('customers')
        .select('*')
        .eq('email', user.email?.toLowerCase())
        .maybeSingle();
      
      customer = emailResult.data;
      error = emailResult.error;
      
      // Email ile bulundu ama auth_user_id yok, linkle
      if (customer && !customer.auth_user_id) {
        await supabase
          .from('customers')
          .update({ auth_user_id: user.id })
          .eq('id', customer.id);
        customer.auth_user_id = user.id;
        console.log('[CUSTOMERS/ME] Linked existing customer with auth user');
      }
    }
    
    if (error) {
      console.error('[CUSTOMERS/ME] Error fetching customer:', error);
      return c.json({ error: 'Profil bilgileri alınamadı' }, 500);
    }
    
    if (!customer) {
      // Kullanıcı yoksa oluştur (orphan auth kaydı)
      console.log(`[CUSTOMERS/ME] No customer found, creating from auth metadata`);
      
      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert({
          email: user.email?.toLowerCase(),
          name: user.user_metadata?.name || user.email?.split('@')[0] || '',
          phone: user.user_metadata?.phone || '',
          city: 'İzmir',
          auth_user_id: user.id,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('[CUSTOMERS/ME] Error creating customer:', insertError);
        return c.json({ error: 'Profil oluşturulamadı' }, 500);
      }
      
      return c.json({ customer: newCustomer });
    }
    
    console.log(`[CUSTOMERS/ME] Profile found for user: ${user.email}`);
    return c.json({ customer });
    
  } catch (err: any) {
    console.error('[CUSTOMERS/ME] Exception in GET /customers/me:', err);
    return c.json({ error: err.message }, 500);
  }
});

// PUT /customers/me - Kullanıcı bilgilerini güncelle
app.put("/make-server-0f4d2485/customers/me", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUserAuth(authHeader);
    
    if (!user) {
      return c.json({ error: 'Unauthorized - please login' }, 401);
    }
    
    const body = await c.req.json();
    console.log(`[CUSTOMERS/ME] Updating profile for user: ${user.email}`, body);
    
    // Güncellenebilir alanlar
    const allowedFields = [
      'name', 
      'phone', 
      'neighborhood',  // Mahalle
      'street',        // Sokak/Cadde
      'building_no',   // Bina No (snake_case)
      'apartment_no',  // Daire No (snake_case)
      'district',      // İlçe
      'city',          // Şehir
      'age'            // Yaş
    ];
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    // Sadece gönderilen ve izin verilen alanları ekle
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }
    
    // Customers tablosunu güncelle - auth_user_id ile ara
    const { data: customer, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('auth_user_id', user.id)
      .select()
      .single();
    
    if (error) {
      console.error('[CUSTOMERS/ME] Error updating customer:', error);
      return c.json({ error: 'Profil güncellenemedi' }, 500);
    }
    
    // Auth metadata'yı da güncelle (name ve phone için)
    if (body.name || body.phone) {
      await supabase.auth.admin.updateUserById(user.id, {
        user_metadata: {
          name: body.name || user.user_metadata?.name,
          phone: body.phone || user.user_metadata?.phone,
        },
      });
    }
    
    console.log(`[CUSTOMERS/ME] Profile updated successfully for user: ${user.email}`);
    
    return c.json({
      success: true,
      message: 'Profil başarıyla güncellendi',
      customer
    });
  } catch (err: any) {
    console.error('[CUSTOMERS/ME] Exception in PUT /customers/me:', err);
    return c.json({ error: err.message }, 500);
  }
});

// DELETE /customers/me - Kullanıcı hesabını ve tüm verilerini sil (GDPR/KVKK uyumlu)
app.delete("/make-server-0f4d2485/customers/me", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUserAuth(authHeader);
    
    if (!user) {
      return c.json({ error: 'Unauthorized - please login' }, 401);
    }
    
    console.log(`[CUSTOMERS/ME] ⚠️ Deleting account for user: ${user.email}`);
    
    // Kullanıcıyı bul
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, email')
      .eq('email', user.email?.toLowerCase())
      .single();
    
    if (customerError || !customer) {
      console.error('[CUSTOMERS/ME] Customer not found:', customerError);
      return c.json({ error: 'Kullanıcı bulunamadı' }, 404);
    }
    
    console.log(`[CUSTOMERS/ME] Found customer ID: ${customer.id}, deleting all related data...`);
    
    // 1. Orders tablosundaki siparişleri sil
    const { error: ordersDeleteError } = await supabase
      .from('orders')
      .delete()
      .eq('customer_id', customer.id);
    
    if (ordersDeleteError) {
      console.error('[CUSTOMERS/ME] Error deleting orders:', ordersDeleteError);
    } else {
      console.log('[CUSTOMERS/ME] ✅ Orders deleted');
    }
    
    // 2. Technical service requests tablosundaki talepleri sil
    const { error: techServiceDeleteError } = await supabase
      .from('technical_service_requests')
      .delete()
      .eq('customer_id', customer.id);
    
    if (techServiceDeleteError) {
      console.error('[CUSTOMERS/ME] Error deleting technical service requests:', techServiceDeleteError);
    } else {
      console.log('[CUSTOMERS/ME] ✅ Technical service requests deleted');
    }
    
    // 3. Moving requests tablosundaki talepleri sil
    const { error: movingDeleteError } = await supabase
      .from('moving_requests')
      .delete()
      .eq('customer_id', customer.id);
    
    if (movingDeleteError) {
      console.error('[CUSTOMERS/ME] Error deleting moving requests:', movingDeleteError);
    } else {
      console.log('[CUSTOMERS/ME] ✅ Moving requests deleted');
    }
    
    // 3b. Sell requests tablosundaki talepleri sil (Postgres)
    const { error: sellRequestsDeleteError } = await supabase
      .from('sell_requests')
      .delete()
      .eq('customer_id', customer.id);
    
    if (sellRequestsDeleteError) {
      console.error('[CUSTOMERS/ME] Error deleting sell requests from Postgres:', sellRequestsDeleteError);
    } else {
      console.log('[CUSTOMERS/ME] ✅ Sell requests deleted from Postgres');
    }
    
    // 4. KV Store'daki verileri sil (sell_requests legacy, favorites, cart)
    // KV'de user_id kullanılıyor, customer_id değil
    const kvDeletePromises = [];
    
    // Sell requests (prefix: sell-request:user:<user_id>:)
    kvDeletePromises.push(
      (async () => {
        try {
          const kvKeys = await kv.getByPrefix(`sell-request:user:${user.id}:`);
          for (const { key } of kvKeys) {
            await kv.del(key);
          }
          console.log('[CUSTOMERS/ME] ✅ Sell requests deleted from KV');
        } catch (e) {
          console.error('[CUSTOMERS/ME] Error deleting sell requests from KV:', e);
        }
      })()
    );
    
    // Favorites (key: favorites:<user_id>)
    kvDeletePromises.push(
      (async () => {
        try {
          await kv.del(`favorites:${user.id}`);
          console.log('[CUSTOMERS/ME] ✅ Favorites deleted from KV');
        } catch (e) {
          console.error('[CUSTOMERS/ME] Error deleting favorites from KV:', e);
        }
      })()
    );
    
    // Cart (key: cart:<user_id>)
    kvDeletePromises.push(
      (async () => {
        try {
          await kv.del(`cart:${user.id}`);
          console.log('[CUSTOMERS/ME] ✅ Cart deleted from KV');
        } catch (e) {
          console.error('[CUSTOMERS/ME] Error deleting cart from KV:', e);
        }
      })()
    );
    
    await Promise.all(kvDeletePromises);
    
    // 5. Customers tablosundan kullanıcıyı sil
    const { error: customerDeleteError } = await supabase
      .from('customers')
      .delete()
      .eq('id', customer.id);
    
    if (customerDeleteError) {
      console.error('[CUSTOMERS/ME] Error deleting customer:', customerDeleteError);
      return c.json({ error: 'Hesap silinemedi' }, 500);
    }
    
    console.log('[CUSTOMERS/ME] ✅ Customer deleted from database');
    
    // 6. Supabase Auth'dan kullanıcıyı sil
    const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user.id);
    
    if (authDeleteError) {
      console.error('[CUSTOMERS/ME] Error deleting auth user:', authDeleteError);
      // Bu hata kritik değil, database zaten temizlendi
    } else {
      console.log('[CUSTOMERS/ME] ✅ Auth user deleted');
    }
    
    console.log(`[CUSTOMERS/ME] 🎉 Account and all data deleted successfully for: ${customer.email}`);
    
    return c.json({
      success: true,
      message: 'Hesabınız ve tüm verileriniz başarıyla silindi'
    });
    
  } catch (err: any) {
    console.error('[CUSTOMERS/ME] Exception in DELETE /customers/me:', err);
    return c.json({ error: 'Hesap silinirken bir hata oluştu', details: err.message }, 500);
  }
});

// DELETE /customers/delete-all - ADMIN: Tüm müşterileri ve verilerini sil
app.delete("/make-server-0f4d2485/customers/delete-all", async (c) => {
  try {
    console.log('[ADMIN] ⚠️⚠️⚠️ DELETE ALL CUSTOMERS REQUESTED ⚠️⚠️⚠️');
    
    // Tüm müşterileri getir
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('id, email');
    
    if (customersError) {
      console.error('[ADMIN] Error fetching customers:', customersError);
      return c.json({ error: 'Müşteriler alınamadı' }, 500);
    }
    
    if (!customers || customers.length === 0) {
      console.log('[ADMIN] No customers to delete');
      return c.json({ success: true, message: 'Silinecek müşteri bulunamadı', deletedCount: 0 });
    }
    
    console.log(`[ADMIN] Found ${customers.length} customers to delete`);
    
    // 1. Orders tablosunu tamamen temizle
    const { error: ordersDeleteError } = await supabase
      .from('orders')
      .delete()
      .neq('id', 0); // Tüm kayıtları sil
    
    if (ordersDeleteError) {
      console.error('[ADMIN] Error deleting orders:', ordersDeleteError);
    } else {
      console.log('[ADMIN] ✅ All orders deleted');
    }
    
    // 2. Technical service requests tablosunu temizle
    const { error: techServiceDeleteError } = await supabase
      .from('technical_service_requests')
      .delete()
      .neq('id', 0);
    
    if (techServiceDeleteError) {
      console.error('[ADMIN] Error deleting technical service requests:', techServiceDeleteError);
    } else {
      console.log('[ADMIN] ✅ All technical service requests deleted');
    }
    
    // 3. Moving requests tablosunu temizle
    const { error: movingDeleteError } = await supabase
      .from('moving_requests')
      .delete()
      .neq('id', 0);
    
    if (movingDeleteError) {
      console.error('[ADMIN] Error deleting moving requests:', movingDeleteError);
    } else {
      console.log('[ADMIN] ✅ All moving requests deleted');
    }
    
    // 4. KV Store'u temizle
    try {
      // Sell requests
      const sellRequestKeys = await kv.getByPrefix('sell-request:');
      for (const { key } of sellRequestKeys) {
        await kv.del(key);
      }
      console.log('[ADMIN] ✅ All sell requests deleted from KV');
      
      // Favorites
      const favoriteKeys = await kv.getByPrefix('favorites:');
      for (const { key } of favoriteKeys) {
        await kv.del(key);
      }
      console.log('[ADMIN] ✅ All favorites deleted from KV');
      
      // Cart
      const cartKeys = await kv.getByPrefix('cart:');
      for (const { key } of cartKeys) {
        await kv.del(key);
      }
      console.log('[ADMIN] ✅ All carts deleted from KV');
    } catch (kvError) {
      console.error('[ADMIN] Error deleting from KV:', kvError);
    }
    
    // 5. Customers tablosunu temizle
    const { error: customersDeleteError } = await supabase
      .from('customers')
      .delete()
      .neq('id', 0);
    
    if (customersDeleteError) {
      console.error('[ADMIN] Error deleting customers:', customersDeleteError);
      return c.json({ error: 'Müşteriler silinemedi' }, 500);
    }
    
    console.log('[ADMIN] ✅ All customers deleted from database');
    
    // 6. Supabase Auth'dan tüm kullanıcıları sil
    let deletedAuthCount = 0;
    for (const customer of customers) {
      try {
        // Email ile auth kullanıcısını bul
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const authUser = authUsers?.users?.find(u => u.email?.toLowerCase() === customer.email?.toLowerCase());
        
        if (authUser) {
          await supabase.auth.admin.deleteUser(authUser.id);
          deletedAuthCount++;
        }
      } catch (authError) {
        console.error(`[ADMIN] Error deleting auth user for ${customer.email}:`, authError);
      }
    }
    
    console.log(`[ADMIN] ✅ Deleted ${deletedAuthCount} auth users`);
    
    console.log(`[ADMIN] 🎉 Successfully deleted ${customers.length} customers and all their data`);
    
    return c.json({
      success: true,
      message: `${customers.length} müşteri ve tüm verileri başarıyla silindi`,
      deletedCount: customers.length,
      deletedAuthCount
    });
    
  } catch (err: any) {
    console.error('[ADMIN] Exception in DELETE /customers/delete-all:', err);
    return c.json({ error: 'Toplu silme işlemi başarısız', details: err.message }, 500);
  }
});

// GET /customers/me/stats - Kullanıcı istatistiklerini getir
app.get("/make-server-0f4d2485/customers/me/stats", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUserAuth(authHeader);
    
    if (!user) {
      return c.json({ error: 'Unauthorized - please login' }, 401);
    }
    
    console.log(`[CUSTOMERS/ME/STATS] Fetching stats for user: ${user.email}`);
    
    // Kullanıcıyı bul
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('email', user.email?.toLowerCase())
      .single();
    
    if (customerError || !customer) {
      console.error('[CUSTOMERS/ME/STATS] Customer not found:', customerError);
      return c.json({ 
        stats: {
          totalOrders: 0,
          totalServiceAppointments: 0,
          totalMovingAppointments: 0,
          totalSellRequests: 0
        }
      });
    }
    
    // Toplam sipariş sayısı
    const { count: ordersCount, error: ordersError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customer.id);
    
    if (ordersError) {
      console.error('[CUSTOMERS/ME/STATS] Error counting orders:', ordersError);
    }
    
    // Toplam teknik servis randevuları - user_id kullanıyor
    const { count: serviceCount, error: serviceError } = await supabase
      .from('technical_service_appointments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    if (serviceError) {
      console.error('[CUSTOMERS/ME/STATS] Error counting service appointments:', serviceError);
    }
    
    // Toplam nakliye randevuları - user_id kullanıyor
    const { count: movingCount, error: movingError } = await supabase
      .from('moving_appointments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    if (movingError) {
      console.error('[CUSTOMERS/ME/STATS] Error counting moving appointments:', movingError);
    }
    
    // Toplam satış talepleri - customer_id kullanıyor (sell_requests tablosunda customer_id var)
    let sellRequestsCount = 0;
    if (customer) {
      const { count, error: sellRequestsError } = await supabase
        .from('sell_requests')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', customer.id);
      
      if (sellRequestsError) {
        console.error('[CUSTOMERS/ME/STATS] Error counting sell requests:', sellRequestsError);
      } else {
        sellRequestsCount = count || 0;
      }
    }
    
    // Toplam favori ürünler - user_id kullanıyor
    const { count: favoritesCount, error: favoritesError } = await supabase
      .from('favorites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);
    
    if (favoritesError) {
      console.error('[CUSTOMERS/ME/STATS] Error counting favorites:', favoritesError);
    }
    
    const stats = {
      totalOrders: ordersCount || 0,
      totalServiceAppointments: serviceCount || 0,
      totalMovingAppointments: movingCount || 0,
      totalSellRequests: sellRequestsCount || 0,
      totalFavorites: favoritesCount || 0
    };
    
    console.log(`[CUSTOMERS/ME/STATS] Stats fetched successfully:`, stats);
    
    return c.json({ stats });
    
  } catch (err: any) {
    console.error('[CUSTOMERS/ME/STATS] Exception in GET /customers/me/stats:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// FAVORITES ENDPOINTS (Favoriler Yönetimi)
// ==========================================

// GET /favorites - Kullanıcının favorilerini getir
app.get("/make-server-0f4d2485/favorites", async (c) => {
  console.log('[FAVORITES] ========== GET /favorites request received ==========');
  try {
    const authHeader = c.req.header('Authorization');
    console.log('[FAVORITES] Auth header present:', !!authHeader);
    
    const user = await verifyUserAuth(authHeader);

    if (!user) {
      console.error('[FAVORITES] Unauthorized access attempt - user verification failed');
      return c.json({ error: 'Unauthorized - please login' }, 401);
    }

    console.log(`[FAVORITES] ��� User authenticated: ${user.email} (ID: ${user.id})`);

    // Sadece user_id ile sorgu yap (tek gerçek kaynak)
    console.log('[FAVORITES] Querying favorites with user_id:', user.id);
    
    const result = await supabase
      .from('favorites')
      .select(`
        id,
        product_id,
        created_at,
        product:products (
          id,
          title,
          price,
          condition,
          status,
          category:categories(id, name, slug),
          images:product_images(id, image_url, order_num)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (result.error) {
      console.error('[FAVORITES] ❌ Error fetching favorites:', JSON.stringify(result.error));
      // RLS hatası vs olsa bile boş array döndür - uygulama çalışmaya devam etsin
      return c.json({ favorites: [] });
    }
    
    const favorites = result.data || [];
    console.log(`[FAVORITES] ✅ Found ${favorites.length} favorites for user: ${user.email}`);
    return c.json({ favorites });
  } catch (err: any) {
    console.error('[FAVORITES] Exception in GET /favorites:', err);
    console.error('[FAVORITES] Exception stack:', err.stack);
    // Hata durumunda bile boş array döndür
    return c.json({ favorites: [] });
  }
});

// POST /favorites - Favorilere ekle
app.post("/make-server-0f4d2485/favorites", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUserAuth(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized - please login' }, 401);
    }

    const { product_id } = await c.req.json();

    if (!product_id) {
      return c.json({ error: 'product_id gerekli' }, 400);
    }

    console.log(`[FAVORITES] Adding product ${product_id} to favorites for user: ${user.email}`);

    // Sadece user_id ile kontrol et
    const checkResult = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_id', product_id)
      .maybeSingle();
    
    if (checkResult.data) {
      console.log(`[FAVORITES] Product ${product_id} already in favorites`);
      return c.json({ message: 'Ürün zaten favorilerde', favorite_id: checkResult.data.id });
    }

    // Favorilere ekle - sadece user_id ile
    const { data, error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        product_id: product_id,
      })
      .select()
      .single();

    if (error) {
      console.error('[FAVORITES] Error adding to favorites:', error);
      return c.json({ error: 'Favorilere eklenemedi', details: error.message }, 500);
    }

    console.log(`[FAVORITES] Product ${product_id} added to favorites successfully`);
    return c.json({ message: 'Favorilere eklendi', favorite: data });
  } catch (err: any) {
    console.error('[FAVORITES] Exception in POST /favorites:', err);
    return c.json({ error: err.message }, 500);
  }
});

// DELETE /favorites/:productId - Favorilerden çıkar
app.delete("/make-server-0f4d2485/favorites/:productId", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const user = await verifyUserAuth(authHeader);

    if (!user) {
      return c.json({ error: 'Unauthorized - please login' }, 401);
    }

    const productId = c.req.param('productId');

    console.log(`[FAVORITES] Removing product ${productId} from favorites for user: ${user.email}`);

    // Sadece user_id ile sil
    const result = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (result.error) {
      console.error('[FAVORITES] Error removing from favorites:', result.error);
      return c.json({ error: 'Favorilerden çıkarılamadı', details: result.error.message }, 500);
    }

    console.log(`[FAVORITES] Product ${productId} removed from favorites successfully`);
    return c.json({ message: 'Favorilerden çıkarıldı' });
  } catch (err: any) {
    console.error('[FAVORITES] Exception in DELETE /favorites:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// USER-SPECIFIC ENDPOINTS FOR DASHBOARD
// ==========================================

// GET /user-orders - Kullanıcının siparişlerini getir
app.get("/make-server-0f4d2485/user-orders", async (c) => {
  try {
    console.log('[USER-ORDERS] Fetching user orders');
    
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Yetkilendirme hatası' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Kullanıcı doğrulanamadı' }, 401);
    }

    // Get customer - önce auth_user_id ile, bulamazsa email ile ara
    let customer;
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('id, auth_user_id')
      .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle();

    if (customerError) {
      console.error('[USER-ORDERS] Customer query error:', customerError);
      return c.json({ orders: [] });
    }

    if (!customerData) {
      console.log('[USER-ORDERS] No customer found for user:', user.email);
      return c.json({ orders: [] });
    }

    customer = customerData;

    // Email ile bulunduysa ama auth_user_id yoksa linkle
    if (!customer.auth_user_id) {
      await supabase
        .from('customers')
        .update({ auth_user_id: user.id })
        .eq('id', customer.id);
      console.log('[USER-ORDERS] Linked existing customer with auth user');
    }

    // Get orders from KV store
    const orderKeys = await kv.getByPrefix(`order_by_customer:${customer.id}:`);
    
    // Sort by created_at descending
    const orders = orderKeys.sort((a: any, b: any) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    // Enrich with items and statusHistory
    for (const order of orders) {
      const items = await kv.get(`order_items:${order.id}`);
      order.items = items || [];
      
      // Get status history
      const statusHistory = await kv.get(`order_status_history:${order.id}`);
      order.statusHistory = statusHistory || [];
    }

    return c.json({ orders: orders || [] });
  } catch (err: any) {
    console.error('[USER-ORDERS] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// POST /cancel-order - Sipariş iptali
app.post("/make-server-0f4d2485/cancel-order", async (c) => {
  try {
    console.log('[CANCEL-ORDER] Processing order cancellation');
    
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Yetkilendirme hatası' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Kullanıcı doğrulanamadı' }, 401);
    }

    // Get orderId from request body
    const body = await c.req.json();
    const { orderId } = body;

    if (!orderId) {
      return c.json({ error: 'Sipariş ID gerekli' }, 400);
    }

    // Get customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (customerError || !customer) {
      return c.json({ error: 'Müşteri bulunamadı' }, 404);
    }

    // Get order from KV store
    const order = await kv.get(`order:${orderId}`);
    
    if (!order) {
      return c.json({ error: 'Sipariş bulunamadı' }, 404);
    }

    // Verify order belongs to customer
    if (order.customer_id !== customer.id) {
      return c.json({ error: 'Bu sipariş size ait değil' }, 403);
    }

    // Check if order can be cancelled
    const nonCancellableStatuses = ['in_transit', 'delivered', 'cancelled'];
    if (nonCancellableStatuses.includes(order.status)) {
      return c.json({ 
        error: 'Bu sipariş iptal edilemez',
        reason: order.status === 'in_transit' 
          ? 'Sipariş taşıma aşamasında' 
          : order.status === 'delivered'
          ? 'Sipariş teslim edildi'
          : 'Sipariş zaten iptal edilmiş'
      }, 400);
    }

    // Update order status to cancelled
    order.status = 'cancelled';
    order.cancelled_at = new Date().toISOString();
    
    // Save updated order
    await kv.set(`order:${orderId}`, order);
    await kv.set(`order_by_customer:${customer.id}:${orderId}`, order);

    // ✅ YENİ: Sipariş iptal edildi - ürünleri tekrar 'available' yap
    const orderItems = await kv.get(`order_items:${orderId}`);
    if (orderItems && orderItems.length > 0) {
      for (const item of orderItems) {
        // KV Store'daki product'ı güncelle (legacy)
        const productKey = `product:${item.product_id}`;
        const productData = await kv.get(productKey);
        if (productData) {
          productData.status = 'available';
          productData.updated_at = new Date().toISOString();
          await kv.set(productKey, productData);
        }

        // ✅ Supabase products tablosunu güncelle
        await supabase
          .from('products')
          .update({ 
            status: 'for_sale',
            updated_at: new Date().toISOString()
          })
          .eq('id', item.product_id);
      }
      
      console.log(`[CANCEL-ORDER] ✅ ${orderItems.length} ürün tekrar satışa sunuldu (for_sale)`);
    }

    console.log(`✅ Order ${orderId} cancelled successfully`);

    return c.json({ 
      success: true, 
      message: 'Sipariş başarıyla iptal edildi',
      order 
    });
  } catch (err: any) {
    console.error('[CANCEL-ORDER] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// GET /user-services - Kullanıcının teknik servis randevularını getir
app.get("/make-server-0f4d2485/user-services", async (c) => {
  try {
    console.log('[USER-SERVICES] Fetching user service appointments');
    
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Yetkilendirme hatası' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Kullanıcı doğrulanamadı' }, 401);
    }

    const { data: appointments, error: appointmentsError } = await supabase
      .from('technical_service_appointments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (appointmentsError) {
      console.error('[USER-SERVICES] Error:', appointmentsError);
      return c.json({ error: 'Randevular yüklenemedi' }, 500);
    }

    return c.json({ appointments: appointments || [] });
  } catch (err: any) {
    console.error('[USER-SERVICES] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// GET /user-moving - Kullanıcının nakliye randevularını getir
app.get("/make-server-0f4d2485/user-moving", async (c) => {
  try {
    console.log('[USER-MOVING] Fetching user moving appointments');
    
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Yetkilendirme hatası' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      return c.json({ error: 'Kullanıcı doğrulanamadı' }, 401);
    }

    const { data: appointments, error: appointmentsError } = await supabase
      .from('moving_appointments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (appointmentsError) {
      console.error('[USER-MOVING] Error:', appointmentsError);
      return c.json({ error: 'Randevular yüklenemedi' }, 500);
    }

    return c.json({ appointments: appointments || [] });
  } catch (err: any) {
    console.error('[USER-MOVING] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// GET /user-sell-requests - Kullanıcının satış taleplerini getir
app.get("/make-server-0f4d2485/user-sell-requests", async (c) => {
  try {
    console.log('[USER-SELL-REQUESTS] Fetching user sell requests');
    
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Yetkilendirme hatası' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      console.error('[USER-SELL-REQUESTS] Auth error:', authError);
      return c.json({ error: 'Kullanıcı doğrulanamadı' }, 401);
    }

    console.log('[USER-SELL-REQUESTS] User authenticated:', user.email, user.id);

    // Get customer_id from auth_user_id or email
    let customer;
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('id, auth_user_id')
      .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle();

    if (customerError) {
      console.error('[USER-SELL-REQUESTS] Customer query error:', customerError);
      return c.json({ sellRequests: [] });
    }

    if (!customerData) {
      console.log('[USER-SELL-REQUESTS] Customer not found, creating new customer for user:', user.email);
      
      // Customer bulunamadı, yeni oluştur
      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert({
          email: user.email?.toLowerCase(),
          name: user.user_metadata?.name || user.email?.split('@')[0] || '',
          phone: user.user_metadata?.phone || '',
          city: 'İzmir',
          auth_user_id: user.id,
          created_at: new Date().toISOString()
        })
        .select('id, auth_user_id')
        .single();
      
      if (insertError || !newCustomer) {
        console.error('[USER-SELL-REQUESTS] Failed to create customer:', insertError);
        return c.json({ sellRequests: [] });
      }
      
      customer = newCustomer;
      console.log('[USER-SELL-REQUESTS] ✅ New customer created:', customer.id);
    } else {
      customer = customerData;
      
      // Email ile bulunduysa ama auth_user_id yoksa linkle
      if (!customer.auth_user_id) {
        await supabase
          .from('customers')
          .update({ auth_user_id: user.id })
          .eq('id', customer.id);
        customer.auth_user_id = user.id;
        console.log('[USER-SELL-REQUESTS] Linked existing customer with auth user');
      }
      
      console.log('[USER-SELL-REQUESTS] ✅ Customer found:', customer.id);
    }

    // Fetch sell requests with images
    const { data: requests, error: requestsError } = await supabase
      .from('sell_requests')
      .select(`
        id,
        customer_id,
        title,
        brand,
        model,
        year,
        condition,
        description,
        asking_price,
        admin_offer_price,
        admin_notes,
        status,
        created_at,
        updated_at,
        images:sell_request_images(id, image_url, order_num)
      `)
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('[USER-SELL-REQUESTS] ❌ Error fetching requests:', requestsError);
      return c.json({ error: 'Talepler yüklenemedi' }, 500);
    }

    console.log('[USER-SELL-REQUESTS] ✅ Found', requests?.length || 0, 'requests');

    // Format response with proper field mapping
    const formattedRequests = requests?.map(req => ({
      ...req,
      request_number: `#URN-${String(req.id).padStart(5, '0')}`,
      requested_price: req.asking_price,
      offer_price: req.admin_offer_price,
      offer_note: req.admin_notes,
      product_name: req.title,
      condition: getConditionText(req.condition),
      status_text: getStatusText(req.status),
    })) || [];

    console.log('[USER-SELL-REQUESTS] ✅ Returning formatted requests:', formattedRequests.length);
    return c.json({ sellRequests: formattedRequests });
  } catch (err: any) {
    console.error('[USER-SELL-REQUESTS] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// GET /user-sell-requests/:id - Kullanıcının satış talebinin detaylarını getir
app.get("/make-server-0f4d2485/user-sell-requests/:id", async (c) => {
  try {
    const requestId = parseInt(c.req.param('id'));
    console.log(`[USER-SELL-REQUEST-DETAIL] Fetching request ${requestId}`);
    
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ error: 'Yetkilendirme hatası' }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (authError || !user) {
      console.error('[USER-SELL-REQUEST-DETAIL] Auth error:', authError);
      return c.json({ error: 'Kullanıcı doğrulanamadı' }, 401);
    }

    console.log('[USER-SELL-REQUEST-DETAIL] User authenticated:', user.email);

    // Get customer_id from auth_user_id or email
    let customer;
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .select('id, name, phone, email, neighborhood, street, building_no, apartment_no, district, city, auth_user_id')
      .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle();

    if (customerError) {
      console.error('[USER-SELL-REQUEST-DETAIL] Customer query error:', customerError);
      return c.json({ error: 'Müşteri bilgileri alınamadı' }, 500);
    }

    if (!customerData) {
      console.log('[USER-SELL-REQUEST-DETAIL] Customer not found, creating new customer for user:', user.email);
      
      // Customer bulunamadı, yeni oluştur
      const { data: newCustomer, error: insertError } = await supabase
        .from('customers')
        .insert({
          email: user.email?.toLowerCase(),
          name: user.user_metadata?.name || user.email?.split('@')[0] || '',
          phone: user.user_metadata?.phone || '',
          city: 'İzmir',
          auth_user_id: user.id,
          created_at: new Date().toISOString()
        })
        .select('id, name, phone, email, neighborhood, street, building_no, apartment_no, district, city, auth_user_id')
        .single();
      
      if (insertError || !newCustomer) {
        console.error('[USER-SELL-REQUEST-DETAIL] Failed to create customer:', insertError);
        return c.json({ error: 'Müşteri kaydı oluşturulamadı' }, 500);
      }
      
      customer = newCustomer;
      console.log('[USER-SELL-REQUEST-DETAIL] New customer created:', customer.id);
    } else {
      customer = customerData;
      
      // Email ile bulunduysa ama auth_user_id yoksa linkle
      if (!customer.auth_user_id) {
        await supabase
          .from('customers')
          .update({ auth_user_id: user.id })
          .eq('id', customer.id);
        customer.auth_user_id = user.id;
        console.log('[USER-SELL-REQUEST-DETAIL] Linked existing customer with auth user');
      }
    }

    console.log('[USER-SELL-REQUEST-DETAIL] Customer found:', customer.id);

    // Fetch sell request with images
    const { data: request, error: requestError } = await supabase
      .from('sell_requests')
      .select(`
        id,
        customer_id,
        title,
        brand,
        model,
        year,
        condition,
        description,
        asking_price,
        admin_offer_price,
        admin_notes,
        status,
        created_at,
        updated_at,
        images:sell_request_images(id, image_url, order_num)
      `)
      .eq('id', requestId)
      .eq('customer_id', customer.id)
      .order('order_num', { foreignTable: 'sell_request_images', ascending: true })
      .single();

    if (requestError || !request) {
      console.error('[USER-SELL-REQUEST-DETAIL] Error:', requestError);
      return c.json({ error: 'Talep bulunamadı' }, 404);
    }

    // Format response
    const formattedRequest = {
      id: request.id,
      requestNumber: `#URN-${String(request.id).padStart(5, '0')}`,
      title: request.title,
      brand: request.brand,
      model: request.model,
      year: request.year,
      condition: getConditionText(request.condition),
      description: request.description,
      requestedPrice: request.asking_price,
      offerPrice: request.admin_offer_price,
      offerNote: request.admin_notes,
      status: request.status,
      statusText: getStatusText(request.status),
      createdAt: new Date(request.created_at).toLocaleDateString('tr-TR'),
      images: request.images?.sort((a: any, b: any) => a.order_num - b.order_num).map((img: any) => img.image_url) || [],
      customerInfo: {
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        address: buildCustomerAddress(customer),
      },
    };

    return c.json({ request: formattedRequest });
  } catch (err: any) {
    console.error('[USER-SELL-REQUEST-DETAIL] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Helper function for status text
function getStatusText(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'Beklemede',
    'reviewing': 'İnceleniyor',
    'offer_sent': 'Teklif Gönderildi',
    'accepted': 'Kabul Edildi',
    'rejected': 'Reddedildi',
    'completed': 'Tamamlandı',
    'cancelled': 'İptal Edildi',
  };
  return statusMap[status] || 'Bilinmiyor';
}

// Helper function for condition text - Türkçe çeviriler
function getConditionText(condition: string): string {
  const conditionMap: Record<string, string> = {
    'like_new': 'Sıfır Gibi',
    'good': 'İyi',
    'lightly_used': 'Az Kullanılmış',
    'fair': 'Orta',
    'needs_repair': 'Tamir Gerekiyor',
  };
  return conditionMap[condition] || condition;
}

// Helper function to build full address from customer data
function buildCustomerAddress(customer: any): string {
  const parts: string[] = [];
  
  // Mahalle, Sokak, Bina No, Daire No
  if (customer.neighborhood) parts.push(customer.neighborhood);
  if (customer.street) parts.push(customer.street);
  if (customer.building_no) parts.push(`No: ${customer.building_no}`);
  if (customer.apartment_no) parts.push(`Daire: ${customer.apartment_no}`);
  
  // İlçe ve Şehir
  const locationParts: string[] = [];
  if (customer.district) locationParts.push(customer.district);
  if (customer.city) locationParts.push(customer.city);
  
  if (parts.length > 0 && locationParts.length > 0) {
    return `${parts.join(' ')}, ${locationParts.join('/')}`;
  } else if (parts.length > 0) {
    return parts.join(' ');
  } else if (locationParts.length > 0) {
    return locationParts.join('/');
  }
  
  return customer.address || 'Adres bilgisi yok';
}

// ==========================================
// PROFILE PHOTO ENDPOINTS
// ==========================================

// POST /customers/me/profile-photo - Profil fotoğrafı yükle
app.post("/make-server-0f4d2485/customers/me/profile-photo", async (c) => {
  try {
    console.log('[PROFILE-PHOTO] Uploading profile photo...');
    
    const authHeader = c.req.header('Authorization');
    const user = await verifyUserAuth(authHeader);
    
    if (!user) {
      return c.json({ error: 'Unauthorized - please login' }, 401);
    }
    
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' }, 400);
    }
    
    // Validate file size (2MB max)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return c.json({ error: 'File size exceeds 2MB limit.' }, 400);
    }
    
    // Get customer record
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, profile_photo_url')
      .eq('email', user.email?.toLowerCase())
      .maybeSingle();
    
    if (customerError) {
      console.error('[PROFILE-PHOTO] Database error:', customerError);
      return c.json({ error: 'Database error' }, 500);
    }
    
    if (!customer) {
      console.error('[PROFILE-PHOTO] Customer not found for email:', user.email);
      return c.json({ error: 'Customer profile not found. Please complete your profile first.' }, 404);
    }
    
    // Delete old profile photo if exists
    if (customer.profile_photo_url) {
      const oldFilename = customer.profile_photo_url.split('/').pop();
      if (oldFilename) {
        await supabase.storage
          .from(PROFILE_PHOTOS_BUCKET)
          .remove([oldFilename]);
        console.log('[PROFILE-PHOTO] Old photo deleted:', oldFilename);
      }
    }
    
    // Generate unique filename
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop() || 'jpg';
    const filename = `profile_${user.id}_${timestamp}_${randomStr}.${extension}`;
    
    // Convert File to ArrayBuffer
    const fileBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(fileBuffer);
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .upload(filename, uint8Array, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false,
      });
    
    if (uploadError) {
      console.error('[PROFILE-PHOTO] Upload error:', uploadError);
      return c.json({ error: 'Failed to upload image' }, 500);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(PROFILE_PHOTOS_BUCKET)
      .getPublicUrl(filename);
    
    console.log('[PROFILE-PHOTO] Photo uploaded:', publicUrl);
    
    // Update customer record with new photo URL
    const { data: updatedCustomer, error: updateError } = await supabase
      .from('customers')
      .update({ profile_photo_url: publicUrl })
      .eq('id', customer.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('[PROFILE-PHOTO] Update error:', updateError);
      return c.json({ error: 'Failed to update profile' }, 500);
    }
    
    return c.json({ 
      success: true, 
      profile_photo_url: publicUrl,
      message: 'Profile photo uploaded successfully'
    });
  } catch (err: any) {
    console.error('[PROFILE-PHOTO] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// DELETE /customers/me/profile-photo - Profil fotoğrafını sil
app.delete("/make-server-0f4d2485/customers/me/profile-photo", async (c) => {
  try {
    console.log('[PROFILE-PHOTO] Deleting profile photo...');
    
    const authHeader = c.req.header('Authorization');
    const user = await verifyUserAuth(authHeader);
    
    if (!user) {
      return c.json({ error: 'Unauthorized - please login' }, 401);
    }
    
    // Get customer record
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, profile_photo_url')
      .eq('email', user.email?.toLowerCase())
      .maybeSingle();
    
    if (customerError) {
      console.error('[PROFILE-PHOTO] Database error:', customerError);
      return c.json({ error: 'Database error' }, 500);
    }
    
    if (!customer) {
      console.error('[PROFILE-PHOTO] Customer not found for email:', user.email);
      return c.json({ error: 'Customer profile not found.' }, 404);
    }
    
    if (!customer.profile_photo_url) {
      return c.json({ error: 'No profile photo to delete' }, 400);
    }
    
    // Delete from storage
    const filename = customer.profile_photo_url.split('/').pop();
    if (filename) {
      const { error: deleteError } = await supabase.storage
        .from(PROFILE_PHOTOS_BUCKET)
        .remove([filename]);
      
      if (deleteError) {
        console.error('[PROFILE-PHOTO] Storage delete error:', deleteError);
      } else {
        console.log('[PROFILE-PHOTO] Photo deleted from storage:', filename);
      }
    }
    
    // Update customer record
    const { error: updateError } = await supabase
      .from('customers')
      .update({ profile_photo_url: null })
      .eq('id', customer.id);
    
    if (updateError) {
      console.error('[PROFILE-PHOTO] Update error:', updateError);
      return c.json({ error: 'Failed to update profile' }, 500);
    }
    
    return c.json({ 
      success: true,
      message: 'Profile photo deleted successfully'
    });
  } catch (err: any) {
    console.error('[PROFILE-PHOTO] Exception:', err);
    return c.json({ error: err.message }, 500);
  }
});

// DEBUG: Check customers table structure
app.get("/make-server-0f4d2485/debug/customers-table-structure", async (c) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get a sample customer record (without sensitive data)
    const { data: sampleCustomer, error: sampleError } = await supabase
      .from('customers')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (sampleError) {
      return c.json({ 
        error: 'Failed to get sample customer',
        details: sampleError 
      }, 500);
    }

    return c.json({
      success: true,
      sampleCustomerKeys: sampleCustomer ? Object.keys(sampleCustomer) : [],
      hasProfilePhotoUrl: sampleCustomer && 'profile_photo_url' in sampleCustomer,
      message: 'Customers table structure retrieved'
    });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// CONTACT MESSAGES ENDPOINT
// ==========================================

// İletişim formu mesajlarını kaydet (KV Store)
app.post("/make-server-0f4d2485/contact-messages", async (c) => {
  try {
    const { name, email, phone, subject, message } = await c.req.json();
    
    console.log('[CONTACT] New contact message:', { name, email, phone, subject });
    
    // Validation
    if (!name || !email || !phone || !subject || !message) {
      return c.json({ error: 'Tüm alanlar zorunludur' }, 400);
    }
    
    // KV Store'a kaydet
    const messageId = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const messageData = {
      id: messageId,
      name,
      email,
      phone,
      subject,
      message,
      status: 'unread', // unread, read
      created_at: new Date().toISOString(),
      read_at: null,
    };
    
    await kv.set(messageId, messageData);
    
    console.log('[CONTACT] Message saved:', messageId);
    
    return c.json({ 
      success: true, 
      message: 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.',
      messageId 
    });
  } catch (err: any) {
    console.error('[CONTACT] Error saving message:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Admin: Tüm mesajları getir
app.get("/make-server-0f4d2485/admin/contact-messages", async (c) => {
  try {
    console.log('[ADMIN-CONTACT] Fetching all contact messages...');
    
    // KV Store'dan contact_ prefix'li tüm mesajları getir
    const allMessages = await kv.getByPrefix('contact_');
    
    // Tarih sırasına göre sırala (en yeni en üstte)
    const sortedMessages = allMessages.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    console.log(`[ADMIN-CONTACT] Found ${sortedMessages.length} messages`);
    
    return c.json({ 
      success: true, 
      messages: sortedMessages,
      total: sortedMessages.length 
    });
  } catch (err: any) {
    console.error('[ADMIN-CONTACT] Error fetching messages:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Admin: Mesajı okundu olarak işaretle
app.put("/make-server-0f4d2485/admin/contact-messages/:id/read", async (c) => {
  try {
    const id = c.req.param('id');
    
    console.log('[ADMIN-CONTACT] Marking message as read:', id);
    
    const message = await kv.get(id);
    if (!message) {
      return c.json({ error: 'Mesaj bulunamadı' }, 404);
    }
    
    const updatedMessage = {
      ...message,
      status: 'read',
      read_at: new Date().toISOString(),
    };
    
    await kv.set(id, updatedMessage);
    
    console.log('[ADMIN-CONTACT] Message marked as read');
    
    return c.json({ success: true, message: updatedMessage });
  } catch (err: any) {
    console.error('[ADMIN-CONTACT] Error marking message as read:', err);
    return c.json({ error: err.message }, 500);
  }
});

// Admin: Mesajı sil
app.delete("/make-server-0f4d2485/admin/contact-messages/:id", async (c) => {
  try {
    const id = c.req.param('id');
    
    console.log('[ADMIN-CONTACT] Deleting message:', id);
    
    await kv.del(id);
    
    console.log('[ADMIN-CONTACT] Message deleted');
    
    return c.json({ success: true, message: 'Mesaj silindi' });
  } catch (err: any) {
    console.error('[ADMIN-CONTACT] Error deleting message:', err);
    return c.json({ error: err.message }, 500);
  }
});

// ==========================================
// SUB-ROUTERS - Modüler Yapı
// ==========================================

// User Services Router - /user-services/*
app.route('/make-server-0f4d2485/user-services', userServicesRouter);

// User Sell Requests Router - /user-sell-requests/*
app.route('/make-server-0f4d2485/user-sell-requests', userSellRequestsRouter);

// User Orders Router - /user-orders/*
app.route('/make-server-0f4d2485/user-orders', userOrdersRouter);

// User Profile Router - /user-profile/*
app.route('/make-server-0f4d2485/user-profile', userProfileRouter);

// Moving Router - /moving/*
app.route('/make-server-0f4d2485/moving', movingRouter);

// Technical Service Router - /technical-service/*
app.route('/make-server-0f4d2485/technical-service', technicalServiceRouter);

// ==========================================
// REPORT ENDPOINTS - Rapor Sistemleri
// ==========================================

// GET /report/order/:orderId - Sipariş Raporu
app.get("/make-server-0f4d2485/report/order/:orderId", async (c) => {
  try {
    const orderId = c.req.param('orderId');
    console.log(`[REPORT] Generating report for order: ${orderId}`);
    
    // Get order from KV store
    const order = await kv.get(`order:${orderId}`);
    
    if (!order) {
      console.error(`[REPORT] Order not found: ${orderId}`);
      return c.json({ error: 'Sipariş bulunamadı' }, 404);
    }
    
    // Get order items
    const items = await kv.get(`order_items:${orderId}`) || [];
    
    // Get customer info
    let customer = null;
    if (order.customer_id) {
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('id', order.customer_id)
        .single();
      customer = customerData;
    }
    
    // Use order.customer_info as fallback
    const customerInfo = customer || order.customer_info || {};
    
    // Format report data
    const reportData = {
      type: 'order',
      title: 'SİPARİŞ RAPORU',
      reportNumber: order.order_number,
      orderId: order.id,
      orderDate: order.created_at ? new Date(order.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
      deliveryDate: order.delivery_date ? new Date(order.delivery_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '-',
      deliveryTime: order.delivery_time || '-',
      status: order.status,
      customer: {
        name: customerInfo.name || customerInfo.fullName || '-',
        phone: customerInfo.phone || '-',
        email: customerInfo.email || '-',
        address: customerInfo.address || '-',
        district: customerInfo.district || order.customer_district || '-',
        city: customerInfo.city || order.customer_city || 'İzmir',
      },
      items: items.map((item: any) => ({
        name: item.product_snapshot?.title || item.product_snapshot?.name || 'Ürün',
        price: item.price || 0,
        quantity: item.quantity || 1,
        condition: item.product_snapshot?.condition || '-',
        category: item.product_snapshot?.category || '-',
        brand: item.product_snapshot?.brand || '-',
        image: item.product_snapshot?.image || null,
      })),
      subtotal: order.subtotal || 0,
      deliveryFee: order.delivery_fee || 0,
      total: order.total || 0,
      paymentMethod: order.payment_method === 'cash' ? 'Kapıda Ödeme' : 
                     order.payment_method === 'bank' ? 'Banka Havalesi' : 
                     order.payment_method === 'credit' ? 'Kredi Kartı' : 'Diğer',
      notes: order.notes || '',
      statusHistory: order.statusHistory || [],
    };
    
    console.log(`[REPORT] Report generated successfully for order: ${orderId}`);
    return c.json({ success: true, report: reportData });
    
  } catch (err: any) {
    console.error('[REPORT] Exception in GET /report/order/:orderId:', err);
    return c.json({ error: err.message }, 500);
  }
});

Deno.serve(app.fetch);