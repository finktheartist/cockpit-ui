---
name: cockpit-ui
description: Build, change or wire in a UI control styled as the cockpit of a 1990s giant-robot anime (painted pieces mounted on a painted backing sheet, screens drawn live, sound-effect lettering, impact frames and a cut-in panel when used), using the Cockpit UI core. Use when asked to add one of the cockpit-* controls to an app, to change how one reacts, or to make a new control in the same style. Covers the core, the recipe for painting and cutting the pieces, and the rules the set settled on.
---

# Cockpit UI

A Cockpit UI control is an ordinary control (a slider, a switch, a checklist) as one panel of a giant robot's cockpit. It is painted, not drawn: a backing sheet, the physical parts (a dial, keys, a toggle), screen bezels and decals are cel paintings, cut out and mounted on the sheet. The code draws only what changes: the readings on the glass, the lamps, the moving parts. When it is used it reacts like an anime. A real control lies over the painting, so it still works with a keyboard, a screen reader and a form.

This skill is the workflow the set was made by. It comes with:

- `core.js`, the shared core: the clock, `Cockpit.define()` (the custom-element base), `Cockpit.kit()` (the line it says, lettering, the climax, drawn screens) and the shared CSS.
- `starter.html` and `art/`, the smallest whole example: a mute switch with its own screen. Copy it to start a new one.
- `look.mjs`, which photographs a page at chosen moments after an action and saves the frames on one sheet.

If the job is only to put an existing control into an app, skip to **Wire it in** and **Check it**.

## 1. Decide four things first

1. **The control.** With the painting taken away it must still be that control: a real `<button>`, `<input>`, `role="slider"`, `role="switch"`, `role="radiogroup"` inside, with keys and focus.
2. **The cockpit part that already does that job.** A slider is a dial, a confirm is a guarded button you hold, a checkbox group is a checklist, tabs are camera feeds. If you have to explain it, pick again.
3. **The escalation.** What the screen shows as the value climbs, in levels, each with its own status word, line of copy and colour (green, amber, red). The fun is in the copy getting worse.
4. **The climax and its cut-in.** One big moment per control (full output, the last clamp, the launch) and a cut-in picture of its own. Never reuse another control's cut-in.

## 2. The core

Load `core.js` and everything is on `window.Cockpit`:

- `Cockpit.define(tag, { art, css, html, make, read, ... })` registers the element. `art` maps names to image URLs; each becomes a CSS variable `--a-NAME` and fills any `img[data-art=NAME]`. `html` goes in the shadow root, inside `.piece`. `make(root, env, el)` builds the behaviour and returns `{ frame(t) }` plus anything the element exposes; it is stored as `el.piece`.
- `read(root, piece)` returns the value. The core compares it every frame and on every pointer and key release, and fires `input` and `change` itself when it moves. `form: true` makes it form-associated; `formValue(v)` converts the value for the form. `quiet: true` turns `input` and `change` off. `on(el, value, was, user)` is called on every change, to fire your own events. `api` is a set of properties and methods for the prototype; `this._settle()` after a change made from code records it without firing events. `init(el, root, piece)` reads the starting attributes.
- `Cockpit.kit(root, env)` gives `say(text)` (the line, typed under the control and read out), `pop(name, [left%, top%])` (pop a piece of lettering), `climax(name)` (two impact frames, then big lettering, then the cut-in), `stop()`, and `canvas(selector, w, h)`, a canvas sized for the screen's glass with `begin(colour, flash)` and `end(frame, colour, roll)` for the background, the scan lines and the rolling bar.
- `env.now` is the clock in seconds and `env.calm` is reduced motion. `Cockpit.hash(n)` is a repeatable random number for jitter. `GREEN`, `AMBER`, `RED`, `CYAN`, `VIOLET` and `MONO` are the screen colours and type.
- Shared classes: `.stage` (set `--ar` for its proportions), `.part` (an absolutely placed painting, in percent of the stage), `.hit` (a real control over a painting), `.sfx` (lettering; `.big` for the climax word), `.glow`, `.lamp`, `.cutin` (set `--car` and `--cy`, and its background image).

## 3. Painting the pieces

All the art is generated. Code-drawn art did not pass for anime and was thrown away. The recipe:

