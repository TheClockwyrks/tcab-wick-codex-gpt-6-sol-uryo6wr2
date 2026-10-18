# Wick

Wick is a browser survival game about a lamplighter crossing a moth-choked city at night. Walk through the crowd while your tools fire automatically. Gather gems to choose new tools and trinkets, open chests to transform a matched top-level tool, and survive ten minutes to reach dawn.

## Play locally

```sh
npm ci
npm run dev
```

Open the URL Vite prints. To make the self-contained static build, run `npm run build` and serve `dist/` from any static server. The build uses the committed artwork and audio in `assets/`; asset generation is not required to build or play. The project also supports `npm run typecheck`, `npm run lint`, `npm run format`, and `npm test`.

## Controls

- **Move:** Arrow keys or WASD
- **Confirm a menu choice:** Enter or Space
- **Pause or go back:** Escape; P also pauses and resumes
- **Mute:** M
- **Mouse and touch:** Select menu choices and browse the Almanac

The lamplighter only moves; equipped tools attack on their own rhythms. The Almanac on the title screen describes every tool, trinket, enemy, gem, and pickup.

## Assets

All shipped sprites, animation frames, icons, cues, and the music bed are committed under `assets/`. Their original generator is `scripts/create-assets.mjs`, which uses `@napi-rs/canvas` to draw the pixel artwork and writes the authored wave and MIDI files. It is a one-time authoring script and is never called by `npm run build`.
