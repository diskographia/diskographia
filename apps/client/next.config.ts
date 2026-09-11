import { join } from 'node:path';

import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@diskographia/shared'],
  agentRules: false,
  output: 'standalone',
  outputFileTracingRoot: join(import.meta.dirname, '../..'),
};

export default config;
