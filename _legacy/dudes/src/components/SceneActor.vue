<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue';
import { DEFAULT_SCALE } from '../composables/useChannelQuery';
import { useKeepInside } from '../composables/useKeepInside';
import { useMessageParts } from '../composables/useMessageParts';
import type { SceneActor } from '../composables/useSceneActors';
import { DOOR_JAMB, DOOR_LEAF, useSceneDoors, type Side } from '../composables/useSceneDoors';
import { useShrinkWrap } from '../composables/useShrinkWrap';
import { useTalkGrowth } from '../composables/useTalkGrowth';
import { useWandering, WALK_CYCLE_MS } from '../composables/useWandering';
import { shownAt } from '../composables/useTwitchChat';
import { HIGHLIGHTED_PRIORITY, TALKING_PRIORITY } from '../scene/actorPriority';
import { WALKER } from '../scene/walkerSprite';
import { ROLE_COLORS } from '../twitch/badges';
import { emotesOnly, type MessagePart } from '../twitch/emotes';
import ChatEmote from './ChatEmote.vue';
import MessageText from './MessageText.vue';
import RoleBadge from './RoleBadge.vue';

const BUBBLE_DURATION = 6000;
// Напечатав сообщение, облачко плавно прокручивает его до конца, а последние SCROLL_HOLD_MS
// перед исчезновением стоит на месте, чтобы конец успели дочитать
const SCROLL_HOLD_MS = 1000;
const SOLO_EMOTE_SIZE = 30;
const NAME_FLIGHT_MS = 300;
// Кивок на каждые NOD_CHARS символов сообщения (эмодзи — по длине названия), от 1 до MAX_NODS
const NOD_CHARS = 15;
const MAX_NODS = 10;
// Сообщение длиннее стольких символов показываем в широком облачке
const WIDE_BUBBLE_CHARS = 120;
// Значок роли перед ником — по размеру шрифта ника (11px), чтобы не раздувать строку
const BADGE_SIZE = 11;

// scale — экранных пикселей на пиксель сцены; exiting — пропал из списка и уходит со сцены
const props = defineProps<{ actor: SceneActor; scale: number; exiting: boolean }>();
// Вышел за дверь — можно убирать
const emit = defineEmits<{ exited: [] }>();

// Тексты, значки и облачко растут вместе со scale (но не с ростом говорящего):
// ui — сколько экранных пикселей занимает пиксель интерфейса, при scale по умолчанию 1
const ui = computed(() => props.scale / DEFAULT_SCALE);

// Слои спрайта: у робота свои, у человечка — общие пиксели слоя плюс пиксели его причёски,
// а поверх — одежда: штаны, обувь, верх
const spriteLayers = computed<readonly { fill: string; d: string }[]>(() => {
  if (props.actor.bot) return WALKER.robot;
  const { outfit, hairstyle } = props.actor;
  return [
    ...WALKER.layers.map(layer => ({ fill: layer.fill, d: layer.d + layer.hairstyles[hairstyle] })),
    ...WALKER.clothes.pants[outfit.pants],
    ...WALKER.clothes.shoes[outfit.shoes],
    ...WALKER.clothes.tops[outfit.top],
  ];
});

function paint(fill: string): string {
  if (fill === 'shirt') return props.actor.color;
  if (fill === 'hair') return props.actor.hairColor;
  if (fill === 'pants') return props.actor.outfit.pantsColor;
  if (fill === 'shoes') return props.actor.outfit.shoesColor;
  return fill;
}

// Головной убор прячет волосы над собой: человечек обрезается по его clip
const clipId = useId();
// Пока говорит, спрайт рисуется дважды — тело и голова отдельно, чтобы голова кивала
const spriteId = useId();
const headClipId = useId();
const bodyClipId = useId();
const headwearClip = computed(
  () => props.actor.accessories
    .map(a => WALKER.accessories[a.name].clip)
    .find(clip => clip !== null) ?? null,
);

// Кисть с табличкой в пикселях сцены (у спрайта их в WALKER.res раз больше)
const HOLD_HAND = { x: WALKER.holdHand.x / WALKER.res, y: WALKER.holdHand.y / WALKER.res };
// Размер кадра в пикселях сцены
const FRAME_WIDTH = WALKER.frameWidth / WALKER.res;
const FRAME_HEIGHT = WALKER.frameHeight / WALKER.res;
// Высота шеста таблички: от кисти до чуть выше макушки
const POLE_HEIGHT = HOLD_HAND.y + 3;

// У владельца, модераторов и VIP ник жирный и в цвет роли — и над головой, и в облачке
const roleColor = computed(() => (props.actor.role ? ROLE_COLORS[props.actor.role] : null));

const messageParts = useMessageParts();
// Сообщение из одних эмодзи человечек показывает на табличке вместо облачка
const emoteOnly = computed(() => emotesOnly(messageParts(props.actor.lastMessage)));
const messageLength = computed(() => messageParts(props.actor.lastMessage)
  .reduce((sum, part) => sum + [...(
    partText(part)
  )].length, 0));

function partText(part: MessagePart): string {
  switch (part.type) {
    case 'text': return part.text;
    case 'link': return part.domain;
    case 'mention': return part.name;
    case 'emote': return part.emote.name;
  }
}
const nods = computed(() => {
  const count = Math.ceil(messageLength.value / NOD_CHARS);
  return Math.min(MAX_NODS, Math.max(1, count));
});
// Длинному сообщению облачко пошире, чтобы не вытягивалось в высокий столбик
const wideBubble = computed(() => messageLength.value > WIDE_BUBBLE_CHARS);

