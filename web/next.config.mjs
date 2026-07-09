/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile the shared @fleetmaster/shared workspace package
  transpilePackages: ['@fleetmaster/shared'],

  // Disable strict mode for Socket.io compatibility in dev
  reactStrictMode: false,

  // Allow images from any origin (for S3 signed URLs)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },

  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
};

export default nextConfig;
