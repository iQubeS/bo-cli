#!/usr/bin/env node
/* eslint-disable */

// Workaround for oclif node path bug on Unix systems
if (process.platform !== 'win32') {
  process.execPath = '/usr/bin/node';
  process.argv[0] = '/usr/bin/node';
}

import { run, Config } from '@oclif/core';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const root = join(__dirname, '..');
  const config = await Config.load({ root, bin: 'bo' });
  await config.load();
  await run(process.argv.slice(2), config);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
