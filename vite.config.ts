import { defineConfig } from "vite";
import license from "rollup-plugin-license";
import * as path from "node:path";

export default defineConfig(({ mode }) => {
  const isProd = mode == "production";

  return {
    base: isProd ? "/line.script/" : "/",
    css: {
      modules: {
        localsConvention: "camelCaseOnly",
      },
    },
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