import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // FIX: Must perfectly match the capitalization and hyphens in the URL
  base: "/Cloud-Dial-Studio/", 
});
