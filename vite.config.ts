import { defineConfig } from "vite";
import license from "rollup-plugin-license";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path";

export default defineConfig(({ mode }) => {
  const isProd = mode == "production";

  return {
    base: isProd ? "/line.script/" : "/",
    build: {
      rollupOptions: {
        plugins: [
          license({
            banner: {
              content: {
                file: path.join(__dirname, "LICENSE"),
              },
            },
          }),
          nodePolyfills(),
        ],
        output: {
          entryFileNames: "app.js",
        },
      },
      sourcemap: isProd ? true : "inline",
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src")
      },
    },
  };
});