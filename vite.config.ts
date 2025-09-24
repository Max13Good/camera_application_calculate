import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Allow setting base path for GitHub Pages or similar CDNs
  // Example: BASE_PATH=/camera_application_calculate/
  base: process.env.BASE_PATH || "/",
});
