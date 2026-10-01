/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Type errors unna build aagakunda ignore chesthundi
    ignoreBuildErrors: true,
  },
  eslint: {
    // Lint errors ni ignore chesthundi
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;