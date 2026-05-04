// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  vite: {
    plugins: [
      nodePolyfills({
        include: ["buffer", "process", "util", "crypto"],
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
      }),
    ],
    server: {
      headers: {
        "Content-Security-Policy":
          "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://auth.privy.io https://*.privy.io blob:; script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://auth.privy.io https://*.privy.io blob:; script-src-attr 'unsafe-inline'; connect-src 'self' https://auth.privy.io wss://auth.privy.io https://*.privy.io https://*.privy.systems wss://*.privy.systems https://api.devnet.solana.com wss://api.devnet.solana.com https://explorer-api.walletconnect.com https://*.datadoghq.com; frame-src 'self' https://auth.privy.io https://*.privy.io; worker-src 'self' blob:; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com;",
      },
    },
    resolve: {
      alias: {
        "@solana/kit": "@solana/kit",
        "@solana-program/memo": "@solana-program/memo",
        "@solana-program/system": "@solana-program/system",
        "@solana-program/token": "@solana-program/token",
      },
    },
    optimizeDeps: {
      include: [
        "@solana/kit",
        "@solana-program/memo",
        "@solana-program/system",
        "@solana-program/token",
      ],
    },
    build: {
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 2000,
      minify: "esbuild", // faster than terser, less memory
      sourcemap: false, // disable sourcemaps for prod build to save memory
      target: "esnext", // modern target, less transformation needed
    },
  },
});
