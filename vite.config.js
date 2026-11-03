import base44 from "@base44/vite-plugin"
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Stamps every build with an id and a tiny /version.json so open devices can ask
// "has a new build shipped?" without downloading the app again. The query string
// the client adds also defeats any shared caches, since the file itself is small
// and must never be served stale.
function appVersionPlugin() {
  const buildId = Date.now().toString(36);
  const body = (entry) => JSON.stringify({ version: buildId, entry: entry || null });

  return {
    name: "encore-app-version",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if ((req.url || "").split("?")[0] !== "/version.json") return next();
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.setHeader("Cache-Control", "no-store, max-age=0");
        res.end(body(null));
      });
    },
    transformIndexHtml(html) {
      return html.replace(/%APP_VERSION%/g, buildId);
    },
    generateBundle(_options, bundle) {
      const entry = Object.values(bundle).find(chunk => chunk.type === "chunk" && chunk.isEntry);
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: body(entry ? `/${entry.fileName}` : null),
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    base44({
      // Support for legacy code that imports the base44 SDK with @/integrations, @/entities, etc.
      // can be removed if the code has been updated to use the new SDK imports from @base44/sdk
      legacySDKImports: process.env.BASE44_LEGACY_SDK_IMPORTS === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      visualEditAgent: true
    }),
    appVersionPlugin(),
    react(),
  ]
});