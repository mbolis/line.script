import * as path from "node:path";
import license from "rollup-plugin-license";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => {
  const isProd = mode == "production";

  return {
    base: isProd ? "/line.script/" : "/",
    build: {
      ourDir: ".",
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
  };
});