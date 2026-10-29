/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3'],
  poweredByHeader: false,
  devIndicators: false,
};

export default nextConfig;
