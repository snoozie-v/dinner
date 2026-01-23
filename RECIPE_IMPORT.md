# Recipe Import Feature

The Dinner app includes a recipe import feature that allows you to import recipes from popular cooking websites by simply pasting a URL.

## How It Works

The app extracts recipe data from websites using **Schema.org JSON-LD** structured data. Most major recipe sites (AllRecipes, Food Network, Serious Eats, etc.) include this standardized recipe data in their HTML.

### Architecture

The import feature uses a **backend proxy server** to bypass browser CORS restrictions:

```
Browser → Proxy Server → Recipe Website
         ↓
    Parse JSON-LD → Display in Recipe Form
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `express` - Web server for the proxy
- `cors` - CORS middleware
- `concurrently` - Run multiple processes

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Default configuration:
```env
VITE_PROXY_URL=http://localhost:3001
PROXY_PORT=3001
ALLOWED_ORIGIN=http://localhost:5173
```

### 3. Run the App

**Option A: Run frontend and proxy together (recommended)**
```bash
npm run dev:all
```

**Option B: Run separately**
```bash
# Terminal 1: Frontend
npm run dev

# Terminal 2: Proxy server
npm run proxy
```

The app will be available at `http://localhost:5173` and the proxy at `http://localhost:3001`.

## Usage

1. Navigate to the Recipe Library
2. Click **"Import from URL"**
3. Paste a recipe URL (e.g., from Food Network, AllRecipes)
4. Click **"Import Recipe"**
5. The recipe form opens with pre-filled data
6. Review and complete any missing fields
7. Save the recipe

## Supported Sites

The proxy allows imports from these domains:

- allrecipes.com
- foodnetwork.com
- food.com
- seriouseats.com
- bonappetit.com
- epicurious.com
- simplyrecipes.com
- budgetbytes.com
- tasty.co
- delish.com
- cookieandkate.com
- minimalistbaker.com
- thekitchn.com
- food52.com
- kingarthurbaking.com
- sallysbakingaddiction.com
- smittenkitchen.com
- pinchofyum.com
- loveandlemons.com
- recipetineats.com

To add more domains, edit the `ALLOWED_DOMAINS` array in `proxy-server.js`.

## Troubleshooting

### Import Button Shows Error

**Problem**: "This website blocks automatic imports"

**Solutions**:
1. Make sure the proxy server is running (`npm run proxy`)
2. Check that `VITE_PROXY_URL` in `.env` matches the proxy server address
3. Verify the URL is from a supported domain
4. Try the non-AMP version of the page (remove `.amp` from URL)

### Proxy Server Not Starting

**Problem**: Port 3001 already in use

**Solution**: Change the port in `.env`:
```env
PROXY_PORT=3002
VITE_PROXY_URL=http://localhost:3002
```

### Recipe Data Missing

**Problem**: Import succeeds but fields are empty

**Causes**:
- The website doesn't use standard Schema.org JSON-LD
- The recipe data is incomplete on the source site
- The page is an AMP page (try non-AMP version)

**Solution**: Fill in missing fields manually in the recipe form.

## Security Features

The proxy server includes several security measures:

1. **Domain Whitelist**: Only allows fetching from approved recipe sites
2. **HTTPS Only**: Rejects non-HTTPS URLs
3. **Rate Limiting**: Max 10 requests per minute per IP
4. **Timeout**: 15-second timeout per request
5. **CORS**: Only allows requests from configured frontend origin

## Deployment

### Production Considerations

For production deployment, you'll need to:

1. **Deploy the proxy server** separately (e.g., on Heroku, Railway, AWS)
2. **Update environment variables** to point to production URLs
3. **Enable HTTPS** on the proxy server
4. **Add authentication** if needed (optional)

### Example: Deploying to Railway

1. Create a `Procfile` in the project root:
```
web: node proxy-server.js
```

2. Set environment variables in Railway:
```
PORT=8080
ALLOWED_ORIGIN=https://your-app.com
NODE_ENV=production
```

3. Deploy and update frontend `.env`:
```
VITE_PROXY_URL=https://your-proxy.railway.app
```

### Example: Deploying Frontend to Vercel/Netlify

1. Build the frontend:
```bash
npm run build
```

2. Set environment variable in your hosting platform:
```
VITE_PROXY_URL=https://your-proxy-server.com
```

3. Deploy the `dist` folder

## API Reference

### Proxy Server Endpoints

#### `GET /health`
Health check endpoint

**Response**:
```json
{
  "status": "ok",
  "timestamp": "2026-01-22T12:00:00.000Z"
}
```

#### `POST /api/fetch-recipe`
Fetch recipe page HTML

**Request**:
```json
{
  "url": "https://www.foodnetwork.com/recipes/..."
}
```

**Success Response**:
```json
{
  "success": true,
  "html": "<!DOCTYPE html>...",
  "url": "https://...",
  "status": 200
}
```

**Error Response**:
```json
{
  "error": "Error message",
  "status": 404
}
```

## Limitations

1. **CORS Bypass Required**: Requires running a proxy server
2. **Site Structure Changes**: If a recipe site changes their HTML structure, parsing may fail
3. **Rate Limits**: Some sites may rate-limit the proxy server's requests
4. **Incomplete Data**: Not all sites include complete recipe data in JSON-LD
5. **No Authentication**: Can't import from sites that require login (e.g., NYT Cooking paywalled recipes)

## Development

### Testing the Parser

Create a test HTML file to debug parsing:

```html
<!-- test-parser.html -->
<!DOCTYPE html>
<html>
<body>
    <input type="text" id="url" value="https://..." style="width: 500px">
    <button onclick="test()">Test</button>
    <pre id="output"></pre>

    <script type="module">
        import { parseRecipeFromUrl } from './src/utils/recipeParser.ts';

        window.test = async () => {
            const url = document.getElementById('url').value;
            const result = await parseRecipeFromUrl(url);
            document.getElementById('output').textContent =
                JSON.stringify(result, null, 2);
        };
    </script>
</body>
</html>
```

### Adding New Domains

1. Add domain to `ALLOWED_DOMAINS` in `proxy-server.js`
2. Test that the site uses Schema.org JSON-LD:
   - Visit recipe page
   - View source (Ctrl+U or Cmd+Option+U)
   - Search for `application/ld+json`
   - Look for `"@type": "Recipe"`

## Future Improvements

- [ ] Add support for more recipe sites
- [ ] Implement caching to reduce duplicate requests
- [ ] Add recipe preview before importing
- [ ] Support batch import from multiple URLs
- [ ] Add browser extension version (no proxy needed)
- [ ] Support for recipe sites without JSON-LD (HTML scraping)
