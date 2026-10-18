import type {
  Game,
  InitApi,
  RenderApi,
  UpdateApi,
} from "@clockwyrks/simple-2d";
import type { DeepReadonly } from "ts-essentials";
import * as C from "./constants";
import type {
  EnemyId,
  WeaponId,
  PassiveId,
  OfferId,
  GemTier,
  PickupKind,
} from "./constants";
import type {
  WickState,
  RunState,
  Screen,
  ZoneState,
  WeaponSlot,
  Facing,
} from "./state";
export type * from "./state";

export const BACKGROUND = "#0d121a";
const pictures = new Map<string, ImageBitmap>();
const img = (path: string) => pictures.get(path);
const sheet = (dir: string, i: number) => img(`${dir}/${i}.png`);
const tickDown = (n: number) =>
  n - C.TICK_DT < C.TICK_DT / 2 ? 0 : n - C.TICK_DT;
const dist = (x: number, y: number) => Math.hypot(x, y);
const levelNeed = (n: number) => C.XP_BASE + C.XP_STEP * (n - 1);
const baseOf = (id: C.WeaponId): C.BaseWeaponId =>
  (
    ({
      pyre: "taper",
      beacon: "ember",
      hail: "pin",
      chandelier: "lantern",
      corona: "halo",
      blaze: "oil-splash",
    }) as Partial<Record<C.WeaponId, C.BaseWeaponId>>
  )[id] ?? (id as C.BaseWeaponId);
const evolved = (id: C.WeaponId) =>
  C.EVOLUTION_IDS.includes(id as C.EvolutionId);
const levelRow = (slot: WeaponSlot): Record<string, number> => {
  const special: Partial<Record<C.WeaponId, object>> = {
    pyre: C.PYRE_STATS,
    beacon: C.BEACON_STATS,
    hail: C.HAIL_STATS,
    chandelier: C.CHANDELIER_STATS,
    corona: C.CORONA_STATS,
    blaze: C.BLAZE_STATS,
  };
  return (special[slot.id] ??
    C.WEAPON_LEVELS[baseOf(slot.id)][Math.min(7, slot.level - 1)]) as Record<
    string,
    number
  >;
};
const passive = (r: RunState, id: C.PassiveId) =>
  r.passives.find((p) => p.id === id)?.level ?? 0;
