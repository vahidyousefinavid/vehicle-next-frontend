import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async rewrites() {
    const apiBase = process.env.DOMAIN_API || 'http://localhost:3002';
    const voiceAgentBase = process.env.VOICE_AGENT_URL || 'http://localhost:3010';
    return [
      { source: '/api/:path*', destination: `${apiBase}/:path*` },
      { source: '/voice-agent/:path*', destination: `${voiceAgentBase}/api/voice-agent/:path*` },
    ];
  },
};

export default nextConfig;
