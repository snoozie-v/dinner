# Dinner - Meal Planning & Recipe Management App

A React-based meal planning application with recipe management, shopping list generation, and recipe import from popular cooking websites.

## Features

- 📅 **Meal Planning**: Plan meals across multiple days with drag-and-drop interface
- 📚 **Recipe Library**: Manage custom recipes and browse default recipes
- 🛒 **Shopping Lists**: Auto-generate shopping lists from meal plans with smart ingredient aggregation
- 🔗 **Recipe Import**: Import recipes from AllRecipes, Food Network, and 20+ other popular recipe sites
- 🏷️ **Tags & Filters**: Organize recipes by cuisine, dietary restrictions, meal type
- ⏱️ **Time Tracking**: Track prep time, cook time, and difficulty
- 💰 **Cost Estimates**: Track recipe costs and costs per serving
- 🌙 **Dark Mode**: Full dark mode support

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Run frontend and proxy server together (for recipe import)
npm run dev:all

# Or run separately:
npm run dev    # Frontend only (http://localhost:5173)
npm run proxy  # Proxy server only (http://localhost:3001)
```

### Production Build

```bash
npm run build
npm run preview
```

## Recipe Import Feature

The app can import recipes from popular cooking websites using a backend proxy server to bypass CORS restrictions.

### Setup

1. Copy environment configuration:
```bash
cp .env.example .env
```

2. Run with proxy server:
```bash
npm run dev:all
```

### Usage

1. Navigate to Recipe Library
2. Click "Import from URL"
3. Paste a recipe URL
4. Review imported data and fill in missing fields
5. Save to your library

### Supported Sites

- AllRecipes, Food Network, Serious Eats
- Bon Appétit, Epicurious, Simply Recipes
- Budget Bytes, Minimalist Baker, Pinch of Yum
- And 15+ more popular recipe sites

For detailed documentation, see [RECIPE_IMPORT.md](./RECIPE_IMPORT.md).

## Project Structure

```
dinner/
├── src/
│   ├── components/       # React components
│   │   ├── planner/     # Meal planning UI
│   │   ├── recipes/     # Recipe management
│   │   └── shopping/    # Shopping list
│   ├── hooks/           # Custom React hooks
│   ├── utils/           # Utility functions
│   │   └── recipeParser.ts  # Recipe import parser
│   └── types/           # TypeScript types
├── proxy-server.js      # Backend proxy for recipe imports
├── .env.example         # Environment configuration template
└── package.json
```

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS 4
- **State Management**: React hooks with localStorage persistence
- **Drag & Drop**: @dnd-kit
- **Backend**: Express.js (proxy server)

## Scripts

- `npm run dev` - Start Vite dev server
- `npm run proxy` - Start proxy server
- `npm run dev:all` - Start both servers concurrently
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Environment Variables

Create a `.env` file (copy from `.env.example`):

```env
# Frontend: Proxy server URL
VITE_PROXY_URL=http://localhost:3001

# Backend: Proxy server port
PROXY_PORT=3001

# Backend: Allowed frontend origin
ALLOWED_ORIGIN=http://localhost:5173
```

## Storage

The app uses browser localStorage for data persistence:
- `dinner_recipes` - Recipe library
- `dinner_meal_plans` - Meal plans
- `dinner_shopping_adjustments` - Shopping list state
- `dinner_pantry_staples` - Pantry items

## Deployment

### Frontend (Vercel/Netlify)

1. Build the app:
```bash
npm run build
```

2. Deploy the `dist` folder

3. Set environment variable:
```
VITE_PROXY_URL=https://your-proxy-server.com
```

### Proxy Server (Railway/Heroku)

1. Deploy `proxy-server.js`

2. Set environment variables:
```
PORT=8080
ALLOWED_ORIGIN=https://your-app.com
NODE_ENV=production
```

See [RECIPE_IMPORT.md](./RECIPE_IMPORT.md) for detailed deployment instructions.

## Contributing

This is a personal project, but feel free to fork and customize for your own use!

## License

MIT
