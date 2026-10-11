// Генератор спрайтов пиксельного человечка: node scripts/generate-walker.mjs src/scene/walkerSprite.ts [preview.png|preview.svg]
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const W = 12
const H = 22
// Прозрачный зазор между кадрами в листе: при дробном масштабе граница кадра округляется,
// и без зазора у края просвечивал соседний кадр (например, кончик сигары)
const GAP = 1

// Пишет файл, только если содержимое изменилось: генератор запускается при каждом старте dev-сервера,
// и лишняя перезапись walkerSprite.ts дёргала бы HMR
function write(path, content) {
  if (existsSync(path) && readFileSync(path).equals(Buffer.from(content))) return
  writeFileSync(path, content)
}

// Палитра. T/t — рубашка (перекрашивается в цвет зрителя), H — волосы, остальное фиксировано.
const PALETTE = {
  O: [27, 27, 36, 255], // контур
  E: [27, 27, 36, 255], // глаз
  H: [92, 58, 38, 255], // волосы (перекрашиваются в цвет волос зрителя)
  S: [242, 194, 155, 255], // кожа
  s: [204, 156, 120, 255], // кожа в тени (дальняя рука)
  T: [59, 130, 246, 255], // рубашка
  t: [37, 99, 200, 255], // рубашка в тени (рука)
  P: [59, 74, 107, 255], // штаны
  p: [41, 52, 78, 255], // дальняя нога
  B: [58, 38, 28, 255], // ботинки
}
const SHIRT = new Set(['T', 't'])
const HAIR = new Set(['H'])