const stats = (r: RunState) => ({
  damage: 1 + C.WICK_DAMAGE_PER_LEVEL * passive(r, "wick"),
  cooldown: 1 - C.OIL_COOLDOWN_PER_LEVEL * passive(r, "oil"),
  area: 1 + C.GLASS_AREA_PER_LEVEL * passive(r, "glass"),
  armor: C.BRASS_ARMOR_PER_LEVEL * passive(r, "brass"),
  amount: C.MIRROR_AMOUNT_PER_LEVEL * passive(r, "mirror"),
  speed: C.MOVE_SPEED * (1 + C.BELLOWS_SPEED_PER_LEVEL * passive(r, "bellows")),
  maxHp: C.BASE_MAX_HP + C.TALLOW_HP_PER_LEVEL * passive(r, "tallow"),
  recovery:
    C.BASE_RECOVERY + C.TINDER_RECOVERY_PER_LEVEL * passive(r, "tinder"),
  xp: 1 + C.SOOT_XP_PER_LEVEL * passive(r, "soot"),
  pickup: C.PICKUP_RADIUS * (1 + C.LURE_PICKUP_PER_LEVEL * passive(r, "lure")),
});
const idleRun = (): RunState => ({
  tick: 0,
  moving: false,
  moveTicks: 0,
  puffs: [],
  level: 1,
  xp: 0,
  kills: 0,
  player: { x: 0, y: 0, facing: "right", hp: C.BASE_MAX_HP },
  hurtFlash: 0,
  weapons: [],
  passives: [],
  enemies: [],
  projectiles: [],
  zones: [],
  gems: [],
  pickups: [],
  offers: [],
  nextOffers: null,
  pendingLevelUps: 0,
  chestResult: null,
  spawnTimer: 0,
  firedEvents: [],
  nextId: 0,
  nextSpawnAngle: null,
  nextSwarmAngle: null,
  nextSpawnType: null,
  nextPuddleOffset: null,
  nextStrikeTarget: null,
  nextChestItem: null,
  nextDrop: null,
});
const freshRun = (): RunState => ({
  ...idleRun(),
  weapons: [{ id: "taper", level: 1, cooldown: 0 }],
});
const initial = (): WickState => ({
  screen: "title",
  menuIndex: 0,
  almanacTab: 0,
  almanacScroll: 0,
  run: idleRun(),
  accumulator: 0,
  simTime: 0,
  muted: false,
  spawning: true,
  events: true,
  despawning: true,
  enemyMotion: true,
  enemyContact: true,
  weaponFire: true,
  effectMotion: true,
  drops: true,
  progression: true,
});
const pool = (r: RunState): C.OfferId[] => [
  ...r.weapons
    .filter((w) => !evolved(w.id) && w.level < C.MAX_WEAPON_LEVEL)
    .map((w) => w.id),
  ...r.passives
    .filter((p) => p.level < C.PASSIVES[p.id].maxLevel)
    .map((p) => p.id),
  ...(r.weapons.length < C.WEAPON_SLOTS
    ? C.BASE_WEAPON_IDS.filter(
        (id) =>
          !r.weapons.some(
            (w) =>
              w.id === id ||
              C.EVOLUTION_IDS.some(
                (e) => C.EVOLUTIONS[e].from === id && w.id === e,
              ),
          ),
      )
    : []),
  ...(r.passives.length < C.PASSIVE_SLOTS
    ? C.PASSIVE_IDS.filter((id) => !r.passives.some((p) => p.id === id))
    : []),
];
const offers = (r: RunState): RunState => {
  const candidates = pool(r);
  const out: C.OfferId[] = [];
  if (r.nextOffers) return { ...r, offers: r.nextOffers, nextOffers: null };
  while (candidates.length && out.length < C.OFFER_COUNT) {
    const i = Math.floor(Math.random() * candidates.length);
    out.push(candidates.splice(i, 1)[0]);
  }
  return { ...r, offers: out.length ? out : [C.LAMP_OIL_ID] };
};
function select(s: WickState, index: number): WickState {
  if (s.screen === "title")
    return index === 0
      ? { ...s, screen: "playing", run: freshRun(), menuIndex: 0 }
      : {
          ...s,
          screen: index === 1 ? "almanac" : "howto",
          menuIndex: 0,
          almanacTab: 0,
          almanacScroll: 0,
        };
  if (s.screen === "paused")
    return index === 0
      ? { ...s, screen: "playing", menuIndex: 0 }
      : { ...s, screen: "title", run: idleRun(), menuIndex: 0 };
  if (s.screen === "fallen" || s.screen === "dawn")
    return index === 0
      ? { ...s, screen: "playing", run: freshRun(), menuIndex: 0 }
      : { ...s, screen: "title", run: idleRun(), menuIndex: 0 };
  if (s.screen === "chest")
    return { ...s, screen: "playing", run: { ...s.run, chestResult: null } };
  if (s.screen === "levelup") {
    const id = s.run.offers[index];
    if (!id) return s;
    let r = s.run;
    const st = stats(r);
    if (id === C.LAMP_OIL_ID)
      r = {
        ...r,
        player: {
          ...r.player,
          hp: Math.min(st.maxHp, r.player.hp + C.LAMP_OIL_HEAL),
        },
      };
    else if (C.PASSIVE_IDS.includes(id as C.PassiveId)) {
      const p = id as C.PassiveId;
      const held = r.passives.find((v) => v.id === p);
      r = {
        ...r,
        passives: held
          ? r.passives.map((v) =>
              v.id === p ? { ...v, level: v.level + 1 } : v,
            )
          : [...r.passives, { id: p, level: 1 }],
        player:
          p === "tallow"
            ? { ...r.player, hp: r.player.hp + C.TALLOW_HP_PER_LEVEL }
            : r.player,
      };
    } else {
      const w = id as C.WeaponId,
        held = r.weapons.find((v) => v.id === w);
      r = {
        ...r,
        weapons: held
          ? r.weapons.map((v) =>
              v.id === w ? { ...v, level: v.level + 1 } : v,
            )
          : [...r.weapons, { id: w, level: 1, cooldown: 0 }],
      };
    }
    const pending = r.pendingLevelUps - 1;
    r = { ...r, pendingLevelUps: pending, offers: [] };
    return {
      ...s,
      screen: pending ? "levelup" : "playing",
      menuIndex: 0,
      run: pending ? offers(r) : r,
    };
  }
  return s;
}
function spawn(r: RunState, type: C.EnemyId, x: number, y: number): RunState {
  const e = C.ENEMIES[type],
    d = dist(r.player.x - x, r.player.y - y) || 1;
  const hp =
    e.hp *
    (e.rank === "common"
      ? 1 + C.HP_SCALE_PER_MINUTE * Math.floor(r.tick / C.TICK_HZ / 60)
      : 1);
  return {
    ...r,
    nextId: r.nextId + 1,
    enemies: [
      ...r.enemies,
      {
        id: r.nextId,
        type,
        x,
        y,
        hp,
        maxHp: hp,
        heading: { x: (r.player.x - x) / d, y: (r.player.y - y) / d },
        age: 0,
        contactCooldown: 0,
      },
    ],
  };
}
function damage(r: RunState, enemy: number, amount: number): RunState {
  return {
    ...r,
    enemies: r.enemies.map((e) =>
      e.id === enemy ? { ...e, hp: e.hp - amount } : e,
    ),
  };
}
function fire(r: RunState, w: WeaponSlot): RunState {
  const row = levelRow(w),
    st = stats(r),
    p = r.player,
    id = w.id,
    base = baseOf(id),
    dmg = row.damage * st.damage,
    rad = (row.radius ?? row.area ?? 0) * st.area,
    amount = Math.floor((row.amount ?? 1) + st.amount);
  const near = [...r.enemies].sort(
      (a, b) => dist(a.x - p.x, a.y - p.y) - dist(b.x - p.x, b.y - p.y),
    )[0],
    aim = near
      ? Math.atan2(near.y - p.y, near.x - p.x)
      : p.facing === "right"
        ? 0
        : Math.PI;
  let next = r;
  const zone = (
    kind: ZoneState["kind"],
    x: number,
    y: number,
    radius: number,
    ttl: number | null,
    width?: number,
    height?: number,
  ) => {
    next = {
      ...next,
      nextId: next.nextId + 1,
      zones: [
        ...next.zones,
        {
          id: next.nextId,
          weapon: id,
          kind,
          x,
          y,
          radius,
          width,
          height,
          damage: dmg,
          ttl,
          hits: [],
        },
      ],
    };
  };
  const bolt = (x: number, y: number, angle: number, pierce: number) => {
    const speed = row.speed;
    next = {
      ...next,
      nextId: next.nextId + 1,
      projectiles: [
        ...next.projectiles,
        {
          id: next.nextId,
          weapon: id,
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          ax: base === "sconce" ? -Math.cos(angle) * C.SCONCE_DECEL : 0,
          ay: base === "sconce" ? -Math.sin(angle) * C.SCONCE_DECEL : 0,
          radius: rad,
          damage: dmg,
          ttl: row.duration,
          pierce,
          hits: [],
        },
      ],
    };
  };
  if (base === "taper")
    for (let i = 0; i < Math.min(id === "pyre" ? 2 : amount, 2); i++) {
      const sign =
          i === 0
            ? p.facing === "right"
              ? 1
              : -1
            : -(p.facing === "right" ? 1 : -1),
        width = row.width * st.area,
        height = row.height * st.area,
        x = p.x + (sign * width) / 2;
      zone("slash", x, p.y, 0, C.SLASH_FLASH, width, height);
    }
  else if (base === "ember")
    for (let i = 0; i < amount; i++)
      bolt(p.x, p.y + (i - (amount - 1) / 2) * 8, aim, row.pierce);
  else if (base === "pin")
    for (let i = 0; i < amount; i++)
      bolt(
        p.x,
        p.y + (i - (amount - 1) / 2) * C.PIN_SPREAD,
        p.facing === "right" ? 0 : Math.PI,
        row.pierce,
      );
  else if (base === "shard" || base === "sconce")
    for (let i = 0; i < amount; i++)
      bolt(
        p.x,
        p.y,
        aim +
          ((i - (amount - 1) / 2) *
            (base === "shard" ? C.SHARD_SPREAD : C.SCONCE_SPREAD) *
            Math.PI) /
            180,
        C.INFINITE_PIERCE,
      );
  else if (base === "lantern")
    for (let i = 0; i < amount; i++) {
      const a = (2 * Math.PI * i) / amount;
      zone(
        "lantern",
        p.x + Math.cos(a) * row.orbit * st.area,
        p.y + Math.sin(a) * row.orbit * st.area,
        rad,
        row.duration,
      );
    }
  else if (base === "oil-splash")
    for (let i = 0; i < amount; i++) {
      const offset = next.nextPuddleOffset;
      const x = p.x + (offset?.x ?? (Math.random() - 0.5) * C.OIL_SCATTER * 2),
        y = p.y + (offset?.y ?? (Math.random() - 0.5) * C.OIL_SCATTER * 2);
      zone("puddle", x, y, rad, row.duration);
      next = { ...next, nextPuddleOffset: null };
    }
  else if (base === "spark")
    for (let i = 0; i < amount; i++) {
      const targets = next.enemies.filter(
        (e) => dist(e.x - p.x, e.y - p.y) < C.SPARK_RANGE,
      );
      const e =
        targets.find((e) => e.id === next.nextStrikeTarget) ??
        targets[Math.floor(Math.random() * targets.length)];
      if (e) zone("strike", e.x, e.y, rad, C.SPARK_FLASH);
      next = { ...next, nextStrikeTarget: null };
    }
  else if (base === "flare") zone("burst", p.x, p.y, rad, C.FLARE_FLASH);
  else if (
    base === "halo" &&
    !next.zones.some((z) => z.weapon === id && z.kind === "aura")
  )
    zone("aura", p.x, p.y, rad, null);
  return next;
}
function chest(r: RunState): RunState {
  for (const e of C.EVOLUTION_IDS) {
    const recipe = C.EVOLUTIONS[e],
      w = r.weapons.find(
        (v) => v.id === recipe.from && v.level === C.MAX_WEAPON_LEVEL,
      );
    if (w && r.passives.some((p) => p.id === recipe.passive))
      return {
        ...r,
        weapons: r.weapons.map((v) =>
          v === w ? { id: e, level: 1, cooldown: 0 } : v,
        ),
        chestResult: { kind: "evolve", weapon: e },
      };
  }
  const choices = [
    ...r.weapons
      .filter((w) => !evolved(w.id) && w.level < C.MAX_WEAPON_LEVEL)
      .map((w) => w.id),
    ...r.passives
      .filter((p) => p.level < C.PASSIVES[p.id].maxLevel)
      .map((p) => p.id),
  ];
  const choice =
    choices.find((v) => v === r.nextChestItem) ??
    choices[Math.floor(Math.random() * choices.length)];
  if (choice) {
    const weapons = r.weapons.map((w) =>
        w.id === choice ? { ...w, level: w.level + 1 } : w,
      ),
      passives = r.passives.map((p) =>
        p.id === choice ? { ...p, level: p.level + 1 } : p,
      ),
      level =
        [...weapons, ...passives].find((v) => v.id === choice)?.level ?? 1;
    return {
      ...r,
      weapons,
      passives,
      nextChestItem: null,
      chestResult: { kind: "level", item: choice, level },
      player:
        choice === "tallow"
          ? { ...r.player, hp: r.player.hp + C.TALLOW_HP_PER_LEVEL }
          : r.player,
    };
  }
  return {
    ...r,
    player: {
      ...r.player,
      hp: Math.min(stats(r).maxHp, r.player.hp + C.CHEST_HEAL),
    },
    chestResult: { kind: "heal" },
  };
}
function simulate(
  s: WickState,
  dx: number,
  dy: number,
  audio: UpdateApi["audio"],
): WickState {
  let r: RunState = {
    ...s.run,
    tick: s.run.tick + 1,
    moving: dx !== 0 || dy !== 0,
    moveTicks: s.run.moveTicks + (dx !== 0 || dy !== 0 ? 1 : 0),
    puffs: s.run.puffs
      .map((p) => ({ ...p, age: p.age + C.TICK_DT }))
      .filter((p) => p.age < C.PUFF_TIME),
  };
  const st = stats(r),
    len = dist(dx, dy);
  r = {
    ...r,
    player: {
      ...r.player,
      x: r.player.x + (len ? dx / len : 0) * st.speed * C.TICK_DT,
      y: r.player.y + (len ? dy / len : 0) * st.speed * C.TICK_DT,
      facing: dx ? (dx > 0 ? "right" : "left") : r.player.facing,
      hp: Math.min(st.maxHp, r.player.hp + st.recovery * C.TICK_DT),
    },
    hurtFlash: tickDown(r.hurtFlash),
  };
  r = {
    ...r,
    enemies: r.enemies.map((e) => {
      const age = e.age + C.TICK_DT;
      let heading = e.heading;
      if (e.type !== "gnat") {
        const d = dist(r.player.x - e.x, r.player.y - e.y) || 1;
        heading = { x: (r.player.x - e.x) / d, y: (r.player.y - e.y) / d };
      }
      let x = e.x,
        y = e.y;
      if (s.enemyMotion) {
        x += heading.x * C.ENEMIES[e.type].speed * C.TICK_DT;
        y += heading.y * C.ENEMIES[e.type].speed * C.TICK_DT;
        if (e.type === "wisp") {
          x +=
            -heading.y *
            C.WISP_AMPLITUDE *
            Math.sin((2 * Math.PI * age) / C.WISP_PERIOD) *
            C.TICK_DT;
          y +=
            heading.x *
            C.WISP_AMPLITUDE *
            Math.sin((2 * Math.PI * age) / C.WISP_PERIOD) *
            C.TICK_DT;
        }
      }
      return {
        ...e,
        x,
        y,
        age,
        heading,
        contactCooldown: tickDown(e.contactCooldown),
      };
    }),
  };
  if (s.weaponFire) {
    for (const w of r.weapons) {
      let cooldown = tickDown(w.cooldown);
      if (cooldown === 0 && w.id !== "chandelier") {
        const needsTarget = ["ember", "beacon", "sconce", "spark"].includes(
          w.id,
        );
        const eligible =
          w.id === "spark"
            ? r.enemies.some(
                (e) =>
                  dist(e.x - r.player.x, e.y - r.player.y) <= C.SPARK_RANGE,
              )
            : r.enemies.length > 0;
        if (needsTarget && !eligible) {
          r = {
            ...r,
            weapons: r.weapons.map((v) =>
              v === w ? { ...v, cooldown: 0 } : v,
            ),
          };
          continue;
        }
        r = fire(r, w);
        const row = levelRow(w);
        cooldown =
          Math.max(C.MIN_COOLDOWN, row.cooldown * st.cooldown) +
          (w.id === "lantern" ? row.duration : 0);
      }
      r = {
        ...r,
        weapons: r.weapons.map((v) => (v === w ? { ...v, cooldown } : v)),
      };
    }
  }
  for (const w of r.weapons.filter(
    (w) => w.id === "halo" || w.id === "corona" || w.id === "chandelier",
  )) {
    if (!r.zones.some((z) => z.weapon === w.id)) {
      const row = levelRow(w);
      if (w.id === "chandelier")
        for (let i = 0; i < row.amount + st.amount; i++) {
          const a = (2 * Math.PI * i) / (row.amount + st.amount);
          r = {
            ...r,
            nextId: r.nextId + 1,
            zones: [
              ...r.zones,
              {
                id: r.nextId,
                weapon: w.id,
                kind: "lantern",
                x: r.player.x + Math.cos(a) * row.orbit * st.area,
                y: r.player.y + Math.sin(a) * row.orbit * st.area,
                radius: row.radius * st.area,
                damage: row.damage * st.damage,
                ttl: null,
                hits: [],
              },
            ],
          };
        }
      else r = fire(r, w);
    }
  }
  r = {
    ...r,
    zones: r.zones.filter(
      (z) =>
        r.weapons.some((w) => w.id === z.weapon) ||
        (z.kind !== "aura" &&
          !(z.kind === "lantern" && z.weapon === "chandelier")),
    ),
  };
  const previousIds = new Set(s.run.projectiles.map((p) => p.id));
  r = {
    ...r,
    projectiles: r.projectiles
      .map((p) => {
        if (!previousIds.has(p.id)) return p;
        const ttl = tickDown(p.ttl);
        let x = p.x,
          y = p.y,
          vx = p.vx,
          vy = p.vy;
        if (s.effectMotion) {
          x += vx * C.TICK_DT;
          y += vy * C.TICK_DT;
          vx += p.ax * C.TICK_DT;
          vy += p.ay * C.TICK_DT;
          if (
            p.weapon === "shard" &&
            (Math.abs(x - r.player.x) > C.STAGE_CX ||
              Math.abs(y - r.player.y) > C.STAGE_CY)
          ) {
            if (Math.abs(x - r.player.x) > C.STAGE_CX) vx = -vx;
            if (Math.abs(y - r.player.y) > C.STAGE_CY) vy = -vy;
          }
        }
        return {
          ...p,
          x,
          y,
          vx,
          vy,
          ttl,
          hits: p.hits
            .map((h) => ({ ...h, cooldown: tickDown(h.cooldown) }))
            .filter((h) => h.cooldown > 0),
        };
      })
      .filter((p) => p.ttl > 0),
    zones: r.zones
      .map((z) => {
        const ttl = z.ttl === null ? null : tickDown(z.ttl);
        let x = z.x,
          y = z.y;
        if (z.kind === "aura") {
          x = r.player.x;
          y = r.player.y;
        }
        if (z.kind === "lantern") {
          const mates = r.zones.filter(
              (v) => v.weapon === z.weapon && v.kind === "lantern",
            ),
            i = mates.findIndex((v) => v.id === z.id),
            row = levelRow(
              r.weapons.find((w) => w.id === z.weapon) ?? {
                id: z.weapon,
                level: 1,
                cooldown: 0,
              },
            ),
            a =
              (2 * Math.PI * i) / mates.length +
              (r.tick * C.TICK_DT * C.LANTERN_ANGULAR_SPEED * Math.PI) / 180;
          x = r.player.x + Math.cos(a) * row.orbit * st.area;
          y = r.player.y + Math.sin(a) * row.orbit * st.area;
        }
        return {
          ...z,
          x,
          y,
          ttl,
          hits: z.hits
            .map((h) => ({ ...h, cooldown: tickDown(h.cooldown) }))
            .filter((h) => h.cooldown > 0),
        };
      })
      .filter((z) => z.ttl === null || z.ttl > 0),
  };
  for (const p of r.projectiles) {
    let pierce = p.pierce;
    const hits = [...p.hits];
    for (const e of r.enemies) {
      if (pierce < 0 && p.pierce !== C.INFINITE_PIERCE) break;
      if (
        dist(e.x - p.x, e.y - p.y) <= C.ENEMIES[e.type].radius + p.radius &&
        !hits.some((h) => h.enemy === e.id)
      ) {
        r = damage(r, e.id, p.damage);
        hits.push({
          enemy: e.id,
          cooldown: p.pierce === C.INFINITE_PIERCE ? C.SHARD_REHIT : p.ttl,
        });
        if (pierce !== C.INFINITE_PIERCE) pierce--;
        audio.play(C.CUES.hit);
      }
    }
    r = {
      ...r,
      projectiles: r.projectiles
        .map((v) => (v.id === p.id ? { ...v, pierce, hits } : v))
        .filter((v) => v.pierce >= 0 || v.pierce === C.INFINITE_PIERCE),
    };
  }
  for (const z of r.zones) {
    const pulse =
      z.kind === "aura"
        ? tickDown(
            s.run.weapons.find((w) => w.id === z.weapon)?.cooldown ?? 0,
          ) === 0
        : z.kind === "puddle"
          ? Math.round(
              ((levelRow(
                r.weapons.find((w) => w.id === z.weapon) ?? {
                  id: z.weapon,
                  level: 1,
                  cooldown: 0,
                },
              ).duration ?? 0) -
                (z.ttl ?? 0)) *
                C.TICK_HZ,
            ) %
              Math.round(C.OIL_PULSE * C.TICK_HZ) ===
            0
          : true;
    if (
      ["slash", "strike", "burst"].includes(z.kind) &&
      s.run.zones.some((old) => old.id === z.id)
    )
      continue;
    if (!pulse) continue;
    const hits = [...z.hits];
    for (const e of r.enemies) {
      const overlap =
        z.kind === "slash"
          ? Math.abs(e.x - z.x) <
              (z.width ?? 0) / 2 + C.ENEMIES[e.type].radius &&
            Math.abs(e.y - z.y) < (z.height ?? 0) / 2 + C.ENEMIES[e.type].radius
          : dist(e.x - z.x, e.y - z.y) <= z.radius + C.ENEMIES[e.type].radius;
      if (
        overlap &&
        !hits.some((h) => h.enemy === e.id) &&
        !(z.kind === "burst" && C.FLARE_IMMUNE.includes(e.type))
      ) {
        r = damage(r, e.id, z.damage);
        if (z.kind === "lantern")
          hits.push({ enemy: e.id, cooldown: C.LANTERN_REHIT });
        audio.play(C.CUES.hit);
        if (z.weapon === "pyre")
          r = {
            ...r,
            player: {
              ...r.player,
              hp: Math.min(st.maxHp, r.player.hp + C.PYRE_HEAL),
            },
          };
      }
    }
    r = {
      ...r,
      zones: r.zones.map((v) => (v.id === z.id ? { ...v, hits } : v)),
    };
  }
  const dead = r.enemies.filter((e) => e.hp <= 0);
  r = {
    ...r,
    enemies: r.enemies.filter((e) => e.hp > 0),
    kills: r.kills + dead.length,
    puffs: [...r.puffs, ...dead.map((e) => ({ x: e.x, y: e.y, age: 0 }))],
  };
  for (const e of dead) {
    audio.play(C.CUES.kill);
    if (s.drops) {
      const kind = C.ENEMIES[e.type].drop;
      if (kind === "chest")
        r = {
          ...r,
          nextId: r.nextId + 1,
          pickups: [
            ...r.pickups,
            { id: r.nextId, kind: "chest", x: e.x, y: e.y },
          ],
        };
      else if (kind) {
        r = {
          ...r,
          nextId: r.nextId + 1,
          gems: [
            ...r.gems,
            { id: r.nextId, tier: kind, x: e.x, y: e.y, attracted: false },
          ],
        };
        const drop =
          r.nextDrop ??
          (Math.random() < C.BREAD_CHANCE
            ? "bread"
            : Math.random() < C.DRAFT_CHANCE
              ? "draft"
              : "none");
        r = { ...r, nextDrop: null };
        if (drop !== "none")
          r = {
            ...r,
            nextId: r.nextId + 1,
            pickups: [
              ...r.pickups,
              { id: r.nextId, kind: drop, x: e.x, y: e.y },
            ],
          };
      }
    }
  }
  if (s.enemyContact)
    for (const e of r.enemies) {
      if (
        e.contactCooldown === 0 &&
        dist(e.x - r.player.x, e.y - r.player.y) <
          C.ENEMIES[e.type].radius + C.PLAYER_RADIUS
      ) {
        r = {
          ...r,
          player: {
            ...r.player,
            hp:
              r.player.hp -
              Math.max(C.MIN_DAMAGE_TAKEN, C.ENEMIES[e.type].damage - st.armor),
          },
          hurtFlash: C.HURT_FLASH,
          enemies: r.enemies.map((v) =>
            v.id === e.id ? { ...v, contactCooldown: C.CONTACT_COOLDOWN } : v,
          ),
        };
        audio.play(C.CUES.hurt);
      }
    }
  let chestOpen = false;
  for (const p of r.pickups.filter(
    (p) =>
      dist(p.x - r.player.x, p.y - r.player.y) <
      C.PICKUP_ITEM_RADIUS + C.PLAYER_RADIUS,
  )) {
    r = { ...r, pickups: r.pickups.filter((v) => v.id !== p.id) };
    if (p.kind === "bread")
      r = {
        ...r,
        player: {
          ...r.player,
          hp: Math.min(st.maxHp, r.player.hp + C.BREAD_HEAL),
        },
      };
    if (p.kind === "draft")
      r = { ...r, gems: r.gems.map((g) => ({ ...g, attracted: true })) };
    if (p.kind === "chest") {
      r = chest(r);
      chestOpen = true;
      audio.play(C.CUES.chest);
    } else audio.play(C.CUES.pickup);
  }
  const oldGems = new Set(s.run.gems.map((g) => g.id));
  const gems = [] as RunState["gems"] extends readonly (infer T)[]
    ? T[]
    : never;
  let xp = r.xp,
    level = r.level,
    pending = r.pendingLevelUps;
  for (const g of r.gems) {
    const d = dist(g.x - r.player.x, g.y - r.player.y);
    const attracted = g.attracted || d <= st.pickup;
    const step =
      attracted && oldGems.has(g.id) ? Math.min(d, C.GEM_SPEED * C.TICK_DT) : 0;
    const x = g.x + (d ? ((r.player.x - g.x) / d) * step : 0),
      y = g.y + (d ? ((r.player.y - g.y) / d) * step : 0);
    if (dist(x - r.player.x, y - r.player.y) <= C.COLLECT_RADIUS) {
      xp += C.GEM_VALUES[g.tier] * st.xp;
      audio.play(C.CUES.gem);
    } else gems.push({ ...g, x, y, attracted });
  }
  if (s.progression)
    while (xp >= levelNeed(level)) {
      xp -= levelNeed(level);
      level++;
      pending++;
      audio.play(C.CUES.levelUp);
    }
  r = { ...r, gems, xp, level, pendingLevelUps: pending };
  if (s.despawning)
    r = {
      ...r,
      enemies: r.enemies.filter(
        (e) =>
          C.ENEMIES[e.type].rank !== "common" ||
          dist(e.x - r.player.x, e.y - r.player.y) < C.DESPAWN_DISTANCE,
      ),
    };
  const time = r.tick / C.TICK_HZ,
    window = Math.min(19, Math.floor(time / C.SPAWN_WINDOW)),
    prevWindow = Math.min(
      19,
      Math.floor((r.tick - 1) / C.TICK_HZ / C.SPAWN_WINDOW),
    );
  if (s.spawning) {
    let timer = window !== prevWindow ? 0 : tickDown(r.spawnTimer);
    if (timer === 0) {
      const row = C.SPAWN_WINDOWS[window],
        commons = r.enemies.filter(
          (e) => C.ENEMIES[e.type].rank === "common" && e.type !== "gnat",
        ).length;
      if (commons < row.cap) {
        const type =
            r.nextSpawnType ??
            row.types[Math.floor(Math.random() * row.types.length)],
          angle = ((r.nextSpawnAngle ?? Math.random() * 360) * Math.PI) / 180;
        r = spawn(
          r,
          type,
          r.player.x + Math.cos(angle) * C.SPAWN_DISTANCE,
          r.player.y + Math.sin(angle) * C.SPAWN_DISTANCE,
        );
        r = { ...r, nextSpawnAngle: null, nextSpawnType: null };
      }
      timer = row.interval;
    }
    r = { ...r, spawnTimer: timer };
  }
  if (s.events)
    for (const event of C.EVENTS) {
      if (time >= event.time && !r.firedEvents.includes(event.time)) {
        const angle =
          ((r.nextSwarmAngle ?? r.nextSpawnAngle ?? Math.random() * 360) *
            Math.PI) /
          180;
        r = {
          ...r,
          firedEvents: [...r.firedEvents, event.time],
          nextSwarmAngle: null,
          nextSpawnAngle: null,
        };
        if (event.kind === "spawn")
          r = spawn(
            r,
            event.type,
            r.player.x + Math.cos(angle) * C.SPAWN_DISTANCE,
            r.player.y + Math.sin(angle) * C.SPAWN_DISTANCE,
          );
        else
          for (let i = 0; i < C.SWARM_SIZE; i++) {
            const q = (i / (C.SWARM_SIZE - 1) - 0.5) * C.SWARM_LINE;
            r = spawn(
              r,
              event.type,
              r.player.x +
                Math.cos(angle) * C.SPAWN_DISTANCE -
                Math.sin(angle) * q,
              r.player.y +
                Math.sin(angle) * C.SPAWN_DISTANCE +
                Math.cos(angle) * q,
            );
          }
      }
    }
  if (time >= C.DAWN_TIME) {
    audio.play(C.CUES.dawn);
    return { ...s, screen: "dawn", run: r, menuIndex: 0 };
  }
  if (r.player.hp <= 0) {
    audio.play(C.CUES.fallen);
    return { ...s, screen: "fallen", run: r, menuIndex: 0 };
  }

  if (chestOpen) return { ...s, screen: "chest", run: r, menuIndex: 0 };
  if (pending > 0)
    return { ...s, screen: "levelup", run: offers(r), menuIndex: 0 };
  return { ...s, run: r };
}
export interface WickRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export type NextDrop = "bread" | "draft" | "none";

