// Write every folder's README.md and index.html, the gallery, registry.json and llms.txt from tools/spec.mjs.
//   node tools/docs.mjs          (run it after editing tools/spec.mjs, and after tools/build.mjs, since file sizes are quoted)
//   node tools/docs.mjs --check  (exits 1 if anything is out of date, and changes nothing)
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPEC, REPO, SITE, AUTHOR, COMMON_LIMITS } from './spec.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'), check = process.argv.includes('--check');
let stale = 0;
const put = (rel, next) => {
  let was = ''; try { was = readFileSync(join(root, rel), 'utf8'); } catch {}
  if (next !== was) { stale++; if (!check) writeFileSync(join(root, rel), next); console.log(`${check ? 'stale' : 'wrote'} ${rel}`); }
};
const bytes = (id) => statSync(join(root, id, id + '.js')).size;
const size = (id) => (bytes(id) > 1.5e6 ? `${(bytes(id) / 1048576).toFixed(1)} MB` : `${Math.round(bytes(id) / 1024)} KB`);
const table = (head, rows) => `| ${head.join(' | ')} |\n|${head.map(() => '---').join('|')}|\n` + rows.map((r) => `| ${r.join(' | ')} |`).join('\n');
const COUNT = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'][SPEC.length];
const PAGE = `:root { --bg: #000; --ink: #e8ecf2; --dim: #8791a3; --gold: #ffc93a; --cyan: #5fe6ff; }
  * { box-sizing: border-box; }
  html { overflow-x: clip; background: var(--bg); }
  body { margin: 0; color: var(--ink); font: 14px/1.45 ui-monospace, "SF Mono", Menlo, Consolas, monospace; overflow-x: clip; }
  a { color: var(--cyan); } :focus-visible { outline: 2.5px solid #fff; outline-offset: 3px; }
  .pill { min-height: 32px; padding: 4px 13px; border: 2px solid #3a4558; border-radius: 6px; background: #121824; color: var(--ink); font: inherit; font-size: 12px; letter-spacing: .1em; text-transform: uppercase; text-decoration: none; cursor: pointer; }
  .pill:hover { border-color: var(--gold); } .pill:active { translate: 0 1px; }`;

