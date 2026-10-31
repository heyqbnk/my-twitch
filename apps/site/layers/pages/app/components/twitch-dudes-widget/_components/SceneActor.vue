<script lang="ts" setup>
import ChatEmote from './ChatEmote.vue';
import MessageText from './MessageText.vue';
import RoleBadge from './RoleBadge.vue';

import { useKeepInside } from '../_composables/useKeepInside';
import { useMessageParts } from '../_composables/useMessageParts';
import type { SceneActor } from '../_composables/useSceneActors';
import { DOOR_JAMB, DOOR_LEAF, type Side, useSceneDoors } from '../_composables/useSceneDoors';
import { useShrinkWrap } from '../_composables/useShrinkWrap';
import { useTalkGrowth } from '../_composables/useTalkGrowth';
import { shownAt } from '../_composables/useTwitchChat';
import { useWandering, WALK_CYCLE_MS } from '../_composables/useWandering';
import { HIGHLIGHTED_PRIORITY, TALKING_PRIORITY } from '../_utils/actorPriority';
import { ROLE_COLORS } from '../_utils/badges';
import { emotesOnly, type MessagePart } from '../_utils/emotes';
import { DEFAULT_SCALE } from '../_utils/sceneParams';
import { WALKER } from '../_utils/walkerSprite';

const BUBBLE_DURATION = 6000;
// Having typed the message, the bubble smoothly scrolls it to the end, and stands still for the
// last SCROLL_HOLD_MS before disappearing, so the end can be read
const SCROLL_HOLD_MS = 1000;
const SOLO_EMOTE_SIZE = 30;
const NAME_FLIGHT_MS = 300;
// A nod per NOD_CHARS characters of the message (an emote counts by its name length), 1 to MAX_NODS
const NOD_CHARS = 15;
const MAX_NODS = 10;
// A message longer than this many characters is shown in a wide bubble
const WIDE_BUBBLE_CHARS = 120;
// The role badge in front of the nick matches the nick's font size (11px), not to inflate the line
const BADGE_SIZE = 11;

const props = defineProps<{
  actor: SceneActor;
  /**
   * Gone from the actors list and leaving the scene.
   */
  exiting: boolean;
  /**
   * Screen px per scene px.
   */
  scale: number;
}>();

const emit = defineEmits<{
  /**
   * Went out of the door: can be removed.
   */
  exited: [];
}>();

// Texts, badges and the bubble grow with the scale (but not with a talking dude's growth):
// ui is how many screen px a UI pixel takes, 1 at the default scale
const ui = computed(() => props.scale / DEFAULT_SCALE);

// Sprite layers: a robot has its own; a dude has the layer's common pixels plus the pixels of its
// hairstyle, with clothes on top: pants, shoes, top
const spriteLayers = computed<readonly { d: string; fill: string }[]>(() => {
  if (props.actor.bot) {
    return WALKER.robot;
  }
  const { hairstyle, outfit } = props.actor;
  return [
    ...WALKER.layers.map(layer => ({ d: layer.d + layer.hairstyles[hairstyle], fill: layer.fill })),
    ...WALKER.clothes.pants[outfit.pants],
    ...WALKER.clothes.shoes[outfit.shoes],
    ...WALKER.clothes.tops[outfit.top],
  ];
});

function paint(fill: string): string {
  if (fill === 'shirt') {
    return props.actor.color;
  }
  if (fill === 'hair') {
    return props.actor.hairColor;
  }
  if (fill === 'pants') {
    return props.actor.outfit.pantsColor;
  }
  if (fill === 'shoes') {
    return props.actor.outfit.shoesColor;
  }
  return fill;
}

// A headwear hides the hair above it: the dude is clipped by its clip
const clipId = useId();
// While talking, the sprite is drawn twice — the body and the head apart, so the head nods
const spriteId = useId();
const headClipId = useId();
const bodyClipId = useId();
const headwearClip = computed(
  () => props.actor.accessories
    .map(a => WALKER.accessories[a.name].clip)
    .find(clip => clip !== null) ?? null,
);

// The hand with the sign in scene px (the sprite has WALKER.res times more of them)
const HOLD_HAND = { x: WALKER.holdHand.x / WALKER.res, y: WALKER.holdHand.y / WALKER.res };
// The frame size in scene px
const FRAME_WIDTH = WALKER.frameWidth / WALKER.res;
const FRAME_HEIGHT = WALKER.frameHeight / WALKER.res;
// The sign pole height: from the hand to a bit above the top of the head
const POLE_HEIGHT = HOLD_HAND.y + 3;

// The owner, moderators and VIPs have a bold nick in the role color, above the head and in the
// bubble
const roleColor = computed(() => (props.actor.role ? ROLE_COLORS[props.actor.role] : null));

