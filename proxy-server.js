// proxy-server.js - Backend proxy for recipe imports
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
// Use PORT for production (Render/Railway), PROXY_PORT for local dev, or default to 3001
const PORT = process.env.PORT || process.env.PROXY_PORT || 3001;

// Enable CORS - allow localhost in dev, or specific origin in production
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like curl without Origin header)
    if (!origin) return callback(null, true);

    // In production, use ALLOWED_ORIGIN env var
    if (process.env.ALLOWED_ORIGIN) {
      return callback(null, process.env.ALLOWED_ORIGIN);
    }

    // In development, allow any localhost origin
    if (origin.match(/^http:\/\/localhost:\d+$/)) {
      return callback(null, origin);
    }

    callback(null, false);
  },
  methods: ['GET', 'POST'],
}));

app.use(express.json());

// Rate limiting map (simple in-memory implementation)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30; // Increased for batch imports

// Allowed domains for recipe fetching (security measure)
const ALLOWED_DOMAINS = [
  'allrecipes.com',
  'foodnetwork.com',
  'food.com',
  'seriouseats.com',
  'bonappetit.com',
  'epicurious.com',
  'simplyrecipes.com',
  'budgetbytes.com',
  'tasty.co',
  'delish.com',
  'cookieandkate.com',
  'minimalistbaker.com',
  'thekitchn.com',
  'food52.com',
  'kingarthurbaking.com',
  'sallysbakingaddiction.com',
  'smittenkitchen.com',
  'pinchofyum.com',
  'loveandlemons.com',
  'recipetineats.com',
  'hellofresh.com',
  'diethood.com',
];

// Domains that are known to block automated requests (Cloudflare, etc.)
const BLOCKED_DOMAINS = [
  'sweetphi.com',
];

// Simple rate limiting
function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(ip) || [];

  // Filter out old requests
  const recentRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);

  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return true;
}

// Clean up rate limit map periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, requests] of rateLimitMap.entries()) {
    const recentRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
    if (recentRequests.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, recentRequests);
    }
  }
}, RATE_LIMIT_WINDOW);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// Instacart Integration
// ============================================

const INSTACART_API_URL = process.env.NODE_ENV === 'production'
  ? 'https://connect.instacart.com/idp/v1/products/recipe'
  : 'https://connect.dev.instacart.tools/idp/v1/products/recipe';

const INSTACART_API_KEY = process.env.INSTACART_API_KEY;

// Check if Instacart is configured (for frontend to know whether to show button)
app.get('/api/instacart/status', (req, res) => {
  res.json({
    enabled: !!INSTACART_API_KEY,
    timestamp: new Date().toISOString()
  });
});

// Create Instacart shopping list
app.post('/api/instacart', async (req, res) => {
  if (!INSTACART_API_KEY) {
    return res.status(503).json({
      error: 'Instacart integration not configured'
    });
  }

  const clientIp = req.ip || req.connection.remoteAddress;

  // Rate limiting
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      error: 'Too many requests. Please wait a minute before trying again.'
    });
  }

  const { title, ingredients, linkbackUrl } = req.body;

  if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: 'No ingredients provided' });
  }

  // Transform ingredients to Instacart format
  const instacartIngredients = ingredients.map(item => ({
    name: item.name,
    display_text: `${item.quantity || ''} ${item.unit || ''} ${item.name}`.trim(),
    measurements: item.quantity ? [{
      quantity: parseFloat(item.quantity) || 1,
      unit: item.unit || 'unit'
    }] : []
  }));

  try {
    const response = await fetch(INSTACART_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${INSTACART_API_KEY}`,
      },
      body: JSON.stringify({
        title: title || 'My Meal Plan Shopping List',
        link_type: 'recipe',
        ingredients: instacartIngredients,
        landing_page_configuration: {
          partner_linkback_url: linkbackUrl || 'https://meal-planner.app',
          enable_pantry_items: true
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Instacart API error:', data);
      throw new Error(data.error || `Instacart API error: ${response.status}`);
    }

    // Return the Instacart checkout URL
    res.json({
      success: true,
      instacartUrl: data.products_link_url
    });

  } catch (error) {
    console.error('Instacart API error:', error);
    res.status(500).json({
      error: 'Failed to create Instacart list',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Proxy endpoint for recipe fetching
app.post('/api/fetch-recipe', async (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress;

  // Rate limiting
  if (!checkRateLimit(clientIp)) {
    return res.status(429).json({
      error: 'Too many requests. Please wait a minute before trying again.'
    });
  }

  const { url } = req.body;

  // Validate URL
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Invalid URL provided' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  // Security: Only allow HTTPS
  if (parsedUrl.protocol !== 'https:') {
    return res.status(400).json({ error: 'Only HTTPS URLs are allowed' });
  }

  const hostname = parsedUrl.hostname.replace('www.', '');

  // Check if domain is known to block automated requests
  const isBlocked = BLOCKED_DOMAINS.some(domain =>
    hostname === domain || hostname.endsWith('.' + domain)
  );

  if (isBlocked) {
    return res.status(403).json({
      error: `Sorry, ${hostname} blocks automated recipe imports. Please add this recipe manually using the recipe form.`
    });
  }

  // Security: Check if domain is in allowed list
  const isAllowed = ALLOWED_DOMAINS.some(domain =>
    hostname === domain || hostname.endsWith('.' + domain)
  );

  if (!isAllowed) {
    return res.status(403).json({
      error: 'Domain not allowed. Only popular recipe sites are supported.',
      allowedDomains: ALLOWED_DOMAINS
    });
  }

  try {
    // Fetch the recipe page
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const html = await response.text();

    // Some sites return 403 but still send valid HTML (anti-bot quirk)
    // Only reject if we got an error status AND no meaningful content
    if (!response.ok && html.length < 1000) {
      return res.status(response.status).json({
        error: `Failed to fetch recipe: HTTP ${response.status}`,
        status: response.status
      });
    }

    // Return the HTML content
    res.json({
      success: true,
      html,
      url: response.url, // Final URL after redirects
      status: response.status
    });

  } catch (error) {
    console.error('Fetch error:', error);

    if (error.name === 'AbortError') {
      return res.status(504).json({
        error: 'Request timed out. The website took too long to respond.'
      });
    }

    res.status(500).json({
      error: 'Failed to fetch recipe page',
      message: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, () => {
  console.log(`✓ Recipe proxy server running on port ${PORT}`);
  console.log(`✓ Allowed origin: ${process.env.ALLOWED_ORIGIN || 'http://localhost:5173'}`);
  console.log(`✓ Allowed domains: ${ALLOWED_DOMAINS.length} recipe sites`);
});
