import { createCanvas } from "@napi-rs/canvas";
import fs from "node:fs";
import path from "node:path";
import { Buffer } from "node:buffer";
const root = "assets";
function png(file, w, h, paint) {
  const c = createCanvas(w, h),
    g = c.getContext("2d");
  g.imageSmoothingEnabled = false;
  paint(g, w, h);
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, c.toBuffer("image/png"));
}
function ell(g, x, y, rx, ry, fill, stroke) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.lineWidth = 1;
    g.strokeStyle = stroke;
    g.stroke();
  }
}
function poly(g, pts, fill, stroke) {
  g.beginPath();
  g.moveTo(...pts[0]);
  for (const p of pts.slice(1)) g.lineTo(...p);
  g.closePath();
  g.fillStyle = fill;
  g.fill();
  if (stroke) {
    g.strokeStyle = stroke;
    g.lineWidth = 1;
    g.stroke();
  }
}
function line(g, pts, color, width = 1) {
  g.beginPath();
  g.moveTo(...pts[0]);
  for (const p of pts.slice(1)) g.lineTo(...p);
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = "round";
  g.stroke();
}
const ink = "#151a22",
  gold = "#eac17c",
  light = "#fff2ba";
function lamp(g, w, h, frame = 0) {
  const k = frame % 2 ? 1 : -1;
  ell(g, 12, 29, 8, 2, "#070d15");
  line(
    g,
    [
      [9, 25],
      [8 + k, 30],
    ],
    "#293748",
    3,
  );
  line(
    g,
    [
      [14, 25],
      [15 - k, 30],
    ],
    "#293748",
    3,
  );
  poly(
    g,
    [
      [6, 13],
      [16, 13],
      [20, 26],
      [3, 26],
    ],
    "#39495b",
    ink,
  );
  poly(
    g,
    [
      [6, 13],
      [10, 10],
      [16, 13],
      [14, 23],
      [7, 23],
    ],
    "#5b6a73",
  );
  ell(g, 11, 7, 5, 5, "#d6a979", ink);
  poly(
    g,
    [
      [4, 4],
      [8, 0],
      [15, 0],
      [18, 5],
    ],
    "#313a49",
  );
  g.fillStyle = "#d5ad6d";
  g.fillRect(10, 7, 3, 1);
  line(
    g,
    [
      [18, 14],
      [20, 21],
    ],
    "#d7a36b",
    2,
  );
  poly(
    g,
    [
      [17, 17],
      [23, 17],
      [22, 25],
      [18, 25],
    ],
    gold,
    "#805a37",
  );
  ell(g, 20, 20, 2, 3, light);
  line(
    g,
    [
      [4, 17],
      [3, 22],
    ],
    "#c3916e",
    2,
  );
}
png("sprites/lamplighter/idle.png", 24, 32, (g) => lamp(g, 24, 32));
for (let i = 0; i < 6; i++)
  png(`sprites/lamplighter/walk/${i}.png`, 24, 32, (g) => {
    g.translate(0, Math.sin((i * Math.PI) / 3));
    lamp(g, 24, 32, i);
  });
