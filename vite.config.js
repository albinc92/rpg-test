import { defineConfig } from 'vite';

export default defineConfig({
  // Root directory where index.html is located
  root: '.',
  
  // Public directory for static assets
  // publicDir: 'assets',
  
  // Server configuration
  server: {
    port: 3000,
    open: true, // Automatically open browser
    host: true  // Allow external access
  },
  
  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  },
  
  // Handle static assets
  assetsInclude: ['**/*.mp3', '**/*.wav', '**/*.ogg', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif']
});