- **One parts sheet first,** of many pieces in one image, and use it as the style reference for everything after: "1990s mecha anime production cel, bold black ink outline, flat cel colours with one hard shadow and one hard highlight, worn dark navy-teal metal, bone-white parts, steel screws".
- **Straight on.** "Seen EXACTLY straight-on in front orthographic view, zero perspective." Anything at an angle cannot be mounted.
- **On flat magenta.** "The background is one perfectly flat, uniform solid magenta (#FF00FF), no texture, no shadows." Cut it with a 22% fuzz to transparent, then erode the alpha by about 1.6 pixels to remove the pink fringe. Find each piece by its connected shape, not by where you asked for it. Purple or pink lettering will not survive that; flood-fill the background from the edge for those.
- **Backing sheets empty in the middle.** Ask for "The whole middle of the plate is EMPTY, flat and plain (parts will be mounted on it later)", detail only round the rim, a distinctive non-rectangular outline, and tiny stencil text in the corners naming the control. Give each control a different outline.
- **Screens blank.** "Dark, unlit, almost black-green glass, completely blank", with a small highlight. The code draws into it, with `mix-blend-mode: screen`.
- **Two states of a moving part in one image,** side by side, the same size and perfectly level (the toggle thrown each way, the guard open and shut), so they line up.
- **Cut-ins as letterboxed insert shots:** "a wide horizontal band across the exact vertical middle of the image ... The top quarter and the bottom quarter of the image are plain flat solid black." Crop the band.
- **Lettering as a sprite sheet,** several words on magenta, each a different colour, "spelled exactly".
- **Measure, then mount.** Threshold the dark glass in a piece to find its window, and read the lamp sockets and key caps as fractions of the piece. Those numbers are the positions in the CSS and the code.

## 4. The rules

These are the corrections that came up, in roughly the order they did.

- **No bulky consoles and no hands.** One compact control per panel, not a scene.
- **Horizontal: input and screen side by side on one sheet,** with decals round them. A vertical stack of loose pieces with no sheet was rejected.
- **Readings escalate.** Every level changes the number, the colour, the status word and the line of copy.
- **Every control has its own cut-in and its own climax word.** Reusing the pilot's eyes everywhere was the first thing sent back.
- **Original designs only.** The robot's head was redrawn once for looking like an existing franchise's, and a one-eyed hostile machine was replaced for the same reason. Check every character and machine against well-known mecha before shipping.
- **Twelve drawings a second.** Step every animation (`steps()` in CSS, `Math.floor(t * 12)` in code). The one exception is the agent hologram, which is a projection and turns smoothly.
- **Float on black.** No card behind the control. The impact frames flash the control itself, not a rectangle.
- **The cut-in is a slanted panel with hard ends,** wiping in from the right and out to the left. A strip chopped at a card edge looked cut off; ends that fade looked awkward.
- **Say what it is.** A caption over each control (name, kind, what to do), a prompt on its own screen until it is first used (TURN THE DIAL), and plain words on the parts you press (ACKNOWLEDGE, not ACK).
- **Make inputs practical.** The text field was lengthened to take sixteen characters; ten was too few.
- **Don't cover what must be read.** Lettering and cut-ins sit over the control for a second or two at most.
- **Reduced motion:** skip the shaking, impact frames and cut-ins, hold the lettering still, and make sure the state still changes.

## 5. Wire it in

Each control is one plain script. Load it with a `<script>` tag (not a module), use the element, and put it on a dark background. Do not edit, split or re-bundle the file: its paintings are inside it as data.

```html
<script src="/cockpit-ui/dial.js"></script>
<cockpit-dial name="gain" value="20"></cockpit-dial>
<script>
  document.querySelector('cockpit-dial').addEventListener('change', (e) => save(e.target.value));
</script>
```

Attributes set where it starts. After that use the properties and methods in its README. Values set from code go straight there with no reaction.

## 6. Check it

- Run `node look.mjs URL --act "..." --times 0,80,170,450,900,1400` and read the sheet: two impact frames, the climax word clear of anything that must be read, the cut-in's slanted ends clean.
- Use it with real touch and key events at 390 pixels wide, and check there is no sideways scroll.
- Check what a form sends, that `input` and `change` fire once per change, and that nothing fires when the value is set from code.
- Turn on reduced motion and check the state still changes.