// Причёски: голова с запасом в 2 строки сверху под объёмные волосы (10 строк), смотрит вправо.
// Глаз — E в 6-й строке, шея — последняя строка. H — волосы, красятся в цвет волос зрителя.
const HAIRSTYLES = {
  // Ёжик: короткая шапочка волос
  buzz: [
    '............',
    '............',
    '............',
    '....HHHH....',
    '...HHHHHH...',
    '...HHSSSS...',
    '...HSSSES...',
    '...SSSSSS...',
    '....SSSS....',
    '.....SS.....',
  ],
  // Колючки: торчащие вверх пряди
  spiky: [
    '............',
    '...H.H.H....',
    '...HHHHHH...',
    '..HHHHHHHH..',
    '...HHHHHHH..',
    '...HHHSSS...',
    '...HHSSES...',
    '...HSSSSS...',
    '....SSSS....',
    '.....SS.....',
  ],
  // Афро: пышная шапка волос
  afro: [
    '............',
    '...HHHHH....',
    '..HHHHHHH...',
    '.HHHHHHHHH..',
    '.HHHHHHHHH..',
    '.HHHHHSSS...',
    '.HHHHSSES...',
    '..HHHSSSS...',
    '...HSSSS....',
    '.....SS.....',
  ],
  // Хвост: собранные волосы свисают с затылка
  ponytail: [
    '............',
    '............',
    '............',
    '....HHHH....',
    '...HHHHHH...',
    '.HHHHHSSS...',
    '.HHHHSSES...',
    '.H.HSSSSS...',
    '.H..SSSS....',
    '.....SS.....',
  ],
  // Каре: чёлка и волосы до подбородка
  bob: [
    '............',
    '............',
    '............',
    '...HHHHH....',
    '..HHHHHHH...',
    '..HHHHHHS...',
    '..HHHHSES...',
    '..HHHSSSS...',
    '..HHHSSS....',
    '..HH.SS.....',
  ],
  // Пучок на макушке
  bun: [
    '............',
    '...HHH......',
    '....H.......',
    '....HHHH....',
    '...HHHHHH...',
    '...HHHSSS...',
    '...HHSSES...',
    '...HSSSSS...',
    '....SSSS....',
    '.....SS.....',
  ],
  // Кок: волосы зачёсаны вверх и вперёд
  quiff: [
    '............',
    '......HHH...',
    '....HHHHHH..',
    '...HHHHHHH..',
    '...HHHHHH...',
    '...HHSSSS...',
    '...HSSSES...',
    '...SSSSSS...',
    '....SSSS....',
    '.....SS.....',
  ],
  // Лысина с бородой
  beard: [
    '............',
    '............',
    '............',
    '....SSSS....',
    '...SSSSSS...',
    '...SSSSSS...',
    '...SSHSES...',
    '...SSHHHH...',
    '....HHHH....',
    '.....SS.....',
  ],
}
const STYLE_NAMES = Object.keys(HAIRSTYLES)
// Те же причёски анфас: лицом к зрителю, глаза — E в 6-й строке
const HAIRSTYLES_FRONT = {
  buzz: [
    '............',
    '............',
    '............',
    '....HHHH....',
    '...HHHHHH...',
    '...HSSSSH...',
    '...SESSES...',
    '...SSSSSS...',
    '....SSSS....',
    '.....SS.....',
  ],
  spiky: [
    '............',
    '...H.HH.H...',
    '...HHHHHH...',
    '..HHHHHHHH..',
    '..HHHHHHHH..',
    '...HSSSSH...',
    '...SESSES...',
    '...SSSSSS...',
    '....SSSS....',
    '.....SS.....',
  ],
  afro: [
    '............',
    '...HHHHHH...',
    '..HHHHHHHH..',
    '.HHHHHHHHHH.',
    '.HHHHHHHHHH.',
    '.HHHSSSSHHH.',
    '.HHSESSESHH.',
    '..HSSSSSSH..',
    '...HSSSSH...',
    '.....SS.....',
  ],
  // Хвост из-за головы виден сбоку
  ponytail: [
    '............',
    '............',
    '............',
    '....HHHH....',
    '...HHHHHHH..',
    '...HSSSSHH..',
    '...SESSESH..',
    '...SSSSSSH..',
    '....SSSS.H..',
    '.....SS.....',
  ],
  bob: [
    '............',
    '............',
    '............',
    '...HHHHHH...',
    '..HHHHHHHH..',
    '..HHSSSSHH..',
    '..HSESSESH..',
    '..HSSSSSSH..',
    '..HHSSSSHH..',
    '..HH.SS.HH..',
  ],
  bun: [
    '............',
    '....HHHH....',
    '.....HH.....',
    '....HHHH....',
    '...HHHHHH...',
    '...HSSSSH...',
    '...SESSES...',
    '...SSSSSS...',
    '....SSSS....',
    '.....SS.....',
  ],
  quiff: [
    '............',
    '.....HHH....',
    '....HHHHH...',
    '...HHHHHH...',
    '...HHHHHH...',
    '...HSSSSH...',
    '...SESSES...',
    '...SSSSSS...',
    '....SSSS....',
    '.....SS.....',
  ],
  beard: [
    '............',
    '............',
    '............',
    '....SSSS....',
    '...SSSSSS...',
    '...SSSSSS...',
    '...HESSEH...',
    '...HHHHHH...',
    '....HHHH....',
    '.....SS.....',
  ],
}
const ARMS = {
  side: [
    '....TTTT....',
    '....TtTT....',
    '....TtTT....',
    '....TtTT....',
    '....PSPP....',
  ],
  // На шаге дальняя рука (в тени, из-за корпуса) качается навстречу ближней
  forward: [
    '....TTTT....',
    '....TTtT....',
    '...tTTTtt...',
    '...sTTTTS...',
    '....PPPP....',
  ],
  back: [
    '....TTTT....',
    '....tTTT....',
    '...ttTTTt...',
    '...STTTTs...',
    '....PPPP....',
  ],
  // Рука вытянута вперёд и держит шест таблички: кисть в точке HOLD_HAND
  hold: [
    '....TTTT....',
    '....TTTtt...',
    '....TTTTtS..',
    '....TTTT....',
    '....PPPP....',
  ],
  // Анфас: руки по швам
  front: [
    '...TTTTTT...',
    '...TTTTTT...',
    '...tTTTTt...',
    '...tTTTTt...',
    '...SPPPPS...',
  ],
  // Анфас, левая для зрителя рука поднята (продолжение — WAVE_HAND)
  frontWave: [
    '..ttTTTTT...',
    '...TTTTTT...',
    '....TTTTt...',
    '....TTTTt...',
    '....PPPPS...',
  ],
  // Анфас с шестом таблички в правой для зрителя руке: кисть в той же точке HOLD_HAND
  frontHold: [
    '...TTTTTT...',
    '...TTTTTt...',
    '...tTTTTtS..',
    '...tTTTT....',
    '...SPPPP....',
  ],
  frontWaveHold: [
    '..ttTTTTT...',
    '...TTTTTt...',
    '....TTTTtS..',
    '....TTTT....',
    '....PPPP....',
  ],
}
// Кисть, держащая шест, в кадре стоя (смотрит вправо или анфас)
const HOLD_HAND = { x: 9, y: 12 }
// Поднятая рука сбоку от головы (строки 2–9): качается только ладонь над головой —
// предплечье в обоих кадрах на месте и не прилегает к лицу, иначе голова «дышит» по ширине
const WAVE_HAND = {
  out: [
    '.S..........',
    '.S..........',
    '.t..........',
    '.t..........',
    '.t..........',
    '.t..........',
    '..t.........',
    '..t.........',
  ],
  in: [
    '..S.........',
    '..S.........',
    '.t..........',
    '.t..........',
    '.t..........',
    '.t..........',
    '..t.........',
    '..t.........',
  ],
}
const WAVE_TOP = 2
// Ноги: idle/passing — 6 строк (13–18), contact — 5 строк (14–18), корпус ниже на 1px
const LEGS = {
  idle: [
    '....PPPP....',
    '....ppPP....',
    '....ppPP....',
    '....ppPP....',
    '....BBBB....',
    '....BBBBB...',
  ],
  contactA: [
    '....PPPP....',
    '...ppPPP....',
    '...pp..PP...',
    '..pp....PP..',
    '..BB....BBB.',
  ],
  passA: [
    '....PPPP....',
    '....PPPP....',
    '....ppPP....',
    '...pp.PP....',
    '...BB.PP....',
    '......BBB...',
  ],
  contactB: [
    '....PPPP....',
    '...PPppp....',
    '...PP..pp...',
    '..PP....pp..',
    '..BB....BBB.',
  ],
  passB: [
    '....PPPP....',
    '....PPPP....',
    '....PPpp....',
    '...PP.pp....',
    '...BB.pp....',
    '......BBB...',
  ],
  front: [
    '....PPPP....',
    '....PPPP....',
    '....P..P....',
    '....P..P....',
    '....B..B....',
    '...BB..BB...',
  ],
}

