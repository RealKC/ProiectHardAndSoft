import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { quasar, transformAssetUrls } from "@quasar/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue({
      template: { transformAssetUrls },
    }),

    // @quasar/plugin-vite options list:
    // https://github.com/quasarframework/quasar/blob/dev/vite-plugin/index.d.ts
    quasar({
      sassVariables: "src/css/quasar-variables.sass",
    }),
  ],

  server: {
    port: 22269,
    host: "0.0.0.0",
    strictPort: true,
  },

  preview: {
    port: 22269,
    host: "0.0.0.0",
    strictPort: true,
  },
});