const enemies = [
  ["moth", 20, "#b8a9a0"],
  ["bat", 20, "#816c83"],
  ["rat", 24, "#9b7b68"],
  ["gnat", 16, "#aabda6"],
  ["beetle", 28, "#66877c"],
  ["wisp", 20, "#9dc6cc"],
  ["spider", 28, "#92707d"],
  ["crow", 24, "#576678"],
  ["shade", 32, "#677282"],
  ["hound", 36, "#7e6c68"],
  ["mothwing", 56, "#c3a798"],
  ["owl", 72, "#a99b82"],
  ["dark", 80, "#242832"],
];
function enemy(g, id, n, f, color) {
  const c = n / 2,
    t = Math.sin((f * Math.PI) / 2),
    large = n >= 56;
  g.translate(c, c);
  g.scale(n / 32, n / 32);
  ell(g, 0, 12, 12, 2, "#0a1119");
  if (id === "moth" || id === "mothwing") {
    const span = id === "mothwing" ? 20 : 14;
    poly(
      g,
      [
        [-2, -3],
        [-span, -13 - t * 2],
        [-span + 3, 6],
        [-2, 5],
      ],
      color,
      ink,
    );
    poly(
      g,
      [
        [2, -3],
        [span, -13 + t * 2],
        [span - 3, 6],
        [2, 5],
      ],
      color,
      ink,
    );
    ell(g, 0, 2, 4, 10, "#4c5360", ink);
    line(
      g,
      [
        [-2, -7],
        [-6, -14],
      ],
      gold,
    );
    line(
      g,
      [
        [2, -7],
        [6, -14],
      ],
      gold,
    );
  } else if (id === "bat" || id === "crow" || id === "owl") {
    poly(
      g,
      [
        [-2, -3],
        [-17, -9 - t * 3],
        [-12, 1],
        [-8, -2],
        [-3, 7],
      ],
      color,
      ink,
    );
    poly(
      g,
      [
        [2, -3],
        [17, -9 + t * 3],
        [12, 1],
        [8, -2],
        [3, 7],
      ],
      color,
      ink,
    );
    ell(g, 0, 2, large ? 9 : 6, 8, "#394454", ink);
    poly(
      g,
      [
        [-4, -7],
        [-7, -12],
        [0, -8],
        [7, -12],
        [4, -7],
      ],
      color,
    );
  } else if (id === "rat" || id === "hound") {
    ell(g, -1, 3, 12, 7, color, ink);
    ell(g, 8, 1, 5, 5, color, ink);
    poly(
      g,
      [
        [10, -2],
        [15, 1],
        [10, 3],
      ],
      "#b7a39b",
    );
    line(
      g,
      [
        [-11, 5],
        [-17, 2],
        [-18, -5],
      ],
      "#be8683",
      2,
    );
    for (const x of [-7, 4])
      line(
        g,
        [
          [x, 9 + t],
          [x + 2, 13],
        ],
        ink,
        2,
      );
  } else if (id === "spider") {
    ell(g, 0, 2, 8, 7, color, ink);
    for (const side of [-1, 1])
      for (let i = 0; i < 4; i++)
        line(
          g,
          [
            [side * 5, 0],
            [side * (12 + i), -9 + i * 5 + t],
            [side * 16, -7 + i * 6],
          ],
          color,
          2,
        );
  } else if (id === "beetle") {
    ell(g, 0, 2, 11, 12, color, ink);
    line(
      g,
      [
        [0, -8],
        [0, 12],
      ],
      ink,
    );
    for (const side of [-1, 1])
      for (const y of [-5, 2, 8])
        line(
          g,
          [
            [side * 8, y],
            [side * 14, y + 2 + t],
          ],
          "#3b5c59",
          2,
        );
  } else if (id === "wisp" || id === "shade" || id === "dark") {
    poly(
      g,
      [
        [-9, 10],
        [-12, -1],
        [0, -14],
        [12, -1],
        [9, 10],
        [5, 5],
        [0, 12],
        [-4, 5],
      ],
      color,
      ink,
    );
    ell(g, 0, -3, 6, 7, id === "dark" ? "#0e1118" : "#536879");
    for (let i = 0; i < 3; i++)
      line(
        g,
        [
          [-7 + i * 7, 8],
          [-10 + i * 9, 13 + t],
        ],
        color,
        2,
      );
  } else {
    ell(g, 0, 1, 5, 6, color, ink);
    for (const x of [-11, 11]) ell(g, x, -1 + t, 5, 3, color);
  }
  for (const x of [-3, 3])
    ell(g, x, -2, large ? 1.6 : 1, 1.5, id === "dark" ? "#f8af75" : gold);
  if (large) {
    g.strokeStyle = "#e1ae73";
    g.lineWidth = 0.7;
    g.strokeRect(-13, -14, 26, 27);
  }
}
for (const [id, n, color] of enemies)
  for (let f = 0; f < 4; f++)
    png(`sprites/enemies/${id}/${f}.png`, n, n, (g) =>
      enemy(g, id, n, f, color),
    );
