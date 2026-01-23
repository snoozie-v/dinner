// proxy-server.js - Backend proxy for recipe imports
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PROXY_PORT || 3001;

// Enable CORS for local development
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:5173',
  methods: ['GET', 'POST'],
}));

app.use(express.json());

// Rate limiting map (simple in-memory implementation)
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

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

  // Security: Check if domain is in allowed list
  const hostname = parsedUrl.hostname.replace('www.', '');
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

    if (!response.ok) {
      return res.status(response.status).json({
        error: `Failed to fetch recipe: HTTP ${response.status}`,
        status: response.status
      });
    }

    const html = await response.text();

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