const messageParts = useMessageParts();
// A message of emotes only is shown on a sign instead of a bubble
const emoteOnly = computed(() => emotesOnly(messageParts(props.actor.lastMessage)));
const messageLength = computed(() => messageParts(props.actor.lastMessage)
  .reduce((sum, part) => sum + [...partText(part)].length, 0));

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
// A long message gets a wider bubble, so it doesn't stretch into a tall column
const wideBubble = computed(() => messageLength.value > WIDE_BUBBLE_CHARS);

const bubbleVisible = ref(false);
// The dude's layer: seniors over juniors (see actorPriority), a talking one over all silent ones
// until done, one with a highlighted message over all other talking ones. Doors are above all
// anyway
const zIndex = computed(() => {
  if (!bubbleVisible.value) {
    return props.actor.priority;
  }
  const bonus = props.actor.lastMessage.highlighted ? HIGHLIGHTED_PRIORITY : TALKING_PRIORITY;
  return props.actor.priority + bonus;
});
// A talking dude is bigger: px is the final scale with the growth
const growth = useTalkGrowth(bubbleVisible);
const px = computed(() => props.scale * growth.value);
let bubbleTimer: ReturnType<typeof setTimeout> | null = null;

const root = ref<HTMLElement | null>(null);
const {
  currentX, duration, facing, pace, place, stageWidth, stop, walking, walkTo, wander, x,
} = useWandering(root, px);

// A dude enters the scene from behind the edge nearest to its spot, through the door at that
// edge, and leaves through the door at the edge nearest to it, walking faster
const EXIT_SPEED = 1.3;
// The gap between the dude and the leaf, in scene px
const DOOR_GAP = 2;
// Having entered, the dude walks up to GREET_MAX_DISTANCE screen px from the door and waves to
// the viewers for WAVE_MS ms: a wave there and back takes WAVE_CYCLE_MS
const GREET_MAX_DISTANCE = 100;
const WAVE_MS = 1600;
const WAVE_CYCLE_MS = 400;

const doors = useSceneDoors();
// While the dude is behind the scene's edge it isn't seen, and its bubble and nick don't press to
// the edge
const hidden = ref(true);
// The door the dude holds
let heldDoor: Side | null = null;
// The number of the current scenario (entering, leaving, coming back): a new one interrupts the
// previous
let scenario = 0;
// Stands facing the viewers and waves
const waving = ref(false);
let waveTimer: ReturnType<typeof setTimeout> | null = null;

const nearestSide = (at: number): Side => (at < 0.5 ? 'left' : 'right');

// A message to someone (a reply or a mention) is typed on the phone by its author, who stands
// sideways rather than facing the viewers. An addressee strolling around stops and looks at the
// phone for as long as the message's bubble would be shown — BUBBLE_DURATION (the screen flickers
// a frame per PHONE_FRAME_MS). One tagged mid-speech finishes first and then looks at the phone
// shorter — LATE_READ_MS
const PHONE_FRAME_MS = 600;
const LATE_READ_MS = 3000;
const texting = computed(
  () => bubbleVisible.value && !!props.actor.lastMessage.addressees && !emoteOnly.value,
);
const reading = ref(false);
// A message came, but there is no time to look at the phone yet (talking, entering or changed
// their mind about leaving): how many ms it will look once free
let readPending: number | null = null;
let readTimer: ReturnType<typeof setTimeout> | null = null;

// Strolls around the scene rather than entering or leaving. While talking (the bubble or the sign
// is visible) stands still facing the viewers, and strolls again when done
let roaming = false;

function roam() {
  roaming = true;
  resume();
}

// Free: looks at a pending message if there is one, else strolls
function resume() {
  if (!roaming || bubbleVisible.value) {
    return;
  }
  if (readPending !== null) {
    readPhone(readPending);
  } else {
    wander();
  }
}

function readPhone(readMs: number) {
  stopReading();
  readPending = null;
  stop();
  reading.value = true;
  readTimer = setTimeout(() => {
    readTimer = null;
    reading.value = false;
    resume();
  }, readMs);
}

function stopReading() {
  if (readTimer) {
    clearTimeout(readTimer);
  }
  readTimer = null;
  reading.value = false;
}

watch(bubbleVisible, talking => {
  if (!roaming) {
    return;
  }
  if (talking) {
    // Started talking before finishing reading: won't finish it
    stopReading();
    stop();
  } else {
    resume();
  }
});

// Old messages from the history don't make anyone look at the phone. A new one coming mid-reading
// is read anew
watch(
  () => props.actor.lastPing?.id,
  () => {
    const ping = props.actor.lastPing;
    if (!ping || Date.now() - shownAt(ping) >= BUBBLE_DURATION) {
      return;
    }
    // Of several pending messages, looks as long as the longest one needs
    const readMs = bubbleVisible.value ? LATE_READ_MS : BUBBLE_DURATION;
    readPending = Math.max(readPending ?? 0, readMs);
    resume();
  },
  { immediate: true },
);