// Накладывает непрозрачные пиксели overlay на rows начиная со строки top
function overlay(rows, grid, top) {
  return rows.map((r, y) => {
    const o = grid[y - top]
    return o ? [...r].map((ch, x) => (o[x] !== '.' ? o[x] : ch)).join('') : r
  })
}

function frame(head, arms, legs, hand) {
  let upper = [...head, ...ARMS[arms]]
  if (hand) upper = overlay(upper, hand, WAVE_TOP)
  const rows = legs.length === 5 ? ['............', ...upper, ...legs] : [...upper, ...legs]
  rows.push('............') // строка под контур ботинок
  if (rows.length !== H || rows.some((r) => r.length !== W)) throw new Error(`bad frame ${arms}`)
  return addOutline(rows.map((r) => [...r]))
}

// Контур: прозрачный пиксель рядом (по 4 сторонам) с закрашенным
function addOutline(g) {
  const out = g.map((r) => [...r])
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (g[y][x] !== '.') continue
      const near = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(
        ([dx, dy]) => g[y + dy]?.[x + dx] && g[y + dy][x + dx] !== '.',
      )
      if (near) out[y][x] = 'O'
    }
  return out
}

const mirror = (g) => g.map((r) => [...r].reverse())

// Кадры: idle + 4 кадра шага. Рука — противоходом к ближней ноге.
// Анфас: стоит, машет (два кадра), остальные столбцы — снова стоит.
function sheetOf(name) {
  const head = HAIRSTYLES[name]
  const face = HAIRSTYLES_FRONT[name]
  const frontOf = (still, wave) => [
    frame(face, still, LEGS.front),
    frame(face, wave, LEGS.front, WAVE_HAND.out),
    frame(face, wave, LEGS.front, WAVE_HAND.in),
    frame(face, still, LEGS.front),
    frame(face, still, LEGS.front),
  ]
  const right = [
    frame(head, 'side', LEGS.idle),
    frame(head, 'back', LEGS.contactA),
    frame(head, 'side', LEGS.passA),
    frame(head, 'forward', LEGS.contactB),
    frame(head, 'side', LEGS.passB),
  ]
  // Те же кадры, но с табличкой в руке
  const holdRight = [
    frame(head, 'hold', LEGS.idle),
    frame(head, 'hold', LEGS.contactA),
    frame(head, 'hold', LEGS.passA),
    frame(head, 'hold', LEGS.contactB),
    frame(head, 'hold', LEGS.passB),
  ]
  return [
    right,
    right.map(mirror),
    holdRight,
    holdRight.map(mirror),
    frontOf('front', 'frontWave'),
    frontOf('frontHold', 'frontWaveHold'),
  ]
}
const SHEETS = STYLE_NAMES.map(sheetOf)

