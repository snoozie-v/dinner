// proxy-server.js - Backend proxy for recipe imports
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ============================================
// Recipe Sharing — Storage Layer
// ============================================

const SHARE_EXPIRY_DAYS = 30;
const MAX_SHARED_RECIPES = 10000;
const DATA_DIR = path.join(__dirname, 'data');
const SHARED_RECIPES_FILE = path.join(DATA_DIR, 'shared-recipes.json');

let sharedRecipes = {};

function loadSharedRecipes() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(SHARED_RECIPES_FILE)) {
      const data = fs.readFileSync(SHARED_RECIPES_FILE, 'utf-8');
      sharedRecipes = JSON.parse(data);
      console.log(`✓ Loaded ${Object.keys(sharedRecipes).length} shared recipes`);
    }
  } catch (err) {
    console.error('Failed to load shared recipes:', err.message);
    sharedRecipes = {};
  }
}

function saveSharedRecipes() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SHARED_RECIPES_FILE, JSON.stringify(sharedRecipes, null, 2));
  } catch (err) {
    console.error('Failed to save shared recipes:', err.message);
  }
}

function cleanupExpired() {
  const now = Date.now();
  let removed = 0;
  for (const [id, entry] of Object.entries(sharedRecipes)) {
    if (now > entry.expiresAt) {
      delete sharedRecipes[id];
      removed++;
    }
  }
  if (removed > 0) {
    saveSharedRecipes();
    console.log(`Cleaned up ${removed} expired shared recipes`);
  }
}

function generateShareId() {
  return crypto.randomBytes(6).toString('base64url');
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Load on startup and clean up hourly
loadSharedRecipes();
cleanupExpired();
setInterval(cleanupExpired, 60 * 60 * 1000);

// Share-specific rate limiting (10 shares/hour/IP)
const shareRateLimitMap = new Map();
const SHARE_RATE_LIMIT_WINDOW = 3600000; // 1 hour
const MAX_SHARES_PER_WINDOW = 10;

function checkShareRateLimit(ip) {
  const now = Date.now();
  const requests = shareRateLimitMap.get(ip) || [];
  const recent = requests.filter(time => now - time < SHARE_RATE_LIMIT_WINDOW);
  if (recent.length >= MAX_SHARES_PER_WINDOW) return false;
  recent.push(now);
  shareRateLimitMap.set(ip, recent);
  return true;
}
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
  'aprettylifeinthesuburbs.com',
  'aheadofthyme.com',
  'adamantkitchen.com',
  'amybakesbread.com',
  'lordbyronskitchen.com',
  'hellofresh.ca',
  'bellyrumbles.com',
  'fooddolls.com',
  'skinnytaste.com',
  'tasteofhome.com',
  'sugarspunrun.com',
  'ourzestylife.com',
];

