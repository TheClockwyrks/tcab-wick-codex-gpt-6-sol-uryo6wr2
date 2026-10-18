import { describe, expect, it } from "vitest";
import type { InitApi, UpdateApi } from "@clockwyrks/simple-2d";
import { game } from "./game";
import { TICK_DT, DAWN_TIME, TICK_HZ } from "./constants";
import type { WickState } from "./state";

async function rig() {
  const cues: string[] = [];
  const init = {
    input: { register() {} },
    assets: { loadImage: async () => ({}) },
    audio: { load: async () => {} },
    diagnostics: { register() {} },
  } as unknown as InitApi<WickState>;
  const [initial, debug] = await game.initialize(init);
  const keys = new Set<string>();
  const values = new Set<string>();
  let muted = false;
  const api = {
    input: {
      pressed: (key: string) => keys.delete(key),
      value: (key: string) => Number(values.has(key)),
      pointer: () => ({ x: -10, y: -10, down: false, device: "mouse" }),
      pointerPressed: () => false,
      pointerReleased: () => false,
      wheel: () => ({ x: 0, y: 0 }),
    },
    audio: {
      play: (name: string) => cues.push(name),
      loop() {},
      stop() {},
      setMuted: (value: boolean) => {
        muted = value;
      },
      muted: () => muted,
    },
  } as unknown as UpdateApi;
  return {
    initial,
    debug,
    api,
    cues,
    press(key: string) {
      keys.add(key);
    },
    hold(key: string) {
      values.add(key);
    },
    step(state: WickState, dt = TICK_DT) {
      return game.update(state, api, dt);
    },
  };
}

describe("Wick night", () => {
  it("starts at the title and enters a fresh run with Taper", async () => {
    const r = await rig();
    expect(r.initial.screen).toBe("title");
    r.press("confirm");
    const s = r.step(r.initial);
    expect(s.screen).toBe("playing");
    expect(s.run.tick).toBe(1);
    expect(s.run.weapons[0].id).toBe("taper");
  });
  it("moves on whole ticks and freezes while paused", async () => {
    const r = await rig();
    let s = r.debug.setScreen(r.initial, "playing");
    r.hold("right");
    s = r.step(s, TICK_DT / 2);
    expect(s.run.tick).toBe(0);
    s = r.step(s, TICK_DT / 2);
    expect(s.run.tick).toBe(1);
    expect(s.run.player.x).toBe(3);
    r.press("pause");
    s = r.step(s, 1);
    expect(s.screen).toBe("paused");
    expect(s.run.tick).toBe(1);
  });
  it("applies contact damage and can fall", async () => {
    const r = await rig();
    let s = r.debug.setScreen(r.initial, "playing");
    s = r.debug.setSpawning(s, false);
    s = r.debug.setWeaponFire(s, false);
    s = r.debug.spawnEnemy(s, "moth", 0, 0);
    s = r.step(s);
    expect(s.run.player.hp).toBeLessThan(100);
    s = r.debug.setHp(s, 1);
    s = r.step(s, 0.5);
    expect(s.screen).toBe("fallen");
  });
  it("opens an offer when a gem completes a level", async () => {
    const r = await rig();
    let s = r.debug.setScreen(r.initial, "playing");
    s = r.debug.setSpawning(s, false);
    s = r.debug.setXp(s, 4);
    s = r.debug.spawnGem(s, "small", 0, 0);
    s = r.step(s);
    expect(s.run.level).toBe(2);
    expect(s.screen).toBe("levelup");
    expect(s.run.offers.length).toBe(3);
  });
  it("a slash hits once while its sprite stays visible", async () => {
    const r = await rig();
    let s = r.debug.setScreen(r.initial, "playing");
    s = r.debug.setSpawning(s, false);
    s = r.debug.setEnemyMotion(s, false);
    s = r.debug.setEnemyContact(s, false);
    s = r.debug.setWeapon(s, 0, "taper", 1);
    s = r.debug.spawnEnemy(s, "beetle", 60, 0);
    s = r.step(s);
    expect(s.run.enemies[0].hp).toBe(15);
    expect(s.run.zones.some((z) => z.kind === "slash")).toBe(true);
    s = r.step(s);
    expect(s.run.enemies[0].hp).toBe(15);
  });
  it("Halo pulses on its weapon rhythm", async () => {
    const r = await rig();
    let s = r.debug.setScreen(r.initial, "playing");
    s = r.debug.setSpawning(s, false);
    s = r.debug.setEnemyMotion(s, false);
    s = r.debug.setEnemyContact(s, false);
    s = r.debug.setWeapon(s, 0, "halo", 1);
    s = r.debug.spawnEnemy(s, "beetle", 50, 0);
    s = r.step(s);
    expect(s.run.enemies[0].hp).toBe(22);
    s = r.step(s, 1);
    expect(s.run.enemies[0].hp).toBe(19);
  });
  it("reaches dawn on the ten minute tick", async () => {
    const r = await rig();
    let s = r.debug.setScreen(r.initial, "playing");
    s = r.debug.setSpawning(s, false);
    s = r.debug.setEvents(s, false);
    s = r.debug.setTick(s, DAWN_TIME * TICK_HZ - 1);
    s = r.step(s);
    expect(s.screen).toBe("dawn");
    expect(s.run.tick).toBe(DAWN_TIME * TICK_HZ);
  });
});
