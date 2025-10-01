# RPG Test Game

A top-down RPG game built with vanilla JavaScript and Vite.

## Development

Start the development server with hot reload:

```bash
npm run dev
```

This will start Vite development server at `http://localhost:3000` with:
- Hot module replacement
- Automatic browser refresh on file changes
- Fast startup and rebuilds

## Build for Production

Build the game for deployment:

```bash
npm run build
```

This creates a `dist/` folder with optimized static files ready for deployment.

## Preview Production Build

Test the production build locally:

```bash
npm run preview
```

## Deployment

### Vercel
1. Connect your GitHub repo to Vercel
2. Deploy automatically - Vite projects work out of the box

### Netlify
1. Connect your GitHub repo to Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`

### Other Static Hosts
Upload the contents of the `dist/` folder to any static hosting service.

## Project Structure

- `src/` - Game source code
- `assets/` - Game assets (audio, images, maps)
- `index.html` - Main HTML file
- `vite.config.js` - Vite configuration