// Аксессуары: накладываются поверх готового человечка, сетка как у причёсок (смотрит вправо).
// A — цвет аксессуара (у каждого зрителя свой), a — он же в тени, h — он же с бликом, остальное фиксировано.
// Контур рисуется вручную: автоматический лёг бы чёрной рамкой на лицо.
// cut — головные уборы прячут человечка выше этой строки головы, иначе из-под них торчали бы волосы.
const ACC_PALETTE = {
  O: [27, 27, 36, 255], // контур
  L: [27, 27, 36, 255], // тёмное стекло
  w: [244, 244, 246, 255], // помпон
  g: [191, 227, 255, 255], // блик на стекле очков
  K: [43, 43, 51, 255], // ремешок VR-очков
  W: [228, 230, 238, 255], // корпус VR-очков
  v: [42, 48, 70, 255], // передняя панель VR-очков
  c: [94, 240, 255, 255], // огонёк VR-очков
  C: [122, 74, 42, 255], // сигара
  R: [255, 122, 42, 255], // тлеющий кончик
  m: [220, 220, 228, 190], // дымок
}
const ACC_COLOR = new Set(['A', 'a', 'h'])
// Порядок — порядок отрисовки: очки поверх шапки, наушники поверх ремешка VR-очков
const ACCESSORIES = {
  // Шапка с помпоном и отворотом
  beanie: {
    cut: 5,
    grid: [
      '.....OO.....',
      '....OwwO....',
      '...OAAAAO...',
      '..OAhAAAAO..',
      '..OaaaaaaO..',
    ],
    // Анфас шапка та же
    front: null,
  },
  // Каска: широкие поля, спереди длиннее
  helmet: {
    cut: 5,
    grid: [
      '............',
      '....OOOO....',
      '...OAhAAO...',
      '..OAAAAAAOO.',
      '.OaaaaaaaaaO',
      '..O.......O.',
    ],
    front: [
      '............',
      '....OOOO....',
      '...OAhAAO...',
      '..OAAAAAAO..',
      '.OaaaaaaaaO.',
      '..O......O..',
    ],
  },
  // Очки: дужка к уху, глаз за стеклом
  glasses: {
    grid: [
      '............',
      '............',
      '............',
      '............',
      '............',
      '.......AAA..',
      '....AAALgA..',
    ],
    front: [
      '............',
      '............',
      '............',
      '............',
      '............',
      '...AAAAAA...',
      '...ALAALA...',
    ],
  },
  // VR-очки: коробка на лице, ремешок вокруг головы
  vr: {
    grid: [
      '............',
      '............',
      '............',
      '............',
      '.....OOOOO..',
      '...KKOWWWvO.',
      '...KKOWWWcO.',
      '.....OOOOO..',
    ],
    front: [
      '............',
      '............',
      '............',
      '............',
      '..OOOOOOOO..',
      '.KOvvvvvvOK.',
      '.KOvcvvcvOK.',
      '..OOOOOOOO..',
    ],
  },
  // Наушники: дуга через макушку и чашка на ухе
  headphones: {
    grid: [
      '............',
      '............',
      '.....A......',
      '.....A......',
      '.....A......',
      '....AhA.....',
      '....AaA.....',
      '....AAA.....',
    ],
    front: [
      '............',
      '............',
      '....AAAA....',
      '...A....A...',
      '..A......A..',
      '.Ah......hA.',
      '.Aa......aA.',
      '.AA......AA.',
    ],
  },
  // Сигара во рту и струйка дыма
  cigar: {
    grid: [
      '............',
      '............',
      '............',
      '...........m',
      '..........m.',
      '...........m',
      '............',
      '.........CCR',
    ],
    front: [
      '............',
      '............',
      '............',
      '............',
      '..........m.',
      '.........m..',
      '..........m.',
      '............',
      '.......CCR..',
    ],
  },
}
const ACC_NAMES = Object.keys(ACCESSORIES)

