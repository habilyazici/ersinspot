// Ersin Spot Backend - Main Entry Point
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Ana server dosyasını import et
// NOT: Deno'da .tsx uzantısı gerekiyor
import app from "../../../src/supabase/functions/server/index.tsx";

console.log("🚀 Ersin Spot Backend Server starting...");

// Serve the Hono app
serve(app.fetch);
