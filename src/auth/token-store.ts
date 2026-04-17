import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  chmodSync,
  unlinkSync,
  readdirSync,
  rmSync,
} from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import type { ServerAuthState } from './types.js';

const AUTH_DIR = join(homedir(), '.bo-cli', 'auth');

function pathFor(env: string, server: string): string {
  return join(AUTH_DIR, env, `${server}.json`);
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function loadAuthState(env: string, server: string): ServerAuthState | null {
  const p = pathFor(env, server);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as ServerAuthState;
  } catch {
    return null;
  }
}

export function saveAuthState(env: string, server: string, state: ServerAuthState): void {
  const dir = join(AUTH_DIR, env);
  ensureDir(dir);
  const p = pathFor(env, server);
  writeFileSync(p, JSON.stringify(state, null, 2));
  try {
    chmodSync(p, 0o600);
  } catch {
    // Unix-only; no-op on Windows.
  }
}

export function deleteAuthState(env: string, server: string): void {
  const p = pathFor(env, server);
  if (existsSync(p)) {
    try {
      unlinkSync(p);
    } catch {
      // ignore
    }
  }
}

export function listAuthServers(env: string): string[] {
  const dir = join(AUTH_DIR, env);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace(/\.json$/, ''));
}

export function clearEnvAuth(env: string): void {
  const dir = join(AUTH_DIR, env);
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function authDirFor(env: string): string {
  return join(AUTH_DIR, env);
}
