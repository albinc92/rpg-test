import { defineConfig } from 'vite';
import { execSync } from 'child_process';

// Get git commit SHA at build time
let gitCommitSha = 'dev';
try {
  gitCommitSha = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  console.warn('Could not get git commit SHA:', e.message);
}

export default defineConfig({
  // Base public path when served in development or production.
  // Setting this to './' allows the app to run from a file system path (Electron).
  base: './',

  // Root directory where index.html is located
  root: '.',
  
  // Public directory for static assets
  // publicDir: 'assets',
  
  // Define global constants
  define: {
    '__GIT_COMMIT_SHA__': JSON.stringify(gitCommitSha)
  },
  
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