for (let f = 0; f < 4; f++)
  png(`sprites/puff/${f}.png`, 24, 24, (g) => {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4;
      ell(
        g,
        12 + Math.cos(a) * (3 + f * 2),
        12 + Math.sin(a) * (3 + f * 2),
        Math.max(1, 4 - f),
        Math.max(1, 4 - f),
        f < 2 ? "#f0c586" : "#8795a4",
      );
    }
  });
for (const [id, n, color] of [
  ["small", 8, "#65c0c4"],
  ["medium", 12, "#91d9c2"],
  ["large", 16, "#d6f2c8"],
])
  png(`sprites/gems/${id}.png`, n, n, (g) => {
    poly(
      g,
      [
        [n / 2, 0],
        [n - 1, n / 3],
        [n / 2, n - 1],
        [1, n / 3],
      ],
      color,
      "#dfffee",
    );
    poly(
      g,
      [
        [n / 2, 1],
        [n / 2, n - 2],
        [n / 4, n / 3],
      ],
      "#e9ffff",
    );
  });
for (const id of ["chest", "bread", "draft"])
  png(`sprites/pickups/${id}.png`, 24, 24, (g) => {
    if (id === "chest") {
      g.fillStyle = "#51382e";
      g.fillRect(2, 8, 20, 14);
      g.fillStyle = "#b58a50";
      g.fillRect(2, 8, 20, 4);
      g.fillRect(11, 8, 3, 14);
      g.strokeStyle = gold;
      g.strokeRect(2, 8, 20, 14);
      ell(g, 12, 15, 2, 2, light);
    }
    if (id === "bread") {
      ell(g, 12, 14, 10, 7, "#c59057", "#594c42");
      for (let i = 0; i < 3; i++)
        line(
          g,
          [
            [6 + i * 5, 9],
            [8 + i * 5, 15],
          ],
          "#f2cd8d",
          2,
        );
    }
    if (id === "draft") {
      poly(
        g,
        [
          [10, 1],
          [15, 1],
          [17, 10],
          [20, 19],
          [16, 22],
          [6, 22],
          [4, 18],
          [8, 10],
        ],
        "#5d9da4",
        gold,
      );
      ell(g, 12, 15, 6, 4, "#a8dcd0");
    }
  });
