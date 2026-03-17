#!/usr/bin/env node

const { spawn } = require('child_process');
const { join } = require('path');

const rootDir = join(__dirname, '..');
const runScript = join(__dirname, 'run.mjs');

const child = spawn(process.execPath, [runScript, ...process.argv.slice(2)], {
  cwd: rootDir,
  stdio: 'inherit',
  env: {
    ...process.env,
    OCLIF_SKIP_BINARY_CHECK: '1',
    BO_CLI_ORIGINAL_CWD: process.cwd()
  }
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