// A point `fromEdge` screen px from the scene's edge (beyond the gutters), as a share of the width
// the dude strolls
function fromSceneEdge(side: Side, fromEdge: number) {
  const stage = root.value?.parentElement;
  const scene = stage?.parentElement;
  if (!stage || !scene || !stageWidth()) {
    return side === 'left' ? 0 : 1;
  }
  const inner = stage.getBoundingClientRect();
  const outer = scene.getBoundingClientRect();
  const gutter = side === 'left' ? inner.left - outer.left : outer.right - inner.right;
  const at = (fromEdge - gutter) / inner.width;
  return side === 'left' ? at : 1 - at;
}

const halfBody = () => (FRAME_WIDTH * px.value) / 2;
// Behind the scene's edge, fully hidden
const offstage = (side: Side) => fromSceneEdge(side, -halfBody());
// In front of the door: the opening leaf doesn't touch it
const beforeDoor = (side: Side) => fromSceneEdge(
  side,
  ((DOOR_JAMB + DOOR_LEAF + DOOR_GAP) * props.scale) + halfBody(),
);

function holdDoor(side: Side) {
  letGoDoor();
  heldDoor = side;
  return doors.open(side);
}

function letGoDoor() {
  if (heldDoor) {
    doors.release(heldDoor);
  }
  heldDoor = null;
}

// The promise resolves when done waving; one interrupted by stopWaving never resolves
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
  if (waveTimer) {
    clearTimeout(waveTimer);
  }
  waveTimer = null;
  waving.value = false;
}

// Comes out from behind the scene's edge (or, having changed its mind about leaving, from under
// the leaf), waves to the viewers and walks to its spot
async function enter(side: Side) {
  const id = ++scenario;
  roaming = false;
  stopWaving();
  stopReading();
  if (hidden.value) {
    place(offstage(side));
  }
  await holdDoor(side);
  if (id !== scenario) {
    return;
  }
  hidden.value = false;
  if (!(await walkTo(beforeDoor(side)))) {
    return;
  }
  // Passed the door: it can be closed
  letGoDoor();
  const width = stageWidth();
  const greetAt = width ? (Math.random() * GREET_MAX_DISTANCE) / width : 0;
  if (!(await walkTo(currentX() + (side === 'left' ? greetAt : -greetAt)))) {
    return;
  }
  await wave();
  if (id !== scenario) {
    return;
  }
  if (await walkTo(props.actor.x)) {
    roam();
  }
}

async function exit() {
  const id = ++scenario;
  roaming = false;
  stopWaving();
  stopReading();
  readPending = null;
  letGoDoor();
  // Still behind the edge: just doesn't come out
  if (!hidden.value) {
    const side = nearestSide(currentX());
    if (!(await walkTo(beforeDoor(side), EXIT_SPEED))) {
      return;
    }
    await holdDoor(side);
    if (id !== scenario) {
      return;
    }
    if (!(await walkTo(offstage(side), EXIT_SPEED))) {
      return;
    }
    hidden.value = true;
    letGoDoor();
  }
  emit('exited');
}

