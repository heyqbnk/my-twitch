// Генератор спрайтов пиксельного человечка: node scripts/generate-walker.mjs src/scene/walkerSprite.ts [preview.png|preview.svg]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

// Пикселей спрайта на пиксель сцены: в ?scale= и в остальной сцене (двери, шаг, интерфейс) пиксель
// вдвое крупнее, чем у человечка, — так на нём можно рисовать детали мельче прежнего пикселя
const RES = 2;
const W = 24;
const H = 44;
// Шея — строки 18–19 головы (и кадра стоя): голова выше неё кивает отдельно от тела
const NECK = 18;
// Толщина автоматического контура
const OUTLINE = 2;
// Прозрачный зазор между кадрами в листе: при дробном масштабе граница кадра округляется,
// и без зазора у края просвечивал соседний кадр (например, кончик сигары)
const GAP = 2;

// Пишет файл, только если содержимое изменилось: генератор запускается при каждом старте dev-сервера,
// и лишняя перезапись walkerSprite.ts дёргала бы HMR
function write(path, content) {
  if (existsSync(path) && readFileSync(path).equals(Buffer.from(content))) return;
  writeFileSync(path, content);
}

// Палитра. T/t — рубашка (перекрашивается в цвет зрителя), H — волосы, P/p — штаны, B/b — обувь
// (красятся в цвета одежды зрителя), остальное фиксировано.
const PALETTE = {
  // контур
  O: [27, 27, 36, 255],
  // глаз
  E: [27, 27, 36, 255],
  // волосы (перекрашиваются в цвет волос зрителя)
  H: [92, 58, 38, 255],
  // кожа
  S: [242, 194, 155, 255],
  // кожа в тени (дальняя рука)
  s: [204, 156, 120, 255],
  // рубашка
  T: [59, 130, 246, 255],
  // рубашка в тени (рука)
  t: [37, 99, 200, 255],
  // штаны
  P: [59, 74, 107, 255],
  // дальняя нога
  p: [41, 52, 78, 255],
  // ботинки
  B: [58, 38, 28, 255],
  // голенище дальней ноги
  b: [40, 26, 19, 255],
  // белое: лампасы, кеды
  w: [244, 244, 246, 255],
  // розовое платье и оно же в тени
  K: [240, 128, 180, 255],
  k: [206, 88, 148, 255],
  // корпус телефона
  D: [44, 44, 54, 255],
  // экран телефона и он же посветлее: мерцает, пока листают ленту
  G: [120, 200, 255, 255],
  g: [205, 240, 255, 255],
};
const SHIRT = new Set(['T', 't']);
const HAIR = new Set(['H']);
const PANTS = new Set(['P', 'p']);
const SHOES = new Set(['B', 'b']);
// Тень поверх перекрашиваемых цветов: рука, дальняя нога, голенище дальней ноги
const SHADOW = new Set(['t', 'p', 'b']);

