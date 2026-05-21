import * as fs from 'fs';
import * as path from 'path';

export function loadEnv(files = ['.env', '.env.local']): void {
  const cwd = process.cwd();
  for (const file of files) {
    const envPath = path.join(cwd, file);
    try {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx <= 0) continue;
        const key = trimmed.slice(0, eqIdx);
        const value = trimmed.slice(eqIdx + 1);
        if (!process.env[key]) process.env[key] = value;
      }
    } catch (e: any) {
      if (e.code !== 'ENOENT') throw e;
    }
  }
}