png("sprites/ground.png", 64, 64, (g) => {
  g.fillStyle = "#19242b";
  g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 16)
    for (let x = 0; x < 64; x += 16) {
      g.fillStyle = (x + y) % 32 ? "#1b2b32" : "#213039";
      g.fillRect(x + 1, y + 1, 14, 14);
      g.strokeStyle = "#2b3b40";
      g.strokeRect(x + 0.5, y + 0.5, 15, 15);
    }
  for (const [x, y] of [
    [8, 6],
    [28, 26],
    [47, 13],
    [53, 49],
    [13, 51],
  ]) {
    ell(g, x, y, 2, 1, "#596455");
    line(
      g,
      [
        [x, y],
        [x + 2, y - 4],
      ],
      "#606e58",
    );
  }
});
const effectIds = [
  "taper",
  "ember",
  "pin",
  "lantern",
  "halo",
  "oil-splash",
  "spark",
  "shard",
  "sconce",
  "flare",
  "pyre",
  "beacon",
  "hail",
  "chandelier",
  "corona",
  "blaze",
];
const size = {
  taper: [120, 40],
  ember: [16, 16],
  pin: [12, 12],
  lantern: [28, 28],
  halo: [160, 160],
  "oil-splash": [100, 100],
  spark: [80, 80],
  shard: [16, 16],
  sconce: [24, 24],
  flare: [128, 128],
  pyre: [120, 40],
  beacon: [16, 16],
  hail: [12, 12],
  chandelier: [28, 28],
  corona: [160, 160],
  blaze: [100, 100],
};
function effect(g, id, w, h, f = 0) {
  const evolved = [
      "pyre",
      "beacon",
      "hail",
      "chandelier",
      "corona",
      "blaze",
    ].includes(id),
    col = evolved ? "#e6b7ed" : gold,
    soft = evolved ? "#8d68aa" : "#dc8450",
    cx = w / 2,
    cy = h / 2;
  g.globalAlpha = 0.84;
  if (id === "taper" || id === "pyre") {
    poly(
      g,
      [
        [2, cy],
        [w * 0.24, cy - 12],
        [w - 2, cy - 4],
        [w * 0.58, cy],
        [w - 2, cy + 4],
        [w * 0.24, cy + 12],
      ],
      soft,
    );
    line(
      g,
      [
        [5, cy],
        [w - 5, cy],
      ],
      col,
      3,
    );
    if (evolved)
      for (let i = 0; i < 5; i++)
        ell(g, 20 + i * 19, cy + (i % 2 ? 9 : -9), 3, 3, col);
  } else if (id === "halo" || id === "corona") {
    g.strokeStyle = soft;
    g.lineWidth = 11;
    g.beginPath();
    g.arc(cx, cy, w * 0.43, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = col;
    g.lineWidth = 4;
    g.beginPath();
    g.arc(cx, cy, w * 0.42, 0, Math.PI * 2);
    g.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      line(
        g,
        [
          [cx + Math.cos(a) * w * 0.33, cy + Math.sin(a) * w * 0.33],
          [cx + Math.cos(a) * w * 0.48, cy + Math.sin(a) * w * 0.48],
        ],
        col,
        evolved ? 4 : 2,
      );
    }
  } else if (id === "oil-splash" || id === "blaze") {
    ell(g, cx, cy, w * 0.46, h * 0.42, "#67554c");
    ell(g, cx, cy, w * 0.38, h * 0.34, soft);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4;
      ell(
        g,
        cx + Math.cos(a) * w * 0.24,
        cy + Math.sin(a) * h * 0.2,
        4 + (i % 3),
        4,
        col,
      );
    }
  } else if (id === "spark" || id === "flare") {
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6 + f * 0.15;
      line(
        g,
        [
          [cx + Math.cos(a) * w * 0.08, cy + Math.sin(a) * h * 0.08],
          [
            cx + Math.cos(a) * w * (0.31 + f * 0.02),
            cy + Math.sin(a) * h * (0.31 + f * 0.02),
          ],
        ],
        i % 2 ? col : soft,
        4,
      );
    }
    ell(g, cx, cy, w * 0.14, h * 0.14, light);
  } else if (id === "pin" || id === "hail" || id === "shard") {
    poly(
      g,
      [
        [cx, 1],
        [w - 1, cy],
        [cx, h - 1],
        [1, cy],
      ],
      soft,
      col,
    );
    poly(
      g,
      [
        [cx, 2],
        [w - 3, cy],
        [cx, cy],
      ],
      light,
    );
  } else if (id === "lantern" || id === "chandelier" || id === "sconce") {
    poly(
      g,
      [
        [cx - 6, 3],
        [cx + 6, 3],
        [cx + 10, h - 4],
        [cx - 10, h - 4],
      ],
      soft,
      col,
    );
    ell(g, cx, cy, 5, 7, light);
    line(
      g,
      [
        [cx - 8, h - 4],
        [cx + 8, h - 4],
      ],
      col,
      2,
    );
  } else {
    ell(g, cx, cy, w * 0.45, h * 0.45, soft);
    ell(g, cx, cy, w * 0.28, h * 0.28, col);
    ell(g, cx - w * 0.1, cy - h * 0.1, w * 0.1, h * 0.1, light);
  }
}
for (const id of effectIds) {
  const [w, h] = size[id],
    frames = id === "spark" || id === "sconce" ? 4 : id === "flare" ? 6 : 1;
  for (let f = 0; f < frames; f++)
    png(`sprites/effects/${id}${frames > 1 ? `/${f}` : ""}.png`, w, h, (g) =>
      effect(g, id, w, h, f),
    );
}
const iconIds = [
  ...effectIds,
  "wick",
  "oil",
  "glass",
  "brass",
  "mirror",
  "bellows",
  "tallow",
  "tinder",
  "soot",
  "lure",
  "lamp-oil",
];
for (const id of iconIds)
  png(`icons/${id}.png`, 24, 24, (g) => {
    g.fillStyle = "#25363f";
    g.fillRect(0, 0, 24, 24);
    g.strokeStyle = "#bd9662";
    g.strokeRect(0.5, 0.5, 23, 23);
    if (effectIds.includes(id)) {
      g.save();
      g.translate(3, 3);
      g.scale(18 / size[id][0], 18 / size[id][1]);
      effect(g, id, ...size[id]);
      g.restore();
    } else {
      const marks = {
        wick: "✦",
        oil: "◈",
        glass: "◇",
        brass: "⬡",
        mirror: "❖",
        bellows: "➤",
        tallow: "♥",
        tinder: "✷",
        soot: "✣",
        lure: "◎",
        "lamp-oil": "◉",
      };
      g.fillStyle = id === "tinder" ? "#ed8c65" : "#edc784";
      g.font = "bold 19px serif";
      g.textAlign = "center";
      g.fillText(marks[id], 12, 19);
    }
  });
