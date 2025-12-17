import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
};

console.log('Starting Edge Function...');

// Import app at startup to catch errors early
let app: any = null;
try {
  console.log('Loading main app...');
  const module = await import("../../../src/supabase/functions/server/index.tsx");
  app = module.default;
  console.log('✅ Main app loaded successfully');
} catch (error: any) {
  console.error('❌ Failed to load main app:', error.message);
  console.error('Stack:', error.stack);
}

serve(async (req) => {
  const url = new URL(req.url);
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  // Health check
  if (url.pathname.endsWith('/health')) {
    return new Response(
      JSON.stringify({ 
        status: 'ok',
        appLoaded: !!app 
      }),
      { 
        status: 200,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }

  // If app failed to load, return error
  if (!app) {
    return new Response(
      JSON.stringify({ 
        error: 'Application failed to initialize',
        message: 'Check function logs for details'
      }), 
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }

  try {
    // Handle request with main app
    const response = await app.fetch(req);
    
    // Add CORS headers
    const headers = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error: any) {
    console.error('[REQUEST ERROR]', error);
    return new Response(
      JSON.stringify({ 
        error: 'Request failed', 
        message: error?.message || 'Unknown error'
      }), 
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
