/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    domains: ["assets.co.dev", "images.unsplash.com"],
  },
  webpack: (config, context) => {
    // Disable minification in development to work around webpack error
    if (!context.isServer && context.dev) {
      config.optimization.minimize = false;
    }
    return config;
  }
};

export default nextConfig;
