---
description: Build a new page from a brief — gathers specs, proposes three concepts, implements, verifies in-browser, self-critiques, then presents.
argument-hint: [brief]
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Skill, AskUserQuestion, mcp__playwright__*
---

Build a new page in this repo from the user's brief.

**Brief:** $ARGUMENTS

Follow the six steps below in order. The gates are the point of this command —
step 2 exists specifically to stop you writing code before the structural
direction is agreed. Do not collapse steps, do not run ahead.

Read `CLAUDE.md` first if it is not already in context. Every aesthetic, motion
and 3D rule there applies to this page and to your critique in step 5.

---

## 1. Gather what's missing

Check the brief for these. Ask — in a **single** `AskUserQuestion` — about
whatever is absent. Do not guess, and do not proceed on any of them:

- **Accent color.** Exactly one. Get a specific value, not "something warm."
- **Type pairing.** Two families and their roles (display vs text). If they
  name families that need loading, confirm the source — self-hosted woff2 in
  `public/fonts` is the default; ask before adding a network font dependency.
- **2–3 reference sites, and specifically what they want from each.** "I like
  this one" is not usable. Push for the actual quality: its pacing, its
  density, how it handles the fold, one particular transition. A reference
  without a named quality is noise, and building against it produces pastiche.

Also establish, if the brief does not: what the page is *for*, roughly how many
sections, and whether WebGL is wanted or merely tolerated.

If the brief already covers everything, say so and go to step 2.

## 2. Propose three structural concepts — then STOP

Write three genuinely distinct concepts in **plain text**. No code. No files.

Distinct means different structural spines, not three skins on one scroll
narrative. If all three could be built from the same component tree, they are
one concept and you have not done step 2.

For each, in a short paragraph plus a few beats:

- The **one structural idea** — the organizing move the whole page hangs on.
- How the fold reads, and what the scroll does.
- Where the motion budget goes, and what stays deliberately still.
- Whether it needs WebGL, and what specifically justifies it.
- What it will look like at 375, honestly. A concept that only works wide is
  half a concept — say so now rather than discovering it in step 4.

Then stop and wait. **Do not write code before the user picks one.** Not
scaffolding, not "getting a head start on the layout," not a component file.
The user may combine concepts or reject all three; either way, work already
written is work thrown away or, worse, work quietly steering the outcome.

## 3. Implement

Build the chosen concept in `src/pages/`, add its route to `src/App.tsx`.

- Set the accent and font variables in the page's own scope. Never edit the
  engine's placeholder tokens in `index.css`.
- Import GSAP from `@/engine`. Both `matchMedia` branches, every timeline.
- WebGL goes through `Stage3D` (poster required). Dispose anything you build
  imperatively.
- `npm run build` when the implementation is done — `tsc -b` runs first and
  catches what the dev server does not.

## 4. Open it in the browser

Start the dev server if it is not running (`npm run dev`, background,
`127.0.0.1:5173`).

Then, with the Playwright MCP tools:

- Resize to **1440×900**. Navigate to the route. Screenshot.
- **Scroll through the whole page** and screenshot at each significant beat.
  A single top-of-page screenshot verifies nothing about a scroll-driven page —
  pinned sections, scrub timelines and reveals are all invisible from the top.
- Resize to **375×812**. Repeat, including the scroll pass.
- Read the console at both widths. Report what is there. React key warnings,
  shader compilation errors and WebGL context warnings all count.
- If the page has a WebGL scene, check the dev GPU readout: note draw calls,
  then navigate away and back and confirm `geometries`/`textures` return to
  baseline. A climbing count is a leak — fix it before continuing.

## 5. Critique your own screenshots, then fix

Look at what you actually produced, not at what you intended.

Go through `CLAUDE.md`'s aesthetic rules one at a time and check the
screenshots against each. Then answer honestly:

- Does this look like the default LLM page? Where, specifically?
- Is there exactly one accent, or did a second hue creep in via an image,
  a shadow tint, or a gradient stop?
- Is the type pairing doing visible work, or are both families just sitting
  there at similar sizes and weights?
- Is the structural idea legible in the screenshot — would someone who never
  read the brief perceive it? Or did it get buried under effects?
- What is the weakest single thing on this page?
- At 375: is it the design, or is it the desktop design squeezed until it fits?

**Name the weaknesses in writing before fixing them.** Vague self-approval
("looks clean, matches the brief") means the step was skipped. There is always
a weakest element; if you cannot name it, look harder.

Fix what you named. Screenshot again at both widths.

Repeat this step if the fixes did not land. Twice through is normal.

## 6. Present

Only now show the user. Include:

- Screenshots at 1440 and 375, attached.
- The structural idea in one sentence.
- What you critiqued in step 5 and what you changed as a result.
- Console state — explicitly "clean" or the exact remaining warnings.
- Anything you know is still weak, or that you deliberately left. Do not let
  them find it themselves; that costs more trust than admitting it here.
