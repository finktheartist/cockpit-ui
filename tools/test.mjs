// node tools/test.mjs [URL]   uses every control in the gallery with real touch and key events at phone width, checks the
// events they fire, their form values and sideways scroll, and exits 1 on a failure. Needs Chrome or Chromium (CHROME=... if it is
// somewhere unusual) and the repo being served: python3 -m http.server 8000, then the default URL works.
import { spawn } from 'node:child_process';
import { rmSync, mkdtempSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const URL_ = process.argv[2] || 'http://localhost:8000/gallery/';
const PORT = await new Promise((res) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const PROFILE = mkdtempSync(join(tmpdir(), 'ck-'));
const chrome = spawn(process.env.CHROME || 'chromium', ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) { try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json(); if (Array.isArray(targets) && targets.some((t) => t.type === 'page')) break; } catch {} await sleep(200); }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map(); const logs = [];
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } if (m.method === 'Runtime.exceptionThrown') logs.push('EXC ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text)); });
const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pending.set(i, (m) => (m.error ? rej(new Error(`${method}: ${m.error.message}`)) : res(m.result))); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true }); if (r.exceptionDetails) logs.push('EVAL ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text) + ' in ' + expr.slice(0, 80)); return r.result.value; };
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setTouchEmulationEnabled', { enabled: true });
await send('Page.enable'); await send('Page.navigate', { url: URL_ }); await sleep(4000);
// E(tag) is the element; S(tag, sel) is something inside its shadow root
const E = (tag) => `document.querySelector('cockpit-${tag}')`, S = (tag, sel) => `${E(tag)}.shadowRoot.querySelector(${JSON.stringify(sel)})`;
const at = async (expr, fx = 0.5, fy = 0.5) => JSON.parse(await ev(`(() => { const e = ${expr}; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return JSON.stringify([b.left + b.width * ${fx}, b.top + b.height * ${fy}]); })()`));
const touch = (type, x, y) => send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
const tap = async (tag, sel) => { const [x, y] = await at(S(tag, sel)); await sleep(200); await touch('touchStart', x, y); await touch('touchEnd', x, y); await sleep(120); };
const key = async (k, code) => { const text = k === 'Enter' ? { text: '\r' } : k === ' ' ? { text: ' ' } : {}; await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: code, ...text }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: code }); await sleep(60); };
const focus = (tag, sel) => ev(`${S(tag, sel)}.focus()`);
const prop = (tag, p) => ev(`${E(tag)}.${p}`), line = (tag) => prop(tag, 'line'), cut = (tag) => ev(`${S(tag, '.cutin')}.classList.contains('go')`);
// count the events each element fires, so a check can ask whether change really reached the page
await ev(`window.__n = {}; for (const t of ['input', 'change', 'cockpit:launch', 'cockpit:ack', 'cockpit:enter', 'cockpit:done', 'cockpit:state', 'cockpit:line']) document.addEventListener(t, (e) => { const k = e.target.localName.slice(8) + ' ' + t; __n[k] = (__n[k] || 0) + 1; })`);
const fired = (k) => ev(`__n[${JSON.stringify(k)}] || 0`);
// put every value-bearing control in one form, to read what a form would send
await ev(`(() => { const f = document.createElement('form'); f.id = 'f'; document.body.appendChild(f); for (const t of ['dial', 'checklist', 'lock', 'mode', 'stepper', 'tabs', 'input']) { const e = ${'document.querySelector'}('cockpit-' + t); e.setAttribute('name', t); e.setAttribute('form', 'f'); } })()`);
const formValue = (n) => ev(`new FormData(document.getElementById('f')).get(${JSON.stringify(n)})`);
let fails = 0;
const check = (name, ok, got) => { if (!ok) fails++; console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${got !== undefined ? `  ->  ${got}` : ''}`); };

check('all eleven are defined and built', (await ev(`[...document.querySelectorAll('.item .stage > *')].filter((e) => e.shadowRoot && e.piece).length`)) === 11, await ev(`document.querySelectorAll('.item .stage > *').length`));

// dial: a real drag round it, then keys
{ const [cx, cy] = await at(S('dial', '.knob')); const r = 22, pt = (d) => [cx + Math.cos(d * Math.PI / 180) * r, cy + Math.sin(d * Math.PI / 180) * r];
  await touch('touchStart', ...pt(160)); for (let d = 170; d <= 270; d += 10) { await touch('touchMove', ...pt(d)); await sleep(20); } await touch('touchEnd'); await sleep(300);
  check('dial: a drag round it turns it up, with input and change', (await prop('dial', 'value')) > 55 && (await fired('dial input')) > 3 && (await fired('dial change')) >= 1, `${await prop('dial', 'value')} / ${await fired('dial input')} input, ${await fired('dial change')} change`);
  await focus('dial', '.knob'); await key('End', 35); await sleep(900);
  check('dial: End goes to 100, with the cut-in', (await prop('dial', 'value')) === 100 && (await cut('dial')) && /^Full output/.test(await line('dial')), await line('dial'));
  check('dial: its form value follows', (await formValue('dial')) === '100', await formValue('dial')); }

// checklist
await tap('checklist', '.row:nth-of-type(1)'); await tap('checklist', '.row:nth-of-type(3)');
check('checklist: two taps tick two rows', (await prop('checklist', 'value')) === '1010' && (await formValue('checklist')) === '1010' && (await fired('checklist change')) === 2, `${await prop('checklist', 'value')} / form ${await formValue('checklist')}`);
await focus('checklist', '.row:nth-of-type(2)'); await key(' ', 32); await tap('checklist', '.row:nth-of-type(4)'); await sleep(800);
check('checklist: all four is complete, with the cut-in', (await prop('checklist', 'complete')) === true && (await cut('checklist')), await line('checklist'));

// lock
await tap('lock', '.sw'); await sleep(150);
check('lock: a tap releases it and fires change', (await prop('lock', 'checked')) === true && (await fired('lock change')) === 1 && (await formValue('lock')) === 'on', `${await prop('lock', 'checked')} / form ${await formValue('lock')}`);
await sleep(1500); check('lock: the fourth clamp sets off the cut-in', (await cut('lock')) && /^Released/.test(await line('lock')), await line('lock'));
await focus('lock', '.sw'); await key(' ', 32); await sleep(200);
check('lock: Space locks it again and it leaves the form', (await prop('lock', 'checked')) === false && (await formValue('lock')) === null, `${await prop('lock', 'checked')} / form ${await formValue('lock')}`);

// mode
await tap('mode', '.key:nth-of-type(3)');
check('mode: a tap chooses snipe', (await prop('mode', 'value')) === 'snipe' && (await formValue('mode')) === 'snipe' && (await fired('mode change')) === 1, await prop('mode', 'value'));
await key('ArrowLeft', 37); await sleep(800);
check('mode: arrow left chooses combat, with the cut-in', (await prop('mode', 'value')) === 'combat' && (await cut('mode')), await line('mode'));

// stepper
await tap('stepper', '.more');
check('stepper: plus adds thirty seconds', (await prop('stepper', 'value')) === 150 && (await formValue('stepper')) === '150' && (await fired('stepper change')) >= 1, await prop('stepper', 'value'));
await focus('stepper', '.spin'); await key('End', 35); await sleep(800);
check('stepper: End goes to five minutes, with the cut-in', (await prop('stepper', 'value')) === 300 && (await cut('stepper')), await line('stepper'));
await key('Home', 36); await sleep(200); check('stepper: Home goes to thirty seconds', (await prop('stepper', 'value')) === 30, await prop('stepper', 'value'));

// alert
await tap('alert', '.ack'); await sleep(200);
check('alert: acknowledging fires cockpit:ack with the level that was showing', (await fired('alert cockpit:ack')) === 1 && (await prop('alert', 'level')) === 'caution', await prop('alert', 'level'));
await ev(`${E('alert')}.show('warning', 'Disk almost full')`); await sleep(800);
check('alert: show() puts up a warning with its own message and the cut-in', (await prop('alert', 'level')) === 'warning' && (await cut('alert')) && /DISK ALMOST FULL/i.test(await ev(`${S('alert', '.ack')}.getAttribute('aria-label')`)) && (await fired('alert cockpit:ack')) === 1, await ev(`${S('alert', '.ack')}.getAttribute('aria-label')`));

// tabs
await tap('tabs', '#tab-1');
check('tabs: a tap changes tab', (await prop('tabs', 'value')) === 'sub' && (await formValue('tabs')) === 'sub' && (await fired('tabs change')) === 1, await prop('tabs', 'value'));
await key('ArrowRight', 39); await sleep(2100);
check('tabs: arrow right goes to rear, and the contact turns up', (await prop('tabs', 'value')) === 'rear' && (await cut('tabs')) && /^Contact/.test(await line('tabs')), await line('tabs'));

// input
{ const [x, y] = await at(S('input', 'input')); await touch('touchStart', x, y); await touch('touchEnd', x, y); await sleep(200); await send('Input.insertText', { text: 'raven 7!' }); await sleep(250);
  check('input: typing is upper-cased, filtered and counted', (await prop('input', 'value')) === 'RAVEN 7' && (await ev(`${S('input', '.count')}.textContent`)) === '07' && (await formValue('input')) === 'RAVEN 7', `${await prop('input', 'value')} / form ${await formValue('input')}`);
  await key('Enter', 13); await sleep(800);
  check('input: Enter registers it, with cockpit:enter and the cut-in', (await fired('input cockpit:enter')) === 1 && (await cut('input')) && /^Registered\. RAVEN 7/.test(await line('input')), await line('input')); }

// launch: the guard, a short hold, then a full hold
await tap('launch', '.guard'); check('launch: a tap lifts the guard', (await prop('launch', 'state')) === 'armed', await prop('launch', 'state'));
{ const [x, y] = await at(S('launch', '.fire')); await touch('touchStart', x, y); await sleep(700); await touch('touchEnd', x, y); await sleep(600);
  check('launch: letting go early does not launch', (await prop('launch', 'state')) === 'armed' && (await fired('launch cockpit:launch')) === 0, await line('launch'));
  await touch('touchStart', x, y); await sleep(2800); await touch('touchEnd', x, y); await sleep(4600);
  check('launch: holding to the end launches and fires cockpit:launch once', (await prop('launch', 'state')) === 'launched' && (await fired('launch cockpit:launch')) === 1, await line('launch')); }
await ev(`${E('launch')}.reset()`); check('launch: reset() puts the guard back', (await prop('launch', 'state')) === 'safe', await prop('launch', 'state'));

// loading: the gallery's runs by itself; feed a second one by hand
await ev(`(() => { const e = document.createElement('cockpit-loading'); e.id = 'fed'; document.body.appendChild(e); })()`); await sleep(400);
check('loading: without demo it waits at zero', (await ev(`document.getElementById('fed').value`)) === 0, await ev(`document.getElementById('fed').value`));
await ev(`document.getElementById('fed').set(0.5)`); await sleep(300); check('loading: set(0.5) reads fifty', (await ev(`document.getElementById('fed').value`)) === 50, await ev(`document.getElementById('fed').value`));
await ev(`document.getElementById('fed').set(1)`); await sleep(800);
check('loading: set(1) finishes, with cockpit:done and the cut-in', (await ev(`document.getElementById('fed').value`)) === 100 && (await fired('loading cockpit:done')) >= 1 && (await ev(`document.getElementById('fed').shadowRoot.querySelector('.cutin').classList.contains('go')`)), await ev(`document.getElementById('fed').line`));

// agent
check('agent: it starts on standby', (await prop('agent', 'state')) === 'standby' && /^Standing by/.test(await line('agent')), await line('agent'));
await tap('agent', '.next'); await sleep(200); check('agent: the button steps to thinking', (await prop('agent', 'state')) === 'thinking' && (await ev(`${S('agent', '.holo video.on')}.dataset.p`)) === 'think', await prop('agent', 'state'));
await ev(`${E('agent')}.set('done', 'all checks pass')`); await sleep(800);
check('agent: set("done") plays the cut-in and fires cockpit:state', (await prop('agent', 'state')) === 'done' && (await cut('agent')) && (await fired('agent cockpit:state')) >= 2, await line('agent'));
check('agent: the hologram clip is loaded', (await ev(`${S('agent', '.holo video.on')}.readyState`)) >= 2, await ev(`${S('agent', '.holo video.on')}.readyState`));

check('every control has said a line', (await ev(`[...document.querySelectorAll('.item .stage > *')].every((e) => e.line && e.line.length > 8)`)) === true);
check('no sideways scroll at 390', (await ev('document.documentElement.scrollWidth')) <= 390, await ev('document.documentElement.scrollWidth'));
if (logs.length) { console.log(logs.join('\n')); fails++; }
ws.close(); chrome.kill(); await sleep(300); try { rmSync(PROFILE, { recursive: true, force: true }); } catch {}
console.log(fails ? `${fails} failed` : 'all passed'); process.exit(fails ? 1 : 0);
