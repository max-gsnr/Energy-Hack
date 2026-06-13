/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // gsap needs single mount
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://localhost:8088/api/:path*' },
    ];
  },
};
module.exports = nextConfig;
