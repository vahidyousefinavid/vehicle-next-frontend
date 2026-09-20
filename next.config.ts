import type { NextConfig } from 'next';
import { readFileSync } from 'node:fs';

/**
 * The build's identity, baked in here because this file runs once per build.
 *
 * `version` is the human number people quote to support; `buildId` is what
 * actually distinguishes two deploys of the same version, and it is what the
 * service worker is registered under. Without a changing id the worker script
 * is byte-identical on every deploy, the browser finds no difference, and the
 * worker — along with everything it has cached — never updates.
 */
const pkg = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string };
const d = new Date();
const p2 = (n: number) => String(n).padStart(2, '0');
const BUILD_ID =
  `${d.getUTCFullYear()}${p2(d.getUTCMonth() + 1)}${p2(d.getUTCDate())}-${p2(d.getUTCHours())}${p2(d.getUTCMinutes())}`;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_BUILD_ID: BUILD_ID,
  },
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