// Причёски: голова с запасом в 4 строки сверху под объёмные волосы (20 строк), смотрит вправо.
// Глаз — E в строках 12–13, шея — две последние строки. H — волосы, красятся в цвет волос зрителя.
const HAIRSTYLES = {
  // Ёжик: короткая шапочка волос
  buzz: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........HHHHHHHH........',
    '........HHHHHHHH........',
    '......HHHHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '......HHHHSSSSSSSS......',
    '......HHHHSSSSSSSS......',
    '......HHSSSSSSEESS......',
    '......HHSSSSSSEESS......',
    '......SSSSSSSSSSSS......',
    '......SSSSSSSSSSSS......',
    '........SSSSSSSS........',
    '........SSSSSSSS........',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  // Колючки: торчащие вверх пряди
  spiky: [
    '........................',
    '........................',
    '......HH..HH..HH........',
    '......HH..HH..HH........',
    '......HHHHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHHHHHHHHHHHHH....',
    '......HHHHHHHHHHHHHH....',
    '......HHHHHHHHHHHHHH....',
    '......HHHHHHSSSSSS......',
    '......HHHHHHSSSSSS......',
    '......HHHHSSSSEESS......',
    '......HHHHSSSSEESS......',
    '......HHSSSSSSSSSS......',
    '......HHSSSSSSSSSS......',
    '........SSSSSSSS........',
    '........SSSSSSSS........',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  // Афро: пышная шапка волос
  afro: [
    '........................',
    '........................',
    '......HHHHHHHHHH........',
    '......HHHHHHHHHH........',
    '....HHHHHHHHHHHHHH......',
    '....HHHHHHHHHHHHHH......',
    '..HHHHHHHHHHHHHHHHHH....',
    '..HHHHHHHHHHHHHHHHHH....',
    '..HHHHHHHHHHHHHHHHHH....',
    '..HHHHHHHHHHHHHHHHHH....',
    '..HHHHHHHHHHSSSSSS......',
    '..HHHHHHHHHHSSSSSS......',
    '..HHHHHHHHSSSSEESS......',
    '..HHHHHHHHSSSSEESS......',
    '....HHHHHHSSSSSSSS......',
    '....HHHHHHSSSSSSSS......',
    '......HHSSSSSSSS........',
    '......HHSSSSSSSS........',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  // Хвост: собранные волосы свисают с затылка
  ponytail: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........HHHHHHHH........',
    '........HHHHHHHH........',
    '......HHHHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '..HHHHHHHHHHSSSSSS......',
    '..HHHHHHHHHHSSSSSS......',
    '..HHHHHHHHSSSSEESS......',
    '..HHHHHHHHSSSSEESS......',
    '..HH..HHSSSSSSSSSS......',
    '..HH..HHSSSSSSSSSS......',
    '..HH....SSSSSSSS........',
    '..HH....SSSSSSSS........',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  // Каре: чёлка и волосы до подбородка
  bob: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '......HHHHHHHHHH........',
    '......HHHHHHHHHH........',
    '....HHHHHHHHHHHHHH......',
    '....HHHHHHHHHHHHHH......',
    '....HHHHHHHHHHHHSS......',
    '....HHHHHHHHHHHHSS......',
    '....HHHHHHHHSSEESS......',
    '....HHHHHHHHSSEESS......',
    '....HHHHHHSSSSSSSS......',
    '....HHHHHHSSSSSSSS......',
    '....HHHHHHSSSSSS........',
    '....HHHHHHSSSSSS........',
    '....HHHH..SSSS..........',
    '....HHHH..SSSS..........',
  ],
  // Пучок на макушке
  bun: [
    '........................',
    '........................',
    '......HHHHHH............',
    '......HHHHHH............',
    '........HH..............',
    '........HH..............',
    '........HHHHHHHH........',
    '........HHHHHHHH........',
    '......HHHHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '......HHHHHHSSSSSS......',
    '......HHHHHHSSSSSS......',
    '......HHHHSSSSEESS......',
    '......HHHHSSSSEESS......',
    '......HHSSSSSSSSSS......',
    '......HHSSSSSSSSSS......',
    '........SSSSSSSS........',
    '........SSSSSSSS........',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  // Кок: волосы зачёсаны вверх и вперёд
  quiff: [
    '........................',
    '........................',
    '............HHHHHH......',
    '............HHHHHH......',
    '........HHHHHHHHHHHH....',
    '........HHHHHHHHHHHH....',
    '......HHHHHHHHHHHHHH....',
    '......HHHHHHHHHHHHHH....',
    '......HHHHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '......HHHHSSSSSSSS......',
    '......HHHHSSSSSSSS......',
    '......HHSSSSSSEESS......',
    '......HHSSSSSSEESS......',
    '......SSSSSSSSSSSS......',
    '......SSSSSSSSSSSS......',
    '........SSSSSSSS........',
    '........SSSSSSSS........',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  // Лысина с бородой
  beard: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........SSSSSSSS........',
    '........SSSSSSSS........',
    '......SSSSSSSSSSSS......',
    '......SSSSSSSSSSSS......',
    '......SSSSSSSSSSSS......',
    '......SSSSSSSSSSSS......',
    '......SSSSHHSSEESS......',
    '......SSSSHHSSEESS......',
    '......SSSSHHHHHHHH......',
    '......SSSSHHHHHHHH......',
    '........HHHHHHHH........',
    '........HHHHHHHH........',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  // Ирокез: гребень волос по макушке, виски выбриты
  mohawk: [
    '........................',
    '........................',
    '........HHHHHHHHHH......',
    '........HHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '........HHHHHHHH........',
    '........HHHHHHHH........',
    '......SSSSSSSSSSSS......',
    '......SSSSSSSSSSSS......',
    '......SSSSSSSSSSSS......',
    '......SSSSSSSSSSSS......',
    '......SSSSSSSSEESS......',
    '......SSSSSSSSEESS......',
    '......SSSSSSSSSSSS......',
    '......SSSSSSSSSSSS......',
    '........SSSSSSSS........',
    '........SSSSSSSS........',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  // Эмо: длинная чёлка закрывает глаз
  emo: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........HHHHHHHH........',
    '........HHHHHHHH........',
    '......HHHHHHHHHHHHHH....',
    '......HHHHHHHHHHHHHH....',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHHHSSSSHHHH......',
    '....HHHHHHSSSSHHHH......',
    '....HHHHSSSSSSSSSS......',
    '....HHHHSSSSSSSSSS......',
    '......HHSSSSSSSS........',
    '......HHSSSSSSSS........',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  // Пробор и усы
  mustache: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '......HHHHHHHHHH........',
    '......HHHHHHHHHH........',
    '......HHHHHHHHHHHHHH....',
    '......HHHHHHHHHHHHHH....',
    '......HHHHHHSSSSSS......',
    '......HHHHHHSSSSSS......',
    '......HHSSSSSSEESS......',
    '......HHSSSSSSEESS......',
    '......SSSSSSSSHHHHHH....',
    '......SSSSSSSSHHHHHH....',
    '........SSSSSSSS........',
    '........SSSSSSSS........',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  // Хвостики по бокам головы: сбоку виден ближний
  pigtails: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........HHHHHHHH........',
    '........HHHHHHHH........',
    '......HHHHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '......HHHHHHSSSSSS......',
    '......HHHHHHSSSSSS......',
    '....HHHHHHSSSSEESS......',
    '....HHHHHHSSSSEESS......',
    '..HHHHHHSSSSSSSSSS......',
    '..HHHHHHSSSSSSSSSS......',
    '..HH....SSSSSSSS........',
    '..HH....SSSSSSSS........',
    '..HH......SSSS..........',
    '..HH......SSSS..........',
  ],
  // Дреды: пряди свисают до плеч
  dreads: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........HHHHHHHH........',
    '........HHHHHHHH........',
    '....HHHHHHHHHHHHHH......',
    '....HHHHHHHHHHHHHH......',
    '..HHHHHHHHHHSSSSSS......',
    '..HHHHHHHHHHSSSSSS......',
    '..HH..HHHHSSSSEESS......',
    '..HH..HHHHSSSSEESS......',
    '..HH..HHSSSSSSSSSS......',
    '..HH..HHSSSSSSSSSS......',
    '..HH..HHSSSSSSSS........',
    '..HH..HHSSSSSSSS........',
    '..HH..HH..SSSS..........',
    '..HH..HH..SSSS..........',
  ],
  // Горшок: ровная чёлка до бровей, волосы закрывают уши
  bowl: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........HHHHHHHH........',
    '........HHHHHHHH........',
    '......HHHHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHHHHHHHHHHHHH....',
    '......SSSSSSSSEESS......',
    '......SSSSSSSSEESS......',
    '......SSSSSSSSSSSS......',
    '......SSSSSSSSSSSS......',
    '........SSSSSSSS........',
    '........SSSSSSSS........',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  // Два пучка по бокам макушки: сбоку виден ближний
  spacebuns: [
    '........................',
    '........................',
    '......HHHH..............',
    '......HHHH..............',
    '....HHHHHHHH............',
    '....HHHHHHHH............',
    '......HHHHHHHHHH........',
    '......HHHHHHHHHH........',
    '......HHHHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '......HHHHHHSSSSSS......',
    '......HHHHHHSSSSSS......',
    '......HHHHSSSSEESS......',
    '......HHHHSSSSEESS......',
    '......HHSSSSSSSSSS......',
    '......HHSSSSSSSSSS......',
    '........SSSSSSSS........',
    '........SSSSSSSS........',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
};
const STYLE_NAMES = Object.keys(HAIRSTYLES);
// Те же причёски анфас: лицом к зрителю, глаза — E в строках 12–13
const HAIRSTYLES_FRONT = {
  buzz: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........HHHHHHHH........',
    '........HHHHHHHH........',
    '......HHHHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '......HHSSSSSSSSHH......',
    '......HHSSSSSSSSHH......',
    '......SSEESSSSEESS......',
    '......SSEESSSSEESS......',
    '......SSSSSSSSSSSS......',
    '......SSSSSSSSSSSS......',
    '........SSSSSSSS........',
    '........SSSSSSSS........',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  spiky: [
    '........................',
    '........................',
    '......HH..HHHH..HH......',
    '......HH..HHHH..HH......',
    '......HHHHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHHHHHHHHHHHHH....',
    '......HHSSSSSSSSHH......',
    '......HHSSSSSSSSHH......',
    '......SSEESSSSEESS......',
    '......SSEESSSSEESS......',
    '......SSSSSSSSSSSS......',
    '......SSSSSSSSSSSS......',
    '........SSSSSSSS........',
    '........SSSSSSSS........',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  afro: [
    '........................',
    '........................',
    '......HHHHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHHHHHHHHHHHHH....',
    '..HHHHHHHHHHHHHHHHHHHH..',
    '..HHHHHHHHHHHHHHHHHHHH..',
    '..HHHHHHHHHHHHHHHHHHHH..',
    '..HHHHHHHHHHHHHHHHHHHH..',
    '..HHHHHHSSSSSSSSHHHHHH..',
    '..HHHHHHSSSSSSSSHHHHHH..',
    '..HHHHSSEESSSSEESSHHHH..',
    '..HHHHSSEESSSSEESSHHHH..',
    '....HHSSSSSSSSSSSSHH....',
    '....HHSSSSSSSSSSSSHH....',
    '......HHSSSSSSSSHH......',
    '......HHSSSSSSSSHH......',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  // Хвост из-за головы виден сбоку
  ponytail: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........HHHHHHHH........',
    '........HHHHHHHH........',
    '......HHHHHHHHHHHHHH....',
    '......HHHHHHHHHHHHHH....',
    '......HHSSSSSSSSHHHH....',
    '......HHSSSSSSSSHHHH....',
    '......SSEESSSSEESSHH....',
    '......SSEESSSSEESSHH....',
    '......SSSSSSSSSSSSHH....',
    '......SSSSSSSSSSSSHH....',
    '........SSSSSSSS..HH....',
    '........SSSSSSSS..HH....',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  bob: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '......HHHHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHSSSSSSSSHHHH....',
    '....HHHHSSSSSSSSHHHH....',
    '....HHSSEESSSSEESSHH....',
    '....HHSSEESSSSEESSHH....',
    '....HHSSSSSSSSSSSSHH....',
    '....HHSSSSSSSSSSSSHH....',
    '....HHHHSSSSSSSSHHHH....',
    '....HHHHSSSSSSSSHHHH....',
    '....HHHH..SSSS..HHHH....',
    '....HHHH..SSSS..HHHH....',
  ],
  bun: [
    '........................',
    '........................',
    '........HHHHHHHH........',
    '........HHHHHHHH........',
    '..........HHHH..........',
    '..........HHHH..........',
    '........HHHHHHHH........',
    '........HHHHHHHH........',
    '......HHHHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '......HHSSSSSSSSHH......',
    '......HHSSSSSSSSHH......',
    '......SSEESSSSEESS......',
    '......SSEESSSSEESS......',
    '......SSSSSSSSSSSS......',
    '......SSSSSSSSSSSS......',
    '........SSSSSSSS........',
    '........SSSSSSSS........',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  quiff: [
    '........................',
    '........................',
    '..........HHHHHH........',
    '..........HHHHHH........',
    '........HHHHHHHHHH......',
    '........HHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '......HHSSSSSSSSHH......',
    '......HHSSSSSSSSHH......',
    '......SSEESSSSEESS......',
    '......SSEESSSSEESS......',
    '......SSSSSSSSSSSS......',
    '......SSSSSSSSSSSS......',
    '........SSSSSSSS........',
    '........SSSSSSSS........',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  beard: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........SSSSSSSS........',
    '........SSSSSSSS........',
    '......SSSSSSSSSSSS......',
    '......SSSSSSSSSSSS......',
    '......SSSSSSSSSSSS......',
    '......SSSSSSSSSSSS......',
    '......HHEESSSSEEHH......',
    '......HHEESSSSEEHH......',
    '......HHHHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '........HHHHHHHH........',
    '........HHHHHHHH........',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  mohawk: [
    '........................',
    '........................',
    '..........HHHH..........',
    '..........HHHH..........',
    '..........HHHH..........',
    '..........HHHH..........',
    '........SSHHHHSS........',
    '........SSHHHHSS........',
    '......SSSSHHHHSSSS......',
    '......SSSSHHHHSSSS......',
    '......SSSSSSSSSSSS......',
    '......SSSSSSSSSSSS......',
    '......SSEESSSSEESS......',
    '......SSEESSSSEESS......',
    '......SSSSSSSSSSSS......',
    '......SSSSSSSSSSSS......',
    '........SSSSSSSS........',
    '........SSSSSSSS........',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  emo: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '......HHHHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHHHHHHHHHSSHH....',
    '....HHHHHHHHHHHHSSHH....',
    '....HHHHHHHHSSEESSHH....',
    '....HHHHHHHHSSEESSHH....',
    '....HHHHHHSSSSSSSSHH....',
    '....HHHHHHSSSSSSSSHH....',
    '......HHHHSSSSSSHH......',
    '......HHHHSSSSSSHH......',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  mustache: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '......HHHHHHHHHH........',
    '......HHHHHHHHHH........',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHHHHHHHHHHHHH....',
    '......HHSSSSSSSSHH......',
    '......HHSSSSSSSSHH......',
    '......SSEESSSSEESS......',
    '......SSEESSSSEESS......',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHHHHHHHHHHHHH....',
    '........SSSSSSSS........',
    '........SSSSSSSS........',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  pigtails: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........HHHHHHHH........',
    '........HHHHHHHH........',
    '......HHHHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '......HHSSSSSSSSHH......',
    '......HHSSSSSSSSHH......',
    '..HHHHSSEESSSSEESSHHHH..',
    '..HHHHSSEESSSSEESSHHHH..',
    '..HH..SSSSSSSSSSSS..HH..',
    '..HH..SSSSSSSSSSSS..HH..',
    '..HH....SSSSSSSS....HH..',
    '..HH....SSSSSSSS....HH..',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  dreads: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '......HHHHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHHHHHHHHHHHHH....',
    '..HHHHHHSSSSSSSSHHHHHH..',
    '..HHHHHHSSSSSSSSHHHHHH..',
    '..HHHHSSEESSSSEESSHHHH..',
    '..HHHHSSEESSSSEESSHHHH..',
    '..HH..HHSSSSSSSSHH..HH..',
    '..HH..HHSSSSSSSSHH..HH..',
    '..HH..HHSSSSSSSSHH..HH..',
    '..HH..HHSSSSSSSSHH..HH..',
    '..HH..HH..SSSS..HH..HH..',
    '..HH..HH..SSSS..HH..HH..',
  ],
  bowl: [
    '........................',
    '........................',
    '........................',
    '........................',
    '........HHHHHHHH........',
    '........HHHHHHHH........',
    '......HHHHHHHHHHHH......',
    '......HHHHHHHHHHHH......',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHHHHHHHHHHHHH....',
    '......SSEESSSSEESS......',
    '......SSEESSSSEESS......',
    '......SSSSSSSSSSSS......',
    '......SSSSSSSSSSSS......',
    '........SSSSSSSS........',
    '........SSSSSSSS........',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
  spacebuns: [
    '........................',
    '........................',
    '....HHHH........HHHH....',
    '....HHHH........HHHH....',
    '..HHHHHHHH....HHHHHHHH..',
    '..HHHHHHHH....HHHHHHHH..',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHHHHHHHHHHHHH....',
    '....HHHHHHHHHHHHHHHH....',
    '......HHSSSSSSSSHH......',
    '......HHSSSSSSSSHH......',
    '......SSEESSSSEESS......',
    '......SSEESSSSEESS......',
    '......SSSSSSSSSSSS......',
    '......SSSSSSSSSSSS......',
    '........SSSSSSSS........',
    '........SSSSSSSS........',
    '..........SSSS..........',
    '..........SSSS..........',
  ],
};
const ARMS = {
  side: [
    '........TTTTTTTT........',
    '........TTTTTTTT........',
    '........TTttTTTT........',
    '........TTttTTTT........',
    '........TTttTTTT........',
    '........TTttTTTT........',
    '........TTttTTTT........',
    '........TTttTTTT........',
    '........PPSSPPPP........',
    '........PPSSPPPP........',
  ],
  // На шаге дальняя рука (в тени, из-за корпуса) качается навстречу ближней
  forward: [
    '........TTTTTTTT........',
    '........TTTTTTTT........',
    '........TTTTttTT........',
    '........TTTTttTT........',
    '......ttTTTTTTtttt......',
    '......ttTTTTTTtttt......',
    '......ssTTTTTTTTSS......',
    '......ssTTTTTTTTSS......',
    '........PPPPPPPP........',
    '........PPPPPPPP........',
  ],
  back: [
    '........TTTTTTTT........',
    '........TTTTTTTT........',
    '........ttTTTTTT........',
    '........ttTTTTTT........',
    '......ttttTTTTTTtt......',
    '......ttttTTTTTTtt......',
    '......SSTTTTTTTTss......',
    '......SSTTTTTTTTss......',
    '........PPPPPPPP........',
    '........PPPPPPPP........',
  ],
  // Рука вытянута вперёд и держит шест таблички: кисть в точке HOLD_HAND
  hold: [
    '........TTTTTTTT........',
    '........TTTTTTTT........',
    '........TTTTTTtttt......',
    '........TTTTTTtttt......',
    '........TTTTTTTTttSS....',
    '........TTTTTTTTttSS....',
    '........TTTTTTTT........',
    '........TTTTTTTT........',
    '........PPPPPPPP........',
    '........PPPPPPPP........',
  ],
  // Анфас: руки по швам
  front: [
    '......TTTTTTTTTTTT......',
    '......TTTTTTTTTTTT......',
    '......TTTTTTTTTTTT......',
    '......TTTTTTTTTTTT......',
    '......ttTTTTTTTTtt......',
    '......ttTTTTTTTTtt......',
    '......ttTTTTTTTTtt......',
    '......ttTTTTTTTTtt......',
    '......SSPPPPPPPPSS......',
    '......SSPPPPPPPPSS......',
  ],
  // Анфас, левая для зрителя рука поднята (продолжение — WAVE_HAND)
  frontWave: [
    '....ttttTTTTTTTTTT......',
    '....ttttTTTTTTTTTT......',
    '......TTTTTTTTTTTT......',
    '......TTTTTTTTTTTT......',
    '........TTTTTTTTtt......',
    '........TTTTTTTTtt......',
    '........TTTTTTTTtt......',
    '........TTTTTTTTtt......',
    '........PPPPPPPPSS......',
    '........PPPPPPPPSS......',
  ],
  // Анфас с шестом таблички в правой для зрителя руке: кисть в той же точке HOLD_HAND
  frontHold: [
    '......TTTTTTTTTTTT......',
    '......TTTTTTTTTTTT......',
    '......TTTTTTTTTTtt......',
    '......TTTTTTTTTTtt......',
    '......ttTTTTTTTTttSS....',
    '......ttTTTTTTTTttSS....',
    '......ttTTTTTTTT........',
    '......ttTTTTTTTT........',
    '......SSPPPPPPPP........',
    '......SSPPPPPPPP........',
  ],
  frontWaveHold: [
    '....ttttTTTTTTTTTT......',
    '....ttttTTTTTTTTTT......',
    '......TTTTTTTTTTtt......',
    '......TTTTTTTTTTtt......',
    '........TTTTTTTTttSS....',
    '........TTTTTTTTttSS....',
    '........TTTTTTTT........',
    '........TTTTTTTT........',
    '........PPPPPPPP........',
    '........PPPPPPPP........',
  ],
  // Согнутая в локте рука держит телефон перед собой (сам телефон — PHONE)
  phone: [
    '........TTTTTTTT........',
    '........TTTTTTTT........',
    '........TTTTTTtttt......',
    '........TTTTTTtttt......',
    '........TTTTTTTT........',
    '........TTTTTTTT........',
    '........TTTTTTTT........',
    '........TTTTTTTT........',
    '........PPPPPPPP........',
    '........PPPPPPPP........',
  ],
};
// Кисть, держащая шест, в кадре стоя (смотрит вправо или анфас)
// (x — середина кисти, y — её верх)
const HOLD_HAND = { x: 19, y: 24 };
// Поднятая рука сбоку от головы (строки 4–19): качается только ладонь над головой —
// предплечье в обоих кадрах на месте и не прилегает к лицу, иначе голова «дышит» по ширине
const WAVE_HAND = {
  out: [
    '..SS....................',
    '..SS....................',
    '..SS....................',
    '..SS....................',
    '..tt....................',
    '..tt....................',
    '..tt....................',
    '..tt....................',
    '..tt....................',
    '..tt....................',
    '..tt....................',
    '..tt....................',
    '....tt..................',
    '....tt..................',
    '....tt..................',
    '....tt..................',
  ],
  in: [
    '....SS..................',
    '....SS..................',
    '....SS..................',
    '....SS..................',
    '..tt....................',
    '..tt....................',
    '..tt....................',
    '..tt....................',
    '..tt....................',
    '..tt....................',
    '..tt....................',
    '..tt....................',
    '....tt..................',
    '....tt..................',
    '....tt..................',
    '....tt..................',
  ],
};
const WAVE_TOP = 4;
// Телефон в кисти (строки 18–23, ниже шеи — не кивает вместе с головой): экраном к лицу,
// в двух кадрах светлое пятно на экране смещается, будто листают ленту
const PHONE = {
  a: [
    '..................ggDD..',
    '..................ggDD..',
    '..................GGDD..',
    '..................GGDD..',
    '..................SSDD..',
    '..................SSDD..',
  ],
  b: [
    '..................GGDD..',
    '..................GGDD..',
    '..................ggDD..',
    '..................ggDD..',
    '..................SSDD..',
    '..................SSDD..',
  ],
};
const PHONE_TOP = 18;
// Ноги: idle/passing — 12 строк (30–41), contact — 10 строк (32–41), корпус ниже на 2px
const LEGS = {
  idle: [
    '........PPPPPPPP........',
    '........PPPPPPPP........',
    '........ppppPPPP........',
    '........ppppPPPP........',
    '........ppppPPPP........',
    '........ppppPPPP........',
    '........ppppPPPP........',
    '........ppppPPPP........',
    '........BBBBBBBB........',
    '........BBBBBBBB........',
    '........BBBBBBBBBB......',
    '........BBBBBBBBBB......',
  ],
  contactA: [
    '........PPPPPPPP........',
    '........PPPPPPPP........',
    '......ppppPPPPPP........',
    '......ppppPPPPPP........',
    '......pppp....PPPP......',
    '......pppp....PPPP......',
    '....pppp........PPPP....',
    '....pppp........PPPP....',
    '....BBBB........BBBBBB..',
    '....BBBB........BBBBBB..',
  ],
  passA: [
    '........PPPPPPPP........',
    '........PPPPPPPP........',
    '........PPPPPPPP........',
    '........PPPPPPPP........',
    '........ppppPPPP........',
    '........ppppPPPP........',
    '......pppp..PPPP........',
    '......pppp..PPPP........',
    '......BBBB..PPPP........',
    '......BBBB..PPPP........',
    '............BBBBBB......',
    '............BBBBBB......',
  ],
  contactB: [
    '........PPPPPPPP........',
    '........PPPPPPPP........',
    '......PPPPpppppp........',
    '......PPPPpppppp........',
    '......PPPP....pppp......',
    '......PPPP....pppp......',
    '....PPPP........pppp....',
    '....PPPP........pppp....',
    '....BBBB........BBBBBB..',
    '....BBBB........BBBBBB..',
  ],
  passB: [
    '........PPPPPPPP........',
    '........PPPPPPPP........',
    '........PPPPPPPP........',
    '........PPPPPPPP........',
    '........PPPPpppp........',
    '........PPPPpppp........',
    '......PPPP..pppp........',
    '......PPPP..pppp........',
    '......BBBB..pppp........',
    '......BBBB..pppp........',
    '............BBBBBB......',
    '............BBBBBB......',
  ],
  front: [
    '........PPPPPPPP........',
    '........PPPPPPPP........',
    '........PPPPPPPP........',
    '........PPPPPPPP........',
    '........PP....PP........',
    '........PP....PP........',
    '........PP....PP........',
    '........PP....PP........',
    '........BB....BB........',
    '........BB....BB........',
    '......BBBB....BBBB......',
    '......BBBB....BBBB......',
  ],
};

// Накладывает непрозрачные пиксели overlay на rows начиная со строки top
function overlay(rows, grid, top) {
  return rows.map((r, y) => {
    const o = grid[y - top];
    return o ? [...r].map((ch, x) => (o[x] !== '.' ? o[x] : ch)).join('') : r;
  });
}

// Одежда: правила, которые переодевают человечка из базового наряда (лонгслив, джинсы, ботинки).
// Обувь и штаны меняют сетку ног (front — ноги анфас), верх — голову с руками (upper), а платье и ноги (юбка).
// Силуэт одежда только расширяет: на спрайте она рисуется накладкой поверх базового человечка
const recolor = (rows, map, from = 0) => rows.map((r, y) => (y < from ? r : [...r].map(ch => map[ch] ?? ch).join('')));
// Пиксели по 4 сторонам не дальше distance
const near = distance => Array.from(
  { length: distance },
  (_, i) => [[0, i + 1], [0, -i - 1], [i + 1, 0], [-i - 1, 0]],
).flat();
// Короткие рукава: два пикселя сцены рукава от каждой кисти становятся кожей того же оттенка, что кисть.
// Шаг — на пиксель сцены (до RES пикселей по сторонам), иначе на диагональной руке рукав обрезался бы неровно
const SLEEVE_STEP = near(RES);
function shortSleeves(upper, hands) {
  const g = upper.map(r => [...r]);
  let edge = hands;
  for (let step = 0; step < 2; step++) {
    const next = [];
    for (const [x, y, skin] of edge) for (const [dx, dy] of SLEEVE_STEP) {
      if (g[y + dy]?.[x + dx] !== 't') continue;
      g[y + dy][x + dx] = skin;
      next.push([x + dx, y + dy, skin]);
    }
    edge = next;
  }
  return g.map(r => r.join(''));
}
// Юбка: шесть верхних строк ног закрашены целиком и ниже первых двух расширяются, подол в тени
const skirt = legs => legs.map((r, y) => {
  if (y > 5) return r;
  const first = r.search(/[^.]/);
  const last = r.length - 1 - [...r].reverse().join('')
    .search(/[^.]/);
  const flare = y > 1 ? 2 : 0;
  return '.'.repeat(first - flare) + (y > 3 ? 'k' : 'K').repeat(last - first + 1 + 2 * flare) + '.'.repeat(r.length - 1 - last - flare);
});
const CLOTHES = {
  shoes: {
    boots: legs => legs,
    // Кеды: белые, носок в цвет обуви
    sneakers: legs => legs.map(r => r.replace(/B+/g, run => 'w'.repeat(run.length - 2) + 'BB')),
    // Высокие сапоги: голенище закрывает две строки штанины над стопой
    highboots: legs => legs.map((r, y) => [...r].map((ch, x) => (
      PANTS.has(ch) && (legs[y + 1]?.[x] === 'B' || legs[y + 2]?.[x] === 'B') ? (ch === 'P' ? 'B' : 'b') : ch
    )).join('')),
  },
  pants: {
    jeans: legs => legs,
    // Шорты: ниже колена голые ноги
    shorts: legs => recolor(legs, { P: 'S', p: 's' }, 4),
    // Спортивки: белый лампас по заднему краю ближней штанины (анфас штанины узкие — без лампаса)
    joggers: (legs, front) => (front ? legs : legs.map((r, y) => (y > 1 ? r.replace(/P{4,}/g, run => 'ww' + run.slice(2)) : r))),
  },
  // Верх — в цвет ника, кроме платья
  tops: {
    longsleeve: parts => parts,
    tshirt: ({ upper, legs, hands }) => ({ upper: shortSleeves(upper, hands), legs }),
    // Кофта с капюшоном: капюшон лежит вокруг шеи, низ закрывает пояс штанов
    hoodie: ({ upper, legs }) => ({
      upper: upper.map((r, y) => (y === NECK || y === NECK + 1 ? r.replace(/S/g, 't') : y >= upper.length - 2 ? r.replace(/P/g, 'T') : r)),
      legs,
    }),
    // Розовое платье с короткими рукавами, пояс в тени
    dress: ({ upper, legs, hands }) => ({
      upper: recolor(shortSleeves(upper, hands), { T: 'K', t: 'k' }).map((r, y) => (y >= upper.length - 2 ? r.replace(/P/g, 'k') : r)),
      legs: skirt(legs),
    }),
  },
};
// Порядок слоёв одежды на спрайте: верх поверх обуви, обувь поверх штанов
const SLOTS = ['pants', 'shoes', 'tops'];
const BASE_OUTFIT = { pants: 'jeans', shoes: 'boots', tops: 'longsleeve' };

// hand — поднятая рука (или телефон) поверх головы и рук, начиная со строки top
function dressedFrame(outfit, head, arms, legsName, hand, top = WAVE_TOP) {
  let upper = [...head, ...ARMS[arms]];
  if (hand) upper = overlay(upper, hand, top);
  // Кисти: кожа ниже головы и ладонь поднятой руки
  const hands = upper.flatMap((r, y) => [...r].flatMap((ch, x) => (
    (ch === 'S' || ch === 's') && (y >= head.length || hand?.[y - top]?.[x] === 'S') ? [[x, y, ch]] : []
  )));
  const dressed = CLOTHES.tops[outfit.tops]({
    upper,
    legs: CLOTHES.pants[outfit.pants](CLOTHES.shoes[outfit.shoes](LEGS[legsName]), legsName === 'front'),
    hands,
  });
  const content = [...dressed.upper, ...dressed.legs];
  // Сверху — пустые строки, если ноги короче (шаг), снизу — строки под контур ботинок
  const empty = n => Array.from({ length: n }, () => '.'.repeat(W));
  const rows = [...empty(H - OUTLINE - content.length), ...content, ...empty(OUTLINE)];
  if (rows.length !== H || rows.some(r => r.length !== W)) throw new Error(`bad frame ${arms}`);
  return addOutline(rows.map(r => [...r]));
}

// Соседи пикселя под контуром: по 4 сторонам на толщину контура
const AROUND = near(OUTLINE);
// Контур: прозрачный пиксель рядом (по 4 сторонам, не дальше OUTLINE) с закрашенным
function addOutline(g) {
  const out = g.map(r => [...r]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x] !== '.') continue;
    const near = AROUND.some(
      ([dx, dy]) => g[y + dy]?.[x + dx] && g[y + dy][x + dx] !== '.',
    );
    if (near) out[y][x] = 'O';
  }
  return out;
}

const mirror = g => g.map(r => [...r].reverse());

// Кадры: idle + 4 кадра шага. Рука — противоходом к ближней ноге.
// Анфас: стоит, машет (два кадра), остальные столбцы — снова стоит.
// С телефоном: стоит боком, в кадрах 1–2 мерцает экран, остальные — как кадр 0.
// head и face — голова сбоку (смотрит вправо) и анфас
function sheetOf(head, face, outfit = BASE_OUTFIT) {
  const frame = (...args) => dressedFrame(outfit, ...args);
  const frontOf = (still, wave) => [
    frame(face, still, 'front'),
    frame(face, wave, 'front', WAVE_HAND.out),
    frame(face, wave, 'front', WAVE_HAND.in),
    frame(face, still, 'front'),
    frame(face, still, 'front'),
  ];
  const right = [
    frame(head, 'side', 'idle'),
    frame(head, 'back', 'contactA'),
    frame(head, 'side', 'passA'),
    frame(head, 'forward', 'contactB'),
    frame(head, 'side', 'passB'),
  ];
  // Те же кадры, но с табличкой в руке
  const holdRight = [
    frame(head, 'hold', 'idle'),
    frame(head, 'hold', 'contactA'),
    frame(head, 'hold', 'passA'),
    frame(head, 'hold', 'contactB'),
    frame(head, 'hold', 'passB'),
  ];
  const phoneA = frame(head, 'phone', 'idle', PHONE.a, PHONE_TOP);
  const phoneRight = [phoneA, phoneA, frame(head, 'phone', 'idle', PHONE.b, PHONE_TOP), phoneA, phoneA];
  return [
    right,
    right.map(mirror),
    holdRight,
    holdRight.map(mirror),
    frontOf('front', 'frontWave'),
    frontOf('frontHold', 'frontWaveHold'),
    phoneRight,
    phoneRight.map(mirror),
  ];
}
const sheetOfStyle = (name, outfit) => sheetOf(HAIRSTYLES[name], HAIRSTYLES_FRONT[name], outfit);
const SHEETS = STYLE_NAMES.map(name => sheetOfStyle(name));

// Робот для чат-ботов: тот же человечек и те же кадры, но голова — коробка с антенной и визором,
// а кисти, шея, ноги и ступни металлические. Корпус (T/t) красится в цвет ника, как рубашка.
// M/m — металл и он же в тени, b — тёмный металл (стержень антенны, шея, болт),
// V — стекло визора, c — светящийся глаз, R — огонёк антенны
const ROBOT_HEAD = [
  '........................',
  '........................',
  '..........RR............',
  '..........RR............',
  '..........bb............',
  '..........bb............',
  '......MMMMMMMMMMMMMM....',
  '......MMMMMMMMMMMMMM....',
  '......MMMMMMMMMMMMMM....',
  '......MMMMMMMMMMMMMM....',
  '......MMMMMMVVVVVVVV....',
  '......MMMMMMVVVVVVVV....',
  '......MMbbMMVVVVccVV....',
  '......MMbbMMVVVVccVV....',
  '......MMMMMMMMMMMMMM....',
  '......MMMMMMMMMMMMMM....',
  '......mmmmmmmmmmmmmm....',
  '......mmmmmmmmmmmmmm....',
  '..........bbbb..........',
  '..........bbbb..........',
];
const ROBOT_FACE = [
  '........................',
  '........................',
  '..........RR............',
  '..........RR............',
  '..........bb............',
  '..........bb............',
  '....MMMMMMMMMMMMMMMM....',
  '....MMMMMMMMMMMMMMMM....',
  '....MMMMMMMMMMMMMMMM....',
  '....MMMMMMMMMMMMMMMM....',
  '....MMVVVVVVVVVVVVMM....',
  '....MMVVVVVVVVVVVVMM....',
  '....MMVVccVVVVccVVMM....',
  '....MMVVccVVVVccVVMM....',
  '....MMMMMMMMMMMMMMMM....',
  '....MMMMMMMMMMMMMMMM....',
  '....mmmmmmmmmmmmmmmm....',
  '....mmmmmmmmmmmmmmmm....',
  '..........bbbb..........',
  '..........bbbb..........',
];
const ROBOT_PALETTE = {
  O: PALETTE.O,
  M: [184, 192, 204, 255],
  m: [128, 136, 150, 255],
  b: [84, 90, 104, 255],
  V: [24, 32, 48, 255],
  c: [94, 240, 255, 255],
  R: [255, 82, 82, 255],
  // телефон у робота такой же
  D: PALETTE.D,
  G: PALETTE.G,
  g: PALETTE.g,
  // ноги, дальняя нога и ступни
  J: [104, 112, 128, 255],
  j: [76, 82, 96, 255],
  F: [52, 56, 68, 255],
};
// Части человечка, которые у робота из металла: кожа рук, штаны и ботинки
const ROBOT_PARTS = { S: 'M', s: 'm', P: 'J', p: 'j', B: 'F' };
const ROBOT_SHEET = sheetOf(ROBOT_HEAD, ROBOT_FACE)
  .map(row => row.map(grid => grid.map(r => r.map(ch => ROBOT_PARTS[ch] ?? ch))));

// Аксессуары: накладываются поверх готового человечка, сетка как у причёсок (смотрит вправо).
// A — цвет аксессуара (у каждого зрителя свой), a — он же в тени, h — он же с бликом, остальное фиксировано.
// Контур рисуется вручную: автоматический лёг бы чёрной рамкой на лицо.
// cut — головные уборы прячут человечка выше этой строки головы, иначе из-под них торчали бы волосы.
const ACC_PALETTE = {
  // контур
  O: [27, 27, 36, 255],
  // тёмное стекло
  L: [27, 27, 36, 255],
  // помпон
  w: [244, 244, 246, 255],
  // блик на стекле очков
  g: [191, 227, 255, 255],
  // ремешок VR-очков
  K: [43, 43, 51, 255],
  // корпус VR-очков
  W: [228, 230, 238, 255],
  // передняя панель VR-очков
  v: [42, 48, 70, 255],
  // огонёк VR-очков
  c: [94, 240, 255, 255],
  // сигара
  C: [122, 74, 42, 255],
  // тлеющий кончик
  R: [255, 122, 42, 255],
  // дымок
  m: [220, 220, 228, 190],
  // золото короны и монокля
  Y: [240, 192, 48, 255],
  // сияние нимба
  N: [255, 234, 128, 255],
};
const ACC_COLOR = new Set(['A', 'a', 'h']);
// Порядок — порядок отрисовки: шарф под всем, очки поверх шапки, наушники поверх ремешка VR-очков
const ACCESSORIES = {
  // Шарф на шее, конец свисает за спину (анфас — на грудь)
  scarf: {
    grid: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '......OOAAhhAAAAOO......',
      '......OOAAhhAAAAOO......',
      '......OOAAAAAAAAOO......',
      '......OOAAAAAAAAOO......',
      '......OOaaOO............',
      '......OOaaOO............',
      '......OOAAOO............',
      '......OOAAOO............',
      '........OO..............',
      '........OO..............',
    ],
    front: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '....OOAAhhAAAAAAAAOO....',
      '....OOAAhhAAAAAAAAOO....',
      '....OOAAAAAAAAAAAAOO....',
      '....OOAAAAAAAAAAAAOO....',
      '......OOAAAAOO..........',
      '......OOAAAAOO..........',
      '......OOaaaaOO..........',
      '......OOaaaaOO..........',
      '........OOOO............',
      '........OOOO............',
    ],
  },
  // Галстук-бабочка под подбородком, узел в тени
  bowtie: {
    grid: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '..............AAAA......',
      '..............AAAA......',
      '..............aaAA......',
      '..............aaAA......',
    ],
    front: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........AA....AA........',
      '........AA....AA........',
      '........AAaaaaAA........',
      '........AAaaaaAA........',
      '........AA....AA........',
      '........AA....AA........',
    ],
  },
  // Шапка с помпоном и отворотом
  beanie: {
    cut: 10,
    grid: [
      '..........OOOO..........',
      '..........OOOO..........',
      '........OOwwwwOO........',
      '........OOwwwwOO........',
      '......OOAAAAAAAAOO......',
      '......OOAAAAAAAAOO......',
      '....OOAAhhAAAAAAAAOO....',
      '....OOAAhhAAAAAAAAOO....',
      '....OOaaaaaaaaaaaaOO....',
      '....OOaaaaaaaaaaaaOO....',
    ],
    // Анфас шапка та же
    front: null,
  },
  // Каска: широкие поля, спереди длиннее
  helmet: {
    cut: 10,
    grid: [
      '........................',
      '........................',
      '........OOOOOOOO........',
      '........OOOOOOOO........',
      '......OOAAhhAAAAOO......',
      '......OOAAhhAAAAOO......',
      '....OOAAAAAAAAAAAAOOOO..',
      '....OOAAAAAAAAAAAAOOOO..',
      '..OOaaaaaaaaaaaaaaaaaaOO',
      '..OOaaaaaaaaaaaaaaaaaaOO',
      '....OO..............OO..',
      '....OO..............OO..',
    ],
    front: [
      '........................',
      '........................',
      '........OOOOOOOO........',
      '........OOOOOOOO........',
      '......OOAAhhAAAAOO......',
      '......OOAAhhAAAAOO......',
      '....OOAAAAAAAAAAAAOO....',
      '....OOAAAAAAAAAAAAOO....',
      '..OOaaaaaaaaaaaaaaaaOO..',
      '..OOaaaaaaaaaaaaaaaaOO..',
      '....OO............OO....',
      '....OO............OO....',
    ],
  },
  // Кепка: козырёк вперёд
  cap: {
    cut: 10,
    grid: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........OOOOOOOOOO......',
      '........OOOOOOOOOO......',
      '......OOAAhhAAAAAAOOOO..',
      '......OOAAhhAAAAAAOOOO..',
      '....OOAAAAAAAAAAAAaaaaOO',
      '....OOAAAAAAAAAAAAaaaaOO',
      '..................OOOO..',
      '..................OOOO..',
    ],
    front: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........OOOOOOOO........',
      '........OOOOOOOO........',
      '......OOAAhhAAAAOO......',
      '......OOAAhhAAAAOO......',
      '....OOAAAAAAAAAAAAOO....',
      '....OOAAAAAAAAAAAAOO....',
      '..OOaaaaaaaaaaaaaaaaOO..',
      '..OOaaaaaaaaaaaaaaaaOO..',
      '....OO............OO....',
      '....OO............OO....',
    ],
  },
  // Нимб: светящееся кольцо парит над головой, ничего не прячет
  halo: {
    grid: [
      '........NNNNNNNN........',
      '........NNNNNNNN........',
      '......NN........NN......',
      '......NN........NN......',
      '........NNNNNNNN........',
      '........NNNNNNNN........',
    ],
    front: null,
  },
  // Золотая корона с камнями (камни — цвет аксессуара)
  crown: {
    cut: 6,
    grid: [
      '......OO..OOOO..OO......',
      '......OO..OOOO..OO......',
      '....OOYYOOYYYYOOYYOO....',
      '....OOYYOOYYYYOOYYOO....',
      '....OOYYAAYYYYAAYYOO....',
      '....OOYYAAYYYYAAYYOO....',
    ],
    front: null,
  },
  // Очки: дужка к уху, глаз за стеклом
  glasses: {
    grid: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '..............AAAAAA....',
      '..............AAAAAA....',
      '........AAAAAALLggAA....',
      '........AAAAAALLggAA....',
    ],
    front: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '......AAAAAAAAAAAA......',
      '......AAAAAAAAAAAA......',
      '......AALLAAAALLAA......',
      '......AALLAAAALLAA......',
    ],
  },
  // Монокль: золотая оправа вокруг глаза и цепочка вниз от неё
  monocle: {
    grid: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '..............YY........',
      '..............YY........',
      '............YY..YY......',
      '............YY..YY......',
      '..............YYYY......',
      '..............YYYY......',
      '................YY......',
      '................YY......',
    ],
    front: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '..............YY........',
      '..............YY........',
      '............YY..YY......',
      '............YY..YY......',
      '..............YYYY......',
      '..............YYYY......',
      '................YY......',
      '................YY......',
      '................YY......',
      '................YY......',
    ],
  },
  // VR-очки: коробка на лице, ремешок вокруг головы
  vr: {
    grid: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '..........OOOOOOOOOO....',
      '..........OOOOOOOOOO....',
      '......KKKKOOWWWWWWvvOO..',
      '......KKKKOOWWWWWWvvOO..',
      '......KKKKOOWWWWWWccOO..',
      '......KKKKOOWWWWWWccOO..',
      '..........OOOOOOOOOO....',
      '..........OOOOOOOOOO....',
    ],
    front: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '....OOOOOOOOOOOOOOOO....',
      '....OOOOOOOOOOOOOOOO....',
      '..KKOOvvvvvvvvvvvvOOKK..',
      '..KKOOvvvvvvvvvvvvOOKK..',
      '..KKOOvvccvvvvccvvOOKK..',
      '..KKOOvvccvvvvccvvOOKK..',
      '....OOOOOOOOOOOOOOOO....',
      '....OOOOOOOOOOOOOOOO....',
    ],
  },
  // Наушники: дуга через макушку и чашка на ухе
  headphones: {
    grid: [
      '........................',
      '........................',
      '........................',
      '........................',
      '..........AA............',
      '..........AA............',
      '..........AA............',
      '..........AA............',
      '..........AA............',
      '..........AA............',
      '........AAhhAA..........',
      '........AAhhAA..........',
      '........AAaaAA..........',
      '........AAaaAA..........',
      '........AAAAAA..........',
      '........AAAAAA..........',
    ],
    front: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........AAAAAAAA........',
      '........AAAAAAAA........',
      '......AA........AA......',
      '......AA........AA......',
      '....AA............AA....',
      '....AA............AA....',
      '..AAhh............hhAA..',
      '..AAhh............hhAA..',
      '..AAaa............aaAA..',
      '..AAaa............aaAA..',
      '..AAAA............AAAA..',
      '..AAAA............AAAA..',
    ],
  },
  // Сигара во рту и струйка дыма
  cigar: {
    grid: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '......................mm',
      '......................mm',
      '....................mm..',
      '....................mm..',
      '......................mm',
      '......................mm',
      '........................',
      '........................',
      '..................CCCCRR',
      '..................CCCCRR',
    ],
    front: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '....................mm..',
      '....................mm..',
      '..................mm....',
      '..................mm....',
      '....................mm..',
      '....................mm..',
      '........................',
      '........................',
      '..............CCCCRR....',
      '..............CCCCRR....',
    ],
  },
  // Леденец на палочке во рту
  lollipop: {
    grid: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '....................OOOO',
      '....................OOOO',
      '..................OOhhAA',
      '..................OOhhAA',
      '..................OOAAaa',
      '..................OOAAaa',
      '....................wwOO',
      '....................wwOO',
      '..................ww....',
      '..................ww....',
    ],
    front: [
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '........................',
      '..................OOOO..',
      '..................OOOO..',
      '..................hhAAOO',
      '..................hhAAOO',
      '..............wwwwAAaaOO',
      '..............wwwwAAaaOO',
      '..................OOOO..',
      '..................OOOO..',
    ],
  },
};
const ACC_NAMES = Object.keys(ACCESSORIES);

