import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `--mode single` inlines all JS/CSS into one HTML file for a portable preview build.
export default defineConfig(({ mode }) => ({
  plugins: mode === 'single' ? [react(), viteSingleFile()] : [react()],
  build: { outDir: mode === 'single' ? 'dist-single' : 'dist' },
  // Vercel's Supabase integration names its public values NEXT_PUBLIC_SUPABASE_*. Only
  // public values use that prefix; the service role and secret keys never reach the bundle.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_SUPABASE_'],
  test: { globals: true, environment: 'node' },
}));
