import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Old address of the Cameroun children's jersey, built from its product name.
      { source: "/maillots/fourteen-enfant-disponible-3-10-ans-troisieme", destination: "/maillots/cameroun-enfant-3-10-ans", permanent: true }
    ];
  }
};

export default nextConfig;
