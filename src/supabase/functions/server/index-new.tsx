import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const app = new Hono();

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

console.log("🚀 Minimal server starting to test...");

// Health check endpoint
app.get("/make-server-0f4d2485/health", (c) => {
  return c.json({ status: "ok", message: "Minimal server working!" });
});

// Test products endpoint
app.get("/make-server-0f4d2485/products", async (c) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(10);
    
    if (error) {
      return c.json({ error: error.message }, 500);
    }
    
    return c.json({ products: data || [], total: data?.length || 0 });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Test categories endpoint  
app.get("/make-server-0f4d2485/categories", async (c) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*');
    
    if (error) {
      return c.json({ error: error.message }, 500);
    }
    
    return c.json({ categories: data || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

// Test brands endpoint
app.get("/make-server-0f4d2485/brands", async (c) => {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select('*');
    
    if (error) {
      return c.json({ error: error.message }, 500);
    }
    
    return c.json({ brands: data || [] });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

Deno.serve(app.fetch);
