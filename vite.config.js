import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: "all",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
    extensions: [".mjs", ".js", ".jsx", ".ts", ".tsx", ".json"],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        ".js": "jsx",
      },
    },
  },
  esbuild: {
    // Strip console.log and debugger statements in production
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - separate large dependencies
          'vendor-react': ['react', 'react-dom', 'react-router'],
          'vendor-radix': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-popover',
            '@radix-ui/react-progress',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toggle',
            '@radix-ui/react-tooltip',
          ],
          'vendor-editor': [
            '@tiptap/react',
            '@tiptap/starter-kit',
            '@tiptap/extension-color',
            '@tiptap/extension-highlight',
            '@tiptap/extension-link',
            '@tiptap/extension-text-style',
            '@tiptap/extension-underline',
          ],
          'vendor-charts': ['recharts'],
          'vendor-animation': ['framer-motion'],
          'vendor-utils': ['date-fns', 'clsx', 'class-variance-authority', 'tailwind-merge'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-dnd': ['@hello-pangea/dnd'],
        },
      },
    },
    // Increase the chunk size warning limit
    chunkSizeWarningLimit: 600,
  },
}));