// Шаг в кадрах contact корпус ниже на 1px — аксессуары опускаются вместе с головой.
// В строках анфас корпус не смещается.
const SHIFT = [0, 1, 0, 1, 0]
const shiftAt = (row, col) => (row < 4 ? SHIFT[col] : 0)
const placed = (grid, shift) => Array.from({ length: H }, (_, y) => [...(grid[y - shift] ?? '.'.repeat(W))])
// Поднятая рука машет перед аксессуарами: под ней и её контуром аксессуар стирается
function underHand(rows, hand) {
  const arm = (x, y) => hand[y - WAVE_TOP]?.[x] && hand[y - WAVE_TOP][x] !== '.'
  return rows.map((r, y) =>
    r.map((ch, x) => ([[0, 0], [0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => arm(x + dx, y + dy)) ? '.' : ch)),
  )
}
// Лист аксессуара в тех же строках и кадрах, что у человечка (без контура)
function accSheetOf({ grid, front }) {
  const right = SHIFT.map((shift) => placed(grid, shift))
  const still = placed(front ?? grid, 0)
  const face = [still, underHand(still, WAVE_HAND.out), underHand(still, WAVE_HAND.in), still, still]
  return [right, right.map(mirror), right, right.map(mirror), face, face]
}
const ACC_SHEETS = ACC_NAMES.map((name) => accSheetOf(ACCESSORIES[name]))
// Часть кадра, которая остаётся видна под головным убором: всё ниже строки cut
function clipOf(cut) {
  let d = ''
  for (let row = 0; row < SHEETS[0].length; row++)
    for (let col = 0; col < 5; col++) {
      const top = cut + shiftAt(row, col)
      d += `M${col * (W + GAP)} ${row * (H + GAP) + top}h${W}v${H - top}h${-W}z`
    }
  return d
}

// --- PNG ---
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
function crc32(buf) {
  let c = 0xffffffff
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(width, height, pixel) {
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) raw.set(pixel(x, y), y * (width * 4 + 1) + 1 + x * 4)
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr.set([8, 6, 0, 0, 0], 8)
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

const cols = SHEETS[0][0].length
const rows = SHEETS[0].length
const sheetW = cols * W
const sheetH = rows * H

const charAt = (sheet, x, y) => sheet[Math.floor(y / H)][Math.floor(x / W)][y % H][x % W]

// Контур пикселей: горизонтальные отрезки подряд идущих пикселей, для которых has(x, y).
// Отрезки не переходят через границу кадра; координаты — в листе с зазорами GAP
function pathOf(has) {
  let d = ''
  for (let y = 0; y < sheetH; y++) {
    const top = y + Math.floor(y / H) * GAP
    let x = 0
    while (x < sheetW) {
      if (!has(x, y)) {
        x++
        continue
      }
      let end = x
      do end++
      while (end % W && has(end, y))
      const left = x + Math.floor(x / W) * GAP
      d += `M${left} ${top}h${end - x}v1h${x - end}z`
      x = end
    }
  }
  return d
}

// Слои SVG: рубашка (fill: 'shirt') и волосы (fill: 'hair') красит компонент, поверх рубашки — тень руки.
// Пиксели, одинаковые у всех причёсок, лежат в d, остальные — в hairstyles[номер причёски]
const hex = ([r, g, b]) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
const byColor = new Map()
for (const [ch, rgba] of Object.entries(PALETTE)) {
  if (SHIRT.has(ch) || HAIR.has(ch)) continue
  const color = hex(rgba)
  byColor.set(color, new Set([...(byColor.get(color) ?? []), ch]))
}
const groups = [
  { fill: 'shirt', chars: SHIRT },
  { fill: 'rgb(0 0 0 / 0.27)', chars: new Set(['t']) },
  { fill: 'hair', chars: HAIR },
  ...[...byColor].map(([fill, chars]) => ({ fill, chars })),
]
const layers = groups.map(({ fill, chars }) => {
  const common = (x, y) => SHEETS.every((sheet) => chars.has(charAt(sheet, x, y)))
  return {
    fill,
    d: pathOf(common),
    hairstyles: SHEETS.map((sheet) => pathOf((x, y) => chars.has(charAt(sheet, x, y)) && !common(x, y))),
  }
})

// Слои аксессуара: fill: 'accessory' красит компонент, поверх — тень и блик, затем фиксированные цвета
const accHex = (rgba) => (rgba[3] === 255 ? hex(rgba) : `rgb(${rgba.slice(0, 3).join(' ')} / ${+(rgba[3] / 255).toFixed(2)})`)
const accessories = Object.fromEntries(
  ACC_NAMES.map((name, i) => {
    const sheet = ACC_SHEETS[i]
    const byFill = new Map()
    for (const [ch, rgba] of Object.entries(ACC_PALETTE)) {
      const fill = accHex(rgba)
      byFill.set(fill, new Set([...(byFill.get(fill) ?? []), ch]))
    }
    const accGroups = [
      { fill: 'accessory', chars: ACC_COLOR },
      { fill: 'rgb(0 0 0 / 0.27)', chars: new Set(['a']) },
      { fill: 'rgb(255 255 255 / 0.4)', chars: new Set(['h']) },
      ...[...byFill].map(([fill, chars]) => ({ fill, chars })),
    ]
    const accLayers = accGroups
      .map(({ fill, chars }) => ({ fill, d: pathOf((x, y) => chars.has(charAt(sheet, x, y))) }))
      .filter((layer) => layer.d)
    const { cut } = ACCESSORIES[name]
    return [name, { clip: cut === undefined ? null : clipOf(cut), layers: accLayers }]
  }),
)

const out = process.argv[2]
write(
  out,
  `// Сгенерировано scripts/generate-walker.mjs — не править вручную.
// Спрайт-лист человечка (кадры разделены прозрачным зазором gap): строки — поза и направление (0 — вправо, 1 — влево,
// 2 и 3 — то же с табличкой, 4 — анфас, 5 — анфас с табличкой), столбцы — кадры
// (0 — стоит, 1–4 — шаг; в строках анфас 1–2 — машет рукой, 3–4 — стоит).
// Слои с fill: 'shirt' и 'hair' красятся в цвета зрителя. Пиксели, общие для всех причёсок, —
// в d, остальные — в hairstyles[номер причёски]. holdHand — кисть с табличкой в кадре стоя
// вправо и анфас.
// accessories — аксессуары в порядке отрисовки: слой fill: 'accessory' красится в цвет аксессуара,
// clip — видимая под головным убором часть листа человечка (null — убор ничего не прячет).
export const WALKER = {
  frameWidth: ${W},
  frameHeight: ${H},
  gap: ${GAP},
  cols: ${cols},
  rows: ${rows},
  holdHand: ${JSON.stringify(HOLD_HAND)},
  hairstyles: ${JSON.stringify(STYLE_NAMES)},
  layers: ${JSON.stringify(layers, null, 2).replace(/\n/g, '\n  ')},
  accessories: ${JSON.stringify(accessories, null, 2).replace(/\n/g, '\n  ')},
} as const
`,
)

// Превью: по строке на причёску — без аксессуаров и с каждым набором пары кадров
// «стоя вправо» и «машет анфас», последние строки — все кадры листа с шапкой, очками и сигарой
const PREVIEW_HAIR = [[92, 58, 38], [30, 30, 30], [214, 168, 72], [176, 74, 34], [150, 150, 158], [232, 111, 165], [79, 127, 217], [61, 42, 31]]
const PREVIEW_ACC = [[229, 57, 53], [67, 160, 71], [30, 136, 229], [253, 216, 53], [142, 36, 170], [255, 143, 0]]

// SVG-превью для ревью в браузере: собрано из тех же слоёв, что уходят в walkerSprite.ts, и рисуется
// так же, как в SceneActor.vue. Сверху — листы всех причёсок, снизу — каждый аксессуар на своей причёске
function svgPreview() {
  const sw = cols * (W + GAP) - GAP
  const sh = rows * (H + GAP) - GAP
  const pad = 6
  const label = 8
  const cellW = sw + pad
  const cellH = label + sh + pad
  const perRow = Math.max(STYLE_NAMES.length, ACC_NAMES.length)
  const width = pad + perRow * cellW
  const height = pad + 2 * cellH
  const frames = Array.from({ length: rows * cols }, (_, i) =>
    `<rect x="${(i % cols) * (W + GAP)}" y="${Math.floor(i / cols) * (H + GAP)}" width="${W}" height="${H}"/>`,
  ).join('')
  const defs = layers.map((layer, i) => `<path id="l${i}" d="${layer.d}"/>`).join('\n')
  const man = (style, clip) => {
    const body = layers
      .map((layer, i) => {
        const fill = layer.fill === 'shirt' ? hex(PALETTE.T) : layer.fill === 'hair' ? hex(PREVIEW_HAIR[style % PREVIEW_HAIR.length]) : layer.fill
        return `<g fill="${fill}"><use href="#l${i}"/><path d="${layer.hairstyles[style]}"/></g>`
      })
      .join('')
    return clip ? `<g clip-path="url(#${clip})">${body}</g>` : body
  }
  const cell = (n, title, content) =>
    `<g transform="translate(${pad + (n % perRow) * cellW} ${pad + Math.floor(n / perRow) * cellH})">` +
    `<text y="${label - 2}">${title}</text><g transform="translate(0 ${label})"><g class="frame">${frames}</g>${content}</g></g>`
  const clips = []
  const cells = [
    ...STYLE_NAMES.map((name, style) => cell(style, name, man(style))),
    ...ACC_NAMES.map((name, i) => {
      const style = i % STYLE_NAMES.length
      const { clip, layers: accLayers } = accessories[name]
      if (clip) clips.push(`<clipPath id="c${i}"><path d="${clip}"/></clipPath>`)
      const acc = accLayers
        .map((layer) => `<path fill="${layer.fill === 'accessory' ? hex(PREVIEW_ACC[i % PREVIEW_ACC.length]) : layer.fill}" d="${layer.d}"/>`)
        .join('')
      return cell(perRow + i, name, man(style, clip && `c${i}`) + acc)
    }),
  ]
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width * 4}" height="${height * 4}" shape-rendering="crispEdges">
<style>text { font: 5px monospace; fill: #555 } .frame { fill: #fff }</style>
<rect width="100%" height="100%" fill="#d4d4dc"/>
<defs>
${defs}
${clips.join('\n')}
</defs>
${cells.join('\n')}
</svg>
`
}

if (process.argv[3]?.endsWith('.svg')) write(process.argv[3], svgPreview())
else if (process.argv[3]) {
  const SETS = [[], ['headphones'], ['beanie'], ['helmet'], ['glasses'], ['vr'], ['cigar'], ['beanie', 'glasses', 'cigar'], ['helmet', 'vr'], ['headphones', 'glasses'], ['vr', 'headphones']]
  const mix = (base, [r, g, b, a]) => base.map((v, k) => Math.round(v + (([r, g, b][k] - v) * a) / 255))
  // Цвет пикселя (x, y) листа: человечек, спрятанный под убором, затем аксессуары по порядку
  function pixel(style, set, x, y, accColor) {
    const fy = y % H
    const cut = Math.max(-1, ...set.map((n) => ACCESSORIES[n].cut ?? -1))
    let color = [230, 230, 235]
    const ch = charAt(SHEETS[style], x, y)
    if (ch !== '.' && !(fy < cut + shiftAt(Math.floor(y / H), Math.floor(x / W)))) {
      if (HAIR.has(ch)) color = PREVIEW_HAIR[style % PREVIEW_HAIR.length]
      else if (ch === 't') color = mix(PALETTE.T.slice(0, 3), [0, 0, 0, 69])
      else color = PALETTE[ch].slice(0, 3)
    }
    for (const name of ACC_NAMES) {
      if (!set.includes(name)) continue
      const a = charAt(ACC_SHEETS[ACC_NAMES.indexOf(name)], x, y)
      if (a === '.') continue
      if (ACC_COLOR.has(a)) color = accColor
      if (a === 'a') color = mix(color, [0, 0, 0, 69])
      else if (a === 'h') color = mix(color, [255, 255, 255, 102])
      else if (!ACC_COLOR.has(a)) color = mix(color, ACC_PALETTE[a])
    }
    return color
  }
  const scale = 8
  const stride = H + 2
  const cellW = W + 2
  const imgW = Math.max(SETS.length * 2 * cellW, sheetW)
  const imgRows = SHEETS.length + rows
  write(
    process.argv[3],
    png(imgW * scale, (stride * imgRows - 2) * scale, (px, py) => {
      const x = Math.floor(px / scale)
      const y = Math.floor(py / scale)
      const band = Math.floor(y / stride)
      if (y % stride >= H) return [180, 180, 190, 255]
      if (band < SHEETS.length) {
        const cell = Math.floor(x / cellW)
        const set = Math.floor(cell / 2)
        if (x % cellW >= W || set >= SETS.length) return [180, 180, 190, 255]
        // Нечётная клетка — кадр «машет» из строки анфас
        const [fx, fy] = cell % 2 ? [W, 4 * H] : [0, 0]
        const color = PREVIEW_ACC[(band + set) % PREVIEW_ACC.length]
        return [...pixel(band, SETS[set], fx + (x % cellW), fy + (y % stride), color), 255]
      }
      if (x >= sheetW) return [180, 180, 190, 255]
      const row = band - SHEETS.length
      return [...pixel(2, ['beanie', 'glasses', 'cigar'], x, row * H + (y % stride), PREVIEW_ACC[2]), 255]
    }),
  )
}