const bubbleVisible = ref(false);
// Слой человечка: старшие поверх младших (см. actorPriority), а говорящий — поверх всех молчащих,
// пока не договорит, а с выделенным сообщением — поверх всех остальных говорящих.
// Двери всё равно выше всех
const zIndex = computed(() => {
  if (!bubbleVisible.value) return props.actor.priority;
  const bonus = props.actor.lastMessage.highlighted ? HIGHLIGHTED_PRIORITY : TALKING_PRIORITY;
  return props.actor.priority + bonus;
});
// Говорящий крупнее: px — итоговый масштаб с учётом роста
const growth = useTalkGrowth(bubbleVisible);
const px = computed(() => props.scale * growth.value);
let bubbleTimer: ReturnType<typeof setTimeout> | null = null;

const root = ref<HTMLElement | null>(null);
const {
  x, facing, walking, duration, pace, stageWidth, currentX, place, walkTo, wander, stop,
} = useWandering(
  root,
  px,
);

// На сцену человечек заходит из-за края, ближайшего к его месту, через дверь у этого края,
// а уходит через дверь у ближайшего к нему края, ускорив шаг
const EXIT_SPEED = 1.3;
// Зазор между человечком и створкой, в пикселях сцены
const DOOR_GAP = 2;
// Войдя, человечек проходит от двери до GREET_MAX_DISTANCE экранных пикселей
// и машет зрителям WAVE_MS мс: взмах туда-обратно за WAVE_CYCLE_MS
const GREET_MAX_DISTANCE = 100;
const WAVE_MS = 1600;
const WAVE_CYCLE_MS = 400;

const doors = useSceneDoors();
// Пока человечек за краем сцены, его не видно — и облачко с ником не прижимаются к краю
const hidden = ref(true);
// Дверь, которую держит человечек
let heldDoor: Side | null = null;
// Номер текущего сценария (вход, уход, возвращение): новый прерывает предыдущий
let scenario = 0;
// Стоит лицом к зрителям и машет
const waving = ref(false);
let waveTimer: ReturnType<typeof setTimeout> | null = null;

const nearestSide = (at: number): Side => (at < 0.5 ? 'left' : 'right');

// Сообщение кому-то (ответ или упоминание) автор пишет в телефоне — стоит боком, а не лицом
// к зрителям. Адресат, бродя по сцене, останавливается и смотрит в телефон, пока висело бы облачко
// сообщения, — BUBBLE_DURATION (экран мерцает: кадр за PHONE_FRAME_MS). Тегнутый посреди своей речи
// сначала договаривает, а потом смотрит в телефон короче — LATE_READ_MS
const PHONE_FRAME_MS = 600;
const LATE_READ_MS = 3000;
const texting = computed(
  () => bubbleVisible.value && !!props.actor.lastMessage.addressees && !emoteOnly.value,
);
const reading = ref(false);
// Пришло сообщение, а посмотреть в телефон пока некогда (говорит, входит или передумал уходить):
// сколько мс будет смотреть, когда освободится
let readPending: number | null = null;
let readTimer: ReturnType<typeof setTimeout> | null = null;

// Бродит по сцене, а не входит и не уходит. Пока говорит (видно облачко или табличку),
// стоит на месте лицом к зрителям, а договорив — снова бродит
let roaming = false;

function roam() {
  roaming = true;
  resume();
}

// Свободен — смотрит в пришедшее сообщение, если оно есть, иначе бродит
function resume() {
  if (!roaming || bubbleVisible.value) return;
  if (readPending !== null) readPhone(readPending);
  else wander();
}

function readPhone(duration: number) {
  stopReading();
  readPending = null;
  stop();
  reading.value = true;
  readTimer = setTimeout(() => {
    readTimer = null;
    reading.value = false;
    resume();
  }, duration);
}

function stopReading() {
  if (readTimer) clearTimeout(readTimer);
  readTimer = null;
  reading.value = false;
}

watch(bubbleVisible, talking => {
  if (!roaming) return;
  if (talking) {
    // Заговорил, не дочитав, — уже не дочитает
    stopReading();
    stop();
  } else resume();
});

// Старые сообщения из истории в телефон не смотрят. Новое, пришедшее посреди чтения, читает заново
watch(
  () => props.actor.lastPing?.id,
  () => {
    const ping = props.actor.lastPing;
    if (!ping || Date.now() - shownAt(ping) >= BUBBLE_DURATION) return;
    // Из нескольких ждущих сообщений смотрит столько, сколько нужно самому долгому
    const duration = bubbleVisible.value ? LATE_READ_MS : BUBBLE_DURATION;
    readPending = Math.max(readPending ?? 0, duration);
    resume();
  },
  { immediate: true },
);

// Точка в fromEdge экранных пикселей от края сцены (за полями) — в долях ширины,
// по которой бродит человечек
function fromSceneEdge(side: Side, fromEdge: number) {
  const stage = root.value?.parentElement;
  const scene = stage?.parentElement;
  if (!stage || !scene || !stageWidth()) return side === 'left' ? 0 : 1;
  const inner = stage.getBoundingClientRect();
  const outer = scene.getBoundingClientRect();
  const gutter = side === 'left' ? inner.left - outer.left : outer.right - inner.right;
  const at = (fromEdge - gutter) / inner.width;
  return side === 'left' ? at : 1 - at;
}

