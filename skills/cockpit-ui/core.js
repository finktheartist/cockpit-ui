// The shared core of Cockpit UI: one clock for every control on the page, the custom-element base, the reactions
// (lettering, two impact frames, a cut-in panel) and screens drawn into blank painted glass twelve times a second.
// tools/build.mjs stamps this into every control file, so each one works alone; the first copy loaded is the one used.
const Cockpit = window.Cockpit || (window.Cockpit = (() => {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
  const GREEN = '#4dff9a', AMBER = '#ffb52e', RED = '#ff4d3d', CYAN = '#5fe6ff', VIOLET = '#d46bff', MONO = 'ui-monospace, Menlo, monospace';
  const env = { now: 0, calm: matchMedia('(prefers-reduced-motion: reduce)').matches }, live = new Set(), t0 = performance.now();
  let running = false;
  const loop = () => { env.now = (performance.now() - t0) / 1000; for (const el of live) el._tick(env.now); requestAnimationFrame(loop); };
  const CSS = `
:host { display: block; width: 100%; max-width: 640px; color: #e8ecf2; font: 14px/1.4 ui-monospace, "SF Mono", Menlo, Consolas, monospace; } :host([hidden]) { display: none; }
* { box-sizing: border-box; }
.piece { position: relative; --dim: #8791a3; }
/* Shared by the kit controls: a painted background, one backing sheet, cut-out pieces mounted on it in percent of the stage,
   and the reactions (lettering, two impact frames, a cut-in strip). Everything moves in steps, twelve drawings a second. */
.stage { container-type: inline-size; position: relative; aspect-ratio: var(--ar, 1000 / 660); border-radius: 18px; overflow: hidden; background: #1b2233 none center / cover; box-shadow: 0 0 0 2.5px #06080c, 0 5px 0 2.5px #06080c; user-select: none; -webkit-user-select: none; }
.stage::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(4, 6, 14, .55)); }
.part { position: absolute; background: center / 100% 100% no-repeat; filter: drop-shadow(0 5px 0 rgba(4, 6, 14, .55)); }
.sheet { filter: drop-shadow(0 7px 0 rgba(4, 6, 14, .6)); }
.tri { aspect-ratio: 224 / 171; background-image: var(--a-tri); }
.caution { aspect-ratio: 520 / 153; background-image: var(--a-caution); }
.tag { aspect-ratio: 264 / 121; background-image: var(--a-tag); }
.hazard { aspect-ratio: 323 / 116; background-image: var(--a-hazard); }
.crt-unit { aspect-ratio: 756 / 662; background-image: var(--a-crt); }
.tile { aspect-ratio: 629 / 384; background-image: var(--a-tile); }
.part canvas { position: absolute; mix-blend-mode: screen; pointer-events: none; }
.crt { left: 16.14%; top: 20.85%; width: 61.4%; height: 58.2%; border-radius: 12% / 14%; }
.tile canvas { left: 15.7%; top: 19.3%; width: 32.8%; height: 41.4%; border-radius: 10% / 13%; }
button { font: inherit; color: inherit; }
.hit { position: absolute; padding: 0; border: 0; background-color: transparent; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; border-radius: 10px; }
.hit:focus-visible, .stage:focus-visible { outline: 2.5px solid #fff; outline-offset: 1px; }
.glow { position: absolute; transform: translate(-50%, -50%); border-radius: 50%; mix-blend-mode: screen; opacity: 0; pointer-events: none; background: radial-gradient(closest-side, rgba(255, 150, 40, .95), rgba(255, 90, 20, .5) 55%, transparent); }
.glow.on { opacity: 1; }
.glow.red { background: radial-gradient(closest-side, rgba(255, 60, 50, .85), rgba(255, 40, 40, .4) 65%, transparent); }
.glow.green { background: radial-gradient(closest-side, rgba(80, 255, 150, .8), rgba(60, 255, 140, .35) 65%, transparent); }
.lamp { position: absolute; border-radius: 50%; transform: translate(-50%, -50%); opacity: 0; background: var(--c, #4dff9a); box-shadow: 0 0 0 1px #0b0d12, 0 0 12px 3px var(--c, #4dff9a); pointer-events: none; }
.lamp::after { content: ""; position: absolute; left: 20%; top: 14%; width: 34%; height: 26%; border-radius: 50%; background: #fff; transform: rotate(-30deg); }
.lamp.on { opacity: 1; }
.sfx { position: absolute; pointer-events: none; opacity: 0; transform-origin: 50% 60%; }
.sfx.hold { opacity: 1; }
.sfx.go { animation: pop .58s steps(7, end) both; } .sfx.big.go { animation: slam 1.1s steps(13, end) both; }
@keyframes pop { 0% { opacity: 1; transform: scale(.3) rotate(-14deg); } 28% { opacity: 1; transform: scale(1.18) rotate(-6deg); } 45%, 80% { opacity: 1; transform: scale(1) rotate(-8deg); } 100% { opacity: 1; transform: scale(0) rotate(-8deg); } }
@keyframes slam { 0% { opacity: 1; transform: scale(2.4) rotate(-9deg); } 16% { opacity: 1; transform: scale(.92) rotate(-5deg); } 26%, 78% { opacity: 1; transform: scale(1) rotate(-6deg); } 100% { opacity: 1; transform: scale(0) rotate(-6deg); } }
.stage.imp1 > * { filter: grayscale(1) contrast(40) brightness(1.5); } .stage.imp1 { background: #fff; }
.stage.imp2 > * { filter: grayscale(1) contrast(40) brightness(1.5) invert(1); } .stage.imp2 { background: #000; }
.stage.imp1 .sfx, .stage.imp2 .sfx, .stage.imp1 .glow, .stage.imp2 .glow, .stage.imp1 .lamp, .stage.imp2 .lamp { visibility: hidden; }
.cutin { position: absolute; left: 0; top: var(--cy, 16%); width: 100%; aspect-ratio: var(--car, 1400 / 420); background: #000 50% 50% / cover; box-shadow: 0 0 0 3px #06080c, 0 -7px 0 #ffc93a, 0 7px 0 #ffc93a; clip-path: inset(-10px 0 -10px 100%); pointer-events: none; }
.cutin.go { animation: cut 1.5s steps(18, end) both; }
@keyframes cut { 0% { clip-path: inset(-10px 0 -10px 100%); background-position: 40% 50%; } 14%, 80% { clip-path: inset(-10px 0 -10px 0); } 80% { background-position: 56% 50%; } 100% { clip-path: inset(-10px 100% -10px 0); background-position: 60% 50%; } }
.say { margin: 16px 0 0; min-height: 40px; font-size: 12.5px; line-height: 19px; letter-spacing: .08em; text-transform: uppercase; color: var(--dim); text-align: center; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { .sfx.go, .sfx.big.go { animation-duration: 1.4s; animation-timing-function: steps(1, end); } }
/* floating on black: no card behind the sheet, and the cut-in is a slanted panel with hard ends, so nothing looks cut off */
.stage { background: none; box-shadow: none; border-radius: 0; overflow: visible; }
.stage::after { display: none; }
.stage.imp1, .stage.imp2 { background: none; }
.cutin { box-shadow: none; border-block: 5px solid #ffc93a; clip-path: polygon(107% 0, 107% 0, 100% 100%, 100% 100%); }
.cutin.go { animation-name: cut, cutshape; }
@keyframes cutshape { 0% { clip-path: polygon(107% 0, 107% 0, 100% 100%, 100% 100%); } 14%, 80% { clip-path: polygon(7% 0, 100% 0, 93% 100%, 0 100%); } 100% { clip-path: polygon(7% 0, 7% 0, 0 100%, 0 100%); } }
`;
  // what every control's own code uses: the line it says, the lettering, the climax and the drawn screens
  function kit(el, env) {
    const stage = el.querySelector('.stage'), cutin = el.querySelector('.cutin'), txt = el.querySelector('.say .txt'), sr = el.querySelector('.say .sr');
    const sfx = {}; el.querySelectorAll('.sfx').forEach((e) => { sfx[e.dataset.n] = e; });
    const dpr = Math.max(2, Math.min(3, window.devicePixelRatio || 1));
    let timer = 0, timers = [];
    const say = (s) => { clearInterval(timer); sr.textContent = s; txt.textContent = ''; let i = 0; timer = setInterval(() => { txt.textContent = s.slice(0, ++i); if (i >= s.length) clearInterval(timer); }, 14); };
    const pop = (n, at) => { const e = sfx[n]; if (!e) return; if (at) { e.style.left = at[0] + '%'; e.style.top = at[1] + '%'; } e.classList.remove('go'); void e.offsetWidth; e.classList.add('go'); };
    const stop = () => { timers.forEach(clearTimeout); timers = []; stage.classList.remove('imp1', 'imp2'); if (cutin) cutin.classList.remove('go'); };
    const climax = (big) => {   // two impact frames, then the big lettering, then the cut-in
      stop(); const at = (ms, fn) => timers.push(setTimeout(fn, ms));
      if (env.calm) { pop(big); return; }
      stage.classList.add('imp1'); at(84, () => stage.classList.replace('imp1', 'imp2')); at(168, () => { stage.classList.remove('imp2'); pop(big); });
      at(420, () => { cutin.classList.remove('go'); void cutin.offsetWidth; cutin.classList.add('go'); });
    };
    const canvas = (sel, w, h) => {
      const c = el.querySelector(sel), g = c.getContext('2d'); c.width = w * dpr; c.height = h * dpr;
      return {
        g, w, h,
        begin(col, flash) { g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h); g.fillStyle = flash ? col : col + '14'; g.fillRect(0, 0, w, h); g.shadowColor = flash ? 'transparent' : col; g.shadowBlur = 5; g.textBaseline = 'alphabetic'; g.textAlign = 'left'; },
        end(f, col, roll = true) { g.shadowBlur = 0; g.fillStyle = 'rgba(0,0,0,.34)'; for (let y = 0; y < h; y += 3) g.fillRect(0, y, w, 1); if (roll && !env.calm) { g.fillStyle = col + '1c'; g.fillRect(0, (f * 9) % (h + 40) - 40, w, 26); } },
      };
    };
    return { stage, cutin, sfx, say, pop, climax, stop, canvas };
  }

  function define(tag, d) {
    if (customElements.get(tag)) return;
    const vars = Object.entries(d.art).map(([k, v]) => `--a-${k}: url("${v}");`).join(' ');
    class El extends HTMLElement {
      static formAssociated = !!d.form;
      constructor() { super(); this.line = ''; this._last = undefined; this._dirty = false; this._used = -9; try { this._internals = d.form ? this.attachInternals() : null; } catch { this._internals = null; } }
      connectedCallback() {
        if (!this.shadowRoot) this._build();
        live.add(this); if (!running) { running = true; loop(); }
      }
      disconnectedCallback() { live.delete(this); }
      _build() {
        const r = this.attachShadow({ mode: 'open', delegatesFocus: true });
        r.innerHTML = `<style>${CSS}\n.piece { ${vars} }\n${d.css}\n.say { position: absolute; margin: 0; min-height: 0; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }</style><div class="piece">${d.html}<p class="say"><span class="txt" aria-hidden="true"></span><span class="sr" aria-live="polite"></span></p></div>`;
        for (const e of r.querySelectorAll('img[data-art]')) e.src = d.art[e.dataset.art];
        for (const e of r.querySelectorAll('video[data-art]')) fetch(d.art[e.dataset.art]).then((x) => x.blob()).then((b) => { e.src = URL.createObjectURL(b); if (e.classList.contains('on') && !env.calm) e.play().catch(() => {}); });
        const sr = r.querySelector('.say .sr');
        new MutationObserver(() => { const text = sr.textContent; if (text === this.line) return; this.line = text; this.dispatchEvent(new CustomEvent('cockpit:line', { bubbles: true, detail: { text } })); }).observe(sr, { childList: true, characterData: true, subtree: true });
        this.piece = d.make(r, env, this); this.line = sr.textContent;
        if (d.init) d.init(this, r, this.piece);
        this._settle();
        for (const t of ['pointerdown', 'keydown']) r.addEventListener(t, () => { this._used = env.now; });
        for (const t of ['pointerup', 'keyup', 'click', 'change']) r.addEventListener(t, () => queueMicrotask(() => { this._check(); if (this._dirty) { this._dirty = false; if (!d.quiet) this.dispatchEvent(new Event('change', { bubbles: true })); } }));
      }
      _read() { return d.read(this.shadowRoot, this.piece); }
      _form(v) { if (this._internals) this._internals.setFormValue(d.formValue ? d.formValue(v) : String(v)); }
      _settle() { this._last = this._read(); this._form(this._last); }   // after a change made from code: no events
      _check() {
        const v = this._read(); if (v === this._last) return;
        const was = this._last, user = env.now - this._used < 1.5; this._last = v; this._form(v);
        if (!d.quiet) { this._dirty = true; this.dispatchEvent(new Event('input', { bubbles: true })); }
        if (d.on) d.on(this, v, was, user);
      }
      _tick(t) { this.piece.frame(t); this._check(); }
    }
    if (d.api) Object.defineProperties(El.prototype, Object.getOwnPropertyDescriptors(d.api));
    customElements.define(tag, El);
  }
  return { env, define, kit, clamp, hash, GREEN, AMBER, RED, CYAN, VIOLET, MONO };
})());