// Domains that are known to block automated requests (Cloudflare, etc.)
const BLOCKED_DOMAINS = [
  'sweetphi.com',
  'thesourdoughpodcast.com',
    'homechef.com',
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
      error: 'Domain not yet supported.',
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

// ============================================
// Recipe Sharing — Endpoints
// ============================================

const BASE_URL = process.env.BASE_URL || `http://localhost:${process.env.PORT || process.env.PROXY_PORT || 3001}`;
const APP_URL = 'https://dinner-olive.vercel.app/';

// Allowlisted recipe fields to prevent data injection
const ALLOWED_RECIPE_FIELDS = [
  'id', 'name', 'description', 'author', 'sourceUrl', 'imageUrl',
  'tags', 'cuisine', 'mealTypes', 'dietary', 'difficulty',
  'prepTime', 'cookTime', 'totalTime',
  'servings', 'ingredients', 'instructions',
  'nutrition', 'equipment', 'notes',
];

function sanitizeRecipe(recipe) {
  const clean = {};
  for (const field of ALLOWED_RECIPE_FIELDS) {
    if (recipe[field] !== undefined) {
      clean[field] = recipe[field];
    }
  }
  return clean;
}

// Increase JSON body limit for share endpoint
app.post('/api/share', express.json({ limit: '50kb' }), (req, res) => {
  const clientIp = req.ip || req.connection.remoteAddress;

  if (!checkShareRateLimit(clientIp)) {
    return res.status(429).json({
      error: 'Too many share requests. Please wait before trying again.'
    });
  }

  const { recipe } = req.body;

  if (!recipe || !recipe.name || !recipe.id) {
    return res.status(400).json({ error: 'Recipe name and id are required' });
  }

  if (Object.keys(sharedRecipes).length >= MAX_SHARED_RECIPES) {
    cleanupExpired();
    if (Object.keys(sharedRecipes).length >= MAX_SHARED_RECIPES) {
      return res.status(503).json({ error: 'Share storage is full. Please try again later.' });
    }
  }

  const sanitized = sanitizeRecipe(recipe);

  // Generate unique share ID (retry on collision)
  let shareId;
  let attempts = 0;
  do {
    shareId = generateShareId();
    attempts++;
  } while (sharedRecipes[shareId] && attempts < 10);

  if (sharedRecipes[shareId]) {
    return res.status(500).json({ error: 'Failed to generate unique share ID' });
  }

  const now = Date.now();
  const expiresAt = now + SHARE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

  sharedRecipes[shareId] = {
    recipe: sanitized,
    createdAt: now,
    expiresAt,
  };

  saveSharedRecipes();

  const shareUrl = `${BASE_URL}/r/${shareId}`;

  res.json({
    success: true,
    shareId,
    shareUrl,
    expiresAt: new Date(expiresAt).toISOString(),
  });
});

// ============================================
// Recipe Sharing — Page Renderer
// ============================================

function formatTimeISO(time) {
  if (!time) return null;
  const match = time.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return time;
  const hours = match[1] ? parseInt(match[1]) : 0;
  const minutes = match[2] ? parseInt(match[2]) : 0;
  const parts = [];
  if (hours > 0) parts.push(`${hours} hr`);
  if (minutes > 0) parts.push(`${minutes} min`);
  return parts.join(' ') || null;
}

function renderRecipePage(recipe, daysRemaining, shareId) {
  const name = escapeHtml(recipe.name);
  const description = escapeHtml(recipe.description || '');
  const author = escapeHtml(recipe.author || '');
  const imageUrl = escapeHtml(recipe.imageUrl || '');
  const sourceUrl = escapeHtml(recipe.sourceUrl || '');
  const cuisine = escapeHtml(recipe.cuisine || '');
  const difficulty = escapeHtml(recipe.difficulty || '');
  const notes = escapeHtml(recipe.notes || '');
  const shareUrl = escapeHtml(`${BASE_URL}/r/${shareId}`);
  const expiresDate = new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const prepTime = formatTimeISO(recipe.prepTime);
  const cookTime = formatTimeISO(recipe.cookTime);
  const totalTime = formatTimeISO(recipe.totalTime);
  const servings = recipe.servings;

  const ogDescription = description || `${name} recipe shared from Dinner app`;

  // Build sections
  let timingHtml = '';
  const timingItems = [];
  if (servings) timingItems.push(`<div class="timing-item"><div class="timing-label">Servings</div><div class="timing-value">${escapeHtml(String(servings.default || '?'))} ${escapeHtml(servings.unit || 'servings')}</div></div>`);
  if (prepTime) timingItems.push(`<div class="timing-item"><div class="timing-label">Prep</div><div class="timing-value">${escapeHtml(prepTime)}</div></div>`);
  if (cookTime) timingItems.push(`<div class="timing-item"><div class="timing-label">Cook</div><div class="timing-value">${escapeHtml(cookTime)}</div></div>`);
  if (totalTime) timingItems.push(`<div class="timing-item"><div class="timing-label">Total</div><div class="timing-value">${escapeHtml(totalTime)}</div></div>`);
  if (timingItems.length > 0) {
    timingHtml = `<div class="timing-grid">${timingItems.join('')}</div>`;
  }

  let authorHtml = '';
  if (author || sourceUrl) {
    authorHtml = '<div class="meta-section">';
    if (author) authorHtml += `<div class="meta-line">By: <strong>${author}</strong></div>`;
    if (sourceUrl) {
      try {
        const hostname = new URL(recipe.sourceUrl).hostname.replace('www.', '');
        authorHtml += `<div class="meta-line">Source: <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(hostname)}</a></div>`;
      } catch { /* invalid URL, skip */ }
    }
    authorHtml += '</div>';
  }

  let tagsHtml = '';
  const tagItems = [];
  if (cuisine) tagItems.push(`<span class="tag tag-cuisine">${cuisine}</span>`);
  if (difficulty) tagItems.push(`<span class="tag tag-difficulty">${difficulty}</span>`);
  if (recipe.tags?.length) {
    recipe.tags.forEach(t => tagItems.push(`<span class="tag">${escapeHtml(t)}</span>`));
  }
  if (tagItems.length > 0) {
    tagsHtml = `<div class="tags">${tagItems.join('')}</div>`;
  }

  let ingredientsHtml = '';
  if (recipe.ingredients?.length) {
    const items = recipe.ingredients.map(ing => {
      let text = '';
      if (ing.quantity && ing.quantity > 0) text += `<strong>${escapeHtml(String(ing.quantity))} ${escapeHtml(ing.unit || '')} </strong>`;
      text += escapeHtml(ing.name);
      if (ing.preparation) text += `<span class="prep">, ${escapeHtml(ing.preparation)}</span>`;
      return `<li>${text}</li>`;
    }).join('');
    ingredientsHtml = `<div class="section"><h2>Ingredients</h2><ul class="ingredients-list">${items}</ul></div>`;
  }

  let instructionsHtml = '';
  if (recipe.instructions?.length) {
    const sections = recipe.instructions.map(section => {
      let html = '';
      if (section.section && section.section !== 'Instructions') {
        html += `<h3 class="instruction-section-title">${escapeHtml(section.section)}</h3>`;
      }
      const steps = section.steps.map((step, i) => `<li><span class="step-num">${i + 1}</span><span class="step-text">${escapeHtml(step)}</span></li>`).join('');
      html += `<ol class="steps">${steps}</ol>`;
      return html;
    }).join('');
    instructionsHtml = `<div class="section"><h2>Instructions</h2>${sections}</div>`;
  }

  let nutritionHtml = '';
  if (recipe.nutrition) {
    const n = recipe.nutrition;
    nutritionHtml = `<div class="section"><h2>Nutrition (per serving)</h2><div class="nutrition-grid">
      <div class="nutrition-item"><div class="nutrition-value">${escapeHtml(String(n.calories ?? '—'))}</div><div class="nutrition-label">Calories</div></div>
      <div class="nutrition-item"><div class="nutrition-value">${escapeHtml(String(n.protein_g ?? '—'))}g</div><div class="nutrition-label">Protein</div></div>
      <div class="nutrition-item"><div class="nutrition-value">${escapeHtml(String(n.carbs_g ?? '—'))}g</div><div class="nutrition-label">Carbs</div></div>
      <div class="nutrition-item"><div class="nutrition-value">${escapeHtml(String(n.fat_g ?? '—'))}g</div><div class="nutrition-label">Fat</div></div>
      <div class="nutrition-item"><div class="nutrition-value">${escapeHtml(String(n.fiber_g ?? '—'))}g</div><div class="nutrition-label">Fiber</div></div>
    </div></div>`;
  }

  let notesHtml = '';
  if (notes) {
    notesHtml = `<div class="notes-box"><h3>Notes</h3><p>${notes}</p></div>`;
  }

  let equipmentHtml = '';
  if (recipe.equipment?.length) {
    const items = recipe.equipment.map(e => `<span class="equipment-tag">${escapeHtml(e)}</span>`).join('');
    equipmentHtml = `<div class="section"><h2>Equipment Needed</h2><div class="equipment-list">${items}</div></div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name} — Shared Recipe</title>
  <meta name="description" content="${escapeHtml(ogDescription)}">
  <meta property="og:title" content="${name}">
  <meta property="og:description" content="${escapeHtml(ogDescription)}">
  <meta property="og:url" content="${shareUrl}">
  <meta property="og:type" content="article">
  ${imageUrl ? `<meta property="og:image" content="${imageUrl}">` : ''}
  <meta name="twitter:card" content="${imageUrl ? 'summary_large_image' : 'summary'}">
  <meta name="twitter:title" content="${name}">
  <meta name="twitter:description" content="${escapeHtml(ogDescription)}">
  ${imageUrl ? `<meta name="twitter:image" content="${imageUrl}">` : ''}
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #ffffff; --card: #ffffff; --text: #1a1a2e; --text-secondary: #6b7280;
      --border: #e5e7eb; --accent: #2563eb; --accent-light: #dbeafe;
      --tag-bg: #f3f4f6; --tag-text: #374151;
      --cuisine-bg: #f3e8ff; --cuisine-text: #6b21a8;
      --difficulty-bg: #fff7ed; --difficulty-text: #c2410c;
      --notes-bg: #fffbeb; --notes-border: #fbbf24; --notes-text: #92400e;
      --step-bg: #2563eb; --step-text: #ffffff;
      --banner-bg: #eff6ff; --banner-text: #1e40af; --banner-border: #bfdbfe;
      --footer-bg: #f9fafb;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #111827; --card: #1f2937; --text: #f3f4f6; --text-secondary: #9ca3af;
        --border: #374151; --accent: #60a5fa; --accent-light: #1e3a5f;
        --tag-bg: #374151; --tag-text: #d1d5db;
        --cuisine-bg: #2e1065; --cuisine-text: #c4b5fd;
        --difficulty-bg: #431407; --difficulty-text: #fdba74;
        --notes-bg: #451a0344; --notes-border: #92400e; --notes-text: #fbbf24;
        --step-bg: #3b82f6; --step-text: #ffffff;
        --banner-bg: #1e3a5f; --banner-text: #93c5fd; --banner-border: #1e40af;
        --footer-bg: #1a2332;
      }
    }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
    .container { max-width: 768px; margin: 0 auto; background: var(--card); min-height: 100vh; }
    .hero-image { width: 100%; max-height: 400px; object-fit: cover; display: block; }
    .content { padding: 24px 20px; }
    @media (min-width: 640px) { .content { padding: 32px; } }
    .banner { background: var(--banner-bg); border: 1px solid var(--banner-border); color: var(--banner-text); padding: 12px 16px; border-radius: 8px; margin-bottom: 24px; font-size: 14px; text-align: center; }
    h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
    .description { color: var(--text-secondary); margin-bottom: 24px; }
    .timing-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding-bottom: 20px; margin-bottom: 20px; border-bottom: 1px solid var(--border); }
    @media (min-width: 640px) { .timing-grid { grid-template-columns: repeat(4, 1fr); } }
    .timing-label { font-size: 13px; color: var(--text-secondary); margin-bottom: 2px; }
    .timing-value { font-size: 18px; font-weight: 600; }
    .meta-section { padding-bottom: 20px; margin-bottom: 20px; border-bottom: 1px solid var(--border); }
    .meta-line { margin-bottom: 4px; font-size: 15px; }
    .meta-line a { color: var(--accent); text-decoration: none; }
    .meta-line a:hover { text-decoration: underline; }
    .tags { display: flex; flex-wrap: wrap; gap: 8px; padding-bottom: 20px; margin-bottom: 20px; border-bottom: 1px solid var(--border); }
    .tag { padding: 4px 12px; border-radius: 9999px; font-size: 13px; background: var(--tag-bg); color: var(--tag-text); }
    .tag-cuisine { background: var(--cuisine-bg); color: var(--cuisine-text); }
    .tag-difficulty { background: var(--difficulty-bg); color: var(--difficulty-text); }
    .section { margin-bottom: 24px; }
    .section h2 { font-size: 20px; font-weight: 700; margin-bottom: 16px; }
    .ingredients-list { list-style: none; }
    .ingredients-list li { padding: 6px 0; display: flex; align-items: flex-start; }
    .ingredients-list li::before { content: '\\2022'; color: var(--accent); margin-right: 12px; flex-shrink: 0; font-weight: bold; }
    .ingredients-list .prep { color: var(--text-secondary); }
    .instruction-section-title { font-size: 17px; font-weight: 600; margin-bottom: 12px; }
    .steps { list-style: none; }
    .steps li { display: flex; align-items: flex-start; margin-bottom: 12px; }
    .step-num { flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%; background: var(--step-bg); color: var(--step-text); font-size: 13px; display: flex; align-items: center; justify-content: center; margin-right: 12px; margin-top: 2px; }
    .step-text { flex: 1; }
    .nutrition-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
    @media (min-width: 640px) { .nutrition-grid { grid-template-columns: repeat(5, 1fr); } }
    .nutrition-item { text-align: center; }
    .nutrition-value { font-size: 20px; font-weight: 600; }
    .nutrition-label { font-size: 13px; color: var(--text-secondary); }
    .notes-box { background: var(--notes-bg); border: 1px solid var(--notes-border); border-radius: 8px; padding: 16px; margin-bottom: 24px; }
    .notes-box h3 { font-size: 14px; font-weight: 600; color: var(--notes-text); margin-bottom: 8px; }
    .notes-box p { font-size: 14px; color: var(--notes-text); white-space: pre-wrap; }
    .equipment-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .equipment-tag { padding: 4px 12px; background: var(--tag-bg); color: var(--tag-text); border-radius: 6px; font-size: 13px; }
    .footer { background: var(--footer-bg); border-top: 1px solid var(--border); padding: 24px 20px; text-align: center; }
    .footer a { color: var(--accent); text-decoration: none; font-weight: 600; }
    .footer a:hover { text-decoration: underline; }
    .footer .cta { font-size: 16px; margin-bottom: 8px; }
    .footer .expiry { font-size: 13px; color: var(--text-secondary); }
  </style>
</head>
<body>
  <div class="container">
    ${imageUrl ? `<img class="hero-image" src="${imageUrl}" alt="${name}" onerror="this.style.display='none'">` : ''}
    <div class="content">
      <div class="banner">This shared recipe expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}</div>
      <h1>${name}</h1>
      ${description ? `<p class="description">${description}</p>` : ''}
      ${timingHtml}
      ${authorHtml}
      ${tagsHtml}
      ${ingredientsHtml}
      ${instructionsHtml}
      ${nutritionHtml}
      ${notesHtml}
      ${equipmentHtml}
    </div>
    <div class="footer">
      <div class="cta"><a href="${escapeHtml(APP_URL)}">Plan your meals with Dinner</a></div>
      <div class="expiry">This link expires on ${escapeHtml(expiresDate)}</div>
    </div>
  </div>
</body>
</html>`;
}

function renderExpiredPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recipe Not Available — Dinner</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; color: #1a1a2e; text-align: center; padding: 20px; }
    @media (prefers-color-scheme: dark) { body { background: #111827; color: #f3f4f6; } }
    .box { max-width: 400px; }
    h1 { font-size: 24px; margin-bottom: 12px; }
    p { color: #6b7280; margin-bottom: 24px; }
    a { color: #2563eb; text-decoration: none; font-weight: 600; }
    a:hover { text-decoration: underline; }
    @media (prefers-color-scheme: dark) { p { color: #9ca3af; } a { color: #60a5fa; } }
  </style>
</head>
<body>
  <div class="box">
    <h1>Recipe Not Available</h1>
    <p>This shared recipe has expired or doesn't exist.</p>
    <a href="${escapeHtml(APP_URL)}">Plan your meals with Dinner</a>
  </div>
</body>
</html>`;
}

// GET /r/:id — Serve shared recipe page
app.get('/r/:id', (req, res) => {
  const entry = sharedRecipes[req.params.id];

  if (!entry) {
    return res.status(404).type('html').send(renderExpiredPage());
  }

  if (Date.now() > entry.expiresAt) {
    delete sharedRecipes[req.params.id];
    saveSharedRecipes();
    return res.status(410).type('html').send(renderExpiredPage());
  }

  const daysRemaining = Math.max(1, Math.ceil((entry.expiresAt - Date.now()) / (24 * 60 * 60 * 1000)));
  res.type('html').send(renderRecipePage(entry.recipe, daysRemaining, req.params.id));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, _next) => {
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