const halfBody = () => (FRAME_WIDTH * px.value) / 2;
// За краем сцены, целиком скрыт
const offstage = (side: Side) => fromSceneEdge(side, -halfBody());
// Перед дверью: открывающаяся створка его не задевает
const beforeDoor = (side: Side) => fromSceneEdge(
  side,
  (DOOR_JAMB + DOOR_LEAF + DOOR_GAP) * props.scale + halfBody(),
);

function holdDoor(side: Side) {
  letGoDoor();
  heldDoor = side;
  return doors.open(side);
}

function letGoDoor() {
  if (heldDoor) doors.release(heldDoor);
  heldDoor = null;
}

// Промис — когда домахал; прерванный stopWaving так и не завершается
function wave(): Promise<void> {
  stopWaving();
  waving.value = true;
  return new Promise(resolve => {
    waveTimer = setTimeout(() => {
      waveTimer = null;
      waving.value = false;
      resolve();
    }, WAVE_MS);
  });
}

function stopWaving() {
  if (waveTimer) clearTimeout(waveTimer);
  waveTimer = null;
  waving.value = false;
}

// Выходит из-за края сцены (или, передумав уходить, — из-под створки), машет зрителям
// и идёт к своему месту
async function enter(side: Side) {
  const id = ++scenario;
  roaming = false;
  stopWaving();
  stopReading();
  if (hidden.value) place(offstage(side));
  await holdDoor(side);
  if (id !== scenario) return;
  hidden.value = false;
  if (!(await walkTo(beforeDoor(side)))) return;
  // Прошёл дверь — её можно закрывать
  letGoDoor();
  const width = stageWidth();
  const greetAt = width ? (Math.random() * GREET_MAX_DISTANCE) / width : 0;
  if (!(await walkTo(currentX() + (side === 'left' ? greetAt : -greetAt)))) return;
  await wave();
  if (id !== scenario) return;
  if (await walkTo(props.actor.x)) roam();
}

async function exit() {
  const id = ++scenario;
  roaming = false;
  stopWaving();
  stopReading();
  readPending = null;
  letGoDoor();
  // Ещё за краем — просто не выходит
  if (!hidden.value) {
    const side = nearestSide(currentX());
    if (!(await walkTo(beforeDoor(side), EXIT_SPEED))) return;
    await holdDoor(side);
    if (id !== scenario) return;
    if (!(await walkTo(offstage(side), EXIT_SPEED))) return;
    hidden.value = true;
    letGoDoor();
  }
  emit('exited');
}

// Передумал уходить: если уже в дверях или за ней — возвращается через неё,
// а на сцене просто продолжает бродить
function stayOnStage() {
  if (hidden.value || heldDoor) return enter(heldDoor ?? nearestSide(currentX()));
  scenario++;
  stopWaving();
  roam();
}

watch(
  () => props.exiting,
  exiting => (exiting ? exit() : stayOnStage()),
);
onMounted(() => enter(nearestSide(props.actor.x)));
onBeforeUnmount(() => {
  scenario++;
  stop();
  stopWaving();
  stopReading();
  letGoDoor();
});

const bubble = ref<HTMLElement | null>(null);
const name = ref<HTMLElement | null>(null);
const bubbleName = ref<HTMLElement | null>(null);
const nameGhost = ref<HTMLElement | null>(null);
const board = ref<HTMLElement | null>(null);
const bubbleFit = useKeepInside(bubble, { limitHeight: true, track: walking });

// Облачко плавно растёт по высоте, пока печатается сообщение: высоту auto анимировать нельзя,
// поэтому задаём телу облачка явную высоту его содержимого. Первый замер — без перехода
const bubbleScroll = ref<HTMLElement | null>(null);
const bubbleContent = ref<HTMLElement | null>(null);
const bubbleContentHeight = ref<number | null>(null);
const bubbleContentObserver = new ResizeObserver(([entry]) => {
  if (entry) bubbleContentHeight.value = entry.borderBoxSize[0]!.blockSize;
});
watch(bubbleContent, (el, _, onCleanup) => {
  if (!el) return;
  bubbleContentObserver.observe(el);
  onCleanup(() => {
    bubbleContentObserver.unobserve(el);
    bubbleContentHeight.value = null;
  });
});
// Многострочное сообщение не оставляет пустого места справа: облачко ужимается до самой длинной строки.
// Строки берём у ника и невидимой копии всего сообщения: недопечатанное слово ещё стоит в строке,
// из которой потом перенесётся, и по нему облачко раздувалось бы на время печати.
// Новое сообщение могло сохранить размер облачка, поэтому подгоняем и при смене сообщения
const fitBubbleWidth = useShrinkWrap(bubbleContent, '.actor__bubble-name, .message-text__ghost');
watch(() => props.actor.lastMessage, fitBubbleWidth, { flush: 'post' });
// У края сцены сдвигаем только доску, шест остаётся в руке. Высоту, как и облачку, ограничивает верх сцены
const boardFit = useKeepInside(board, { limitHeight: true, track: walking });
const signScroll = ref<HTMLElement | null>(null);