export type WickSnapshot = ReturnType<typeof snapshot>;

export interface WickDebugApi {
  readonly version: number;
  reset(state: DeepReadonly<WickState>): WickState;
  snapshot(state: DeepReadonly<WickState>): WickSnapshot;
  reconcile(state: DeepReadonly<WickState>): WickState;
  menuRects(state: DeepReadonly<WickState>): readonly WickRect[];
  tabRects(state: DeepReadonly<WickState>): readonly WickRect[];
  setScreen(state: DeepReadonly<WickState>, name: Screen): WickState;
  choose(state: DeepReadonly<WickState>, index: number): WickState;
  setSpawning(state: DeepReadonly<WickState>, on: boolean): WickState;
  setEvents(state: DeepReadonly<WickState>, on: boolean): WickState;
  setDespawning(state: DeepReadonly<WickState>, on: boolean): WickState;
  setEnemyMotion(state: DeepReadonly<WickState>, on: boolean): WickState;
  setEnemyContact(state: DeepReadonly<WickState>, on: boolean): WickState;
  setWeaponFire(state: DeepReadonly<WickState>, on: boolean): WickState;
  setEffectMotion(state: DeepReadonly<WickState>, on: boolean): WickState;
  setDrops(state: DeepReadonly<WickState>, on: boolean): WickState;
  setProgression(state: DeepReadonly<WickState>, on: boolean): WickState;
  setTick(state: DeepReadonly<WickState>, tick: number): WickState;
  setSpawnTimer(state: DeepReadonly<WickState>, seconds: number): WickState;
  setNextSpawnAngle(state: DeepReadonly<WickState>, degrees: number): WickState;
  setNextSwarmAngle(state: DeepReadonly<WickState>, degrees: number): WickState;
  setNextSpawnType(state: DeepReadonly<WickState>, id: EnemyId): WickState;
  setNextPuddleOffset(
    state: DeepReadonly<WickState>,
    dx: number,
    dy: number,
  ): WickState;
  setNextStrikeTarget(state: DeepReadonly<WickState>, id: number): WickState;
  setNextChestItem(
    state: DeepReadonly<WickState>,
    id: WeaponId | PassiveId,
  ): WickState;
  setNextDrop(state: DeepReadonly<WickState>, kind: NextDrop): WickState;
  rollDrop(state: DeepReadonly<WickState>): NextDrop;
  setPlayerPosition(
    state: DeepReadonly<WickState>,
    x: number,
    y: number,
  ): WickState;
  setFacing(state: DeepReadonly<WickState>, facing: Facing): WickState;
  setHp(state: DeepReadonly<WickState>, hp: number): WickState;
  setLevel(state: DeepReadonly<WickState>, level: number): WickState;
  setXp(state: DeepReadonly<WickState>, xp: number): WickState;
  setKills(state: DeepReadonly<WickState>, kills: number): WickState;
  setPendingLevelUps(state: DeepReadonly<WickState>, count: number): WickState;
  setNextOffers(
    state: DeepReadonly<WickState>,
    ids: readonly OfferId[],
  ): WickState;
  setWeapon(
    state: DeepReadonly<WickState>,
    slot: number,
    id: WeaponId,
    level: number,
  ): WickState;
  setWeaponCooldown(
    state: DeepReadonly<WickState>,
    slot: number,
    seconds: number,
  ): WickState;
  removeWeapon(state: DeepReadonly<WickState>, slot: number): WickState;
  setPassive(
    state: DeepReadonly<WickState>,
    slot: number,
    id: PassiveId,
    level: number,
  ): WickState;
  removePassive(state: DeepReadonly<WickState>, slot: number): WickState;
  spawnEnemy(
    state: DeepReadonly<WickState>,
    type: EnemyId,
    x: number,
    y: number,
  ): WickState;
  setEnemyPosition(
    state: DeepReadonly<WickState>,
    id: number,
    x: number,
    y: number,
  ): WickState;
  setEnemyHp(state: DeepReadonly<WickState>, id: number, hp: number): WickState;
  setEnemyHeading(
    state: DeepReadonly<WickState>,
    id: number,
    hx: number,
    hy: number,
  ): WickState;
  setEnemyAge(
    state: DeepReadonly<WickState>,
    id: number,
    seconds: number,
  ): WickState;
  setEnemyContactCooldown(
    state: DeepReadonly<WickState>,
    id: number,
    seconds: number,
  ): WickState;
  removeEnemy(state: DeepReadonly<WickState>, id: number): WickState;
  clearEnemies(state: DeepReadonly<WickState>): WickState;
  spawnProjectile(
    state: DeepReadonly<WickState>,
    weapon: "ember" | "pin" | "shard" | "sconce" | "beacon" | "hail",
    x: number,
    y: number,
    vx: number,
    vy: number,
    pierce: number,
  ): WickState;
  clearProjectiles(state: DeepReadonly<WickState>): WickState;
  spawnPuddle(
    state: DeepReadonly<WickState>,
    weapon: "oil-splash" | "blaze",
    x: number,
    y: number,
  ): WickState;
  clearZones(state: DeepReadonly<WickState>): WickState;
  spawnGem(
    state: DeepReadonly<WickState>,
    tier: GemTier,
    x: number,
    y: number,
  ): WickState;
  setGemAttracted(
    state: DeepReadonly<WickState>,
    id: number,
    attracted: boolean,
  ): WickState;
  clearGems(state: DeepReadonly<WickState>): WickState;
  spawnPickup(
    state: DeepReadonly<WickState>,
    kind: PickupKind,
    x: number,
    y: number,
  ): WickState;
  clearPickups(state: DeepReadonly<WickState>): WickState;
}
const writable = (s: DeepReadonly<WickState>): WickState => s as WickState;
const mutateRun = (
  s: DeepReadonly<WickState>,
  patch: Partial<RunState>,
): WickState => ({ ...writable(s), run: { ...writable(s).run, ...patch } });
const menuRects = (s: DeepReadonly<WickState>): WickRect[] => {
  const n =
    s.screen === "title"
      ? 3
      : s.screen === "levelup"
        ? s.run.offers.length
        : s.screen === "paused" || s.screen === "fallen" || s.screen === "dawn"
          ? 2
          : s.screen === "almanac"
            ? Math.min(
                C.ALMANAC_ROWS,
                almanacEntries(s.almanacTab).length - s.almanacScroll,
              )
            : s.screen === "howto" || s.screen === "chest"
              ? 1
              : 0;
  return Array.from({ length: n }, (_, i) =>
    s.screen === "almanac"
      ? { x: 98, y: 168 + i * 45, width: 460, height: 40 }
      : s.screen === "levelup"
        ? { x: 350, y: 230 + i * 105, width: 580, height: 90 }
        : s.screen === "howto" || s.screen === "chest"
          ? { x: 430, y: 605, width: 420, height: 65 }
          : {
              x: 425,
              y: (s.screen === "title" ? 398 : 350) + i * 74,
              width: 430,
              height: 62,
            },
  );
};
const tabRects = (): WickRect[] =>
  C.ALMANAC_TABS.map((_, i) => ({
    x: 90 + i * 272,
    y: 88,
    width: 255,
    height: 56,
  }));