// Original synthesized cues. Phase-continuous envelopes keep the two loops seamless.
const sampleRate = 22050;
function wav(file, duration, voices, loop = false) {
  const n = Math.floor(duration * sampleRate),
    data = Buffer.alloc(44 + n * 2);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + n * 2, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(sampleRate, 24);
  data.writeUInt32LE(sampleRate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let v = 0;
    for (const [freq, amp, shape = 0, decay = 3, delay = 0] of voices) {
      const age = t - delay;
      if (age < 0) continue;
      const env = loop
        ? 1
        : Math.pow(Math.max(0, 1 - age / (duration - delay)), decay);
      const phase = 2 * Math.PI * freq * age;
      v +=
        amp *
        env *
        (shape === 1
          ? Math.sin(phase) + 0.25 * Math.sin(phase * 2)
          : shape === 2
            ? Math.sign(Math.sin(phase)) * 0.45
            : Math.sin(phase));
    }
    if (!loop) v *= Math.min(1, t * 70);
    else v *= Math.sin((Math.PI * t) / duration) ** 2 * 0.18 + 0.82;
    data.writeInt16LE(
      Math.max(-32767, Math.min(32767, Math.round(v * 32767))),
      44 + i * 2,
    );
  }
  if (file === "music") {
    const fade = Math.floor(sampleRate / 2);
    for (let i = 0; i < fade; i++) {
      const blend = i / (fade - 1);
      const tail = data.readInt16LE(44 + (n - fade + i) * 2);
      const head = data.readInt16LE(44 + i * 2);
      data.writeInt16LE(
        Math.round(tail * (1 - blend) + head * blend),
        44 + (n - fade + i) * 2,
      );
    }
  }
  fs.mkdirSync("assets/audio", { recursive: true });
  fs.writeFileSync(`assets/audio/${file}.wav`, data);
}
const cues = {
  hit: [
    0.12,
    [
      [180, 0.12, 1, 5],
      [390, 0.05, 0, 8],
    ],
  ],
  kill: [
    0.24,
    [
      [330, 0.1, 0, 2],
      [660, 0.08, 1, 4],
    ],
  ],
  gem: [
    0.19,
    [
      [880, 0.12, 0, 3],
      [1320, 0.08, 0, 4],
    ],
  ],
  hurt: [
    0.43,
    [
      [130, 0.24, 2, 2],
      [80, 0.12, 0, 3],
    ],
  ],
  "level-up": [
    0.8,
    [
      [392, 0.12, 0, 2],
      [494, 0.12, 0, 2, 0.14],
      [587, 0.12, 0, 2, 0.28],
      [784, 0.14, 0, 2, 0.45],
    ],
  ],
  choose: [0.2, [[520, 0.12, 1, 3]]],
  chest: [
    0.65,
    [
      [220, 0.12, 0, 2],
      [330, 0.12, 0, 2, 0.12],
      [440, 0.13, 0, 2, 0.25],
    ],
  ],
  evolve: [
    1.2,
    [
      [330, 0.12, 0, 1],
      [440, 0.12, 0, 1, 0.2],
      [660, 0.14, 0, 1, 0.4],
      [880, 0.1, 0, 1, 0.6],
    ],
  ],
  pickup: [
    0.27,
    [
      [440, 0.1, 0, 3],
      [550, 0.07, 0, 3, 0.07],
    ],
  ],
  fallen: [
    2,
    [
      [110, 0.2, 0, 1],
      [130.8, 0.12, 0, 1],
      [82.4, 0.13, 0, 1, 0.5],
    ],
  ],
  dawn: [
    2.5,
    [
      [261.6, 0.11, 0, 1],
      [329.6, 0.1, 0, 1],
      [392, 0.1, 0, 1],
      [523.3, 0.09, 0, 1, 0.5],
    ],
  ],
  "menu-move": [0.1, [[430, 0.055, 0, 6]]],
  "menu-confirm": [
    0.19,
    [
      [600, 0.09, 0, 4],
      [900, 0.04, 0, 4],
    ],
  ],
  hum: [
    3,
    [
      [110, 0.05, 0, 1],
      [220, 0.026, 0, 1],
    ],
  ],
};
for (const [id, [duration, voices]] of Object.entries(cues))
  wav(id, duration, voices, id === "hum");
