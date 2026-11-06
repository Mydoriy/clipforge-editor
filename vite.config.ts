import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@xenova') || id.includes('transformers') || id.includes('onnxruntime')) {
            return 'transformers';
          }
          if (id.includes('@ffmpeg')) {
            return 'ffmpeg';
          }
          if (id.includes('konva') || id.includes('react-konva')) {
            return 'konva';
          }
          if (id.includes('lucide-react')) {
            return 'lucide-icons';
          }
          if (id.includes('mp4-muxer')) {
            return 'mp4-muxer';
          }
        }
      }
    }
  }
});
