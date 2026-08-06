import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: { root: __dirname },
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-d58df7a0af594baf922fa7cb28ba1b40.r2.dev',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
