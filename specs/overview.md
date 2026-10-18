# Wick

## Overview

Wick is a survival game played in the browser. A lamplighter is alone in a
moth-choked city at night, and everything in the dark is drawn to the light.
The player only moves. The lamplighter's tools fire on their own, each on its
own rhythm, and what the player decides is where to stand and what to take at
each level-up. The night lasts ten minutes: reach dawn and the run is won; run
out of health and the lamplighter has fallen.

Every common enemy killed drops a gem, gems fill an experience bar, and each level
offers a choice of three: a new tool, a new trinket, or a level on one already
held, across `WEAPON_SLOTS` (`6`) tool slots and `PASSIVE_SLOTS` (`6`) trinket
slots. A tool at its top level, carried beside the trinket it pairs with,
transforms into a stronger form when a chest is opened. Chests come from the
elites that arrive on a schedule, and the night's last arrival is the Dark, a
pursuer the lamplighter outruns until dawn.

Wick ships the art and the sound it plays, and this build makes them. Every
sprite, sheet, icon, and cue is produced during the build with the asset tools
on the `PATH`, committed to the repository, and bundled by the build.
`specs/assets.md` is that contract.

Wick has its own name, look, and rules, and its assets, branding, and design
are original to it.

The specification spans several files under `specs/`.

| File | What it fixes |
| --- | --- |
| `specs/overview.md` | The stage, the project, the build interface, and the tick. |
| `specs/world.md` | The world frame, the camera, the order of a tick and how timers count, the lamplighter's movement, facing, contact damage, recovery, the run's two endings, and the gems and pickups. |
| `specs/weapons.md` | The ten weapons, their targeting, and their level tables. |
| `specs/evolutions.md` | The six evolved weapons, their recipes, and what a chest's result is. |
| `specs/passives.md` | The ten passives and the derived stats they feed. |
| `specs/progression.md` | Experience, levels, slots, the level-up offers, and the two overlays. |
| `specs/enemies.md` | The enemy roster, their behaviors, and the spawn director. |
| `specs/controls.md` | The key actions, the pointer, touch, and what each screen reads of them. |
| `specs/state.md` | What the game's state carries. |
| `specs/instrumentation.md` | The debugging and automation surface, and the snapshot it reports. |
| `specs/ui.md` | The screens, the HUD, and the audio cues. |
| `specs/assets.md` | The sprites and sounds the build produces, where each lands, and how it is wired in. |
| `specs/showcase.md` | The showcase the finished game ships beside its source: the description and the carousel. |

Read all of them and build the game they describe as one cohesive whole.

## The runtime

The game is built on the Simple 2D engine, which documents itself in the
`engine/` directory at the root of this repository. It owns the frame loop and
the delta time the game is given, the input actions and the pointer the
lamplighter and the menus are driven by, audio cues including the ones that
loop, asset loading, the canvas fit, and the debug overlay. Read its
documentation before you start. This specification states only what is specific
to Wick.

The engine hands `update` each action as a held value and as a press edge, and
reports the pointer in the stage's own coordinates along with its buttons and
its wheel travel. `specs/controls.md` states what Wick does with them.

## The project you build in

The project at the root of this repository is already wired up, and its
`README.md` describes it. It is a TypeScript project built with Vite, tested
with Vitest, linted with ESLint, and formatted with Prettier. That toolchain is
fixed and supplied.

### What you implement

`src/game.ts`, any new modules you add beside it under `src/`, and the assets
under `assets/`, which does not exist yet.

`src/game.ts` exports `game`, a `Game<WickState, WickDebugApi>`: `initialize`
builds the state and the debug surface once and returns them together as
`[state, debug]`, `update` takes the current state as a read-only view
(`DeepReadonly<WickState>`) and returns the next state, advanced against the
frame's delta time in seconds, and `render` is handed that next state,
read-only again, and draws it. The engine holds the state by value and replaces
it with what each `update` returns, so a frame builds the next state from the
current one rather than writing into it, and nothing but `update` and the debug
surface's poses advances the game. As seeded, the module's functions throw
`"not implemented"`. Implement them.