for (const c of SPEC) {
  // ---- the folder's README
  put(`${c.id}/README.md`, `# ${c.name}

${c.intro.join('\n\n')}

One of ${COUNT} files in this repo. Same idea in each (an ordinary control as a piece of a giant-robot cockpit), different control.

## Run it

\`\`\`sh
python3 -m http.server 8000     # from the repo folder
# open http://localhost:8000/${c.id}/
\`\`\`

\`?embed=1\` hides the heading and the hint.

## Use it

\`${c.id}.js\` is the whole control: one file of about ${size(c.id)} with its paintings inside it, and no dependencies.

\`\`\`html
${c.use}
\`\`\`

\`\`\`js
${c.js}
\`\`\`

${c.attrs.length ? table(['attribute', 'what it sets', 'default'], c.attrs) + '\n\n' : ''}${c.notes.map((n) => `- ${n}`).join('\n')}
- **Attributes set where it starts.** After that, use the properties and methods above; changing an attribute later does nothing.
- **It has a line to say.** \`el.line\` is what it last said about what happened, and each new one fires \`cockpit:line\` with \`{ text }\`. Show it under the control or ignore it.

## What happens

${table(['you', 'it'], c.happens)}

With \`prefers-reduced-motion\` the shaking, the impact frames and the cut-in are skipped and the lettering holds still.

## Limits

${[...c.limits, ...COMMON_LIMITS].map((l) => `- ${l}`).join('\n')}
`);

  // ---- the folder's demo page
  put(`${c.id}/index.html`, `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Cockpit UI / ${c.name}</title>
<style>
  ${PAGE}
  body { min-height: 100vh; display: grid; place-items: center; }
  main { width: min(640px, 100vw - 30px); padding: 26px 0 46px; }
  .cap { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin: 0 2px 12px; font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--dim); }
  .cap h1 { margin: 0; color: var(--gold); font-size: 12.5px; letter-spacing: .12em; white-space: nowrap; } .cap span { text-align: right; }
  .stage { display: grid; justify-items: center; padding: 6% 0; }
  .said { margin: 14px 0 0; min-height: 40px; font-size: 12.5px; line-height: 19px; letter-spacing: .08em; text-transform: uppercase; color: var(--dim); text-align: center; }
  .hint { margin: 10px 0 0; color: var(--dim); font-size: 12.5px; text-align: center; }
  .embed body { place-items: start center; min-height: 0; } .embed .cap, .embed .hint { display: none; } .embed main { padding: 0 0 8px; } .embed .stage { padding: 4% 0; }
</style>
</head>
<body>
<main>
  <div class="cap"><h1>${c.name}</h1><span>${c.kind} / &lt;${c.tag}&gt;</span></div>
  <div class="stage">
    ${c.demo.html}
  </div>
  <p class="said" aria-hidden="true"></p>
  <p class="hint">${c.demo.hint}</p>
  <p class="hint back"><a href="../gallery/">All ${COUNT}</a> · <a href="https://github.com/${REPO}/blob/main/${c.id}/README.md">Docs</a></p>
</main>
<script src="${c.id}.js"></script>
<script>
// This page's own wiring. The control is all in ${c.id}.js.
// ?embed=1 hides the heading and the hints.
const Q = new URLSearchParams(location.search), el = document.getElementById('el'), said = document.querySelector('.said');
if (Q.get('embed') === '1') { document.documentElement.classList.add('embed'); document.querySelector('.back').hidden = true; }
const say = (t) => { said.textContent = t; };
el.addEventListener('cockpit:line', (e) => say(e.detail.text)); if (el.line) say(el.line);
</script>
</body>
</html>
`);
}

