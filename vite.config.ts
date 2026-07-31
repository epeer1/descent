import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import glsl from 'vite-plugin-glsl'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves project sites from /<repo>/, so every emitted asset
  // URL has to carry that prefix. Vite applies it to anything it processes —
  // which is why the fonts and poster live in src/ rather than public/.
  base: '/descent/',
  plugins: [
    react(),
    tailwindcss(),
    // Raw GLSL imports with `#include` chunk resolution.
    // Import shaders as: import frag from '@/shaders/thing.frag'
    glsl({
      include: [
        '**/*.glsl',
        '**/*.wgsl',
        '**/*.vert',
        '**/*.frag',
        '**/*.vs',
        '**/*.fs',
      ],
      // Chunk imports resolve from src/shaders, so `#include chunks/noise.glsl`
      // works from any shader regardless of its own depth.
      root: '/src/shaders/',
      defaultExtension: 'glsl',
      warnDuplicatedImports: true,
      removeDuplicatedImports: true,
      // Keep shaders readable in dev; strip them for production bundles.
      minify: process.env.NODE_ENV === 'production',
      watch: true,
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  build: {
    // three and gsap are large; split them out so a text-only page never pays
    // for WebGL it does not use. Rollup 5 dropped the object form of
    // manualChunks — it must be a function now.
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three'
          if (id.includes('/node_modules/gsap/')) return 'gsap'
          return undefined
        },
      },
    },
  },
})