const holdingSign = computed(() => bubbleVisible.value && !!emoteOnly.value);
// Пока видно облачко, ник показываем в нём: при наложении облачков иначе не понять, кто пишет
const showBubble = computed(() => bubbleVisible.value && !emoteOnly.value);
// Прокручивается то, в чём сейчас показано сообщение: облачко или табличка
const messageScroll = computed(() => (showBubble.value ? bubbleScroll.value : signScroll.value));

// Не влезшее в облачко (ник остаётся на месте) или на табличку прокручивается до конца за время,
// оставшееся после печати (табличка не печатается — сразу после появления).
// Конец пересчитываем каждый кадр: высота облачка ещё может расти, догружаются картинки эмодзи
let scrollFrame = 0;

function scrollMessage() {
  cancelAnimationFrame(scrollFrame);
  const body = messageScroll.value;
  if (!body) return;
  const age = Date.now() - shownAt(props.actor.lastMessage);
  const scrollMs = BUBBLE_DURATION - SCROLL_HOLD_MS - age;
  const begin = performance.now();
  const step = (now: number) => {
    const t = scrollMs > 0 ? Math.min(1, (now - begin) / scrollMs) : 1;
    // ease-in-out
    const k = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
    body.scrollTop = (body.scrollHeight - body.clientHeight) * k;
    updateFades();
    if (t < 1) scrollFrame = requestAnimationFrame(step);
  };
  step(begin);
}

function resetMessageScroll() {
  cancelAnimationFrame(scrollFrame);
  if (messageScroll.value) messageScroll.value.scrollTop = 0;
  updateFades();
}

// Края, за которыми есть скрытый текст, растворяются: сверху он уходит, снизу появляется
const fadeTop = ref(false);
const fadeBottom = ref(false);

function updateFades() {
  const el = messageScroll.value;
  if (!el) return;
  fadeTop.value = el.scrollTop > 1;
  fadeBottom.value = el.scrollTop < el.scrollHeight - el.clientHeight - 1;
}

// Высота блока прокрутки упирается в предел, а содержимое внутри продолжает расти
// (печатается текст, догружаются картинки) — следим за самим содержимым
const messageContentObserver = new ResizeObserver(updateFades);
watch(messageScroll, (el, _, onCleanup) => {
  const content = el?.firstElementChild;
  if (!content) return;
  messageContentObserver.observe(content);
  // Табличку нечего ждать — прокручиваем, как только появилась
  if (el === signScroll.value) scrollMessage();
  onCleanup(() => {
    messageContentObserver.unobserve(content);
    fadeTop.value = false;
    fadeBottom.value = false;
  });
});
// Смотрит в телефон стоя, а не на ходу и не маша зрителям
const onPhone = computed(() => (reading.value || texting.value) && !walking.value && !waving.value);
// Остановившись, человечек поворачивается лицом к зрителям — если не уткнулся в телефон
const facingFront = computed(() => waving.value || (!walking.value && !onPhone.value));
// Строка спрайт-листа: 0/1 — вправо/влево, 2/3 — то же с табличкой, 4/5 — анфас без неё и с ней,
// 6/7 — с телефоном вправо/влево
const spriteRow = computed(() => {
  if (onPhone.value) return facing.value === 'left' ? 7 : 6;
  if (facingFront.value) return holdingSign.value ? 5 : 4;
  return (holdingSign.value ? 2 : 0) + (facing.value === 'left' ? 1 : 0);
});
// Смещение шеста от центра человечка (в пикселях сцены), зеркалится при повороте влево.
// Анфас шест в той же руке, что и при взгляде вправо
const poleOffset = computed(() => {
  const fromCenter = HOLD_HAND.x - FRAME_WIDTH / 2;
  return facing.value === 'left' && !facingFront.value ? -fromCenter : fromCenter;
});
// С табличкой никнейм переезжает к центру доски: она висит на шесте в руке, а не над головой
// Кадр показываем через viewBox, а не сдвигом листа: при дробном px сдвиг на кадр дробный,
// и края пикселей в разных кадрах округлялись по-разному — человечек «дышал» по ширине
const frameBox = (col: number) => `${col * (WALKER.frameWidth + WALKER.gap)} ${spriteRow.value * (WALKER.frameHeight + WALKER.gap)} ${WALKER.frameWidth} ${WALKER.frameHeight}`;
// Кадры анимации: шаг — 1–4, взмах и экран телефона — 1–2; стоит — без анимации, кадр 0
const animation = computed(() => {
  if (waving.value) return { frames: [1, 2].map(frameBox).join(';'), dur: WAVE_CYCLE_MS };
  if (onPhone.value) return { frames: [1, 2].map(frameBox).join(';'), dur: 2 * PHONE_FRAME_MS };
  if (walking.value) return { frames: [1, 2, 3, 4].map(frameBox).join(';'), dur: WALK_CYCLE_MS / pace.value };
  return null;
});
// Кивает, начиная говорить, если стоит: на ходу и при взмахе (рука заходит на голову) — нет
const nodding = computed(() => bubbleVisible.value && !walking.value && !waving.value);
const nameOffset = computed(() => (
  holdingSign.value
    ? poleOffset.value * px.value + boardFit.shift.value
    : 0
));
const nameFit = useKeepInside(name, { track: walking, offset: nameOffset });