// ---- the gallery: every control live, with its install line and a prompt for a coding agent
const items = SPEC.map((c) => ({ id: c.id, name: c.name, tag: c.tag, kind: c.kind, html: c.demo.html.replace(' id="el"', ''), docs: c.docs, desc: c.desc }));
put('gallery/index.html', `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Cockpit UI</title>
<meta name="description" content="${COUNT[0].toUpperCase() + COUNT.slice(1)} ordinary UI controls as the cockpit of a 1990s giant-robot anime. Painted pieces, drawn screens, anime reactions. Each is a single file with no dependencies.">
<meta property="og:title" content="Cockpit UI">
<meta property="og:description" content="${COUNT[0].toUpperCase() + COUNT.slice(1)} ordinary UI controls as the cockpit of a 1990s giant-robot anime.">
<meta property="og:image" content="title.jpg">
<style>
  ${PAGE}
  .wrap { max-width: 1500px; margin: 0 auto; padding: 26px 16px 70px; }
  header { max-width: 760px; margin: 0 auto; text-align: center; }
  header img { display: block; width: 100%; height: auto; aspect-ratio: 1600 / 700; border-radius: 10px; }
  h1 { margin: 18px 0 0; font-size: 18px; letter-spacing: .16em; text-transform: uppercase; color: var(--gold); }
  .lede { margin: 8px auto 0; max-width: 600px; color: var(--dim); font-size: 13.5px; }
  .links { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin: 14px 0 0; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 400px), 1fr)); gap: 44px 22px; margin-top: 44px; align-items: start; }
  .item { min-width: 0; }
  .cap { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin: 0 2px 12px; font-size: 10.5px; letter-spacing: .14em; text-transform: uppercase; color: var(--dim); }
  .cap h2 { margin: 0; color: var(--gold); font-size: 12.5px; letter-spacing: .12em; white-space: nowrap; } .cap span { text-align: right; }
  .stage { display: grid; justify-items: center; }
  .said { margin: 12px 0 0; min-height: 38px; font-size: 11.5px; line-height: 18px; letter-spacing: .08em; text-transform: uppercase; color: var(--dim); text-align: center; }
  .acts { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin-top: 6px; }
  .note { margin: 50px auto 0; max-width: 640px; text-align: center; color: var(--dim); font-size: 12.5px; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <img src="title.jpg" width="1600" height="700" alt="Cockpit UI: five of the controls side by side on black, the launch button, the output gain dial, the agent hologram, the alert panel and the safety lock.">
    <h1>Cockpit UI</h1>
    <p class="lede">${COUNT[0].toUpperCase() + COUNT.slice(1)} ordinary controls as the cockpit of a 1990s giant-robot anime. The pieces are paintings, the screens are drawn live, and every one reacts when you use it. Each is a single file with no dependencies.</p>
    <p class="links">
      <a class="pill" href="https://github.com/${REPO}" target="_blank" rel="noopener">The repo on GitHub</a>
      <a class="pill" href="https://x.com/crtvTeknologist" target="_blank" rel="noopener">@crtvTeknologist on X</a>
    </p>
  </header>
  <main class="grid" id="grid"></main>
  <p class="note">Everything here is live: use the controls. They are drawn for a dark page. The shaking, impact frames and cut-ins are skipped for <code>prefers-reduced-motion</code>.</p>
  <p class="sr" aria-live="polite" id="copied"></p>
</div>
${SPEC.map((c) => `<script src="../${c.id}/${c.id}.js"></script>`).join('\n')}
<script>
// The gallery: every control live on one page, with its install line and a prompt that hands a coding agent the real file.
const REPO = '${REPO}', SITE = '${SITE}';
const ITEMS = ${JSON.stringify(items, null, 2)};
const grid = document.getElementById('grid'), copied = document.getElementById('copied');
const copy = async (btn, text) => { try { await navigator.clipboard.writeText(text); } catch { const t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); } const was = btn.textContent; btn.textContent = 'Copied'; copied.textContent = 'Copied to the clipboard'; setTimeout(() => { btn.textContent = was; copied.textContent = ''; }, 1400); };
for (const c of ITEMS) {
  const s = document.createElement('section'); s.className = 'item'; s.id = c.id;
  s.innerHTML = '<div class="cap"><h2></h2><span></span></div><div class="stage">' + c.html + '</div><p class="said" aria-hidden="true"></p><div class="acts"><button class="pill" type="button" data-a="install">Copy install</button><button class="pill" type="button" data-a="prompt">Copy a prompt</button><a class="pill" href="../' + c.id + '/">Open</a></div>';
  s.querySelector('h2').textContent = c.name; s.querySelector('.cap span').textContent = c.kind;
  grid.appendChild(s);
  const el = s.querySelector(c.tag), said = s.querySelector('.said');
  el.addEventListener('cockpit:line', (e) => { said.textContent = e.detail.text; }); if (el.line) said.textContent = el.line;
  const install = 'npx shadcn add ' + REPO + '/' + c.id;
  const prompt = 'Add the Cockpit UI "' + c.name + '" control to this project. It is one plain script with no dependencies that registers the custom element <' + c.tag + '>: ' + c.desc + '\\n\\n1. Download ' + SITE + '/' + c.id + '/' + c.id + '.js into the folder this project serves static files from (for example public/cockpit-ui/' + c.id + '.js), or run: ' + install + '\\n2. Load it with a plain script tag, not as a module, and do not edit, split or re-bundle the file: its paintings are inside it as data.\\n3. In the page, ' + c.docs + '\\n4. Put it on a dark background; it is drawn to float on black. It is 640 pixels wide at most and scales down with its container.\\n\\nFull notes: https://github.com/' + REPO + '/blob/main/' + c.id + '/README.md';
  s.querySelector('[data-a=install]').addEventListener('click', (e) => copy(e.currentTarget, install));
  s.querySelector('[data-a=prompt]').addEventListener('click', (e) => copy(e.currentTarget, prompt));
}
</script>
</body>
</html>
`);

