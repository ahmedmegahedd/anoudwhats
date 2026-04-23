/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@anoud-job/types'],
  experimental: {
    instrumentationHook: true,
    // Bundle heavy native/optional deps on the server instead of tracing them
    serverComponentsExternalPackages: ['pdf-parse', 'tesseract.js', 'xlsx'],
  },
};

module.exports = nextConfig;
