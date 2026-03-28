import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import NodeCache from "node-cache";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Supabase (Backend client for caching)
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Cache configuration
// TTL in seconds: 
// Products/Services: 300-600 (5-10 min)
// Stores: 600-1200 (10-20 min)
// Home/Listings: 120-300 (2-5 min)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

app.use(express.json());

// API Cache Middleware
const cacheMiddleware = (ttl: number) => (req: any, res: any, next: any) => {
  const key = req.originalUrl;
  const cachedResponse = cache.get(key);
  
  if (cachedResponse) {
    res.setHeader("X-Cache", "HIT");
    return res.json(cachedResponse);
  }
  
  res.setHeader("X-Cache", "MISS");
  res.originalJson = res.json;
  res.json = (body: any) => {
    cache.set(key, body, ttl);
    return res.originalJson(body);
  };
  next();
};

// --- API ROUTES WITH CACHE ---

// Products Cache (5-10 min -> 300s)
app.get("/api/products", cacheMiddleware(300), async (req, res) => {
  const { province_id, municipality_id, category_id, store_id, limit = 20, offset = 0 } = req.query;
  
  let query = supabase
    .from('products')
    .select(`
      *,
      store:store_id (
        id, name, public_id, is_active,
        province:province_id (id, name),
        municipality:municipality_id (id, name)
      )
    `)
    .filter('store.is_active', 'eq', true)
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (province_id) query = query.eq('province_id', province_id);
  if (municipality_id) query = query.eq('municipality_id', municipality_id);
  if (category_id) query = query.eq('category_id', category_id);
  if (store_id) query = query.eq('store_id', store_id);

  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  
  // Add Cache-Control headers for browser/CDN
  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  res.json(data);
});

// Services Cache (5-10 min -> 300s)
app.get("/api/services", cacheMiddleware(300), async (req, res) => {
  const { province_id, municipality_id, category_id, store_id, limit = 20, offset = 0 } = req.query;
  
  let query = supabase
    .from('services')
    .select(`
      *,
      store:store_id (
        id, name, public_id, is_active,
        province:province_id (id, name),
        municipality:municipality_id (id, name)
      )
    `)
    .filter('store.is_active', 'eq', true)
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (province_id) query = query.eq('province_id', province_id);
  if (municipality_id) query = query.eq('municipality_id', municipality_id);
  if (category_id) query = query.eq('category_id', category_id);
  if (store_id) query = query.eq('store_id', store_id);

  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  
  res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  res.json(data);
});

// Stores Cache (10-20 min -> 600s)
app.get("/api/stores", cacheMiddleware(600), async (req, res) => {
  const { province_id, municipality_id, limit = 20, offset = 0 } = req.query;
  
  let query = supabase
    .from('stores')
    .select(`
      *,
      owner:owner_id (id, full_name, photo_url),
      province:province_id (id, name),
      municipality:municipality_id (id, name)
    `)
    .eq('is_active', true)
    .range(Number(offset), Number(offset) + Number(limit) - 1);

  if (province_id) query = query.eq('province_id', province_id);
  if (municipality_id) query = query.eq('municipality_id', municipality_id);

  const { data, error } = await query.order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  
  res.setHeader("Cache-Control", "public, max-age=600, stale-while-revalidate=1200");
  res.json(data);
});

// Users Cache (10-20 min -> 600s)
app.get("/api/users", cacheMiddleware(600), async (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .range(Number(offset), Number(offset) + Number(limit) - 1)
    .order('created_at', { ascending: false });
  
  if (error) return res.status(500).json({ error: error.message });
  
  res.setHeader("Cache-Control", "public, max-age=600, stale-while-revalidate=1200");
  res.json(data);
});

// Single User Cache (10-20 min -> 600s)
app.get("/api/users/:id", cacheMiddleware(600), async (req, res) => {
  const { id } = req.params;
  
  const { data, error } = await supabase
    .from('users')
    .select('*, province:province_id(id, name), municipality:municipality_id(id, name)')
    .eq('id', id)
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  
  res.setHeader("Cache-Control", "public, max-age=600, stale-while-revalidate=1200");
  res.json(data);
});

// Cache Invalidation Endpoint
app.post("/api/cache/invalidate", (req, res) => {
  const { type } = req.body; // e.g., 'products', 'services', 'stores'
  
  // Simple invalidation: clear all keys that match the type
  const keys = cache.keys();
  const keysToInvalidate = keys.filter(key => key.includes(`/api/${type}`));
  
  keysToInvalidate.forEach(key => cache.del(key));
  
  res.json({ success: true, invalidated: keysToInvalidate.length });
});

// --- VITE MIDDLEWARE ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