`src/game.ts` also exports `WickState` and the types it is built from, with
every field `specs/state.md` declares under its name, type, and meaning and
the fields you add under the contract stated there, and `WickDebugApi`, the
debug and automation surface `specs/instrumentation.md` fixes.

`src/game.ts` also exports `BACKGROUND`, a CSS color string: the stage
background. `src/main.ts` hands it to the engine as the color the canvas is
cleared to each frame, so the letterbox bars around the stage match the night.
The seeded stub exports a placeholder; replace it with the color your night
uses.

### What stays as it is

- `src/main.ts`, the entry point. It stands the engine up over the page's canvas,
  binds `game` to it, and runs.
- `src/constants.ts`, holding every figure this specification fixes.
- `index.html`, the page and the canvas the engine fits the stage into.
- `.vendor/`, holding the vendored engine that `package.json` resolves the
  dependency from.
- `engine/`, the engine's own documentation.
- The configuration: `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`,
  `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, and `.gitignore`.

`package.json` takes one kind of change: a dependency you genuinely need, added
along with the updated `package-lock.json`. Its existing entries and scripts stay
as they are.

### Every figure comes from `src/constants.ts`

Every number, identifier, key binding, cue name, asset path, and piece of
screen copy this specification fixes is exported from `src/constants.ts` under
the name this specification gives it. Import it and use it; the value it holds
is authoritative. Anything this specification does not name is yours to decide.

### Your own tests

Write unit tests for what you build, beside your sources as `src/**/*.test.ts`.
`npm test` runs them in process with Vitest, in Node, with coverage measured
over `src/`.
A test stands the engine up over its own canvas and clock and advances the
game a counted number of frames, so it needs no browser, and `@napi-rs/canvas`
is installed to supply the 2D context.

### The checks the repository passes

Four commands run over the finished repository before it is reviewed.

| Command | Checks |
| --- | --- |
| `npx tsc --noEmit` | The code type-checks. A repository that does not compile is not reviewed. |
| `npx eslint .` | The code is lint-clean. |
| `npx prettier --check .` | The code is formatted. |
| `npx vitest run --coverage` | Your tests pass, with their count and coverage reported. |

They run on the repository as you leave it. `npm run typecheck`, `npm run lint`,
`npm run format`, and `npm test` run the same four locally.

### The build interface

`npm ci` followed by `npm run build` produces the complete static site into
`dist/` at the repository root, with an `index.html` at the root of that
directory as the entry point. That directory runs correctly when served as-is,
both at the root of a static file server and mounted under a sub-path, so every
URL the build emits or constructs at runtime is page-relative rather than
root-absolute. The scripts that do this are already in `package.json`.

The build is self-contained. The asset tools on this machine's `PATH` are
development tools for producing the files `specs/assets.md` lists and locates;
the produced files are committed, the build bundles them, and neither `npm ci`
nor `npm run build` invokes a tool.
Every produced file the game loads is served from `dist/` at `assets/<path>`
relative to its `index.html`, the URL the engine's loader resolves it to, so
the built site plays the same night as `npm run dev`.

## Goal of this build

Produce a complete, polished, playable game that runs entirely in a browser,
and the art and sound it plays. This is a broad build: a scrolling world under
a camera fixed on the lamplighter, sixteen weapons each with its own targeting
and effect, ten passives, thirteen enemies on a ten-minute spawn schedule, a
level-up economy with slots and evolutions, several screens and overlays, an
almanac of everything in the night, and a produced set of sprites and sounds.
Aim for a game a person would enjoy playing, where a crowd closing in is
legible and a new tool visibly changes the fight.

### Hard requirements

- Build on the Simple 2D engine, taking the frame loop, the input actions
  and the pointer, audio with looping cues, asset loading, the canvas fit, and
  the debug overlay from it.
- Ship the whole night: the ten weapons, the six evolutions, the ten passives,
  the thirteen enemies, the spawn schedule from the first moth to the Dark, and
  dawn at `DAWN_TIME` (`600`) seconds.
- Ship the almanac: a screen that browses every tool, trinket, enemy, and
  pickup in the game, each shown with its picture and its description.
- Drive every menu with the mouse and with touch as well as with the keyboard,
  as `specs/controls.md` states.
- Render real graphics on the canvas: the world scrolling under the camera, a
  sprite for every actor and effect, and the HUD, drawn as sprites, shapes, and
  text. A text-only or character-cell rendering does not meet this.
- Produce the sprites, icons, and sounds `specs/assets.md` lists during this
  build, commit the produced files at the paths it names, and wire them in as
  it states; draw everything else in code. The build fetches nothing at
  runtime from outside its own `dist/`.
- Run in the browser with no backend. Everything needed to play is
  self-contained, and no API key or credential is needed to build, run, or play.
- Hold the game's whole state in `WickState`, as `specs/state.md` declares it.
- Replace the starter `README.md` with one explaining what the game is, how to
  install dependencies, how to run it in development, how to produce the static
  production build, and the controls.

## Code quality

The code is fit for a long-lived codebase shared with human developers. The
type-check, lint, and format checks pass, and unit tests cover the simulation.

## Units, ticks, the world, and the camera

The canvas presents a fixed logical stage of `STAGE_W x STAGE_H` (`1280 x 720`,
16:9), origin at the top-left, `x` increasing to the right and `y` increasing
downward, with its center at `(STAGE_CX, STAGE_CY)` (`640, 360`). Fitting it to
the browser window is the runtime's: the uniform scale that preserves the aspect
ratio, the letterboxed centering, and the device pixel ratio. The complete stage
is on screen at every window size, on load and at any pixel density. The HUD,
the menus, and the overlays are laid out in logical stage units. The stage has
one background color, painted across the whole stage before anything else is
drawn, and the letterbox bars carry that color.

The world is an unbounded plane measured in the same units as the stage, with
the same axes, and its origin `(0, 0)` is where the lamplighter starts a run.
The camera is centered on the lamplighter at all times: world point `(wx, wy)`
draws at stage `(wx − player.x + STAGE_CX, wy − player.y + STAGE_CY)`. The
view is the `STAGE_W x STAGE_H` rectangle of world space centered on the
lamplighter at that tick, and it is what the player sees. The ground carries a
repeating pattern fixed in world space, so the lamplighter's movement reads as
the ground sliding beneath a figure held at the stage center.

Every length in this specification is in units, every rate is per second, and
every duration is in seconds. The simulation advances on a fixed tick of
`TICK_HZ` (`60`) ticks per second, each `TICK_DT` (`1/60`) seconds long: each
frame's delta time accumulates, whole ticks are consumed from the accumulation,
and a remainder shorter than a tick waits for the next frame while the screen
stays `playing`. Only the `playing` screen ticks; the level-up and chest
overlays and every other screen tick nothing, and `specs/instrumentation.md`
states what becomes of the remainder when the screen leaves `playing`. The run
clock is `time = tick / TICK_HZ`, starting at `0` when a run starts, and dawn
arrives on the tick `time` reaches `DAWN_TIME`.

Where a rule of this specification names a random choice, the file that
states the rule states what the choice is drawn from, and
`specs/instrumentation.md` states how a scenario poses its outcome.

## Visual design

The night is yours to art-direct: the palette, the ground, the light, the
sprites, and the styling of every screen. Legibility is gameplay, so whatever
look you choose, a player reads all of the following at a glance.

| What a player reads | Requirement |
| --- | --- |
| The lamplighter | Drawn at the stage center, animated while moving, and facing the way `facing` says. |
| Enemies | Each of the thirteen enemy types has its own silhouette, told apart by form rather than hue alone, and the two elites and the Dark read as larger than any common enemy. |
| Weapon effects | Each of the sixteen weapons' effects is drawn where its hitbox is and reads as that weapon, and an evolved weapon's effect is visibly distinct from its base's. |
| Gems | The three tiers are told apart by size, small under medium under large. |
| Pickups | A chest, bread, and a draft are told apart from each other and from any gem. |
| The HUD | Health with its numbers, experience with the level, the clock, the kill count, and the twelve slots with their level pips and each weapon's cooldown state are legible over the world. |
| Overlays | The level-up overlay, the chest overlay, and the pause screen read over the frozen world beneath them, with that world visibly quieted. |
| Text | Text is legible against its background at the logical stage size. |

The produced sprites and sounds carry the rest of the look;
`specs/assets.md` holds them to the same bar.
