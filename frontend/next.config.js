/**** Next Config ****/
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  async rewrites() {
    return [
      { source: '/favicon.ico', destination: '/favicon.svg' },
    ]
  },
}
module.exports = nextConfig