// ---- registry.json, for `npx shadcn add finktheartist/cockpit-ui/NAME`
put('registry.json', JSON.stringify({
  $schema: 'https://ui.shadcn.com/schema/registry.json', name: 'cockpit-ui', homepage: SITE,
  items: SPEC.map((c) => ({
    name: c.id, type: 'registry:file', title: `Cockpit UI ${c.name}`,
    description: `${c.desc} One file of about ${size(c.id)} with its paintings inside it, no dependencies, defines <${c.tag}>.`,
    author: AUTHOR, categories: c.categories,
    files: [{ path: `${c.id}/${c.id}.js`, type: 'registry:file', target: `~/public/cockpit-ui/${c.id}.js` }],
    docs: `Cockpit UI ${c.name} is a plain script that registers a custom element. Load /cockpit-ui/${c.id}.js with a script tag (not a module), ${c.docs} Put it on a dark background. More: ${SITE}`,
  })),
}, null, 2) + '\n');

// ---- llms.txt
put('llms.txt', `# Cockpit UI

> ${COUNT[0].toUpperCase() + COUNT.slice(1)} ordinary UI controls as the cockpit of a 1990s giant-robot anime: painted pieces on painted backing sheets, screens drawn live, and anime reactions (sound-effect lettering, impact frames, cut-in panels) when you use them. Each is one plain script that registers a custom element, with its paintings inside it: no dependencies, no build step, no other files to fetch. MIT licensed. The robot, the pilot and the crew are original designs.

Live gallery: ${SITE}
Source: https://github.com/${REPO}

## Drop-in controls

Each is one plain script that registers a custom element. Load it with a script tag, not as a module. Do not rewrite or split the file: the paintings are inside it as data. Each file carries a copy of the shared core; the first one loaded sets window.Cockpit and the rest reuse it, so any mix shares one clock.

${SPEC.map((c) => `- [${c.name}](${SITE}/${c.id}/${c.id}.js) (${c.kind}, about ${size(c.id)}): ${c.desc} \`<${c.tag}>\`: ${c.docs.replace(/^then use /, 'Use ')} [Docs](https://github.com/${REPO}/blob/main/${c.id}/README.md)`).join('\n')}

Install any one with the shadcn CLI: \`npx shadcn add ${REPO}/NAME\`, where NAME is ${SPEC.map((c) => c.id).join(', ')}. The file lands in \`public/cockpit-ui/\`.

Each is a painting 640 pixels wide at most with real controls over it; in a narrower container it scales. They are drawn for a dark page. Attributes set the starting state; use properties and methods after that. Each says a line about what just happened: el.line, and a cockpit:line event with { text }. Shaking, impact frames and cut-ins are skipped for prefers-reduced-motion.

## The skill

- [cockpit-ui skill](${SITE}/skills/cockpit-ui/SKILL.md): the workflow and rules these were made by. Install with \`npx skills add ${REPO}\`.
- [core.js](${SITE}/skills/cockpit-ui/core.js): the shared core (the clock, the custom-element base, lettering, impact frames, the cut-in, drawn screens).
- [starter.html](${SITE}/skills/cockpit-ui/starter.html): the smallest whole example, a mute switch.
- [look.mjs](${SITE}/skills/cockpit-ui/look.mjs): photographs a page at chosen moments after an action and saves the frames side by side.

## How the art was made

- [making-of/README.md](${SITE}/making-of/README.md): how the look was found, how the pieces were painted, cut out and mounted, and how the hologram was made to turn.
- [making-of/prompts.md](${SITE}/making-of/prompts.md): every image and video prompt and setting, in order.
`);
if (check && stale) process.exit(1);
