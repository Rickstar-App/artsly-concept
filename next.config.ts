import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Next writes AGENTS.md/CLAUDE.md into the repo on every dev boot; this repo
  // manages its own agent guidance (DESIGN.md, README.md), so the generator is off.
  agentRules: false,
  images: {
    // §37.2 — every image is local. No remote patterns, deliberately: there is
    // nothing to hot-link and nothing that can 404 on demo day.
    formats: ['image/webp'],
  },
}

export default nextConfig
