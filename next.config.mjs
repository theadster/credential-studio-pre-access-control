/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Exclude test files from pages directory
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'].map(ext => ext),
  
  // Turbopack configuration (promoted from experimental in Next.js 16)
  turbopack: {
    resolveExtensions: ['.mdx', '.tsx', '.ts', '.jsx', '.js', '.json'],
    resolveAlias: {
      // Module aliases can be added here if needed
    },
  },
  
  // Enable file system caching for development with Turbopack
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },
  
  // Updated image configuration for Next.js 16
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
    localPatterns: [
      {
        pathname: '/assets/**',
        search: '',
      },
    ],
    maximumRedirects: 3,
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Webpack fallback configuration (optional - for compatibility)
  // Can be used with: npm run build:webpack
  webpack: (config, context) => {
    // Disable minification in development to work around webpack error
    if (!context.isServer && context.dev) {
      config.optimization.minimize = false;
    }
    
    // Exclude jsdom from client bundle (server-only)
    if (!context.isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      };
    }
    
    return config;
  },
  
  // Server-only packages configuration
  serverExternalPackages: ['jsdom']
};

export default nextConfig;
