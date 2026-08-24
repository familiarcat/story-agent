/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
  },
  transpilePackages: ['@story-agent/markdown-renderer'],
};

module.exports = nextConfig;