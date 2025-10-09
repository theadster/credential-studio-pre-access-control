/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ["assets.co.dev", "images.unsplash.com"],
  },
  // Temporarily disable minification to work around Next.js 15 webpack issue
  swcMinify: false,
  webpack: (config, context) => {
    // Disable minification to work around webpack error
    config.optimization.minimize = false;
    return config;
  }
};

export default nextConfig;
