#!/usr/bin/env node
/* eslint-disable */

import { run, Config } from '@oclif/core';

async function main() {
  // Skip binary check to avoid node path issues
  process.env.OCLIF_SKIP_BINARY_CHECK = '1';
  
  const config = await Config.load({ root: '.', bin: 'bo' });
  await config.load();
  await run(process.argv, config);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
