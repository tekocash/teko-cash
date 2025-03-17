/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: true,
  },
 /* images: {
    domains: ['tekocash.com'], // Ajusta según tus necesidades
  }, */
  // Si necesitas redirecciones
  async redirects() {
    return [
      // Define tus redirecciones aquí si las necesitas
    ];
  },
  // Si usas algún módulo que requiera transpilación especial
  transpilePackages: [],
};

module.exports = nextConfig;