const almanacEntries = (tab: number): string[] =>
  tab === 0
    ? [...C.BASE_WEAPON_IDS, ...C.EVOLUTION_IDS]
    : tab === 1
      ? [...C.PASSIVE_IDS]
      : tab === 2
        ? [...C.ENEMY_IDS]
        : [...C.GEM_TIERS, ...C.PICKUP_KINDS];
const snapshot = (s: DeepReadonly<WickState>) => {
  const r = s.run,
    st = stats(r as RunState);
  return {
    ...s,
    run: {
      ...r,
      time: r.tick / C.TICK_HZ,
      xpToNext: levelNeed(r.level),
      maxHp: st.maxHp,
      armor: st.armor,
      moveSpeed: st.speed,
      pickupRadius: st.pickup,
      pool: s.screen === "levelup" ? pool(r as RunState) : [],
      spawnWindow: Math.min(
        19,
        Math.floor(r.tick / C.TICK_HZ / C.SPAWN_WINDOW),
      ),
      aliveCommons: r.enemies.filter(
        (e) => C.ENEMIES[e.type].rank === "common" && e.type !== "gnat",
      ).length,
    },
    version: C.WICK_DEBUG_VERSION,
  };
};
const debug: WickDebugApi = {
  version: C.WICK_DEBUG_VERSION,
  reset: (s) => ({ ...initial(), muted: s.muted }),
  snapshot,
  reconcile: (s) => writable(s),
  menuRects,
  tabRects,
  setScreen: (s, name) => ({
    ...writable(s),
    screen: name,
    menuIndex: 0,
    almanacTab: 0,
    almanacScroll: 0,
    accumulator: 0,
  }),
  choose: (s, index) => select(writable(s), index),
  setSpawning: (s, on) => ({ ...writable(s), spawning: on }),
  setEvents: (s, on) => ({ ...writable(s), events: on }),
  setDespawning: (s, on) => ({ ...writable(s), despawning: on }),
  setEnemyMotion: (s, on) => ({ ...writable(s), enemyMotion: on }),
  setEnemyContact: (s, on) => ({ ...writable(s), enemyContact: on }),
  setWeaponFire: (s, on) => ({ ...writable(s), weaponFire: on }),
  setEffectMotion: (s, on) => ({ ...writable(s), effectMotion: on }),
  setDrops: (s, on) => ({ ...writable(s), drops: on }),
  setProgression: (s, on) => ({ ...writable(s), progression: on }),
  setTick: (s, tick) => mutateRun(s, { tick }),
  setSpawnTimer: (s, spawnTimer) => mutateRun(s, { spawnTimer }),
  setNextSpawnAngle: (s, nextSpawnAngle) => mutateRun(s, { nextSpawnAngle }),
  setNextSwarmAngle: (s, nextSwarmAngle) => mutateRun(s, { nextSwarmAngle }),
  setNextSpawnType: (s, nextSpawnType) => mutateRun(s, { nextSpawnType }),
  setNextPuddleOffset: (s, x, y) =>
    mutateRun(s, { nextPuddleOffset: { x, y } }),
  setNextStrikeTarget: (s, nextStrikeTarget) =>
    mutateRun(s, { nextStrikeTarget }),
  setNextChestItem: (s, nextChestItem) => mutateRun(s, { nextChestItem }),
  setNextDrop: (s, nextDrop) => mutateRun(s, { nextDrop }),
  rollDrop: () =>
    Math.random() < C.BREAD_CHANCE
      ? "bread"
      : Math.random() < C.DRAFT_CHANCE
        ? "draft"
        : "none",
  setPlayerPosition: (s, x, y) =>
    mutateRun(s, { player: { ...s.run.player, x, y } }),
  setFacing: (s, facing: Facing) =>
    mutateRun(s, { player: { ...s.run.player, facing } }),
  setHp: (s, hp) => mutateRun(s, { player: { ...s.run.player, hp } }),
  setLevel: (s, level) => mutateRun(s, { level }),
  setXp: (s, xp) => mutateRun(s, { xp }),
  setKills: (s, kills) => mutateRun(s, { kills }),
  setPendingLevelUps: (s, pendingLevelUps) => mutateRun(s, { pendingLevelUps }),
  setNextOffers: (s, nextOffers) =>
    mutateRun(s, { nextOffers: [...nextOffers] }),
  setWeapon: (s, slot, id, level) =>
    mutateRun(s, {
      weapons: put(s.run.weapons, slot, { id, level, cooldown: 0 }),
    }),
  setWeaponCooldown: (s, slot, cooldown) =>
    mutateRun(s, {
      weapons: s.run.weapons.map((v, i) =>
        i === slot ? { ...v, cooldown } : v,
      ),
    }),
  removeWeapon: (s, slot) =>
    mutateRun(s, { weapons: s.run.weapons.filter((_, i) => i !== slot) }),
  setPassive: (s, slot, id, level) =>
    mutateRun(s, { passives: put(s.run.passives, slot, { id, level }) }),
  removePassive: (s, slot) =>
    mutateRun(s, { passives: s.run.passives.filter((_, i) => i !== slot) }),
  spawnEnemy: (s, type, x, y) => ({
    ...writable(s),
    run: spawn(s.run as RunState, type, x, y),
  }),
  setEnemyPosition: (s, id, x, y) =>
    mutateRun(s, {
      enemies: s.run.enemies.map((e) => (e.id === id ? { ...e, x, y } : e)),
    }),
  setEnemyHp: (s, id, hp) =>
    mutateRun(s, {
      enemies: s.run.enemies.map((e) => (e.id === id ? { ...e, hp } : e)),
    }),
  setEnemyHeading: (s, id, hx, hy) =>
    mutateRun(s, {
      enemies: s.run.enemies.map((e) =>
        e.id === id ? { ...e, heading: { x: hx, y: hy } } : e,
      ),
    }),
  setEnemyAge: (s, id, age) =>
    mutateRun(s, {
      enemies: s.run.enemies.map((e) => (e.id === id ? { ...e, age } : e)),
    }),
  setEnemyContactCooldown: (s, id, contactCooldown) =>
    mutateRun(s, {
      enemies: s.run.enemies.map((e) =>
        e.id === id ? { ...e, contactCooldown } : e,
      ),
    }),
  removeEnemy: (s, id) =>
    mutateRun(s, { enemies: s.run.enemies.filter((e) => e.id !== id) }),
  clearEnemies: (s) => mutateRun(s, { enemies: [] }),
  spawnProjectile: (s, weapon, x, y, vx, vy, pierce) => {
    const w = s.run.weapons.find((v) => v.id === weapon) ?? {
        id: weapon,
        level: 1,
        cooldown: 0,
      },
      row = levelRow(w);
    return mutateRun(s, {
      nextId: s.run.nextId + 1,
      projectiles: [
        ...s.run.projectiles,
        {
          id: s.run.nextId,
          weapon,
          x,
          y,
          vx,
          vy,
          ax: 0,
          ay: 0,
          radius: row.radius,
          damage: row.damage,
          ttl: row.duration,
          pierce,
          hits: [],
        },
      ],
    });
  },
  clearProjectiles: (s) => mutateRun(s, { projectiles: [] }),
  spawnPuddle: (s, weapon, x, y) => {
    const row = levelRow(
      s.run.weapons.find((v) => v.id === weapon) ?? {
        id: weapon,
        level: 1,
        cooldown: 0,
      },
    );
    return mutateRun(s, {
      nextId: s.run.nextId + 1,
      zones: [
        ...s.run.zones,
        {
          id: s.run.nextId,
          weapon,
          kind: "puddle",
          x,
          y,
          radius: row.radius,
          damage: row.damage,
          ttl: row.duration,
          hits: [],
        },
      ],
    });
  },
  clearZones: (s) => mutateRun(s, { zones: [] }),
  spawnGem: (s, tier, x, y) =>
    mutateRun(s, {
      nextId: s.run.nextId + 1,
      gems: [...s.run.gems, { id: s.run.nextId, tier, x, y, attracted: false }],
    }),
  setGemAttracted: (s, id, attracted) =>
    mutateRun(s, {
      gems: s.run.gems.map((g) => (g.id === id ? { ...g, attracted } : g)),
    }),
  clearGems: (s) => mutateRun(s, { gems: [] }),
  spawnPickup: (s, kind, x, y) =>
    mutateRun(s, {
      nextId: s.run.nextId + 1,
      pickups: [...s.run.pickups, { id: s.run.nextId, kind, x, y }],
    }),
  clearPickups: (s) => mutateRun(s, { pickups: [] }),
};
function put<T>(arr: readonly T[], slot: number, value: T): T[] {
  const out = [...arr];
  out[slot] = value;
  return out;
}
function contains(rect: WickRect, x: number, y: number) {
  return (
    x >= rect.x &&
    x < rect.x + rect.width &&
    y >= rect.y &&
    y < rect.y + rect.height
  );
}
let armed = -1;
function handleInput(current: WickState, api: UpdateApi): WickState {
  let s = current;
  const edges = Object.fromEntries(
    C.ACTIONS.map((a) => [a, api.input.pressed(a)]),
  ) as Record<C.ActionName, boolean>;
  if (edges.mute) api.audio.setMuted(!api.audio.muted());
  const screen = s.screen;
  if (screen === "playing") {
    if (edges.pause || edges.back) s = { ...s, screen: "paused", menuIndex: 0 };
  } else {
    const n =
      screen === "almanac"
        ? almanacEntries(s.almanacTab).length
        : menuRects(s).length;
    if ((edges.up || edges.down) && n) {
      s = { ...s, menuIndex: (s.menuIndex + (edges.down ? 1 : -1) + n) % n };
      api.audio.play(C.CUES.menuMove);
    }
    if (screen === "almanac" && (edges.left || edges.right)) {
      const tab =
        (s.almanacTab + (edges.right ? 1 : -1) + C.ALMANAC_TABS.length) %
        C.ALMANAC_TABS.length;
      s = { ...s, almanacTab: tab, almanacScroll: 0, menuIndex: 0 };
      api.audio.play(C.CUES.menuMove);
    }
    if (edges.back) {
      if (screen === "howto" || screen === "almanac")
        s = {
          ...s,
          screen: "title",
          run: idleRun(),
          menuIndex: screen === "howto" ? 2 : 1,
          almanacTab: 0,
          almanacScroll: 0,
        };
      else if (screen === "paused") s = { ...s, screen: "playing" };
      else if (screen === "fallen" || screen === "dawn")
        s = { ...s, screen: "title", run: idleRun(), menuIndex: 0 };
    } else if (edges.pause && screen === "paused")
      s = { ...s, screen: "playing" };
    else if (edges.confirm && screen !== "almanac" && screen !== "howto") {
      s = select(s, s.menuIndex);
      api.audio.play(C.CUES.menuConfirm);
    }
  }
  const pointer = api.input.pointer(),
    pressed = api.input.pointerPressed(),
    released = api.input.pointerReleased();
  if (s.screen === screen && screen !== "playing") {
    const rects = menuRects(s),
      i = rects.findIndex((rect) => contains(rect, pointer.x, pointer.y));
    const ti =
      screen === "almanac"
        ? tabRects().findIndex((rect) => contains(rect, pointer.x, pointer.y))
        : -1;
    if (pressed) armed = ti >= 0 ? 100 + ti : i;
    if (released) {
      if (armed === i && i >= 0 && ti < 0) {
        if (screen === "almanac") s = { ...s, menuIndex: s.almanacScroll + i };
        else if (screen === "howto")
          s = { ...s, screen: "title", menuIndex: 2 };
        else s = select({ ...s, menuIndex: i }, i);
        api.audio.play(C.CUES.menuConfirm);
      }
      if (armed === 100 + ti && ti >= 0) {
        s = { ...s, almanacTab: ti, almanacScroll: 0, menuIndex: 0 };
        api.audio.play(C.CUES.menuMove);
      }
      armed = -1;
    } else if (pressed && i >= 0 && screen === "almanac")
      s = { ...s, menuIndex: s.almanacScroll + i };
    else if (
      !pointer.down &&
      pointer.device === "mouse" &&
      i >= 0 &&
      s.menuIndex !== i &&
      screen !== "almanac"
    ) {
      s = { ...s, menuIndex: i };
      api.audio.play(C.CUES.menuMove);
    }
    if (screen === "almanac") {
      const wheel = api.input.wheel(),
        count = almanacEntries(s.almanacTab).length;
      const rows = Math.trunc(wheel.y / C.WHEEL_ROW);
      if (rows)
        s = {
          ...s,
          almanacScroll: Math.max(
            0,
            Math.min(count - C.ALMANAC_ROWS, s.almanacScroll + rows),
          ),
        };
      if (s.menuIndex < s.almanacScroll)
        s = { ...s, almanacScroll: s.menuIndex };
      if (s.menuIndex >= s.almanacScroll + C.ALMANAC_ROWS)
        s = { ...s, almanacScroll: s.menuIndex - C.ALMANAC_ROWS + 1 };
    }
  }
  return s;
}
const drawImg = (
  ctx: CanvasRenderingContext2D,
  image: ImageBitmap | undefined,
  x: number,
  y: number,
  w: number,
  h: number,
) => {
  if (image) ctx.drawImage(image, x - w / 2, y - h / 2, w, h);
};
function world(ctx: CanvasRenderingContext2D, s: DeepReadonly<WickState>) {
  const r = s.run,
    p = r.player;
  ctx.imageSmoothingEnabled = false;
  const tile = img(C.GROUND_TILE_PATH);
  if (tile) {
    const left = Math.floor((p.x - C.STAGE_CX) / C.GROUND_TILE_SIZE),
      top = Math.floor((p.y - C.STAGE_CY) / C.GROUND_TILE_SIZE);
    for (let y = top; y < top + 13; y++)
      for (let x = left; x < left + 22; x++)
        ctx.drawImage(
          tile,
          x * C.GROUND_TILE_SIZE - p.x + C.STAGE_CX,
          y * C.GROUND_TILE_SIZE - p.y + C.STAGE_CY,
          C.GROUND_TILE_SIZE,
          C.GROUND_TILE_SIZE,
        );
  }
  const sx = (x: number) => x - p.x + C.STAGE_CX,
    sy = (y: number) => y - p.y + C.STAGE_CY;
  ctx.fillStyle = "rgba(255,189,77,.08)";
  ctx.beginPath();
  ctx.arc(C.STAGE_CX, C.STAGE_CY, 175, 0, Math.PI * 2);
  ctx.fill();
  for (const z of r.zones) {
    const ef = C.EFFECT_SPRITES[z.weapon],
      age =
        z.ttl === null
          ? r.tick * C.TICK_DT
          : z.kind === "strike"
            ? C.SPARK_FLASH - z.ttl
            : z.kind === "burst"
              ? C.FLARE_FLASH - z.ttl
              : r.tick * C.TICK_DT;
    const frame = Math.max(
      0,
      Math.min(
        ef.frames - 1,
        Math.floor(
          age /
            (z.kind === "strike"
              ? C.SPARK_FLASH / 4
              : z.kind === "burst"
                ? C.FLARE_FLASH / 6
                : C.WALK_FRAME_TIME),
        ) % ef.frames,
      ),
    );
    const image = ef.frames === 1 ? img(ef.path) : sheet(ef.path, frame);
    ctx.globalAlpha =
      z.kind === "puddle" ? 0.72 : z.kind === "aura" ? 0.55 : 0.9;
    drawImg(
      ctx,
      image,
      sx(z.x),
      sy(z.y),
      z.kind === "slash" ? (z.width ?? 0) : z.radius * 2,
      z.kind === "slash" ? (z.height ?? 0) : z.radius * 2,
    );
    ctx.globalAlpha = 1;
  }
  for (const puff of r.puffs)
    drawImg(
      ctx,
      sheet(
        C.PUFF_SHEET.dir,
        Math.min(3, Math.floor(puff.age / (C.PUFF_TIME / 4))),
      ),
      sx(puff.x),
      sy(puff.y),
      C.PUFF_SPRITE_SIZE,
      C.PUFF_SPRITE_SIZE,
    );
  for (const g of r.gems)
    drawImg(
      ctx,
      img(C.GEM_PATHS[g.tier]),
      sx(g.x),
      sy(g.y),
      C.GEM_SPRITE_SIZES[g.tier],
      C.GEM_SPRITE_SIZES[g.tier],
    );
  for (const q of r.pickups)
    drawImg(
      ctx,
      img(C.PICKUP_PATHS[q.kind]),
      sx(q.x),
      sy(q.y),
      C.PICKUP_SPRITE_SIZE,
      C.PICKUP_SPRITE_SIZE,
    );
  for (const e of r.enemies) {
    const image = sheet(
      `${C.ENEMY_SHEET_DIR}/${e.type}`,
      Math.floor(e.age / C.WALK_FRAME_TIME) % C.ENEMY_FRAMES,
    );
    ctx.save();
    ctx.translate(sx(e.x), sy(e.y));
    if (e.heading.x < 0) ctx.scale(-1, 1);
    drawImg(
      ctx,
      image,
      0,
      0,
      C.ENEMIES[e.type].radius * 2,
      C.ENEMIES[e.type].radius * 2,
    );
    ctx.restore();
  }
  for (const q of r.projectiles) {
    const ef = C.EFFECT_SPRITES[q.weapon];
    drawImg(
      ctx,
      ef.frames === 1
        ? img(ef.path)
        : sheet(
            ef.path,
            Math.floor((r.tick * C.TICK_DT) / C.WALK_FRAME_TIME) % ef.frames,
          ),
      sx(q.x),
      sy(q.y),
      q.radius * 2,
      q.radius * 2,
    );
  }
  ctx.save();
  ctx.translate(C.STAGE_CX, C.STAGE_CY);
  if (p.facing === "left") ctx.scale(-1, 1);
  if (r.hurtFlash > 0) ctx.globalAlpha = 0.65;
  drawImg(
    ctx,
    r.moving
      ? sheet(
          C.LAMPLIGHTER_WALK_SHEET.dir,
          Math.floor((r.moveTicks * C.TICK_DT) / C.WALK_FRAME_TIME) %
            C.LAMPLIGHTER_WALK_SHEET.frames,
        )
      : img(C.LAMPLIGHTER_IDLE_PATH),
    0,
    0,
    C.LAMPLIGHTER_SPRITE_WIDTH,
    C.LAMPLIGHTER_SPRITE_HEIGHT,
  );
  ctx.restore();
}
function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size = 22,
  color = "#f4dfb2",
  align: CanvasTextAlign = "left",
) {
  ctx.fillStyle = color;
  ctx.font = `600 ${size}px Georgia, serif`;
  ctx.textAlign = align;
  ctx.fillText(value, x, y);
}
function panel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.fillStyle = "rgba(14,19,29,.94)";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#bc9459";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
function hud(ctx: CanvasRenderingContext2D, s: DeepReadonly<WickState>) {
  const r = s.run,
    st = stats(r as RunState);
  panel(ctx, 22, 18, 330, 70);
  text(
    ctx,
    `LIGHT  ${Math.max(0, Math.ceil(r.player.hp))} / ${st.maxHp}`,
    37,
    47,
    20,
  );
  ctx.fillStyle = "#523b32";
  ctx.fillRect(37, 58, 292, 11);
  ctx.fillStyle = "#e5965b";
  ctx.fillRect(37, 58, 292 * Math.max(0, r.player.hp / st.maxHp), 11);
  panel(ctx, 380, 18, 520, 46);
  text(ctx, `LEVEL ${r.level}`, 399, 48, 19);
  ctx.fillStyle = "#25474d";
  ctx.fillRect(528, 36, 350, 10);
  ctx.fillStyle = "#6ad4c9";
  ctx.fillRect(528, 36, (350 * r.xp) / levelNeed(r.level), 10);
  panel(ctx, 930, 18, 327, 70);
  text(
    ctx,
    `${Math.floor(r.tick / C.TICK_HZ / 60)
      .toString()
      .padStart(2, "0")}:${Math.floor((r.tick / C.TICK_HZ) % 60)
      .toString()
      .padStart(2, "0")}`,
    948,
    53,
    32,
  );
  text(ctx, `KILLS ${r.kills}`, 1120, 53, 17);
  for (let i = 0; i < 12; i++) {
    const x = 24 + i * 60,
      y = 644;
    panel(ctx, x, y, 54, 54);
    const v = i < 6 ? r.weapons[i] : r.passives[i - 6];
    if (v) {
      drawImg(ctx, img(C.ICON_PATHS[v.id]), x + 27, y + 22, 30, 30);
      text(ctx, String(v.level), x + 45, y + 49, 13, "#ffe1a0", "right");
      if (i < 6) {
        ctx.fillStyle = "#2c181e";
        ctx.fillRect(x + 4, y + 47, 35, 3);
        ctx.fillStyle = "#efbb6c";
        ctx.fillRect(
          x + 4,
          y + 47,
          35 *
            (1 -
              Math.min(
                1,
                (v as WeaponSlot).cooldown /
                  (levelRow(v as WeaponSlot).cooldown ?? 1),
              )),
          3,
        );
      }
    }
  }
}
function menu(
  ctx: CanvasRenderingContext2D,
  s: DeepReadonly<WickState>,
  labels: readonly string[],
) {
  const rects = menuRects(s);
  labels.forEach((label, i) => {
    const q = rects[i];
    if (!q) return;
    ctx.fillStyle = s.menuIndex === i ? "#5b3d32" : "#1c2732";
    ctx.fillRect(q.x, q.y, q.width, q.height);
    ctx.strokeStyle = s.menuIndex === i ? "#edbf72" : "#58616a";
    ctx.strokeRect(q.x, q.y, q.width, q.height);
    text(
      ctx,
      label,
      q.x + q.width / 2,
      q.y + q.height / 2 + 8,
      24,
      s.menuIndex === i ? "#fff1ca" : "#a8aeb2",
      "center",
    );
  });
}
function render(ctx: CanvasRenderingContext2D, s: DeepReadonly<WickState>) {
  ctx.fillStyle = BACKGROUND;
  ctx.fillRect(0, 0, C.STAGE_W, C.STAGE_H);
  world(ctx, s);
  if (
    s.screen === "playing" ||
    ["levelup", "chest", "paused", "fallen", "dawn"].includes(s.screen)
  )
    hud(ctx, s);
  if (s.screen === "playing") return;
  ctx.fillStyle = "rgba(6,9,16,.72)";
  ctx.fillRect(0, 0, C.STAGE_W, C.STAGE_H);
  if (s.screen === "title") {
    text(ctx, C.TITLE_TEXT, 640, 235, 118, "#f5d38a", "center");
    text(ctx, C.TAGLINE_TEXT, 640, 291, 24, "#d4a969", "center");
    menu(ctx, s, C.TITLE_ITEMS);
  } else if (s.screen === "howto") {
    panel(ctx, 250, 90, 780, 570);
    text(ctx, "HOW TO PLAY", 640, 152, 46, "#f5d38a", "center");
    const lines = [
      "Move with WASD or the arrow keys. Your tools fire on their own.",
      "Everything in the dark comes toward the light. Touch hurts.",
      "Fallen enemies leave gems. Gems bring levels and three choices.",
      "Carry six tools and six trinkets. Elites leave chests.",
      "A chest can transform a top-level tool paired with its trinket.",
      "Survive until 10:00 to greet the dawn.",
      "The Almanac lists every tool, trinket, enemy and pickup.",
      "Enter / Space confirms · Esc goes back · P pauses · M mutes.",
      "Mouse and touch work on every menu.",
    ];
    lines.forEach((v, i) => text(ctx, v, 305, 207 + i * 43, 19));
    text(ctx, "BACK  ·  ESC", 640, 646, 24, "#efc37d", "center");
  } else if (s.screen === "almanac") {
    text(ctx, C.ALMANAC_TEXT, 90, 62, 42);
    tabRects().forEach((q, i) => {
      panel(ctx, q.x, q.y, q.width, q.height);
      text(
        ctx,
        C.ALMANAC_TABS[i],
        q.x + q.width / 2,
        q.y + 36,
        21,
        i === s.almanacTab ? "#ffdc8e" : "#a7aaad",
        "center",
      );
    });
    const entries = almanacEntries(s.almanacTab),
      selected = entries[s.menuIndex];
    for (
      let i = 0;
      i < Math.min(C.ALMANAC_ROWS, entries.length - s.almanacScroll);
      i++
    ) {
      const id = entries[s.almanacScroll + i],
        q = menuRects(s)[i];
      ctx.fillStyle =
        s.menuIndex === s.almanacScroll + i ? "#4d3b36" : "#1b2730";
      ctx.fillRect(q.x, q.y, q.width, q.height);
      text(ctx, nameOf(id), q.x + 16, q.y + 28, 21);
    }
    panel(ctx, 604, 168, 578, 479);
    text(ctx, nameOf(selected), 646, 224, 36, "#ffe0a4");
    if (s.almanacTab === 0) {
      drawImg(ctx, img(C.ICON_PATHS[selected as C.OfferId]), 740, 338, 95, 95);
      const row = levelRow({
        id: selected as C.WeaponId,
        level: 1,
        cooldown: 0,
      });
      text(ctx, `DAMAGE  ${row.damage}`, 646, 450);
      if (row.cooldown) text(ctx, `COOLDOWN  ${row.cooldown}s`, 646, 485);
      text(ctx, C.WEAPON_DESCRIPTIONS[selected as C.WeaponId], 646, 570, 18);
    }
    if (s.almanacTab === 1) {
      drawImg(
        ctx,
        img(C.ICON_PATHS[selected as C.PassiveId]),
        740,
        338,
        95,
        95,
      );
      text(
        ctx,
        `MAX LEVEL  ${C.PASSIVES[selected as C.PassiveId].maxLevel}`,
        646,
        460,
      );
      text(ctx, C.PASSIVE_DESCRIPTIONS[selected as C.PassiveId], 646, 570, 18);
    }
    if (s.almanacTab === 2) {
      const id = selected as C.EnemyId,
        e = C.ENEMIES[id];
      drawImg(
        ctx,
        sheet(
          `${C.ENEMY_SHEET_DIR}/${id}`,
          Math.floor(s.simTime / C.WALK_FRAME_TIME) % 4,
        ),
        742,
        336,
        e.radius * 3,
        e.radius * 3,
      );
      text(
        ctx,
        `HEALTH ${e.hp}   SPEED ${e.speed}   DAMAGE ${e.damage}`,
        646,
        460,
        19,
      );
      text(ctx, C.ENEMY_DESCRIPTIONS[id], 646, 570, 18);
    }
    if (s.almanacTab === 3) {
      const gem = C.GEM_TIERS.includes(selected as C.GemTier);
      drawImg(
        ctx,
        img(
          gem
            ? C.GEM_PATHS[selected as C.GemTier]
            : C.PICKUP_PATHS[selected as C.PickupKind],
        ),
        742,
        336,
        92,
        92,
      );
      text(
        ctx,
        gem
          ? C.GEM_DESCRIPTIONS[selected as C.GemTier]
          : C.PICKUP_DESCRIPTIONS[selected as C.PickupKind],
        646,
        570,
        18,
      );
    }
    text(ctx, "ESC  BACK    ·    ↑↓ BROWSE    ·    ←→ TABS", 92, 688, 18);
  } else if (s.screen === "levelup") {
    text(ctx, C.LEVEL_UP_TEXT, 640, 145, 48, "#ffe0a4", "center");
    menu(
      ctx,
      s,
      s.run.offers.map((id) => nameOf(id)),
    );
    s.run.offers.forEach((id, i) => {
      const q = menuRects(s)[i];
      drawImg(ctx, img(C.ICON_PATHS[id]), q.x + 49, q.y + 45, 42, 42);
    });
    const id = s.run.offers[s.menuIndex];
    if (id)
      text(
        ctx,
        id === C.LAMP_OIL_ID
          ? C.LAMP_OIL_DESCRIPTION
          : C.PASSIVE_IDS.includes(id as C.PassiveId)
            ? C.PASSIVE_DESCRIPTIONS[id as C.PassiveId]
            : C.WEAPON_DESCRIPTIONS[id as C.WeaponId],
        640,
        602,
        19,
        "#efe2c6",
        "center",
      );
  } else if (s.screen === "chest") {
    text(ctx, C.CHEST_TEXT, 640, 225, 54, "#ffdf9c", "center");
    const result = s.run.chestResult;
    const label =
      result?.kind === "evolve"
        ? `EVOLVED: ${nameOf(result.weapon)}`
        : result?.kind === "level"
          ? `${nameOf(result.item)}  LEVEL ${result.level}`
          : "THE LAMP IS RESTORED";
    text(ctx, label, 640, 361, 32, "#fce6bd", "center");
    text(ctx, "CONTINUE", 640, 646, 23, "#f3c67d", "center");
  } else if (s.screen === "paused") {
    text(ctx, C.PAUSED_TEXT, 640, 258, 64, "#ffe0a4", "center");
    menu(ctx, s, C.PAUSE_ITEMS);
  } else {
    const end = s.screen === "dawn";
    text(
      ctx,
      end ? C.DAWN_TEXT : C.FALLEN_TEXT,
      640,
      220,
      61,
      end ? "#ffe3aa" : "#e6a193",
      "center",
    );
    text(
      ctx,
      `LEVEL ${s.run.level}   ·   ${s.run.kills} KILLS   ·   ${Math.floor(s.run.tick / C.TICK_HZ)} SECONDS`,
      640,
      295,
      22,
      "#d8c6ad",
      "center",
    );
    menu(ctx, s, C.END_ITEMS);
  }
}
function nameOf(id: string): string {
  return (
    (C.WEAPON_NAMES as Record<string, string>)[id] ??
    (C.PASSIVES as Record<string, { name: string }>)[id]?.name ??
    (C.ENEMIES as Record<string, { name: string }>)[id]?.name ??
    (C.GEM_NAMES as Record<string, string>)[id] ??
    (C.PICKUP_NAMES as Record<string, string>)[id] ??
    C.LAMP_OIL_NAME
  );
}
export const game: Game<WickState, WickDebugApi> = {
  async initialize(api: InitApi<WickState>) {
    for (const action of C.ACTIONS)
      api.input.register(action, { keys: [...C.BINDINGS[action]] });
    const paths = [
      C.LAMPLIGHTER_IDLE_PATH,
      ...Array.from(
        { length: C.LAMPLIGHTER_WALK_SHEET.frames },
        (_, i) => `${C.LAMPLIGHTER_WALK_SHEET.dir}/${i}.png`,
      ),
      ...C.ENEMY_IDS.flatMap((id) =>
        Array.from(
          { length: C.ENEMY_FRAMES },
          (_, i) => `${C.ENEMY_SHEET_DIR}/${id}/${i}.png`,
        ),
      ),
      ...Array.from(
        { length: C.PUFF_SHEET.frames },
        (_, i) => `${C.PUFF_SHEET.dir}/${i}.png`,
      ),
      ...Object.values(C.GEM_PATHS),
      ...Object.values(C.PICKUP_PATHS),
      C.GROUND_TILE_PATH,
      ...Object.values(C.ICON_PATHS),
      ...Object.values(C.EFFECT_SPRITES).flatMap((e) =>
        e.frames === 1
          ? [e.path]
          : Array.from({ length: e.frames }, (_, i) => `${e.path}/${i}.png`),
      ),
    ];
    await Promise.all(
      paths.map(async (path) =>
        pictures.set(path, await api.assets.loadImage(path)),
      ),
    );
    await Promise.all(
      Object.entries(C.CUE_PATHS).map(([cue, path]) =>
        api.audio.load(cue, path),
      ),
    );
    api.diagnostics.register("screen", (s) => s.screen);
    api.diagnostics.register("tick", (s) => s.run.tick);
    api.diagnostics.register("enemies", (s) => s.run.enemies.length);
    api.diagnostics.register("level", (s) => s.run.level);
    return [initial(), debug];
  },
  update(state, api, dt) {
    let s = handleInput(writable(state), api);
    s = { ...s, simTime: s.simTime + dt, muted: api.audio.muted() };
    if (s.screen === "playing") {
      let accum = s.accumulator + dt;
      const dx = api.input.value("right") - api.input.value("left"),
        dy = api.input.value("down") - api.input.value("up");
      while (accum + C.TICK_EPSILON >= C.TICK_DT && s.screen === "playing") {
        accum -= C.TICK_DT;
        s = simulate(s, dx, dy, api.audio);
      }
      s = {
        ...s,
        accumulator: s.screen === "playing" ? Math.max(0, accum) : 0,
      };
    } else s = { ...s, accumulator: 0 };
    if (s.screen === "playing") api.audio.loop(C.CUES.music);
    else api.audio.stop(C.CUES.music);
    if (
      s.screen === "playing" &&
      s.run.weapons.some((w) => w.id === "halo" || w.id === "corona")
    )
      api.audio.loop(C.CUES.hum);
    else api.audio.stop(C.CUES.hum);
    return s;
  },
  render(state, api: RenderApi) {
    render(api.ctx, state);
  },
};