// Thirty two seconds of a quiet repeating minor-key nocturne.
const duration = 32,
  voices = [];
for (let bar = 0; bar < 8; bar++) {
  const root = [110, 98, 130.8, 87.31][bar % 4];
  for (let beat = 0; beat < 4; beat++) {
    const at = bar * 4 + beat;
    voices.push([root * (beat % 2 ? 2 : 1), 0.012, 0, 1, at]);
    if (beat === 0 || beat === 2)
      voices.push([root * 1.5, 0.008, 0, 1, at + 0.4]);
  }
  voices.push([root * 4, 0.009, 0, 1, bar * 4 + 1.5]);
}
wav("music", duration, voices, true);
function variable(n) {
  let arr = [n & 127];
  while ((n >>= 7)) arr.unshift((n & 127) | 128);
  return arr;
}
const midi = [
  ...Buffer.from("MThd"),
  0,
  0,
  0,
  6,
  0,
  0,
  0,
  1,
  0,
  96,
  ...Buffer.from("MTrk"),
];
const events = [];
let last = 0;
for (let i = 0; i < 32; i++) {
  const time = i * 96,
    delta = time - last;
  events.push(
    ...variable(delta),
    0x90,
    48 + [0, -2, 3, -4][Math.floor(i / 4) % 4],
    64,
    ...variable(72),
    0x80,
    48 + [0, -2, 3, -4][Math.floor(i / 4) % 4],
    0,
  );
  last = time + 72;
}
events.push(0, 0xff, 0x2f, 0);
midi.push(
  ...[
    events.length >>> 24,
    (events.length >>> 16) & 255,
    (events.length >>> 8) & 255,
    events.length & 255,
  ],
  ...events,
);
fs.writeFileSync("assets/audio/music.mid", Buffer.from(midi));
