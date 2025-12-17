import { createClient } from 'npm:@supabase/supabase-js@2.39.3';
import * as kv from './kv_store.tsx';
/**
 * Tarih formatını YYYY-MM-DD'ye çevirir
 */ function formatDate(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
/**
 * Saat dilimini parse eder: "11:00 - 13:00" -> { start: "11:00", end: "13:00" }
 */ function parseTimeSlot(timeSlot) {
  if (!timeSlot) return null;
  // Format: "11:00 - 13:00" veya "11:00-13:00"
  const parts = timeSlot.split(/\s*-\s*/);
  if (parts.length !== 2) return null;
  return {
    start: parts[0].trim(),
    end: parts[1].trim()
  };
}
/**
 * Tarih hafta sonu mu kontrolü (Cumartesi=6, Pazar=0)
 */ function isWeekend(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDay();
  return day === 0 || day === 6; // Pazar veya Cumartesi
}
/**
 * Admin meşguliyet takvimini döndürür
 */ export async function getAdminAvailability(c) {
  try {
    console.log('[ADMIN-AVAILABILITY] 📅 Fetching availability data...');
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Query parameters: startDate, endDate
    const url = new URL(c.req.url);
    const startDateParam = url.searchParams.get('startDate');
    const endDateParam = url.searchParams.get('endDate');
    console.log('[ADMIN-AVAILABILITY] Date range:', {
      startDateParam,
      endDateParam
    });
    if (!startDateParam || !endDateParam) {
      return c.json({
        error: 'startDate ve endDate parametreleri gereklidir'
      }, 400);
    }
    const busySlots = {};
    // 1. SİPARİŞLER - KV Store'dan al (PRIMARY DATA SOURCE)
    // delivery_date + delivery_time kullan
    console.log('[ADMIN-AVAILABILITY] 🔍 Fetching orders from KV Store...');
    // KV Store'daki tüm order:* anahtarlarını al
    const allOrderKeys = await kv.getByPrefix('order:order_');
    const orders = allOrderKeys.filter((order)=>{
      // Sadece aktif siparişleri al (cancelled değil)
      const isActive = order.status !== 'cancelled';
      // Tarih aralığında mı kontrol et
      const orderDate = order.delivery_date;
      if (!orderDate) return false;
      const inRange = orderDate >= startDateParam && orderDate <= endDateParam;
      return isActive && inRange;
    });
    console.log(`[ADMIN-AVAILABILITY] ✅ Found ${orders.length} active orders from KV Store`);
    // Müşteri bilgilerini Postgres'ten al (customers tablosu)
    const customerIds = [
      ...new Set(orders.map((o)=>o.customer_id).filter(Boolean))
    ];
    let customerMap = new Map();
    if (customerIds.length > 0) {
      const { data: customers } = await supabase.from('customers').select('id, name').in('id', customerIds);
      customerMap = new Map(customers?.map((c)=>[
          c.id,
          c.name
        ]) || []);
    }
    for (const order of orders){
      console.log(`[ADMIN-AVAILABILITY] 📦 Processing order: ${order.order_number}, date: ${order.delivery_date}, time: ${order.delivery_time}`);
      if (!order.delivery_date || !order.delivery_time) {
        console.log(`[ADMIN-AVAILABILITY] ⚠️ Skipping order ${order.order_number} - missing delivery info`);
        continue;
      }
      const dateKey = formatDate(order.delivery_date);
      console.log(`[ADMIN-AVAILABILITY] 📅 Order ${order.order_number} dateKey: ${dateKey}`);
      const timeSlot = parseTimeSlot(order.delivery_time);
      console.log(`[ADMIN-AVAILABILITY] ⏰ Order ${order.order_number} timeSlot:`, timeSlot);
      if (!timeSlot) {
        console.log(`[ADMIN-AVAILABILITY] ⚠️ Skipping order ${order.order_number} - invalid timeSlot`);
        continue;
      }
      if (!busySlots[dateKey]) {
        busySlots[dateKey] = [];
      }
      // Müşteri adını al (önce customer_info.name, yoksa customers tablosundan)
      const customerName = order.customer_info?.name || customerMap.get(order.customer_id) || 'Müşteri';
      busySlots[dateKey].push({
        startTime: timeSlot.start,
        endTime: timeSlot.end,
        type: 'order',
        id: order.id,
        customer: customerName,
        details: `Sipariş Teslimatı #${order.order_number}`
      });
      console.log(`[ADMIN-AVAILABILITY] ✅ Added order ${order.order_number} to busySlots[${dateKey}]`);
    }
    // 2. NAKLİYE - appointment_date + appointment_time (moving_appointments tablosu)
    console.log('[ADMIN-AVAILABILITY] 🚚 Fetching moving requests from KV Store...');
    try {
      const allMovingRequests = await kv.getByPrefix('moving_request:');
      console.log(`[ADMIN-AVAILABILITY] 📋 Total moving requests in KV Store: ${allMovingRequests.length}`);
      const movingRequests = allMovingRequests.filter((request)=>{
        // Sadece aktif talepleri al (cancelled, rejected değil)
        const isActive = ![
          'cancelled',
          'rejected'
        ].includes(request.status);
        // Tarih aralığında mı kontrol et
        const appointmentDate = request.appointmentDate;
        if (!appointmentDate) return false;
        const dateStr = formatDate(appointmentDate);
        const inRange = dateStr >= startDateParam && dateStr <= endDateParam;
        return isActive && inRange;
      });
      console.log(`[ADMIN-AVAILABILITY] ✅ Found ${movingRequests.length} active moving requests in date range`);
      for (const request of movingRequests){
        const appointmentDate = request.appointmentDate;
        const appointmentTime = request.appointmentTime;
        if (!appointmentDate) {
          console.log(`[ADMIN-AVAILABILITY] ⚠️ Skipping moving request ${request.requestNumber} - missing date`);
          continue;
        }
        const dateKey = formatDate(appointmentDate);
        // Saat dilimi varsa parse et, yoksa varsayılan 09:00-11:00
        let timeSlot;
        if (appointmentTime) {
          timeSlot = parseTimeSlot(appointmentTime);
        } else {
          timeSlot = {
            start: '09:00',
            end: '11:00'
          };
        }
        if (!timeSlot) {
          console.log(`[ADMIN-AVAILABILITY] ⚠️ Skipping moving request ${request.requestNumber} - invalid timeSlot`);
          continue;
        }
        if (!busySlots[dateKey]) {
          busySlots[dateKey] = [];
        }
        const customerName = request.customerName || 'Müşteri';
        busySlots[dateKey].push({
          startTime: timeSlot.start,
          endTime: timeSlot.end,
          type: 'moving',
          id: request.requestNumber,
          customer: customerName,
          details: `Nakliye - ${request.requestNumber}`
        });
        console.log(`[ADMIN-AVAILABILITY] ✅ Added moving request ${request.requestNumber} to ${dateKey} ${timeSlot.start}-${timeSlot.end}`);
      }
    } catch (kvError) {
      console.error('[ADMIN-AVAILABILITY] ❌ Error fetching moving requests from KV Store:', kvError);
    }
    // 3. TEKNİK SERVİS - preferred_date + preferred_time (technical_service_requests tablosu)
    const { data: technicalServices, error: techError } = await supabase.from('technical_service_requests').select('id, preferred_date, preferred_time, status, product_type, customer_id').not('preferred_date', 'is', null).not('preferred_time', 'is', null).gte('preferred_date', startDateParam).lte('preferred_date', endDateParam);
    if (techError) {
      console.error('[ADMIN-AVAILABILITY] ❌ Technical services fetch error:', techError);
    } else if (technicalServices && technicalServices.length > 0) {
      console.log(`[ADMIN-AVAILABILITY] ✅ Found ${technicalServices.length} technical service requests (ALL statuses)`);
      // Müşteri bilgilerini ayrı olarak al
      const customerIds = [
        ...new Set(technicalServices.map((s)=>s.customer_id).filter(Boolean))
      ];
      const { data: customers } = await supabase.from('customers').select('id, name').in('id', customerIds);
      const customerMap = new Map(customers?.map((c)=>[
          c.id,
          c.name
        ]) || []);
      for (const service of technicalServices){
        console.log(`[ADMIN-AVAILABILITY] 🔧 Processing tech service ID: ${service.id}, date: ${service.preferred_date}, time: ${service.preferred_time}, status: ${service.status}`);
        if (!service.preferred_date || !service.preferred_time) {
          console.log(`[ADMIN-AVAILABILITY] ⚠️ Skipping tech service ${service.id} - missing date or time`);
          continue;
        }
        const dateKey = formatDate(service.preferred_date);
        console.log(`[ADMIN-AVAILABILITY] 📅 Tech service ${service.id} dateKey: ${dateKey}`);
        const timeSlot = parseTimeSlot(service.preferred_time);
        console.log(`[ADMIN-AVAILABILITY] ⏰ Tech service ${service.id} timeSlot:`, timeSlot);
        if (!timeSlot) {
          console.log(`[ADMIN-AVAILABILITY] ⚠️ Skipping tech service ${service.id} - invalid timeSlot`);
          continue;
        }
        if (!busySlots[dateKey]) {
          busySlots[dateKey] = [];
        }
        const customerName = customerMap.get(service.customer_id) || 'Müşteri';
        busySlots[dateKey].push({
          startTime: timeSlot.start,
          endTime: timeSlot.end,
          type: 'technical_service',
          id: service.id,
          customer: customerName,
          details: service.product_type ? `${service.product_type} - Teknik Servis` : 'Teknik Servis'
        });
        console.log(`[ADMIN-AVAILABILITY] ✅ Added tech service ${service.id} to busySlots[${dateKey}]`);
      }
    } else {
      console.log('[ADMIN-AVAILABILITY] ℹ️ No technical service requests found');
    }
    // 4. ÜRÜN ALIM TALEPLERİ - pickup_date + pickup_time (sell_requests tablosu)
    const { data: sellRequests, error: sellRequestsError } = await supabase.from('sell_requests').select(`
        id, 
        pickup_date, 
        pickup_time, 
        status,
        brand,
        model,
        customer:customers(name)
      `).not('pickup_date', 'is', null).not('pickup_time', 'is', null).gte('pickup_date', startDateParam).lte('pickup_date', endDateParam);
    if (sellRequestsError) {
      console.error('[ADMIN-AVAILABILITY] ❌ Sell requests fetch error:', sellRequestsError);
    } else if (sellRequests) {
      console.log(`[ADMIN-AVAILABILITY] ✅ Found ${sellRequests.length} sell requests (ALL statuses)`);
      for (const request of sellRequests){
        console.log(`[ADMIN-AVAILABILITY] 💰 Processing sell request ID: ${request.id}, date: ${request.pickup_date}, time: ${request.pickup_time}, status: ${request.status}`);
        if (!request.pickup_date || !request.pickup_time) {
          console.log(`[ADMIN-AVAILABILITY] ⚠️ Skipping sell request ${request.id} - missing date or time`);
          continue;
        }
        const dateKey = formatDate(request.pickup_date);
        console.log(`[ADMIN-AVAILABILITY] 📅 Sell request ${request.id} dateKey: ${dateKey}`);
        const timeSlot = parseTimeSlot(request.pickup_time);
        console.log(`[ADMIN-AVAILABILITY] ⏰ Sell request ${request.id} timeSlot:`, timeSlot);
        if (!timeSlot) {
          console.log(`[ADMIN-AVAILABILITY] ⚠️ Skipping sell request ${request.id} - invalid timeSlot`);
          continue;
        }
        if (!busySlots[dateKey]) {
          busySlots[dateKey] = [];
        }
        // @ts-ignore - customer join
        const customerName = request.customer?.name || 'Müşteri';
        busySlots[dateKey].push({
          startTime: timeSlot.start,
          endTime: timeSlot.end,
          type: 'sell_request',
          id: request.id,
          customer: customerName,
          details: request.brand && request.model ? `${request.brand} ${request.model} - Ürün Alımı` : 'Ürün Alımı'
        });
        console.log(`[ADMIN-AVAILABILITY] ✅ Added sell request ${request.id} to busySlots[${dateKey}]`);
      }
    }
    // Her gün için saat sırasına göre sırala
    for(const dateKey in busySlots){
      busySlots[dateKey].sort((a, b)=>{
        return a.startTime.localeCompare(b.startTime);
      });
    }
    console.log('[ADMIN-AVAILABILITY] 📊 Total busy days:', Object.keys(busySlots).length);
    console.log('[ADMIN-AVAILABILITY] 📊 Busy days:', Object.keys(busySlots).join(', '));
    console.log('[ADMIN-AVAILABILITY] 🔍 Full busySlots object:', JSON.stringify(busySlots, null, 2));
    const response = {
      busySlots,
      workingHours: {
        start: '09:00',
        end: '18:00'
      },
      weekendClosed: true
    };
    console.log('[ADMIN-AVAILABILITY] ✅ Availability data fetched successfully');
    console.log('[ADMIN-AVAILABILITY] 🔍 Returning response with', Object.keys(busySlots).length, 'busy days');
    return c.json(response);
  } catch (error) {
    console.error('Error fetching admin availability:', error);
    return c.json({
      error: 'Meşguliyet takvimi yüklenirken hata oluştu',
      details: String(error)
    }, 500);
  }
}
/**
 * Belirli bir tarih için müsait saat dilimlerini döndürür
 */ export async function getAvailableSlots(c) {
  try {
    console.log('[AVAILABLE-SLOTS] 🔍 Fetching available slots...');
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const url = new URL(c.req.url);
    const dateParam = url.searchParams.get('date');
    console.log('[AVAILABLE-SLOTS] 📅 Requested date:', dateParam);
    if (!dateParam) {
      return c.json({
        error: 'date parametresi gereklidir'
      }, 400);
    }
    // Hafta sonu kontrolü
    if (isWeekend(dateParam)) {
      console.log('[AVAILABLE-SLOTS] ⚠️ Weekend detected - returning empty slots');
      return c.json({
        date: dateParam,
        availableSlots: [],
        busySlots: [],
        message: 'Firma hafta sonları kapalıdır',
        isWeekend: true
      });
    }
    // Tüm olası saat dilimleri (firma mesai saatleri: 09:00-19:00)
    // Cumartesi ve Pazar kapalı - kontrol yukarıda yapılıyor
    const allSlots = [
      '09:00 - 11:00',
      '11:00 - 13:00',
      '13:00 - 15:00',
      '15:00 - 17:00',
      '17:00 - 19:00'
    ];
    // O günün meşgul olduğu saatleri al
    const availabilityResponse = await getAdminAvailability({
      ...c,
      req: {
        ...c.req,
        url: c.req.url.replace(/date=[^&]*/, `startDate=${dateParam}&endDate=${dateParam}`)
      }
    });
    const availabilityData = await availabilityResponse.json();
    const busySlots = availabilityData.busySlots?.[dateParam] || [];
    // Meşgul saat dilimlerini string array'e çevir
    const busyTimeSlots = busySlots.map((slot)=>`${slot.startTime} - ${slot.endTime}`);
    // Müsait saatleri filtrele
    const availableSlots = allSlots.filter((slot)=>!busyTimeSlots.includes(slot));
    console.log('[AVAILABLE-SLOTS] ✅ Available slots:', availableSlots);
    console.log('[AVAILABLE-SLOTS] ❌ Busy slots:', busyTimeSlots);
    return c.json({
      date: dateParam,
      availableSlots,
      busySlots: busyTimeSlots,
      isWeekend: false
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return c.json({
      error: 'Müsait saatler yüklenirken hata oluştu',
      details: String(error)
    }, 500);
  }
}
