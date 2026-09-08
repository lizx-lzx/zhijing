import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/postcss";

export default defineConfig({
  base: "./",
  css: { postcss: { plugins: [tailwindcss()] } },
  build: {
    outDir: "../../public/demo/openmaic-20260908",
    emptyOutDir: true,
  },
});
