import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

/**
 * Copy shared map assets (styles + self-hosted fonts) from assets/ into this
 * app's public/ so they are served at root-relative URLs in dev and production.
 */
function copyMapAssetsPlugin() {
  return {
    name: 'copy-map-assets',
    buildStart() {
      const assetsRoot = path.resolve(__dirname, '../../assets');
      const publicRoot = path.resolve(__dirname, 'public');

      // Shared style JSONs
      for (const file of ['map-style-light.json', 'map-style-dark.json']) {
        const src = path.join(assetsRoot, file);
        const dest = path.join(publicRoot, file);
        if (!fs.existsSync(src)) continue;
        fs.mkdirSync(publicRoot, { recursive: true });
        fs.copyFileSync(src, dest);
      }

      // Self-hosted fonts: /fonts/{fontstack}/{range}.pbf
      const fontsSrc = path.join(assetsRoot, 'fonts');
      const fontsDest = path.join(publicRoot, 'fonts');
      if (!fs.existsSync(fontsSrc)) {
        this.warn(`Shared fonts directory not found: ${fontsSrc}`);
        return;
      }
      fs.mkdirSync(fontsDest, { recursive: true });
      for (const entry of fs.readdirSync(fontsSrc, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const src = path.join(fontsSrc, entry.name);
        const dest = path.join(fontsDest, entry.name);
        const srcStat = fs.statSync(src);
        let needsCopy = true;
        if (fs.existsSync(dest)) {
          const destStat = fs.statSync(dest);
          // Only copy if the source directory is newer than the existing copy.
          needsCopy = srcStat.mtimeMs > destStat.mtimeMs;
        }
        if (needsCopy) {
          fs.rmSync(dest, { recursive: true, force: true });
          fs.cpSync(src, dest, { recursive: true, preserveTimestamps: true });
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyMapAssetsPlugin()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared'),
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
