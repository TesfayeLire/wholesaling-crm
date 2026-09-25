import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.app.github.dev"],
  experimental: {
    // Optional for restricted build hosts; Codespaces keeps the default process workers.
    useTypeScriptCli: process.env.CRM_BUILD_WORKER_THREADS === "1" ? false : undefined,
    workerThreads: process.env.CRM_BUILD_WORKER_THREADS === "1",
    serverActions: {
      allowedOrigins: ["*.app.github.dev", "localhost:3000"],
    },
  },
};

export default nextConfig;