// Ник перелетает между местом над головой и облачком. Летит копия (nameGhost) поверх облачка:
// сам ник в облачке прозрачен, пока облачко проявляется. Цель перемеряется каждый кадр —
// облачко и подпись могут сдвигаться у края сцены, пока человечек идёт.
const nameFlying = ref(false);
let flightFrame = 0;

// Координаты считаем от середины низа человечка: она не сдвигается, когда ник над головой
// прячется или появляется и человечек меняет ширину и высоту
function offsetInRoot(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const base = root.value!.getBoundingClientRect();
  return { x: rect.left - (base.left + base.width / 2), y: rect.top - base.bottom };
}

watch(showBubble, async inBubble => {
  const from = inBubble ? name.value : bubbleName.value;
  const leavingBubble = inBubble ? null : bubble.value;
  if (!from || !root.value) return;
  // Если ник ещё в полёте — продолжаем с того места, где он сейчас
  const ghostEl = nameGhost.value;
  const start = nameFlying.value && ghostEl ? offsetInRoot(ghostEl) : offsetInRoot(from);
  const fromStyle = nameFlying.value && ghostEl ? ghostEl.style : getComputedStyle(from);
  const fromColor = fromStyle.color;
  const fromWeight = fromStyle.fontWeight;
  const fromShadow = fromStyle.textShadow;
  const rootHeight = root.value.offsetHeight;
  cancelAnimationFrame(flightFrame);
  nameFlying.value = true;

  await nextTick();
  const ghost = nameGhost.value;
  if (!ghost || !root.value) return;
  // Ник над головой вернулся в поток и приподнял человечка сверху — уходящее облачко
  // привязано к его верху, поэтому опускаем облачко обратно, чтобы оно не подпрыгнуло
  if (leavingBubble) {
    leavingBubble.style.bottom = `calc(100% + var(--bubble-gap) - ${root.value.offsetHeight - rootHeight}px)`;
  }

  const begin = performance.now();
  const fly = (now: number) => {
    const to = inBubble ? bubbleName.value : name.value;
    if (!to || !root.value) {
      nameFlying.value = false;
      return;
    }
    const t = Math.min(1, (now - begin) / NAME_FLIGHT_MS);
    // ease-out
    const k = 1 - (1 - t) ** 3;
    const end = offsetInRoot(to);
    const target = getComputedStyle(to);
    ghost.style.translate = `${start.x + (end.x - start.x) * k}px ${start.y + (end.y - start.y) * k}px`;
    ghost.style.color = `color-mix(in srgb, ${target.color} ${k * 100}%, ${fromColor})`;
    // Толщина и обводка ника (в облачке её нет) меняются на полпути
    ghost.style.fontWeight = k < 0.5 ? fromWeight : target.fontWeight;
    ghost.style.textShadow = k < 0.5 ? fromShadow : target.textShadow;
    if (t < 1) flightFrame = requestAnimationFrame(fly);
    else nameFlying.value = false;
  };
  fly(begin);
});

// Убираемая табличка сжимается по высоте, чтобы никнейм над ней съезжал вниз вместе с ней.
// Конечная высота равна захлёсту на тело (-marginBottom), тогда место в потоке — ноль.
function collapseSign(el: Element) {
  const sign = el as HTMLElement;
  sign.style.height = `${sign.offsetHeight}px`;
  // фиксируем начальную высоту, иначе переход не запустится
  void sign.offsetHeight;
  sign.style.height = `${HOLD_HAND.y * px.value}px`;
}

