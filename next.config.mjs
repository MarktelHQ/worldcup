/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // don't serve stale cached pages when navigating between tabs — always fetch fresh
    staleTimes: { dynamic: 0, static: 0 },
  },
};

export default nextConfig;