// Changed its mind about leaving: if already in the doorway or behind it, comes back through it;
// on the scene it just keeps strolling
function stayOnStage() {
  if (hidden.value || heldDoor) {
    return enter(heldDoor ?? nearestSide(currentX()));
  }
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

// The bubble smoothly grows in height while the message is typed: height auto can't be animated,
// so the bubble's body gets the explicit height of its content. The first measurement goes
// without a transition
const bubbleScroll = ref<HTMLElement | null>(null);
const bubbleContent = ref<HTMLElement | null>(null);
const bubbleContentHeight = ref<number | null>(null);
const bubbleContentObserver = new ResizeObserver(([entry]) => {
  if (entry) {
    bubbleContentHeight.value = entry.borderBoxSize[0]!.blockSize;
  }
});
watch(bubbleContent, (el, _, onCleanup) => {
  if (!el) {
    return;
  }
  bubbleContentObserver.observe(el);
  onCleanup(() => {
    bubbleContentObserver.unobserve(el);
    bubbleContentHeight.value = null;
  });
});
// A multiline message leaves no empty room on the right: the bubble shrinks to its longest line.
// The lines are taken from the nick and the invisible copy of the whole message: a half-typed word
// still stands in the line it will wrap from, and the bubble would inflate by it while typing.
// A new message may have kept the bubble's size, so it is fitted on a message change too
const fitBubbleWidth = useShrinkWrap(bubbleContent, '[data-bubble-name], [data-message-ghost]');
watch(() => props.actor.lastMessage, fitBubbleWidth, { flush: 'post' });
// At the scene's edge only the board shifts, the pole stays in the hand. Like the bubble, its
// height is limited by the scene's top
const boardFit = useKeepInside(board, { limitHeight: true, track: walking });
const signScroll = ref<HTMLElement | null>(null);

const holdingSign = computed(() => bubbleVisible.value && !!emoteOnly.value);
// While the bubble is visible, the nick is shown in it: with overlapping bubbles it would be
// unclear who is writing otherwise
const showBubble = computed(() => bubbleVisible.value && !emoteOnly.value);
// What scrolls is whatever shows the message now: the bubble or the sign
const messageScroll = computed(() => (showBubble.value ? bubbleScroll.value : signScroll.value));

// What didn't fit into the bubble (the nick stays in place) or onto the sign scrolls to the end
// in the time left after typing (the sign isn't typed — right after appearing).
// The end is recomputed every frame: the bubble's height may still grow, emote images load
let scrollFrame = 0;

function scrollMessage() {
  cancelAnimationFrame(scrollFrame);
  const body = messageScroll.value;
  if (!body) {
    return;
  }
  const age = Date.now() - shownAt(props.actor.lastMessage);
  const scrollMs = BUBBLE_DURATION - SCROLL_HOLD_MS - age;
  const begin = performance.now();
  const step = (now: number) => {
    const t = scrollMs > 0 ? Math.min(1, (now - begin) / scrollMs) : 1;
    // ease-in-out
    const k = t < 0.5 ? 2 * t * t : 1 - ((((-2 * t) + 2) ** 2) / 2);
    body.scrollTop = (body.scrollHeight - body.clientHeight) * k;
    updateFades();
    if (t < 1) {
      scrollFrame = requestAnimationFrame(step);
    }
  };
  step(begin);
}

function resetMessageScroll() {
  cancelAnimationFrame(scrollFrame);
  if (messageScroll.value) {
    messageScroll.value.scrollTop = 0;
  }
  updateFades();
}

// Edges with hidden text beyond them fade out: the text leaves at the top and comes at the bottom
const fadeTop = ref(false);
const fadeBottom = ref(false);

function updateFades() {
  const el = messageScroll.value;
  if (!el) {
    return;
  }
  fadeTop.value = el.scrollTop > 1;
  fadeBottom.value = el.scrollTop < el.scrollHeight - el.clientHeight - 1;
}

// The scroll block's height hits its limit while the content inside keeps growing (text is typed,
// images load), so the content itself is observed
const messageContentObserver = new ResizeObserver(updateFades);
watch(messageScroll, (el, _, onCleanup) => {
  const content = el?.firstElementChild;
  if (!content) {
    return;
  }
  messageContentObserver.observe(content);
  // The sign has nothing to wait for: it scrolls as soon as it appears
  if (el === signScroll.value) {
    scrollMessage();
  }
  onCleanup(() => {
    messageContentObserver.unobserve(content);
    fadeTop.value = false;
    fadeBottom.value = false;
  });
});
// Looks at the phone standing, not on the go and not while waving to the viewers
const onPhone = computed(() => (reading.value || texting.value) && !walking.value && !waving.value);
// Having stopped, the dude turns to face the viewers — unless it is buried in the phone
const facingFront = computed(() => waving.value || (!walking.value && !onPhone.value));
// The sprite sheet row: 0/1 — right/left, 2/3 — the same with a sign, 4/5 — front without and
// with it, 6/7 — with the phone right/left
const spriteRow = computed(() => {
  if (onPhone.value) {
    return facing.value === 'left' ? 7 : 6;
  }
  if (facingFront.value) {
    return holdingSign.value ? 5 : 4;
  }
  return (holdingSign.value ? 2 : 0) + (facing.value === 'left' ? 1 : 0);
});
// The pole's offset from the dude's center (in scene px), mirrored when facing left. Facing front,
// the pole is in the same hand as when facing right
const poleOffset = computed(() => {
  const fromCenter = HOLD_HAND.x - (FRAME_WIDTH / 2);
  return facing.value === 'left' && !facingFront.value ? -fromCenter : fromCenter;
});
// A frame is shown through the viewBox rather than by shifting the sheet: with a fractional px the
// shift by a frame is fractional, and pixel edges in different frames rounded differently — the
// dude was "breathing" in width
const frameBox = (col: number) => [
  col * (WALKER.frameWidth + WALKER.gap),
  spriteRow.value * (WALKER.frameHeight + WALKER.gap),
  WALKER.frameWidth,
  WALKER.frameHeight,
].join(' ');
// Animation frames: a step is 1–4, a wave and the phone screen are 1–2; standing is frame 0
const animation = computed(() => {
  if (waving.value) {
    return { dur: WAVE_CYCLE_MS, frames: [1, 2].map(frameBox).join(';') };
  }
  if (onPhone.value) {
    return { dur: 2 * PHONE_FRAME_MS, frames: [1, 2].map(frameBox).join(';') };
  }
  if (walking.value) {
    return { dur: WALK_CYCLE_MS / pace.value, frames: [1, 2, 3, 4].map(frameBox).join(';') };
  }
  return null;
});
// Nods when it starts talking while standing: not on the go and not while waving (the arm goes
// over the head)
const nodding = computed(() => bubbleVisible.value && !walking.value && !waving.value);
// With a sign the nick moves to the board's center: the board hangs on the pole in the hand
// rather than above the head
const nameOffset = computed(() => (
  holdingSign.value
    ? (poleOffset.value * px.value) + boardFit.shift.value
    : 0
));
const nameFit = useKeepInside(name, { offset: nameOffset, track: walking });

// The nick flies between its place above the head and the bubble. A copy (nameGhost) flies over
// the bubble: the nick in the bubble is transparent while the bubble fades in. The target is
// measured again every frame — the bubble and the nick may shift at the scene's edge while the
// dude walks
const nameFlying = ref(false);
let flightFrame = 0;

// Coordinates are taken from the middle of the dude's bottom: it doesn't move when the nick above
// the head hides or shows and the dude changes its width and height
function offsetInRoot(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const base = root.value!.getBoundingClientRect();
  return { x: rect.left - (base.left + (base.width / 2)), y: rect.top - base.bottom };
}

watch(showBubble, async inBubble => {
  const from = inBubble ? name.value : bubbleName.value;
  const leavingBubble = inBubble ? null : bubble.value;
  if (!from || !root.value) {
    return;
  }
  // A nick still in flight continues from where it is now
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
  if (!ghost || !root.value) {
    return;
  }
  // The nick above the head came back into the flow and raised the dude's top — the leaving bubble
  // is attached to the top, so it is lowered back, not to jump up
  if (leavingBubble) {
    const raised = root.value.offsetHeight - rootHeight;
    leavingBubble.style.bottom = `calc(100% + var(--bubble-gap) - ${raised}px)`;
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
    const k = 1 - ((1 - t) ** 3);
    const end = offsetInRoot(to);
    const target = getComputedStyle(to);
    const flightX = start.x + ((end.x - start.x) * k);
    const flightY = start.y + ((end.y - start.y) * k);
    ghost.style.translate = `${flightX}px ${flightY}px`;
    ghost.style.color = `color-mix(in srgb, ${target.color} ${k * 100}%, ${fromColor})`;
    // The nick's weight and outline (there is none in the bubble) switch halfway
    ghost.style.fontWeight = k < 0.5 ? fromWeight : target.fontWeight;
    ghost.style.textShadow = k < 0.5 ? fromShadow : target.textShadow;
    if (t < 1) {
      flightFrame = requestAnimationFrame(fly);
    } else {
      nameFlying.value = false;
    }
  };
  fly(begin);
});

// A sign being put away shrinks in height, so the nick above it goes down with it. The final
// height equals the overlap with the body (-marginBottom), so its room in the flow is zero
function collapseSign(el: Element) {
  const sign = el as HTMLElement;
  sign.style.height = `${sign.offsetHeight}px`;
  // Fixes the initial height, else the transition doesn't start
  void sign.offsetHeight;
  sign.style.height = `${HOLD_HAND.y * px.value}px`;
}

watch(
  () => props.actor.lastMessage.id,
  () => {
    if (bubbleTimer) {
      clearTimeout(bubbleTimer);
    }
    // A new message is typed in the same bubble — from the start again
    resetMessageScroll();
    // The bubble is only for fresh messages, not for those restored from the history
    const age = Math.max(0, Date.now() - shownAt(props.actor.lastMessage));
    bubbleVisible.value = age < BUBBLE_DURATION;
    if (bubbleVisible.value) {
      bubbleTimer = setTimeout(() => (bubbleVisible.value = false), BUBBLE_DURATION - age);
      // New emotes on the same sign scroll anew right away; a new sign is scrolled by
      // watch(messageScroll)
      if (emoteOnly.value && signScroll.value) {
        void nextTick(scrollMessage);
      }
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (bubbleTimer) {
    clearTimeout(bubbleTimer);
  }
  cancelAnimationFrame(flightFrame);
  cancelAnimationFrame(scrollFrame);
  bubbleContentObserver.disconnect();
  messageContentObserver.disconnect();
});
</script>

<template>
  <div
    ref="root"
    :class="[cn.root, hidden && cn.rootHidden]"
    :style="{
      '--px': `${px}px`,
      '--ui': `${ui}px`,
      zIndex,
      left: `${x * 100}%`,
      transition: walking ? `left ${duration}ms linear` : undefined,
    }"
  >
    <Transition
      :enter-active-class="cn.bubbleActive"
      :leave-active-class="cn.bubbleActive"
      :enter-from-class="cn.bubbleAway"
      :leave-to-class="cn.bubbleAway"
    >
      <div
        v-if="showBubble"
        ref="bubble"
        :class="[
          cn.bubble,
          wideBubble && cn.bubbleWide,
          actor.lastMessage.firstMessage && !actor.lastMessage.highlighted && cn.bubbleFirst,
          actor.lastMessage.highlighted && cn.bubbleHighlighted,
          actor.bot && cn.bubbleBot,
        ]"
        :style="{
          translate: `${bubbleFit.shift.value}px 0`,
          maxHeight: bubbleFit.maxHeight.value === null
            ? undefined
            : `${bubbleFit.maxHeight.value}px`,
        }"
      >
        <div
          :class="[cn.bubbleBody, actor.bot && cn.bubbleBodyBot]"
          :style="{
            height: bubbleContentHeight === null ? undefined : `${bubbleContentHeight}px`,
          }"
        >
          <div ref="bubbleContent">
            <span
              ref="bubbleName"
              :class="cn.bubbleName"
              :style="{
                color: roleColor ?? actor.color,
                visibility: nameFlying ? 'hidden' : undefined,
              }"
              data-bubble-name
            >
              <RoleBadge
                v-if="actor.role"
                :role="actor.role"
                :size="BADGE_SIZE * ui"
              />{{ actor.name }}
            </span>
            <!-- The bot's terminal cursor runs after the text being typed -->
            <div
              ref="bubbleScroll"
              :class="[
                cn.bubbleScroll,
                fadeTop && cn.scrollFadeTop,
                fadeBottom && cn.scrollFadeBottom,
              ]"
            >
              <MessageText
                :class="cn.bubbleText"
                :message="actor.lastMessage"
                :prefix="actor.bot ? '$ ' : undefined"
                stream
                @streamed="scrollMessage"
              >
                <span v-if="actor.bot" :class="cn.cursor"/>
              </MessageText>
            </div>
          </div>
        </div>
        <!-- The tail points at the dude even when the bubble is shifted from the scene's edge -->
        <div
          :class="cn.bubbleTail"
          :style="{ '--bubble-shift': `${bubbleFit.shift.value}px` }"
        />
      </div>
    </Transition>
    <span
      v-show="!showBubble"
      ref="name"
      :class="[cn.name, roleColor && cn.nameRole, actor.bot && cn.nameBot]"
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
      />{{ actor.name }}
    </span>
    <span
      v-show="nameFlying"
      ref="nameGhost"
      :class="[cn.nameGhost, actor.bot && cn.nameGhostBot]"
    >
      <RoleBadge
        v-if="actor.role"
        :role="actor.role"
        :size="BADGE_SIZE * ui"
      />{{ actor.name }}
    </span>
    <div :class="cn.figure">
      <!-- The sign stands in the flow above the body and overlaps it so the pole rests in the
           hand -->
      <Transition
        :enter-active-class="cn.signActive"
        :leave-active-class="cn.signActive"
        :enter-from-class="cn.signAway"
        :leave-to-class="cn.signAway"
        @leave="collapseSign"
      >
        <div
          v-if="holdingSign && emoteOnly"
          :class="cn.sign"
          :style="{
            transform: `translateX(${poleOffset * px}px)`,
            marginBottom: `${-HOLD_HAND.y * px}px`,
          }"
        >
          <div
            ref="board"
            :class="[
              cn.board,
              actor.lastMessage.firstMessage && !actor.lastMessage.highlighted && cn.boardFirst,
              actor.lastMessage.highlighted && cn.boardHighlighted,
            ]"
            :style="{
              translate: `${boardFit.shift.value}px 0`,
              maxHeight: boardFit.maxHeight.value === null
                ? undefined
                : `${boardFit.maxHeight.value}px`,
            }"
          >
            <div
              ref="signScroll"
              :class="[
                cn.signScroll,
                fadeTop && cn.scrollFadeTop,
                fadeBottom && cn.scrollFadeBottom,
              ]"
            >
              <div :class="cn.signEmotes">
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
          <div :class="cn.pole" :style="{ height: `${POLE_HEIGHT * px}px` }"/>
        </div>
      </Transition>
      <div
        :class="cn.body"
        :style="{ width: `${FRAME_WIDTH * px}px`, height: `${FRAME_HEIGHT * px}px` }"
      >
        <!-- The sprite sheet: a row is a pose and a direction, a column is a frame (0 — standing,
             1–4 — a step or a wave). The viewBox cuts one frame out of the sheet -->
        <svg
          :class="cn.sprite"
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
                <path :d="headwearClip"/>
              </clipPath>
              <!-- The top (a robot's body) is in the nick color, hair, pants and shoes in their
                   own colors -->
              <g :clip-path="headwearClip ? `url(#${clipId})` : undefined">
                <path
                  v-for="(layer, i) in spriteLayers"
                  :key="i"
                  :fill="paint(layer.fill)"
                  :d="layer.d"
                />
              </g>
              <!-- Accessories on top: the main layer is in the accessory's color -->
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
              <path :d="WALKER.head"/>
            </clipPath>
            <clipPath :id="bodyClipId">
              <path :d="WALKER.body"/>
            </clipPath>
          </defs>
          <template v-if="nodding">
            <use :href="`#${spriteId}`" :clip-path="`url(#${bodyClipId})`"/>
            <!-- The key restarts the nods on every new message -->
            <g
              :key="actor.lastMessage.id"
              :class="cn.spriteHead"
              :style="{ animationIterationCount: nods, '--nod': `${WALKER.res}px` }"
            >
              <use :href="`#${spriteId}`" :clip-path="`url(#${headClipId})`"/>
            </g>
          </template>
          <use v-else :href="`#${spriteId}`"/>
        </svg>
      </div>
    </div>
  </div>
</template>

<style module="cn">
/* The edge fade is animated through registered properties: a mask gradient alone doesn't
   transition */
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

/* The nick outline grows with the scale, but not thinner than 1px — else it disappears.
   var() in a custom property resolves where it is declared, so the outlines are declared here,
   next to the width they follow */
.root {
  --outline-width: max(1px, var(--ui));

  /* Diagonal shadows too: a solid outline without gaps on rounded letters */
  --text-outline:
    var(--outline-width) 0 var(--dudes-outline-color),
    calc(-1 * var(--outline-width)) 0 var(--dudes-outline-color),
    0 var(--outline-width) var(--dudes-outline-color),
    0 calc(-1 * var(--outline-width)) var(--dudes-outline-color),
    var(--outline-width) var(--outline-width) var(--dudes-outline-color),
    calc(-1 * var(--outline-width)) var(--outline-width) var(--dudes-outline-color),
    var(--outline-width) calc(-1 * var(--outline-width)) var(--dudes-outline-color),
    calc(-1 * var(--outline-width)) calc(-1 * var(--outline-width)) var(--dudes-outline-color);

  /* A double shadow: a single soft 1px shadow on a badge is too pale */
  --icon-outline:
    drop-shadow(0 0 var(--outline-width) var(--dudes-icon-outline-color))
    drop-shadow(0 0 var(--outline-width) var(--dudes-icon-outline-color));

  position: absolute;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  transform: translateX(-50%);
}

.rootHidden {
  visibility: hidden;
}

/* The colors and border are shared by the bubble's body and its tail */
.bubble {
  --bubble-gap: calc(var(--ui) * 10);
  --bubble-radius: calc(var(--ui) * 10);
  --bubble-border: 1px solid var(--dudes-border-color);
  --bubble-bg: var(--dudes-bubble-color);
  --tail-size: calc(var(--ui) * 10);

  /* The tail doesn't go onto the rounded corners */
  --tail-inset: calc(var(--ui) * 16);

  position: absolute;
  bottom: calc(100% + var(--bubble-gap));
  display: flex;
  flex-direction: column;
  width: max-content;
  max-width: calc(var(--ui) * 220);
}

/* A line of braille art from the chat (22 ⣿ characters) fits whole, with room for fonts with
   wide braille glyphs */
.bubbleWide {
  max-width: calc(var(--ui) * 320);
}

.bubbleFirst {
  --bubble-border: 1px solid var(--dudes-first-message-color);
  --bubble-bg: color-mix(in srgb, var(--dudes-first-message-color) 15%, var(--dudes-bubble-color));
}

.bubbleHighlighted {
  --bubble-border: 2px solid var(--dudes-highlight-color);
  --bubble-bg: color-mix(in srgb, var(--dudes-highlight-color) 22%, var(--dudes-bubble-color));
  --bubble-shadow:
    0 0 10px color-mix(in srgb, var(--dudes-highlight-color) 60%, transparent),
    0 4px 12px var(--dudes-shadow-color);
}

/* A bot writes into a terminal: a dark window with almost square corners, green monospace text
   with a slight glow, a "$" prompt and a blinking cursor. The same in light and dark themes */
.bubbleBot {
  --bubble-radius: calc(var(--ui) * 3);
  --bubble-border: 1px solid var(--dudes-terminal-border-color);
  --bubble-bg: var(--dudes-terminal-color);
  --bubble-shadow:
    0 0 calc(var(--ui) * 8) color-mix(in srgb, var(--dudes-terminal-text-color) 20%, transparent),
    0 4px 12px var(--dudes-terminal-shadow-color);
}

.bubbleBody {
  /* Emotes in the message text */
  --emote-size: calc(var(--ui) * 28);

  min-height: 0;
  padding: calc(var(--ui) * 4) calc(var(--ui) * 10);
  border: var(--bubble-border);
  border-radius: var(--bubble-radius);
  font-size: calc(var(--ui) * 13);
  line-height: 1.2;
  overflow-wrap: anywhere;
  overflow: hidden;
  color: var(--dudes-bubble-text-color);
  background: var(--bubble-bg);
  box-shadow: var(--bubble-shadow, 0 4px 12px var(--dudes-shadow-color));
  transition: height 0.2s ease-out;
}

.bubbleBodyBot {
  --message-prefix-color: color-mix(in srgb, var(--dudes-terminal-text-color) 55%, transparent);

  font-family: ui-monospace, Consolas, monospace;
  font-size: calc(var(--ui) * 12);
  color: var(--dudes-terminal-text-color);
  text-shadow:
    0 0 calc(var(--ui) * 3)
    color-mix(in srgb, var(--dudes-terminal-text-color) 50%, transparent);
}

/* A rotated square with a border at the bottom and right: sticks out from under the bubble with a
   corner down and covers the bubble's border above itself */
.bubbleTail {
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

.bubbleName {
  display: block;
  font-size: calc(var(--ui) * 11);
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* No more than 6 lines of the message, the rest scrolls after typing */
.bubbleScroll {
  --fade-size: 1em;

  /* Emotes in a line stick out of it by a seventh of their height (see ChatEmote): room for them,
     else their edges are clipped, and the sticking bottom counts as an overflow and starts the
     scroll. The negative margin gives the bubble back its size */
  --emote-overhang: calc(var(--emote-size) / 7);

  /* Six lines of text fit inside, the padding comes on top */
  box-sizing: content-box;
  max-height: calc(6 * 1.2em);
  padding: var(--emote-overhang) 0;
  margin: calc(-1 * var(--emote-overhang)) 0;
}

/* The mask only uses the alpha of its colors */
.bubbleScroll,
.signScroll {
  overflow: hidden;
  mask-image: linear-gradient(
    to bottom,
    rgb(0 0 0 / 15%),
    rgb(0 0 0) var(--fade-top),
    rgb(0 0 0) calc(100% - var(--fade-bottom)),
    rgb(0 0 0 / 15%)
  );
  transition:
    --fade-top 0.3s ease-out,
    --fade-bottom 0.3s ease-out;
}

.scrollFadeTop {
  --fade-top: var(--fade-size);
}

.scrollFadeBottom {
  --fade-bottom: var(--fade-size);
}

/* A block, so ResizeObserver sees the typed text grow */
.bubbleText {
  display: block;
}

.cursor {
  display: inline-block;
  width: 0.6em;
  height: 1.1em;
  margin-left: 0.2em;
  vertical-align: text-bottom;
  background: currentcolor;
  animation: blink 1s steps(1) infinite;
}

/* White in both themes: the stream is under the nick, the dark outline keeps it readable */
.name {
  --role-badge-filter: var(--icon-outline);

  /* The nick's line is exactly the font's height: the badge takes it whole and doesn't push the
     nick up */
  --role-badge-align: top;

  margin-bottom: calc(var(--ui) * 4);
  text-shadow: var(--text-outline);
  transition: translate 0.25s ease-out;
  font-size: calc(var(--ui) * 11);
  line-height: 1;
  white-space: nowrap;
  color: var(--dudes-name-color);
}

.nameRole {
  font-weight: 700;
}

/* A bot's nick is monospace above the head too */
.nameBot {
  font-family: ui-monospace, Consolas, monospace;
}

.nameGhost {
  --role-badge-filter: var(--icon-outline);
  --role-badge-align: top;

  position: absolute;
  top: 100%;
  left: 50%;
  z-index: 2;
  text-shadow: var(--text-outline);
  font-size: calc(var(--ui) * 11);
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
}

.nameGhostBot {
  font-family: ui-monospace, Consolas, monospace;
}

.figure {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.sign {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;

  /* Shrinking on the way out, the board and the pole stay at the hand rather than the top edge */
  justify-content: flex-end;
}

.board {
  /* Sign emote images are rounded */
  --emote-radius: 6px;

  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  box-sizing: border-box;

  /* As wide as the bubble */
  max-width: calc(var(--ui) * 220);
  overflow: hidden;
  padding: calc(var(--px) * 0.75);
  border: var(--px) solid var(--dudes-board-border-color);
  border-radius: 10px;
  background: var(--dudes-board-color);
  box-shadow: 0 4px 12px var(--dudes-board-shadow-color);
}

.boardFirst {
  border-color: var(--dudes-first-message-color);
}

.boardHighlighted {
  border-color: var(--dudes-highlight-color);
  box-shadow:
    0 0 10px color-mix(in srgb, var(--dudes-highlight-color) 60%, transparent),
    0 4px 12px var(--dudes-board-shadow-color);
}

/* As tall as the bubble's text: 6 of its lines, the rest scrolls */
.signScroll {
  --fade-size: calc(var(--ui) * 13);

  min-height: 0;
  max-height: calc(var(--ui) * 13 * 1.2 * 6);
}

/* Several emotes go in centered rows */
.signEmotes {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: calc(var(--ui) * 3);
}

.pole {
  flex-shrink: 0;
  width: var(--px);
  background: var(--dudes-pole-color);

  /* The pole's dark edge gives it volume in the pixel style */
  box-shadow: inset calc(var(--px) * -0.34) 0 var(--dudes-pole-shade-color);
}

.body {
  overflow: hidden;
}

.sprite {
  display: block;
}

/* The number of nods is animation-iteration-count, by the message length */
.spriteHead {
  animation: nod 0.2s steps(1);
}

.bubbleActive {
  transition:
    opacity 0.2s,
    transform 0.2s;
}

.bubbleAway {
  opacity: 0;
  transform: translateY(calc(var(--ui) * 4));
}

/* The sign is "taken out" from below, from the hand */
.signActive {
  transition:
    opacity 0.25s,
    translate 0.25s ease-out,
    height 0.25s ease-out;
}

.signAway {
  opacity: 0;
  translate: 0 calc(var(--px) * 6);
}

/* The head drops by a sheet pixel (a scene pixel), covering the neck, and comes back */
@keyframes nod {
  50% {
    transform: translateY(var(--nod));
  }
}

@keyframes blink {
  50% {
    opacity: 0;
  }
}
</style>