watch(
  () => props.actor.lastMessage.id,
  () => {
    if (bubbleTimer) clearTimeout(bubbleTimer);
    // Новое сообщение печатается в том же облачке — снова с начала
    resetMessageScroll();
    // Облачко только для свежих сообщений, а не для восстановленных из истории
    const age = Math.max(0, Date.now() - shownAt(props.actor.lastMessage));
    bubbleVisible.value = age < BUBBLE_DURATION;
    if (bubbleVisible.value) {
      bubbleTimer = setTimeout(() => (bubbleVisible.value = false), BUBBLE_DURATION - age);
      // На той же табличке новые эмодзи сразу прокручиваются заново; новую табличку прокрутит watch(messageScroll)
      if (emoteOnly.value && signScroll.value) nextTick(scrollMessage);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (bubbleTimer) clearTimeout(bubbleTimer);
  cancelAnimationFrame(flightFrame);
  cancelAnimationFrame(scrollFrame);
  bubbleContentObserver.disconnect();
  messageContentObserver.disconnect();
});
</script>

<template>
  <div
    ref="root"
    class="actor outline-scope"
    :class="{ 'actor--hidden': hidden, 'actor--bot': actor.bot }"
    :style="{
      '--px': `${px}px`,
      '--ui': `${ui}px`,
      zIndex,
      left: `${x * 100}%`,
      transition: walking ? `left ${duration}ms linear` : undefined,
    }"
  >
    <Transition name="bubble">
      <div
        v-if="showBubble"
        ref="bubble"
        class="actor__bubble"
        :class="{
          'actor__bubble--highlighted': actor.lastMessage.highlighted,
          'actor__bubble--first': actor.lastMessage.firstMessage && !actor.lastMessage.highlighted,
          'actor__bubble--bot': actor.bot,
          'actor__bubble--wide': wideBubble,
        }"
        :style="{
          translate: `${bubbleFit.shift.value}px 0`,
          maxHeight: bubbleFit.maxHeight.value === null
            ? undefined
            : `${bubbleFit.maxHeight.value}px`,
        }"
      >
        <div
          class="actor__bubble-body"
          :style="{
            height: bubbleContentHeight === null ? undefined : `${bubbleContentHeight}px`,
          }"
        >
          <div ref="bubbleContent">
            <span
              ref="bubbleName"
              class="actor__bubble-name"
              :style="{
                color: roleColor ?? actor.color,
                visibility: nameFlying ? 'hidden' : undefined,
              }"
            >
              <RoleBadge
                v-if="actor.role"
                :role="actor.role"
                :size="BADGE_SIZE * ui"
              />{{ actor.name }}
            </span>
            <!-- Курсор терминала бота бежит за печатающимся текстом -->
            <div
              ref="bubbleScroll"
              class="actor__bubble-scroll"
              :class="{
                'actor__scroll--fade-top': fadeTop,
                'actor__scroll--fade-bottom': fadeBottom,
              }"
            >
              <MessageText
                class="actor__bubble-text"
                :message="actor.lastMessage"
                stream
                @streamed="scrollMessage"
              >
                <span v-if="actor.bot" class="actor__cursor" />
              </MessageText>
            </div>
          </div>
        </div>
        <!-- Хвостик смотрит на человечка, даже когда облачко сдвинуто от края сцены -->
        <div
          class="actor__bubble-tail"
          :style="{ '--bubble-shift': `${bubbleFit.shift.value}px` }"
        />
      </div>
    </Transition>
    <span
      v-show="!showBubble"
      ref="name"
      class="actor__name"
      :class="{ 'actor__name--role': roleColor }"
      :style="{
        translate: `${nameFit.shift.value}px 0`,
        color: roleColor ?? undefined,
        visibility: nameFlying ? 'hidden' : undefined,
      }"
    >
      <RoleBadge
        v-if="actor.role"
        :role="actor.role"
        :size="BADGE_SIZE * ui"
        class="actor__badge"
      />{{ actor.name }}
    </span>
    <span v-show="nameFlying" ref="nameGhost" class="actor__name-ghost">
      <RoleBadge
        v-if="actor.role"
        :role="actor.role"
        :size="BADGE_SIZE * ui"
        class="actor__badge"
      />{{ actor.name }}
    </span>
    <div class="actor__figure">
      <!-- Табличка стоит в потоке над телом и заходит на него так, что шест упирается в кисть -->
      <Transition name="sign" @leave="collapseSign">
        <div
          v-if="holdingSign && emoteOnly"
          class="actor__sign"
          :style="{
            transform: `translateX(${poleOffset * px}px)`,
            marginBottom: `${-HOLD_HAND.y * px}px`,
          }"
        >
          <div
            ref="board"
            class="actor__board"
            :class="{
              'actor__board--highlighted': actor.lastMessage.highlighted,
              'actor__board--first':
                actor.lastMessage.firstMessage && !actor.lastMessage.highlighted,
            }"
            :style="{
              translate: `${boardFit.shift.value}px 0`,
              maxHeight: boardFit.maxHeight.value === null
                ? undefined
                : `${boardFit.maxHeight.value}px`,
            }"
          >
            <div
              ref="signScroll"
              class="actor__sign-scroll"
              :class="{
                'actor__scroll--fade-top': fadeTop,
                'actor__scroll--fade-bottom': fadeBottom,
              }"
            >
              <div class="actor__sign-emotes">
                <ChatEmote
                  v-for="(part, i) in emoteOnly"
                  :key="i"
                  :emote="part.emote"
                  :overlays="part.overlays"
                  :size="SOLO_EMOTE_SIZE * ui"
                />
              </div>
            </div>
          </div>
          <div class="actor__pole" :style="{ height: `${POLE_HEIGHT * px}px` }" />
        </div>
      </Transition>
      <div
        class="actor__body"
        :style="{ width: `${FRAME_WIDTH * px}px`, height: `${FRAME_HEIGHT * px}px` }"
      >
        <!-- Спрайт-лист: строка — поза и направление,
             столбец — кадр (0 — стоит, 1–4 — шаг или взмах).
             viewBox вырезает из листа один кадр -->
        <svg
          class="sprite"
          :viewBox="frameBox(0)"
          :width="FRAME_WIDTH * px"
          :height="FRAME_HEIGHT * px"
          shape-rendering="crispEdges"
        >
          <animate
            v-if="animation"
            attributeName="viewBox"
            calcMode="discrete"
            :values="animation.frames"
            :dur="`${animation.dur}ms`"
            repeatCount="indefinite"
          />
          <defs>
            <g :id="spriteId">
              <clipPath v-if="headwearClip" :id="clipId">
                <path :d="headwearClip" />
              </clipPath>
              <!-- Верх (корпус робота) — в цвет ника, волосы, штаны и обувь — в свои цвета -->
              <g :clip-path="headwearClip ? `url(#${clipId})` : undefined">
                <path
                  v-for="(layer, i) in spriteLayers"
                  :key="i"
                  :fill="paint(layer.fill)"
                  :d="layer.d"
                />
              </g>
              <!-- Аксессуары поверх: основной слой — в цвет аксессуара -->
              <template v-for="accessory in actor.accessories" :key="accessory.name">
                <path
                  v-for="(layer, i) in WALKER.accessories[accessory.name].layers"
                  :key="i"
                  :fill="layer.fill === 'accessory' ? accessory.color : layer.fill"
                  :d="layer.d"
                />
              </template>
            </g>
            <clipPath :id="headClipId">
              <path :d="WALKER.head" />
            </clipPath>
            <clipPath :id="bodyClipId">
              <path :d="WALKER.body" />
            </clipPath>
          </defs>
          <template v-if="nodding">
            <use :href="`#${spriteId}`" :clip-path="`url(#${bodyClipId})`" />
            <!-- Ключ перезапускает кивки на каждое новое сообщение -->
            <g
              :key="actor.lastMessage.id"
              class="sprite__head"
              :style="{ animationIterationCount: nods, '--nod': `${WALKER.res}px` }"
            >
              <use :href="`#${spriteId}`" :clip-path="`url(#${headClipId})`" />
            </g>
          </template>
          <use v-else :href="`#${spriteId}`" />
        </svg>
      </div>
    </div>
  </div>
