// Stamp core.js and the paintings into every control file, so each file works on its own.
//   node tools/build.mjs          (run it after editing core.js or a file in art/)
//   node tools/build.mjs --check  (exits 1 if any file is out of date, and changes nothing)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const NAMES = ['launch', 'dial', 'checklist', 'lock', 'mode', 'alert', 'tabs', 'agent', 'loading', 'stepper', 'input'];
const TYPES = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4' };
const check = process.argv.includes('--check');
// every file in art/NAME/ goes into NAME.js under its own name, as a data URI
const layers = (name) => '{\n' + readdirSync(join(root, 'art', name)).sort().map((f) => `  '${basename(f, extname(f))}': 'data:${TYPES[extname(f)]};base64,${readFileSync(join(root, 'art', name, f)).toString('base64')}',`).join('\n') + '\n}';
export const core = readFileSync(join(root, 'core.js'), 'utf8').trim();

const between = (text, name, body, file) => {
  const re = new RegExp(`(// >>> ${name}[^\\n]*\\n)[\\s\\S]*?(// <<< ${name})`);
  if (!re.test(text)) throw new Error(`${file}: no ${name} markers`);
  return text.replace(re, (_, a, b) => a + body + '\n' + b);
};
let stale = 0;
const put = (file, next) => {
  let was = ''; try { was = readFileSync(file, 'utf8'); } catch {}
  if (next !== was) { stale++; if (!check) writeFileSync(file, next); console.log(`${check ? 'stale' : 'wrote'} ${file.slice(root.length + 1)} (${Math.round(next.length / 1024)} KB)`); }
};
if (import.meta.url === `file://${process.argv[1]}`) {
  for (const n of NAMES) {
    const file = join(root, n, n + '.js'), was = readFileSync(file, 'utf8');
    put(file, between(between(was, 'art', `const ART = ${layers(n)};`, file), 'cockpit core', core, file));
  }
  put(join(root, 'skills/cockpit-ui/core.js'), core + '\n');
  if (check && stale) process.exit(1);
}
