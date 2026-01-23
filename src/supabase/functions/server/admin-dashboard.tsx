import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { getByPrefix } from './kv_store.tsx';
const app = new Hono();
// Supabase client helper
function getSupabaseClient() {
  return createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
}
// User verification helper
async function verifyUser(authHeader) {
  if (!authHeader) return null;
  const token = authHeader.replace('Bearer ', '');
  const supabase = getSupabaseClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    console.error('[AUTH] User verification failed:', error);
    return null;
  }
  return user;
}
// Admin email listesi
const ADMIN_EMAILS = [
  'admin@ersinspot.com',
  'ersinspot@gmail.com'
];
// Admin verification helper (EMAIL bazlı)
async function verifyAdmin(authHeader) {
  const user = await verifyUser(authHeader);
  if (!user) return null;
  // Email kontrolü yap
  const isAdmin = ADMIN_EMAILS.includes(user.email || '');
  if (!isAdmin) {
    console.error('[AUTH] Not an admin email:', user.email);
    return null;
  }
  return user;
}
// Helper: Calculate date range
function getDateRange(filter) {
  const now = new Date();
  let startDate = new Date();
  switch(filter){
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      break;
    case 'week':
      startDate.setDate(now.getDate() - 7);
      break;
    case 'month':
      startDate.setMonth(now.getMonth() - 1);
      break;
    case '3months':
      startDate.setMonth(now.getMonth() - 3);
      break;
    case '6months':
      startDate.setMonth(now.getMonth() - 6);
      break;
    case 'all':
    default:
      startDate = new Date('2020-01-01'); // Beginning of time
      break;
  }
  return {
    startDate: startDate.toISOString(),
    endDate: now.toISOString()
  };
}
// GET /make-server-0f4d2485/admin/dashboard - Admin Dashboard Data
app.get('/dashboard', async (c)=>{
  try {
    console.log('[ADMIN DASHBOARD] 📊 Fetching dashboard data...');
    const authHeader = c.req.header('Authorization');
    const admin = await verifyAdmin(authHeader);
    if (!admin) {
      console.log('[ADMIN DASHBOARD] ❌ Unauthorized');
      return c.json({
        error: 'Unauthorized'
      }, 401);
    }
    const filter = c.req.query('filter') || 'month'; // default: last month
    const { startDate, endDate } = getDateRange(filter);
    console.log('[ADMIN DASHBOARD] 📅 Date range:', {
      filter,
      startDate,
      endDate
    });
    const supabase = getSupabaseClient();
    // ============================================
    // 0. KV STORE DATA (Orders & Moving Requests)
    // ============================================
    // Fetch all orders from KV Store
    const kvOrders = await getByPrefix('order:order_');
    console.log('[ADMIN DASHBOARD] 📦 KV Store orders fetched:', kvOrders?.length || 0);
    // Filter KV orders by date range
    console.log('[ADMIN DASHBOARD] 📦 Sample KV order:', kvOrders?.[0]);
    const kvOrdersFiltered = kvOrders?.filter((order)=>{
      const dateValue = order?.created_at || order?.createdAt || order?.date;
      if (!dateValue) return false;
      const orderDate = new Date(dateValue);
      return orderDate >= new Date(startDate) && orderDate <= new Date(endDate);
    }) || [];
    console.log('[ADMIN DASHBOARD] 📦 KV Store orders in date range:', kvOrdersFiltered.length, '/', kvOrders?.length);
    // Fetch all moving requests from KV Store (try both possible prefixes)
    let kvMovingRequests = await getByPrefix('moving_request:');
    // If no results, try alternative prefix
    if (!kvMovingRequests || kvMovingRequests.length === 0) {
      kvMovingRequests = await getByPrefix('moving_request:NAK');
    }
    // If still no results, try just 'moving'
    if (!kvMovingRequests || kvMovingRequests.length === 0) {
      kvMovingRequests = await getByPrefix('moving');
    }
    console.log('[ADMIN DASHBOARD] 🚚 KV Store moving requests fetched:', kvMovingRequests?.length || 0);
    // Filter KV moving requests by date range
    console.log('[ADMIN DASHBOARD] 🚚 Sample KV moving request:', kvMovingRequests?.[0]);
    const kvMovingFiltered = kvMovingRequests?.filter((moving)=>{
      // Try multiple date fields
      const dateValue = moving?.created_at || moving?.createdAt || moving?.date || moving?.movingDate;
      if (!dateValue) {
        console.log('[ADMIN DASHBOARD] ⚠️ No date found in moving request:', Object.keys(moving || {}));
        return false;
      }
      const movingDate = new Date(dateValue);
      const isInRange = movingDate >= new Date(startDate) && movingDate <= new Date(endDate);
      if (!isInRange) {
        console.log('[ADMIN DASHBOARD] 📅 Moving request outside date range:', {
          dateValue,
          startDate,
          endDate
        });
      }
      return isInRange;
    }) || [];
    console.log('[ADMIN DASHBOARD] 🚚 KV Store moving requests in date range:', kvMovingFiltered.length, '/', kvMovingRequests?.length);
    // ============================================
    // 1. KPI METRICS
    // ============================================
    // Total Revenue (accepted orders, moving, services)
    const { data: ordersData } = await supabase.from('orders').select('total_price, status, created_at').in('status', [
      'processing',
      'shipped',
      'delivered'
    ]).gte('created_at', startDate).lte('created_at', endDate);
    const { data: movingData } = await supabase.from('moving_requests').select('admin_price, status, created_at').in('status', [
      'accepted',
      'completed'
    ]).gte('created_at', startDate).lte('created_at', endDate);
    const { data: serviceData } = await supabase.from('technical_service_requests').select('estimated_price, final_price, status, created_at').not('estimated_price', 'is', null).gte('created_at', startDate).lte('created_at', endDate);
    console.log('[ADMIN DASHBOARD] 🔧 Technical service data:', {
      count: serviceData?.length || 0,
      sample: serviceData?.[0],
      totalRevenue: serviceData?.reduce((sum, s)=>sum + (s.final_price || s.estimated_price || 0), 0) || 0
    });
    const { data: sellData } = await supabase.from('sell_requests').select('admin_offer_price, status, created_at').in('status', [
      'accepted',
      'completed'
    ]).gte('created_at', startDate).lte('created_at', endDate);
    // Calculate KV Store revenue (from delivered/in_transit orders)
    const kvRevenue = kvOrdersFiltered?.filter((order)=>[
        'delivered',
        'in_transit',
        'order_received'
      ].includes(order.status))?.reduce((sum, order)=>sum + (order.total || 0), 0) || 0;
    // Calculate KV Store moving revenue (from accepted/completed moving requests)
    const kvMovingRevenue = kvMovingFiltered?.filter((moving)=>[
        'accepted',
        'completed',
        'in_progress'
      ].includes(moving.status))?.reduce((sum, moving)=>sum + (moving.adminOffer || moving.admin_price || moving.price || 0), 0) || 0;
    console.log('[ADMIN DASHBOARD] 💰 KV Store revenue:', {
      orders: kvRevenue,
      moving: kvMovingRevenue
    });
    const totalRevenue = (ordersData?.reduce((sum, o)=>sum + (o.total_price || 0), 0) || 0) + (movingData?.reduce((sum, m)=>sum + (m.admin_price || 0), 0) || 0) + (serviceData?.reduce((sum, s)=>sum + (s.final_price || s.estimated_price || 0), 0) || 0) + (sellData?.reduce((sum, s)=>sum + (s.admin_offer_price || 0), 0) || 0) + kvRevenue + kvMovingRevenue;
    // Total Requests Count
    const { count: ordersCount } = await supabase.from('orders').select('*', {
      count: 'exact',
      head: true
    }).gte('created_at', startDate).lte('created_at', endDate);
    const { count: movingCount } = await supabase.from('moving_requests').select('*', {
      count: 'exact',
      head: true
    }).gte('created_at', startDate).lte('created_at', endDate);
    const { count: serviceCount } = await supabase.from('technical_service_requests').select('*', {
      count: 'exact',
      head: true
    }).gte('created_at', startDate).lte('created_at', endDate);
    const { count: sellCount } = await supabase.from('sell_requests').select('*', {
      count: 'exact',
      head: true
    }).gte('created_at', startDate).lte('created_at', endDate);
    const totalRequests = (ordersCount || 0) + (movingCount || 0) + (serviceCount || 0) + (sellCount || 0) + kvOrdersFiltered.length + kvMovingFiltered.length;
    console.log('[ADMIN DASHBOARD] 📊 Total requests breakdown:', {
      postgres_orders: ordersCount || 0,
      kv_orders: kvOrdersFiltered.length,
      postgres_moving: movingCount || 0,
      kv_moving: kvMovingFiltered.length,
      service: serviceCount || 0,
      sell: sellCount || 0,
      total: totalRequests
    });
    // Cancellation Rate
    const { count: cancelledOrders } = await supabase.from('orders').select('*', {
      count: 'exact',
      head: true
    }).eq('status', 'cancelled').gte('created_at', startDate).lte('created_at', endDate);
    const { count: cancelledMoving } = await supabase.from('moving_requests').select('*', {
      count: 'exact',
      head: true
    }).in('status', [
      'cancelled',
      'rejected'
    ]).gte('created_at', startDate).lte('created_at', endDate);
    const { count: cancelledService } = await supabase.from('technical_service_requests').select('*', {
      count: 'exact',
      head: true
    }).in('status', [
      'cancelled',
      'rejected'
    ]).gte('created_at', startDate).lte('created_at', endDate);
    const { count: rejectedSell } = await supabase.from('sell_requests').select('*', {
      count: 'exact',
      head: true
    }).in('status', [
      'cancelled',
      'rejected'
    ]).gte('created_at', startDate).lte('created_at', endDate);
    // Add KV Store cancelled orders and moving requests
    const kvCancelledCount = kvOrdersFiltered?.filter((order)=>[
        'cancelled',
        'rejected'
      ].includes(order.status)).length || 0;
    const kvMovingCancelledCount = kvMovingFiltered?.filter((moving)=>[
        'cancelled',
        'rejected'
      ].includes(moving.status)).length || 0;
    const totalCancellations = (cancelledOrders || 0) + (cancelledMoving || 0) + (cancelledService || 0) + (rejectedSell || 0) + kvCancelledCount + kvMovingCancelledCount;
    const cancellationRate = totalRequests > 0 ? totalCancellations / totalRequests * 100 : 0;
    console.log('[ADMIN DASHBOARD] ❌ Cancellations:', {
      postgres_orders: cancelledOrders || 0,
      kv_orders: kvCancelledCount,
      postgres_moving: cancelledMoving || 0,
      kv_moving: kvMovingCancelledCount,
      service: cancelledService || 0,
      sell: rejectedSell || 0,
      total: totalCancellations,
      rate: cancellationRate.toFixed(2) + '%'
    });
    // Offer Acceptance Rate (Moving + Sell Requests)
    const { count: acceptedMoving } = await supabase.from('moving_requests').select('*', {
      count: 'exact',
      head: true
    }).eq('status', 'accepted').gte('created_at', startDate).lte('created_at', endDate);
    const { count: acceptedSell } = await supabase.from('sell_requests').select('*', {
      count: 'exact',
      head: true
    }).eq('status', 'accepted').gte('created_at', startDate).lte('created_at', endDate);
    const { count: offersWithResponse } = await supabase.from('moving_requests').select('*', {
      count: 'exact',
      head: true
    }).in('status', [
      'accepted',
      'rejected'
    ]).gte('created_at', startDate).lte('created_at', endDate);
    const { count: sellOffersWithResponse } = await supabase.from('sell_requests').select('*', {
      count: 'exact',
      head: true
    }).in('status', [
      'accepted',
      'rejected'
    ]).gte('created_at', startDate).lte('created_at', endDate);
    const totalAccepted = (acceptedMoving || 0) + (acceptedSell || 0);
    const totalOffersResponded = (offersWithResponse || 0) + (sellOffersWithResponse || 0);
    const acceptanceRate = totalOffersResponded > 0 ? totalAccepted / totalOffersResponded * 100 : 0;
    // Average Response Time (Hours)
    const { data: movingResponseTimes } = await supabase.from('moving_requests').select('created_at, updated_at, status').not('admin_price', 'is', null).gte('created_at', startDate).lte('created_at', endDate);
    const { data: sellResponseTimes } = await supabase.from('sell_requests').select('created_at, updated_at, status').not('admin_offer_price', 'is', null).gte('created_at', startDate).lte('created_at', endDate);
    let totalResponseTimeHours = 0;
    let responseCount = 0;
    if (movingResponseTimes) {
      movingResponseTimes.forEach((req)=>{
        const created = new Date(req.created_at).getTime();
        const updated = new Date(req.updated_at).getTime();
        const diffHours = (updated - created) / (1000 * 60 * 60);
        totalResponseTimeHours += diffHours;
        responseCount++;
      });
    }
    if (sellResponseTimes) {
      sellResponseTimes.forEach((req)=>{
        const created = new Date(req.created_at).getTime();
        const updated = new Date(req.updated_at).getTime();
        const diffHours = (updated - created) / (1000 * 60 * 60);
        totalResponseTimeHours += diffHours;
        responseCount++;
      });
    }
    const avgResponseTime = responseCount > 0 ? totalResponseTimeHours / responseCount : 0;
    // Total Active Customers
    const { count: customersCount } = await supabase.from('customers').select('*', {
      count: 'exact',
      head: true
    });
    // ============================================
    // 2. MONTHLY TREND (Last 6 Months)
    // ============================================
    const monthlyTrend = [];
    const now = new Date();
    for(let i = 5; i >= 0; i--){
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const monthName = monthStart.toLocaleDateString('tr-TR', {
        month: 'short',
        year: 'numeric'
      });
      // Orders
      const { count: ordersMonth } = await supabase.from('orders').select('*', {
        count: 'exact',
        head: true
      }).gte('created_at', monthStart.toISOString()).lte('created_at', monthEnd.toISOString());
      // Moving
      const { count: movingMonth } = await supabase.from('moving_requests').select('*', {
        count: 'exact',
        head: true
      }).gte('created_at', monthStart.toISOString()).lte('created_at', monthEnd.toISOString());
      // Service
      const { count: serviceMonth } = await supabase.from('technical_service_requests').select('*', {
        count: 'exact',
        head: true
      }).gte('created_at', monthStart.toISOString()).lte('created_at', monthEnd.toISOString());
      // Sell
      const { count: sellMonth } = await supabase.from('sell_requests').select('*', {
        count: 'exact',
        head: true
      }).gte('created_at', monthStart.toISOString()).lte('created_at', monthEnd.toISOString());
      // KV Store orders for this month
      const kvOrdersMonth = kvOrders?.filter((order)=>{
        if (!order?.created_at) return false;
        const orderDate = new Date(order.created_at);
        return orderDate >= monthStart && orderDate <= monthEnd;
      }).length || 0;
      // KV Store moving requests for this month
      const kvMovingMonth = kvMovingRequests?.filter((moving)=>{
        const dateValue = moving?.created_at || moving?.createdAt;
        if (!dateValue) return false;
        const movingDate = new Date(dateValue);
        return movingDate >= monthStart && movingDate <= monthEnd;
      }).length || 0;
      monthlyTrend.push({
        month: monthName,
        sipariş: (ordersMonth || 0) + kvOrdersMonth,
        nakliye: (movingMonth || 0) + kvMovingMonth,
        'teknik servis': serviceMonth || 0,
        'ürün satış': sellMonth || 0
      });
    }
    // ============================================
    // 3. REVENUE DISTRIBUTION
    // ============================================
    const revenueDistribution = [
      {
        name: 'Sipariş',
        value: (ordersData?.reduce((sum, o)=>sum + (o.total_price || 0), 0) || 0) + kvRevenue,
        color: '#f97316' // orange
      },
      {
        name: 'Nakliye',
        value: (movingData?.reduce((sum, m)=>sum + (m.admin_price || 0), 0) || 0) + kvMovingRevenue,
        color: '#1e3a8a' // navy
      },
      {
        name: 'Teknik Servis',
        value: serviceData?.reduce((sum, s)=>sum + (s.final_price || s.estimated_price || 0), 0) || 0,
        color: '#14b8a6' // teal
      },
      {
        name: 'Ürün Alımı',
        value: sellData?.reduce((sum, s)=>sum + (s.admin_offer_price || 0), 0) || 0,
        color: '#a855f7' // purple
      }
    ];
    // ============================================
    // 4. CANCELLATION ANALYSIS
    // ============================================
    const totalOrdersCount = (ordersCount || 0) + kvOrdersFiltered.length;
    const totalMovingCount = (movingCount || 0) + kvMovingFiltered.length;
    const totalOrdersCancelled = (cancelledOrders || 0) + kvCancelledCount;
    const totalMovingCancelled = (cancelledMoving || 0) + kvMovingCancelledCount;
    
    const ordersCancellationRate = totalOrdersCount > 0 ? (totalOrdersCancelled / totalOrdersCount) * 100 : 0;
    const movingCancellationRate = totalMovingCount > 0 ? (totalMovingCancelled / totalMovingCount) * 100 : 0;
    const serviceCancellationRate = serviceCount ? (cancelledService || 0) / serviceCount * 100 : 0;
    const sellRejectionRate = sellCount ? (rejectedSell || 0) / sellCount * 100 : 0;
    const cancellationAnalysis = [
      {
        name: 'Sipariş',
        rate: ordersCancellationRate
      },
      {
        name: 'Nakliye',
        rate: movingCancellationRate
      },
      {
        name: 'Teknik Servis',
        rate: serviceCancellationRate
      },
      {
        name: 'Ürün Satış',
        rate: sellRejectionRate
      }
    ];
    // ============================================
    // 5. TOP SELLING PRODUCTS
    // ============================================
    const { data: orderItems } = await supabase.from('order_items').select('product_title, quantity, orders!inner(created_at)').gte('orders.created_at', startDate).lte('orders.created_at', endDate);
    const productSales = {};
    orderItems?.forEach((item)=>{
      if (!productSales[item.product_title]) {
        productSales[item.product_title] = 0;
      }
      productSales[item.product_title] += item.quantity;
    });
    const topSellingProducts = Object.entries(productSales).sort((a, b)=>b[1] - a[1]).slice(0, 10).map(([name, value])=>({
        name,
        value
      }));
    // ============================================
    // 6. TOP SELL REQUEST BRANDS
    // ============================================
    const { data: sellRequests } = await supabase.from('sell_requests').select('title, brand').gte('created_at', startDate).lte('created_at', endDate);
    const sellRequestBrands = {};
    sellRequests?.forEach((req)=>{
      const brand = req.brand || 'Bilinmiyor';
      if (!sellRequestBrands[brand]) {
        sellRequestBrands[brand] = 0;
      }
      sellRequestBrands[brand]++;
    });
    const topSellRequestProducts = Object.entries(sellRequestBrands).sort((a, b)=>b[1] - a[1]).slice(0, 10).map(([name, value])=>({
        name,
        value
      }));
    // ============================================
    // 7. MOST PROBLEMATIC PRODUCTS (Technical Service)
    // ============================================
    const { data: serviceRequests } = await supabase.from('technical_service_requests').select('product_type, problem_category').gte('created_at', startDate).lte('created_at', endDate);
    const problematicProducts = {};
    serviceRequests?.forEach((req)=>{
      const key = req.product_type || 'Bilinmiyor';
      if (!problematicProducts[key]) {
        problematicProducts[key] = 0;
      }
      problematicProducts[key]++;
    });
    const topProblematicProducts = Object.entries(problematicProducts).sort((a, b)=>b[1] - a[1]).slice(0, 10).map(([name, value])=>({
        name,
        value
      }));
    // ============================================
    // 8. PROBLEM CATEGORIES
    // ============================================
    const problemCategories = {};
    serviceRequests?.forEach((req)=>{
      const key = req.problem_category || 'Diğer';
      if (!problemCategories[key]) {
        problemCategories[key] = 0;
      }
      problemCategories[key]++;
    });
    const topProblemCategories = Object.entries(problemCategories).sort((a, b)=>b[1] - a[1]).slice(0, 8).map(([name, value])=>({
        name,
        value
      }));
    // ============================================
    // 9. PENDING WORK (Urgent + Awaiting Response)
    // ============================================
    const urgentThreshold = new Date();
    urgentThreshold.setHours(urgentThreshold.getHours() - 24); // 24 hours ago
    // Urgent - more than 24h in reviewing
    const { data: urgentMoving } = await supabase.from('moving_requests').select('id, request_number, created_at, from_address, to_address').eq('status', 'reviewing').lt('created_at', urgentThreshold.toISOString()).order('created_at', {
      ascending: true
    }).limit(5);
    const { data: urgentService } = await supabase.from('technical_service_requests').select('id, request_number, created_at, product_type, service_address').eq('status', 'reviewing').lt('created_at', urgentThreshold.toISOString()).order('created_at', {
      ascending: true
    }).limit(5);
    // Awaiting customer response (offer_sent)
    const { data: awaitingMoving } = await supabase.from('moving_requests').select('id, request_number, created_at, from_address, to_address, admin_price').eq('status', 'offer_sent').order('created_at', {
      ascending: false
    }).limit(5);
    const { data: awaitingSell } = await supabase.from('sell_requests').select('id, request_number, created_at, title, brand, admin_offer_price').eq('status', 'offer_sent').order('created_at', {
      ascending: false
    }).limit(5);
    const pendingWork = {
      urgent: [
        ...urgentMoving?.map((m)=>({
            ...m,
            type: 'nakliye'
          })) || [],
        ...urgentService?.map((s)=>({
            ...s,
            type: 'teknik-servis'
          })) || []
      ],
      awaitingResponse: [
        ...awaitingMoving?.map((m)=>({
            ...m,
            type: 'nakliye'
          })) || [],
        ...awaitingSell?.map((s)=>({
            ...s,
            type: 'ürün-satış'
          })) || []
      ]
    };
    // ============================================
    // 10. DAILY TREND (Last 30 Days)
    // ============================================
    const dailyTrend = [];
    for(let i = 29; i >= 0; i--){
      const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      const dayName = dayStart.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'short'
      });
      const { count: ordersDay } = await supabase.from('orders').select('*', {
        count: 'exact',
        head: true
      }).gte('created_at', dayStart.toISOString()).lte('created_at', dayEnd.toISOString());
      const { count: movingDay } = await supabase.from('moving_requests').select('*', {
        count: 'exact',
        head: true
      }).gte('created_at', dayStart.toISOString()).lte('created_at', dayEnd.toISOString());
      const { count: serviceDay } = await supabase.from('technical_service_requests').select('*', {
        count: 'exact',
        head: true
      }).gte('created_at', dayStart.toISOString()).lte('created_at', dayEnd.toISOString());
      const { count: sellDay } = await supabase.from('sell_requests').select('*', {
        count: 'exact',
        head: true
      }).gte('created_at', dayStart.toISOString()).lte('created_at', dayEnd.toISOString());
      // KV Store orders and moving for this day
      const kvOrdersDay = kvOrders?.filter((order)=>{
        if (!order?.created_at) return false;
        const orderDate = new Date(order.created_at);
        return orderDate >= dayStart && orderDate <= dayEnd;
      }).length || 0;
      const kvMovingDay = kvMovingRequests?.filter((moving)=>{
        const dateValue = moving?.created_at || moving?.createdAt;
        if (!dateValue) return false;
        const movingDate = new Date(dateValue);
        return movingDate >= dayStart && movingDate <= dayEnd;
      }).length || 0;
      dailyTrend.push({
        day: dayName,
        talepler: (ordersDay || 0) + (movingDay || 0) + (serviceDay || 0) + (sellDay || 0) + kvOrdersDay + kvMovingDay
      });
    }
    // ============================================
    // 11. YENİ: TEKNİK SERVİS - EN ÇOK DESTEK İSTENEN MARKALAR
    // ============================================
    // Technical service requests tablosu brand bilgisi içeriyor
    const { data: serviceBrands } = await supabase.from('technical_service_requests').select('product_type').gte('created_at', startDate).lte('created_at', endDate);
    const brandCounts = {};
    serviceBrands?.forEach((req)=>{
      // product_type içinden marka bilgisini çıkarmaya çalış (örn: "Samsung Buzdolabı" -> "Samsung")
      const productType = (req.product_type || '').trim();
      if (productType) {
        // İlk kelimeyi marka olarak al (genellikle marka ilk kelimedir)
        const brand = productType.split(' ')[0];
        if (brand && brand.length > 2) {
          brandCounts[brand] = (brandCounts[brand] || 0) + 1;
        }
      }
    });
    const topServiceBrands = Object.entries(brandCounts).sort((a, b)=>b[1] - a[1]).slice(0, 10).map(([name, value])=>({
        name,
        value
      }));
    // ============================================
    // 12. YENİ: NAKLİYE - EN ÇOK TALEP GELEN İLÇELER
    // ============================================
    const { data: movingAddresses } = await supabase.from('moving_requests').select('from_address, to_address').gte('created_at', startDate).lte('created_at', endDate);
    const districtCounts = {};
    // İzmir ilçeleri listesi
    const districtKeywords = [
      'Buca',
      'Karşıyaka',
      'Konak',
      'Bornova',
      'Alsancak',
      'Gaziemir',
      'Balçova',
      'Narlıdere',
      'Çiğli',
      'Bayraklı',
      'Güzelbahçe',
      'Urla',
      'Çeşme',
      'Karabağlar',
      'Menderes',
      'Tire',
      'Ödemiş',
      'Torbalı',
      'Kemalpaşa',
      'Foça'
    ];
    movingAddresses?.forEach((req)=>{
      // Hem pickup hem de delivery adreslerini kontrol et
      const addresses = [
        req.from_address || '',
        req.to_address || ''
      ];
      addresses.forEach((address)=>{
        if (!address) return;
        let foundDistrict = false;
        for (const district of districtKeywords){
          if (address.toLowerCase().includes(district.toLowerCase())) {
            districtCounts[district] = (districtCounts[district] || 0) + 1;
            foundDistrict = true;
            break;
          }
        }
        // İlçe bulunamazsa 'Diğer' kategorisine ekle
        if (!foundDistrict && address.length > 5) {
          districtCounts['Diğer'] = (districtCounts['Diğer'] || 0) + 1;
        }
      });
    });
    const topMovingDistricts = Object.entries(districtCounts).sort((a, b)=>b[1] - a[1]).slice(0, 10).map(([name, value])=>({
        name,
        value
      }));
    // ============================================
    // RESPONSE
    // ============================================
    const dashboardData = {
      kpis: {
        totalRevenue,
        totalRequests,
        cancellationRate: Math.round(cancellationRate * 10) / 10,
        acceptanceRate: Math.round(acceptanceRate * 10) / 10,
        avgResponseTime: Math.round(avgResponseTime * 10) / 10,
        customersCount: customersCount || 0
      },
      charts: {
        monthlyTrend,
        revenueDistribution,
        cancellationAnalysis,
        topSellingProducts,
        topSellRequestProducts,
        topProblematicProducts,
        topProblemCategories,
        dailyTrend,
        topServiceBrands,
        topMovingDistricts
      },
      pendingWork
    };
    console.log('[ADMIN DASHBOARD] ✅ Dashboard data fetched successfully');
    return c.json(dashboardData);
  } catch (error) {
    console.error('[ADMIN DASHBOARD] ❌ Exception:', error);
    return c.json({
      error: 'Internal server error',
      details: String(error)
    }, 500);
  }
});
export default app;