// Шаг в кадрах contact корпус ниже на 2px — аксессуары опускаются вместе с головой.
// В строках анфас корпус не смещается.
const SHIFT = [0, 2, 0, 2, 0];
const shiftAt = (row, col) => (row < 4 ? SHIFT[col] : 0);
const placed = (grid, shift) => Array.from({ length: H }, (_, y) => [...(grid[y - shift] ?? '.'.repeat(W))]);
// Поднятая рука машет перед аксессуарами: под ней и её контуром аксессуар стирается
function underHand(rows, hand) {
  const arm = (x, y) => hand[y - WAVE_TOP]?.[x] && hand[y - WAVE_TOP][x] !== '.';
  return rows.map((r, y) => r.map((ch, x) => ([[0, 0], ...AROUND].some(([dx, dy]) => arm(x + dx, y + dy)) ? '.' : ch)));
}
// Лист аксессуара в тех же строках и кадрах, что у человечка (без контура)
function accSheetOf({ grid, front }) {
  const right = SHIFT.map(shift => placed(grid, shift));
  // С телефоном стоит боком, не шагая
  const phone = SHIFT.map(() => placed(grid, 0));
  const still = placed(front ?? grid, 0);
  const face = [
    still,
    underHand(still, WAVE_HAND.out),
    underHand(still, WAVE_HAND.in),
    still,
    still,
  ];
  return [right, right.map(mirror), right, right.map(mirror), face, face, phone, phone.map(mirror)];
}
const ACC_SHEETS = ACC_NAMES.map(name => accSheetOf(ACCESSORIES[name]));
// Часть кадра, которая остаётся видна под головным убором: всё ниже строки cut
function clipOf(cut) {
  let d = '';
  for (let row = 0; row < SHEETS[0].length; row++) for (let col = 0; col < 5; col++) {
    const top = cut + shiftAt(row, col);
    d += `M${col * (W + GAP)} ${row * (H + GAP) + top}h${W}v${H - top}h${-W}z`;
  }
  return d;
}
// Часть кадра выше строки cut — дополнение к clipOf(cut)
function clipAbove(cut) {
  let d = '';
  for (let row = 0; row < SHEETS[0].length; row++) for (let col = 0; col < 5; col++) {
    const bottom = cut + shiftAt(row, col);
    d += `M${col * (W + GAP)} ${row * (H + GAP)}h${W}v${bottom}h${-W}z`;
  }
  return d;
}