</template>

<style scoped>
.actor {
  /* Обводка ников растёт со scale, но не тоньше 1px — иначе пропадёт */
  --outline-width: max(1px, var(--ui));
  position: absolute;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateX(-50%);
}

.actor--hidden {
  visibility: hidden;
}

.actor__body {
  overflow: hidden;
}

.sprite {
  display: block;
}

.actor__figure {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sprite__head {
  /* Число кивков — animation-iteration-count, по длине сообщения */
  animation: nod 0.2s steps(1);
}

/* Голова опускается на пиксель листа, закрывая шею, и возвращается */
@keyframes nod {
  50% {
    /* на пиксель сцены */
    transform: translateY(var(--nod));
  }
}

.actor__sign {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  /* При сжатии на уходе доска с шестом остаются у руки, а не у верхнего края */
  justify-content: flex-end;
}

.actor__sign > * {
  flex-shrink: 0;
}

.actor__board {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  /* Ширина — как у облачка */
  max-width: calc(var(--ui) * 220);
  overflow: hidden;
  padding: calc(var(--px) * 0.75);
  border: var(--px) solid #6b4423;
  border-radius: 10px;
  background: #f0d9b5;
  box-shadow: 0 4px 12px rgb(0 0 0 / 18%);
}

.actor__board--first {
  border-color: var(--first-msg);
}

.actor__board--highlighted {
  border-color: var(--highlight);
  box-shadow:
    0 0 10px color-mix(in srgb, var(--highlight) 60%, transparent),
    0 4px 12px rgb(0 0 0 / 18%);
}

/* Высота — как у текста облачка: 6 его строк, остальное прокручивается */
.actor__sign-scroll {
  --fade-size: calc(var(--ui) * 13);
  min-height: 0;
  max-height: calc(var(--ui) * 13 * 1.2 * 6);
}

/* Несколько эмодзи — рядами по центру */
.actor__sign-emotes {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: calc(var(--ui) * 3);
}

.actor__board :deep(img) {
  border-radius: 6px;
}

.actor__pole {
  width: var(--px);
  background: #8a5a2b;
  /* Тёмный край шеста — объём в пиксельном стиле */
  box-shadow: inset calc(var(--px) * -0.34) 0 rgb(0 0 0 / 25%);
}

/* Табличку «достают» снизу, из руки */
.sign-enter-active,
.sign-leave-active {
  transition:
    opacity 0.25s,
    translate 0.25s ease-out,
    height 0.25s ease-out;
}

.sign-enter-from,
.sign-leave-to {
  opacity: 0;
  translate: 0 calc(var(--px) * 6);
}

.actor__name {
  margin-bottom: calc(var(--ui) * 4);
  text-shadow: var(--text-outline);
  transition: translate 0.25s ease-out;
  font-size: calc(var(--ui) * 11);
  line-height: 1;
  white-space: nowrap;
  /* Белый в обеих темах: под ником стрим, читаемость держит тёмная обводка */
  color: #fff;
}

img.actor__badge {
  filter: var(--icon-outline);
  /* Строка ника высотой ровно в шрифт: значок занимает её целиком и не сдвигает ник вверх */
  vertical-align: top;
}

.actor__name--role {
  font-weight: 700;
}

.actor__name-ghost {
  position: absolute;
  text-shadow: var(--text-outline);
  top: 100%;
  left: 50%;
  z-index: 2;
  font-size: calc(var(--ui) * 11);
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
}

.actor__bubble {
  /* Цвета и рамка общие у тела облачка и хвостика */
  --bubble-gap: calc(var(--ui) * 10);
  --bubble-radius: calc(var(--ui) * 10);
  --bubble-border: 1px solid var(--border);
  --bubble-bg: var(--bg);
  --tail-size: calc(var(--ui) * 10);
  /* Хвостик не заезжает на скруглённые углы */
  --tail-inset: calc(var(--ui) * 16);
  position: absolute;
  bottom: calc(100% + var(--bubble-gap));
  display: flex;
  flex-direction: column;
  width: max-content;
  max-width: calc(var(--ui) * 220);
}

/* Строка braille-арта из чата (22 символа ⣿) помещается целиком,
   с запасом на шрифты с широкими braille-глифами */
.actor__bubble--wide {
  max-width: calc(var(--ui) * 320);
}

.actor__bubble-body {
  min-height: 0;
  padding: calc(var(--ui) * 4) calc(var(--ui) * 10);
  border: var(--bubble-border);
  border-radius: var(--bubble-radius);
  font-size: calc(var(--ui) * 13);
  /* Эмодзи в тексте сообщения */
  --emote-size: calc(var(--ui) * 28);
  line-height: 1.2;
  overflow-wrap: anywhere;
  overflow: hidden;
  color: var(--text-h);
  background: var(--bubble-bg);
  box-shadow: var(--bubble-shadow, 0 4px 12px rgb(0 0 0 / 12%));
  transition: height 0.2s ease-out;
}

/* Повёрнутый квадрат с рамкой снизу и справа: торчит из-под облачка уголком вниз
   и закрывает рамку облачка над собой */
.actor__bubble-tail {
  position: absolute;
  top: 100%;
  left: clamp(var(--tail-inset), calc(50% - var(--bubble-shift)), calc(100% - var(--tail-inset)));
  /* --tail-size is the inner square, the border is drawn outside of it */
  box-sizing: content-box;
  width: var(--tail-size);
  height: var(--tail-size);
  border-right: var(--bubble-border);
  border-bottom: var(--bubble-border);
  background: var(--bubble-bg);
  translate: -50% -50%;
  rotate: 45deg;
}

/* Не больше 6 строк сообщения, остальное прокручивается после печати */
/* Растворение краёв анимируется через зарегистрированные свойства: градиент маски сам по себе
   переходом не анимируется */
@property --fade-top {
  syntax: '<length>';
  inherits: false;
  initial-value: 0;
}

@property --fade-bottom {
  syntax: '<length>';
  inherits: false;
  initial-value: 0;
}

.actor__bubble-scroll {
  --fade-size: 1em;
  /* Эмодзи в строке торчат из неё на седьмую часть высоты (см. ChatEmote): место под них,
     иначе их края обрезаются, а торчащий низ считается переполнением и запускает прокрутку.
     Отрицательный margin возвращает облачку прежний размер */
  --emote-overhang: calc(var(--emote-size) / 7);
  /* Six lines of text fit inside, the padding comes on top */
  box-sizing: content-box;
  max-height: calc(6 * 1.2em);
  padding: var(--emote-overhang) 0;
  margin: calc(-1 * var(--emote-overhang)) 0;
}

.actor__bubble-scroll,
.actor__sign-scroll {
  overflow: hidden;
  mask-image: linear-gradient(
    to bottom,
    rgb(0 0 0 / 15%),
    #000 var(--fade-top),
    #000 calc(100% - var(--fade-bottom)),
    rgb(0 0 0 / 15%)
  );
  transition:
    --fade-top 0.3s ease-out,
    --fade-bottom 0.3s ease-out;
}

.actor__scroll--fade-top {
  --fade-top: var(--fade-size);
}

.actor__scroll--fade-bottom {
  --fade-bottom: var(--fade-size);
}

/* Блочный, чтобы ResizeObserver видел рост напечатанного текста */
.actor__bubble-text {
  display: block;
}

.actor__bubble-name {
  display: block;
  font-size: calc(var(--ui) * 11);
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.actor__bubble--first {
  --bubble-border: 1px solid var(--first-msg);
  --bubble-bg: color-mix(in srgb, var(--first-msg) 15%, var(--bg));
}

.actor__bubble--highlighted {
  --bubble-border: 2px solid var(--highlight);
  --bubble-bg: color-mix(in srgb, var(--highlight) 22%, var(--bg));
  --bubble-shadow:
    0 0 10px color-mix(in srgb, var(--highlight) 60%, transparent),
    0 4px 12px rgb(0 0 0 / 12%);
}

/* Бот пишет в терминал: тёмное окно с почти прямыми углами, зелёный моноширинный текст
   с лёгким свечением, приглашение «$» и мигающий курсор. Одинаковое в светлой и тёмной теме.
   Ник бота и над головой моноширинный */
.actor--bot .actor__name,
.actor--bot .actor__name-ghost,
.actor__bubble--bot .actor__bubble-body {
  font-family: var(--mono);
}

.actor__bubble--bot {
  --bubble-radius: calc(var(--ui) * 3);
  --bubble-border: 1px solid #2c4a36;
  --bubble-bg: #0b120e;
  --bubble-shadow:
    0 0 calc(var(--ui) * 8) rgb(74 222 128 / 20%),
    0 4px 12px rgb(0 0 0 / 30%);
}

.actor__bubble--bot .actor__bubble-body {
  font-size: calc(var(--ui) * 12);
  color: #4ade80;
  text-shadow: 0 0 calc(var(--ui) * 3) rgb(74 222 128 / 50%);
}

/* Префикс и в невидимой копии сообщения, по которой облачко берёт ширину */
.actor__bubble--bot .actor__bubble-text::before,
.actor__bubble--bot .actor__bubble-text :deep(.message-text__ghost)::before {
  content: '$ ';
  color: rgb(74 222 128 / 55%);
}

.actor__cursor {
  display: inline-block;
  width: 0.6em;
  height: 1.1em;
  margin-left: 0.2em;
  vertical-align: text-bottom;
  background: currentColor;
  animation: blink 1s steps(1) infinite;
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}

.bubble-enter-active,
.bubble-leave-active {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.bubble-enter-from,
.bubble-leave-to {
  opacity: 0;
  transform: translateY(calc(var(--ui) * 4));
}
</style>
