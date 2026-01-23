import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS
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

// Test endpoint
app.get("/make-server-0f4d2485/test", (c) => {
  return c.json({ status: "ok", message: "Test server is working!" });
});

console.log("🚀 Test server starting...");

Deno.serve(app.fetch);