// --- PNG ---
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(width, height, pixel) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) raw.set(pixel(x, y), y * (width * 4 + 1) + 1 + x * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const cols = SHEETS[0][0].length;
const rows = SHEETS[0].length;
const sheetW = cols * W;
const sheetH = rows * H;

const charAt = (sheet, x, y) => sheet[Math.floor(y / H)][Math.floor(x / W)][y % H][x % W];

// Контур пикселей: горизонтальные отрезки подряд идущих пикселей, для которых has(x, y).
// Отрезки не переходят через границу кадра; координаты — в листе с зазорами GAP
// Одинаковые отрезки в соседних строках кадра сливаются в один прямоугольник — путь вдвое короче
function pathOf(has) {
  const rects = [];
  // Прямоугольники, которые ещё можно продлить вниз: ключ — начало и конец отрезка
  let open = new Map();
  for (let y = 0; y < sheetH; y++) {
    if (y % H === 0) open = new Map();
    const next = new Map();
    let x = 0;
    while (x < sheetW) {
      if (!has(x, y)) {
        x++;
        continue;
      }
      let end = x;
      do end++;
      while (end % W && has(end, y));
      const key = `${x} ${end}`;
      const rect = open.get(key) ?? { x, y, w: end - x, h: 0 };
      if (!rect.h) rects.push(rect);
      rect.h++;
      next.set(key, rect);
      x = end;
    }
    open = next;
  }
  return rects.map(({ x, y, w, h }) => {
    const left = x + Math.floor(x / W) * GAP;
    const top = y + Math.floor(y / H) * GAP;
    return `M${left} ${top}h${w}v${h}h${-w}z`;
  }).join('');
}

// Слои SVG: рубашка (fill: 'shirt') и волосы (fill: 'hair') красит компонент, поверх рубашки — тень руки.
// Пиксели, одинаковые у всех причёсок, лежат в d, остальные — в hairstyles[номер причёски]
const hex = ([r, g, b]) => '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
// Фиксированные цвета палитры: символы одного цвета — в одной группе
function colorGroups(palette) {
  const byColor = new Map();
  for (const [ch, rgba] of Object.entries(palette)) {
    if (SHIRT.has(ch) || HAIR.has(ch) || PANTS.has(ch) || SHOES.has(ch)) continue;
    const color = hex(rgba);
    byColor.set(color, new Set([...(byColor.get(color) ?? []), ch]));
  }
  return [...byColor].map(([fill, chars]) => ({ fill, chars }));
}
const groups = [
  { fill: 'shirt', chars: SHIRT },
  { fill: 'pants', chars: PANTS },
  { fill: 'shoes', chars: SHOES },
  { fill: 'rgb(0 0 0 / 0.27)', chars: SHADOW },
  { fill: 'hair', chars: HAIR },
  ...colorGroups(PALETTE),
];
const layers = groups.map(({ fill, chars }) => {
  const common = (x, y) => SHEETS.every(sheet => chars.has(charAt(sheet, x, y)));
  return {
    fill,
    d: pathOf(common),
    hairstyles: SHEETS.map(
      sheet => pathOf((x, y) => chars.has(charAt(sheet, x, y)) && !common(x, y)),
    ),
  };
});

// Одежда на спрайте — накладка поверх человечка в базовом наряде: пиксели, которыми вариант
// (при базовых остальных частях) отличается от него. Накладка не зависит от причёски, а накладки
// штанов, обуви и верха, положенные в порядке SLOTS, дают ровно человечка в этом наряде — генератор это проверяет
const mapSheet = (sheet, fn) => sheet.map((row, r) => row.map((grid, c) => grid.map(
  (line, y) => line.map((ch, x) => fn(ch, r, c, y, x)),
)));
function diffOf(base, dressed) {
  return mapSheet(dressed, (ch, r, c, y, x) => {
    const was = base[r][c][y][x];
    if (ch === '.' && was !== '.') throw new Error('одежда не должна сужать силуэт');
    return ch === was ? '.' : ch;
  });
}
const clothesDiffs = Object.fromEntries(SLOTS.map(slot => [slot, Object.fromEntries(
  Object.keys(CLOTHES[slot]).map(name => {
    const outfit = { ...BASE_OUTFIT, [slot]: name };
    const diffs = STYLE_NAMES.map((style, i) => diffOf(SHEETS[i], sheetOfStyle(style, outfit)));
    if (diffs.some(d => JSON.stringify(d) !== JSON.stringify(diffs[0]))) throw new Error(`${slot}.${name} зависит от причёски`);
    return [name, diffs[0]];
  }),
)]));
const outfits = Object.keys(CLOTHES.tops).flatMap(tops => Object.keys(CLOTHES.pants).flatMap(
  pants => Object.keys(CLOTHES.shoes).map(shoes => ({ tops, pants, shoes })),
));
for (const outfit of outfits) {
  const { tops, pants, shoes } = outfit;
  STYLE_NAMES.forEach((style, i) => {
    let sheet = SHEETS[i];
    for (const slot of SLOTS) {
      const diff = clothesDiffs[slot][outfit[slot]];
      sheet = mapSheet(sheet, (ch, r, c, y, x) => (diff[r][c][y][x] === '.' ? ch : diff[r][c][y][x]));
    }
    if (JSON.stringify(sheet) !== JSON.stringify(sheetOfStyle(style, outfit))) throw new Error(`накладки не собирают ${tops}+${pants}+${shoes}`);
  });
}
const clothes = Object.fromEntries(SLOTS.map(slot => [slot, Object.fromEntries(
  Object.entries(clothesDiffs[slot]).map(([name, diff]) => [name, groups
    .map(({ fill, chars }) => ({ fill, d: pathOf((x, y) => chars.has(charAt(diff, x, y))) }))
    .filter(layer => layer.d)]),
)]));

// Слои робота: у него один вариант, так что весь слой целиком в d
const robot = [
  { fill: 'shirt', chars: SHIRT },
  { fill: 'rgb(0 0 0 / 0.27)', chars: new Set(['t']) },
  ...colorGroups(ROBOT_PALETTE),
]
  .map(({ fill, chars }) => ({ fill, d: pathOf((x, y) => chars.has(charAt(ROBOT_SHEET, x, y))) }))
  .filter(layer => layer.d);

// Слои аксессуара: fill: 'accessory' красит компонент, поверх — тень и блик, затем фиксированные цвета
const accHex = rgba => (rgba[3] === 255 ? hex(rgba) : `rgb(${rgba.slice(0, 3).join(' ')} / ${+(rgba[3] / 255).toFixed(2)})`);
const accessories = Object.fromEntries(
  ACC_NAMES.map((name, i) => {
    const sheet = ACC_SHEETS[i];
    const byFill = new Map();
    for (const [ch, rgba] of Object.entries(ACC_PALETTE)) {
      const fill = accHex(rgba);
      byFill.set(fill, new Set([...(byFill.get(fill) ?? []), ch]));
    }
    const accGroups = [
      { fill: 'accessory', chars: ACC_COLOR },
      { fill: 'rgb(0 0 0 / 0.27)', chars: new Set(['a']) },
      { fill: 'rgb(255 255 255 / 0.4)', chars: new Set(['h']) },
      ...[...byFill].map(([fill, chars]) => ({ fill, chars })),
    ];
    const accLayers = accGroups
      .map(({ fill, chars }) => ({ fill, d: pathOf((x, y) => chars.has(charAt(sheet, x, y))) }))
      .filter(layer => layer.d);
    const { cut } = ACCESSORIES[name];
    return [name, { clip: cut === undefined ? null : clipOf(cut), layers: accLayers }];
  }),
);

const out = process.argv[2];
write(
  out,
  `// Сгенерировано scripts/generate-walker.mjs — не править вручную.
// Спрайт-лист человечка (кадры разделены прозрачным зазором gap): строки — поза и направление (0 — вправо, 1 — влево,
// 2 и 3 — то же с табличкой, 4 — анфас, 5 — анфас с табличкой, 6 и 7 — смотрит в телефон вправо и влево),
// столбцы — кадры (0 — стоит, 1–4 — шаг; в строках анфас 1–2 — машет рукой, 3–4 — стоит;
// в строках с телефоном 1–2 — мерцает экран, 3–4 — как 0).
// Слои с fill: 'shirt', 'hair', 'pants' и 'shoes' красятся в цвета зрителя. Пиксели, общие для всех причёсок, —
// в d, остальные — в hairstyles[номер причёски]. Это человечек в лонгсливе, джинсах и ботинках;
// clothes — слои одежды, которые рисуются поверх него в порядке pants, shoes, tops (у базовой одежды пусты).
// Координаты и размеры — в пикселях спрайта, res — сколько их в пикселе сцены (в единицах ?scale=).
// holdHand — кисть с табличкой в кадре стоя вправо и анфас: x — её середина, y — верх.
// accessories — аксессуары в порядке отрисовки: слой fill: 'accessory' красится в цвет аксессуара,
// clip — видимая под головным убором часть листа человечка (null — убор ничего не прячет).
// robot — слои робота для чат-ботов на тех же кадрах: fill: 'shirt' красится в цвет ника.
// head и body — части листа выше шеи и начиная с неё: голова кивает отдельно от тела.
export const WALKER = {
  res: ${RES},
  frameWidth: ${W},
  frameHeight: ${H},
  gap: ${GAP},
  cols: ${cols},
  rows: ${rows},
  holdHand: ${JSON.stringify(HOLD_HAND)},
  head: '${clipAbove(NECK)}',
  body: '${clipOf(NECK)}',
  hairstyles: ${JSON.stringify(STYLE_NAMES)},
  layers: ${JSON.stringify(layers, null, 2).replace(/\n/g, '\n  ')},
  clothes: ${JSON.stringify(clothes, null, 2).replace(/\n/g, '\n  ')},
  accessories: ${JSON.stringify(accessories, null, 2).replace(/\n/g, '\n  ')},
  robot: ${JSON.stringify(robot, null, 2).replace(/\n/g, '\n  ')},
} as const
`,
);

// Превью: по строке на причёску — без аксессуаров и с каждым набором пары кадров
// «стоя вправо» и «машет анфас», последние строки — все кадры листа с шапкой, очками и сигарой
const PREVIEW_HAIR = [
  [92, 58, 38],
  [30, 30, 30],
  [214, 168, 72],
  [176, 74, 34],
  [150, 150, 158],
  [232, 111, 165],
  [79, 127, 217],
  [61, 42, 31],
];
const PREVIEW_ACC = [
  [229, 57, 53],
  [67, 160, 71],
  [30, 136, 229],
  [253, 216, 53],
  [142, 36, 170],
  [255, 143, 0],
];

// SVG-превью для ревью в браузере: собрано из тех же слоёв, что уходят в walkerSprite.ts, и рисуется
// так же, как в SceneActor.vue. Сверху — листы всех причёсок, ниже — каждый аксессуар на своей причёске и робот,
// внизу — каждый вариант одежды
function svgPreview() {
  const sw = cols * (W + GAP) - GAP;
  const sh = rows * (H + GAP) - GAP;
  const pad = 12;
  const label = 16;
  const cellW = sw + pad;
  const cellH = label + sh + pad;
  const perRow = Math.max(STYLE_NAMES.length, ACC_NAMES.length + 1);
  const width = pad + perRow * cellW;
  const height = pad + 3 * cellH;
  const frames = Array.from({ length: rows * cols }, (_, i) => `<rect x="${(i % cols) * (W + GAP)}" y="${Math.floor(i / cols) * (H + GAP)}" width="${W}" height="${H}"/>`).join('');
  const defs = layers.map((layer, i) => `<path id="l${i}" d="${layer.d}"/>`).join('\n');
  const paint = (fill, style) => ({
    shirt: hex(PALETTE.T),
    pants: hex(PALETTE.P),
    shoes: hex(PALETTE.B),
    hair: hex(PREVIEW_HAIR[style % PREVIEW_HAIR.length]),
  })[fill] ?? fill;
  const man = (style, clip, outfit = BASE_OUTFIT) => {
    const body = layers
      .map((layer, i) => `<g fill="${paint(layer.fill, style)}"><use href="#l${i}"/><path d="${layer.hairstyles[style]}"/></g>`)
      .join('')
      + SLOTS.flatMap(slot => clothes[slot][outfit[slot]]).map(layer => `<path fill="${paint(layer.fill, style)}" d="${layer.d}"/>`)
        .join('');
    return clip ? `<g clip-path="url(#${clip})">${body}</g>` : body;
  };
  const cell = (n, title, content) => `<g transform="translate(${pad + (n % perRow) * cellW} ${pad + Math.floor(n / perRow) * cellH})">`
    + `<text y="${label - 2}">${title}</text><g transform="translate(0 ${label})"><g class="frame">${frames}</g>${content}</g></g>`;
  const clips = [];
  const cells = [
    ...STYLE_NAMES.map((name, style) => cell(style, name, man(style))),
    ...ACC_NAMES.map((name, i) => {
      const style = i % STYLE_NAMES.length;
      const { clip, layers: accLayers } = accessories[name];
      if (clip) clips.push(`<clipPath id="c${i}"><path d="${clip}"/></clipPath>`);
      const acc = accLayers
        .map(layer => `<path fill="${layer.fill === 'accessory' ? hex(PREVIEW_ACC[i % PREVIEW_ACC.length]) : layer.fill}" d="${layer.d}"/>`)
        .join('');
      return cell(perRow + i, name, man(style, clip && `c${i}`) + acc);
    }),
    cell(
      perRow + ACC_NAMES.length,
      'robot',
      robot.map(layer => `<path fill="${layer.fill === 'shirt' ? hex(PALETTE.T) : layer.fill}" d="${layer.d}"/>`).join(''),
    ),
    // Каждый вариант одежды при базовых остальных частях
    ...SLOTS
      .flatMap(slot => Object.keys(CLOTHES[slot]).map(
        name => [name, { ...BASE_OUTFIT, [slot]: name }],
      ))
      .map(([name, outfit], i) => cell(2 * perRow + i, name, man(i, null, outfit))),
  ];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width * 2}" height="${height * 2}" shape-rendering="crispEdges">
<style>text { font: 10px monospace; fill: #555 } .frame { fill: #fff }</style>
<rect width="100%" height="100%" fill="#d4d4dc"/>
<defs>
${defs}
${clips.join('\n')}
</defs>
${cells.join('\n')}
</svg>
`;
}

if (process.argv[3]?.endsWith('.svg')) write(process.argv[3], svgPreview());
else if (process.argv[3]) {
  const SETS = [
    [],
    ['headphones'],
    ['beanie'],
    ['helmet'],
    ['glasses'],
    ['vr'],
    ['cigar'],
    ['beanie', 'glasses', 'cigar'],
    ['helmet', 'vr'],
    ['headphones', 'glasses'],
    ['vr', 'headphones'],
    ['cap'],
    ['crown'],
    ['monocle'],
    ['scarf'],
    ['lollipop'],
    ['bowtie'],
    ['halo'],
    ['cap', 'glasses', 'scarf'],
    ['crown', 'monocle', 'lollipop'],
  ];
  const mix = (base, [r, g, b, a]) => base.map(
    (v, k) => Math.round(v + (([r, g, b][k] - v) * a) / 255),
  );
  // Цвет пикселя (x, y) листа: человечек, спрятанный под убором, затем аксессуары по порядку
  function pixel(style, set, x, y, accColor) {
    const fy = y % H;
    const cut = Math.max(-1, ...set.map(n => ACCESSORIES[n].cut ?? -1));
    let color = [230, 230, 235];
    const ch = charAt(SHEETS[style], x, y);
    if (ch !== '.' && !(fy < cut + shiftAt(Math.floor(y / H), Math.floor(x / W)))) {
      if (HAIR.has(ch)) color = PREVIEW_HAIR[style % PREVIEW_HAIR.length];
      else if (ch === 't') color = mix(PALETTE.T.slice(0, 3), [0, 0, 0, 69]);
      else color = PALETTE[ch].slice(0, 3);
    }
    for (const name of ACC_NAMES) {
      if (!set.includes(name)) continue;
      const a = charAt(ACC_SHEETS[ACC_NAMES.indexOf(name)], x, y);
      if (a === '.') continue;
      if (ACC_COLOR.has(a)) color = accColor;
      if (a === 'a') color = mix(color, [0, 0, 0, 69]);
      else if (a === 'h') color = mix(color, [255, 255, 255, 102]);
      else if (!ACC_COLOR.has(a)) color = mix(color, ACC_PALETTE[a]);
    }
    return color;
  }
  const scale = 4;
  const stride = H + 2;
  const cellW = W + 2;
  const imgW = Math.max(SETS.length * 2 * cellW, sheetW);
  const imgRows = SHEETS.length + rows;
  write(
    process.argv[3],
    png(imgW * scale, (stride * imgRows - 2) * scale, (px, py) => {
      const x = Math.floor(px / scale);
      const y = Math.floor(py / scale);
      const band = Math.floor(y / stride);
      if (y % stride >= H) return [180, 180, 190, 255];
      if (band < SHEETS.length) {
        const cell = Math.floor(x / cellW);
        const set = Math.floor(cell / 2);
        if (x % cellW >= W || set >= SETS.length) return [180, 180, 190, 255];
        // Нечётная клетка — кадр «машет» из строки анфас
        const [fx, fy] = cell % 2 ? [W, 4 * H] : [0, 0];
        const color = PREVIEW_ACC[(band + set) % PREVIEW_ACC.length];
        return [...pixel(band, SETS[set], fx + (x % cellW), fy + (y % stride), color), 255];
      }
      if (x >= sheetW) return [180, 180, 190, 255];
      const row = band - SHEETS.length;
      return [...pixel(2, ['beanie', 'glasses', 'cigar'], x, row * H + (y % stride), PREVIEW_ACC[2]), 255];
    }),
  );
}
