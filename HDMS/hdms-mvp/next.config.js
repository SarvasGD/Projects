/** @type {import('next').NextConfig} */
const nextConfig = {
reactStrictMode: true,
experimental: { serverComponentsExternalPackages: ['deckstrings'] }
};
module.exports = nextConfig;