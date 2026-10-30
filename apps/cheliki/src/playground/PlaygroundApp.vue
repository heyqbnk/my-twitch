<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import MessageText from '../components/MessageText.vue';
import SceneGround from '../components/SceneGround.vue';
import { DEFAULT_GROUND, DEFAULT_SCALE } from '../composables/useChannelQuery';
import { provideMentionColor } from '../composables/useMentionColor';
import { provideMessageParts } from '../composables/useMessageParts';
import { useSceneActors, type SceneActor } from '../composables/useSceneActors';
import { useThirdPartyEmotes } from '../composables/useThirdPartyEmotes';
import ChatDoll from '../doll-chat/ChatDoll.vue';
import { preload, type Doll } from '../doll/paperDoll';
import { useViewportWidth } from '../doll/useViewportWidth';
import { actorColor } from '../scene/actorStyle';
import type { ChatRole } from '../twitch/badges';
import { fetchUserId } from '../twitch/ivr';
import controls from './controls.module.css';
import LookEditor from './LookEditor.vue';
import PlaygroundCard from './PlaygroundCard.vue';
import { randomDude, randomMessage, usePlayground, withNickColor } from './usePlayground';

const props = defineProps<{ doll: Doll }>();

const SETTINGS_KEY = 'cheliki-playground:settings:v2';
/** Pause between the messages of «Все говорят», so the bubbles come one by one. */
const CHORUS_STEP_MS = 300;
const CROWD_SIZE = 10;

preload(props.doll);

interface Settings {
  scale: number;
  /** Scene px. */
  ground: number;
  /** Minutes on the scene after the last message, null — no limit, like ?stay=. */
  stay: number | null;
  /** Seconds, like ?msg_delay=. */
  delay: number;
  background: string;
  emoteChannel: string;
}

function loadSettings(): Settings {
  const defaults: Settings = {
    scale: DEFAULT_SCALE,
    ground: DEFAULT_GROUND,
    stay: null,
    delay: 0,
    background: '#5c94fc',
    emoteChannel: '',
  };
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') };
  } catch {
    return defaults;
  }
}

const settings = ref(loadSettings());
watch(settings, value => {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
  } catch {
    // No storage: the settings just won't be remembered
  }
}, { deep: true });

const {
  dudes, messages, queued, followDates, lastMessageOf,
  send, deleteMessage, timeout, clearChat, addDude, removeDude, renameDude,
} = usePlayground(props.doll, computed(() => settings.value.delay * 1000));

/**
 * 7TV and BTTV emotes of a real channel, as on its scene
 */
const roomId = ref<string | null>(null);
const emoteStatus = ref('');
async function loadEmotes() {
  const login = settings.value.emoteChannel.trim().toLowerCase();
  roomId.value = null;
  if (!login) return (emoteStatus.value = '');
  emoteStatus.value = 'Ищем канал…';
  try {
    roomId.value = await fetchUserId(login);
    emoteStatus.value = roomId.value ? `ID ${roomId.value}` : 'Канал не найден';
  } catch {
    emoteStatus.value = 'Не удалось узнать ID канала';
  }
}
void loadEmotes();
provideMessageParts(useThirdPartyEmotes(roomId));
provideMentionColor(messages);

const stay = computed(() => (settings.value.stay ? settings.value.stay * 60_000 : null));
const actors = useSceneActors(messages, stay, followDates);
/**
 * No exit animation yet: a chatter who said goodbye just disappears
 */
const shown = computed(() => actors.value.filter(actor => !actor.leaving));
const onStage = computed(() => new Set(shown.value.map(a => a.login)));

function lookOf(actor: SceneActor) {
  const look = dudes.value.find(d => d.login === actor.login)?.look;
  return look ? withNickColor(look, actor.color) : undefined;
}

const viewportWidth = useViewportWidth();
/** Walkable width in sprite px. */
const width = computed(() => Math.floor(viewportWidth.value / settings.value.scale));

const selectedLogin = ref(dudes.value[0]?.login ?? null);
const selected = computed(() => dudes.value.find(d => d.login === selectedLogin.value) ?? null);

function add(bot = false) {
  const dude = addDude({ ...randomDude(), bot });
  selectedLogin.value = dude.login;
}

function remove(login: string) {
  removeDude(login);
  if (selectedLogin.value === login) selectedLogin.value = dudes.value[0]?.login ?? null;
}

function rename(event: Event) {
  const input = event.target as HTMLInputElement;
  const dude = selected.value;
  if (!dude) return;
  if (renameDude(dude, input.value)) selectedLogin.value = dude.login;
  else input.value = dude.login;
}

/**
 * The message being written
 */
const text = ref('');
const highlighted = ref(false);
const firstMessage = ref(false);
const replyTo = ref<string | null>(null);

function say(message = text.value) {
  if (!selected.value) return;
  send(selected.value.login, message, {
    highlighted: highlighted.value,
    firstMessage: firstMessage.value,
    replyTo: replyTo.value,
  });
  if (message === text.value) text.value = '';
  highlighted.value = false;
  firstMessage.value = false;
  replyTo.value = null;
}

function mention(login: string) {
  const name = dudes.value.find(d => d.login === login)?.name ?? login;
  text.value = `${text.value.trimEnd()} @${name} `.trimStart();
}

function chorus(logins = dudes.value.map(d => d.login)) {
  logins.forEach((login, i) => {
    setTimeout(() => send(login, randomMessage()), i * CHORUS_STEP_MS);
  });
}

/** New viewers, each says something, so they come on the scene. */
function crowd() {
  chorus(Array.from({ length: CROWD_SIZE }, () => addDude(randomDude()).login));
}

function deleteLast() {
  if (!selected.value) return;
  const last = lastMessageOf(selected.value.login);
  if (last) deleteMessage(last.id);
}

const ROLES: { value: ChatRole | undefined; label: string }[] = [
  { value: undefined, label: 'зритель' },
  { value: 'vip', label: 'VIP' },
  { value: 'moderator', label: 'модератор' },
  { value: 'broadcaster', label: 'владелец' },
];
const ROLE_ICONS: Record<ChatRole, string> = { broadcaster: '👑', moderator: '⚔️', vip: '💎' };

const log = computed(() => [
  ...queued.value.map(message => ({ message, queued: true })),
  ...messages.value.map(message => ({ message, queued: false })).reverse(),
]);

const value = (event: Event) => (event.target as HTMLInputElement).value;
const optionalNumber = (raw: string) => (raw.trim() === '' ? null : Math.max(0, Number(raw)));
</script>

<template>
  <div class="flex h-dvh flex-col bg-neutral-900 text-sm text-neutral-300">
    <div
      class="flex min-h-50 flex-1 flex-col overflow-hidden"
      :style="{ background: settings.background }"
    >
      <div class="relative flex-1">
        <ChatDoll
          v-for="actor in shown"
          :key="actor.login"
          :doll="doll"
          :actor="actor"
          :look="lookOf(actor)"
          :width="width"
          :scale="settings.scale"
        />
      </div>
      <SceneGround :scale="settings.scale" :height="settings.ground" />
    </div>

    <div class="flex h-[45vh] shrink-0 gap-3 overflow-x-auto p-3">
      <PlaygroundCard title="Зрители">
        <ul class="flex flex-col gap-0.5">
          <li
            v-for="dude in dudes"
            :key="dude.login"
            :class="[cn.dude, dude.login === selectedLogin && cn.dudeSelected]"
            @click="selectedLogin = dude.login"
          >
            <span class="size-3 shrink-0 rounded-full" :style="{ background: actorColor(dude) }" />
            <span v-if="dude.role" :title="dude.role">{{ ROLE_ICONS[dude.role] }}</span>
            <span v-if="dude.bot" title="бот">🤖</span>
            <span class="flex-1 truncate">{{ dude.name }}</span>
            <span
              v-if="onStage.has(dude.login)"
              class="text-xs text-green-500"
              title="На сцене"
            >●</span>
            <button
              type="button"
              :class="controls.button"
              title="Упомянуть"
              @click.stop="mention(dude.login)"
            >
              @
            </button>
            <button
              type="button"
              :class="controls.button"
              title="Удалить зрителя"
              @click.stop="remove(dude.login)"
            >
              ✕
            </button>
          </li>
        </ul>
        <div class="flex flex-wrap gap-1.5">
          <button type="button" :class="controls.button" @click="add()">+ Зритель</button>
          <button type="button" :class="controls.button" @click="add(true)">+ Бот</button>
          <button type="button" :class="controls.button" @click="chorus()">Все говорят</button>
          <button
            type="button"
            :class="controls.button"
            @click="crowd"
          >
            +{{ CROWD_SIZE }} с сообщением
          </button>
        </div>
      </PlaygroundCard>

      <PlaygroundCard v-if="selected" :key="selected.login" title="Профиль">
        <label class="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-1.5">
          <span>Логин</span>
          <input :class="controls.input" :value="selected.login" @change="rename" />
        </label>
        <label class="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-1.5">
          <span>Ник</span>
          <input v-model.trim="selected.name" :class="controls.input" />
        </label>
        <div class="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-1.5">
          <span>Цвет ника</span>
          <span class="flex items-center gap-1.5">
            <input
              type="color"
              :class="controls.color"
              :disabled="selected.color === null"
              :value="selected.color ?? '#000000'"
              @input="selected.color = value($event)"
            />
            <label class="flex items-center gap-1">
              <input
                type="checkbox"
                :checked="selected.color === null"
                @change="selected.color = selected.color === null ? '#1e90ff' : null"
              />
              не выбран
            </label>
          </span>
        </div>
        <label class="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-1.5">
          <span>Роль</span>
          <select v-model="selected.role" :class="controls.input">
            <option
              v-for="role in ROLES"
              :key="role.label"
              :value="role.value"
            >{{ role.label }}</option>
          </select>
        </label>
        <label class="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-1.5">
          <span>Подписка, мес.</span>
          <input
            v-model.number="selected.subMonths"
            :class="controls.input"
            type="number"
            min="0"
          >
        </label>
        <label class="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-1.5">
          <span>Фолловит, дней</span>
          <input
            :class="controls.input"
            type="number"
            min="0"
            placeholder="не фолловер"
            :value="selected.followDays ?? ''"
            @change="selected.followDays = optionalNumber(value($event))"
          />
        </label>
        <label class="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-1.5">
          <span>Бот</span>
          <input v-model="selected.bot" type="checkbox" class="justify-self-start" />
        </label>
        <p class="text-xs text-neutral-500">
          Ник, цвет, роль и подписка применяются со следующего сообщения — как в настоящем чате.
          Кто поверх кого: роль, затем стаж подписки или фоллова.
        </p>
      </PlaygroundCard>

      <PlaygroundCard v-if="selected" :key="`look-${selected.login}`" title="Внешность">
        <LookEditor :doll="doll" :dude="selected" />
      </PlaygroundCard>

      <PlaygroundCard v-if="selected" :title="`Написать от ${selected.name}`">
        <form class="flex gap-1.5" @submit.prevent="say()">
          <input
            v-model="text"
            :class="[controls.input, controls.inputGrow]"
            placeholder="Сообщение, @ник для упоминания"
          >
          <button type="submit" :class="controls.button">Отправить</button>
        </form>
        <div class="flex flex-wrap gap-x-3 gap-y-1">
          <label class="flex items-center gap-1">
            <input v-model="highlighted" type="checkbox" /> выделенное
          </label>
          <label class="flex items-center gap-1">
            <input v-model="firstMessage" type="checkbox" /> первое
          </label>
          <label class="flex items-center gap-1">
            ответ
            <select v-model="replyTo" :class="controls.input">
              <option :value="null">—</option>
              <option
                v-for="dude in dudes.filter(d => d.login !== selected!.login)"
                :key="dude.login"
                :value="dude.login"
              >{{ dude.name }}</option>
            </select>
          </label>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <button
            type="button"
            :class="controls.button"
            @click="say(randomMessage())"
          >
            Случайное
          </button>
          <button type="button" :class="controls.button" @click="say('bb')">bb</button>
          <button type="button" :class="controls.button" @click="say('!vanish')">!vanish</button>
        </div>
        <h3 class="mt-2 font-semibold text-neutral-400">Модерация</h3>
        <div class="flex flex-wrap gap-1.5">
          <button
            type="button"
            :class="controls.button"
            @click="deleteLast"
          >
            Удалить последнее
          </button>
          <button
            type="button"
            :class="controls.button"
            @click="timeout(selected.login)"
          >
            Таймаут
          </button>
          <button type="button" :class="controls.button" @click="clearChat">Очистить чат</button>
        </div>
      </PlaygroundCard>

      <PlaygroundCard title="Сцена">
        <label class="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-1.5">
          <span>Масштаб: ×{{ settings.scale }}</span>
          <input v-model.number="settings.scale" type="range" min="1" max="10" />
        </label>
        <label class="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-1.5">
          <span>Пол: {{ settings.ground }}</span>
          <input v-model.number="settings.ground" type="range" min="0" max="64" />
        </label>
        <label class="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-1.5">
          <span>На сцене, мин</span>
          <input
            :class="controls.input"
            type="number"
            min="0"
            step="0.1"
            placeholder="без ограничения"
            :value="settings.stay ?? ''"
            @change="settings.stay = optionalNumber(value($event)) || null"
          />
        </label>
        <label class="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-1.5">
          <span>Задержка, с</span>
          <input
            :class="controls.input"
            type="number"
            min="0"
            step="0.5"
            :value="settings.delay"
            @change="settings.delay = optionalNumber(value($event)) ?? 0"
          />
        </label>
        <label class="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-1.5">
          <span>Фон</span>
          <input v-model="settings.background" type="color" :class="controls.color" />
        </label>
        <form
          class="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-1.5"
          @submit.prevent="loadEmotes"
        >
          <span>Эмодзи канала</span>
          <span class="flex gap-1.5">
            <input
              v-model.trim="settings.emoteChannel"
              :class="[controls.input, controls.inputGrow]"
              placeholder="логин"
            >
            <button type="submit" :class="controls.button">Загрузить</button>
          </span>
        </form>
        <p v-if="emoteStatus" class="text-xs text-neutral-500">7TV и BTTV: {{ emoteStatus }}</p>
      </PlaygroundCard>

      <PlaygroundCard title="Чат" wide>
        <ul class="flex flex-col gap-0.5">
          <li v-if="!log.length" class="text-xs text-neutral-500">Пока тихо</li>
          <li
            v-for="{ message, queued: waiting } in log"
            :key="message.id"
            :class="[cn.logItem, waiting && cn.logItemQueued]"
          >
            <span v-if="waiting" title="Ждёт показа">⏳ </span>
            <b :style="{ color: actorColor(message) }">{{ message.author }}</b>:
            <MessageText :message="message" />
            {{ ' ' }}<button
              type="button"
              :class="controls.button"
              title="Удалить сообщение"
              @click="deleteMessage(message.id)"
            >
              ✕
            </button>
          </li>
        </ul>
      </PlaygroundCard>
    </div>
  </div>
</template>

<style module="cn">
.dude {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background: rgb(64 64 64);
  }
}

.dudeSelected {
  outline: 2px solid rgb(168 85 247);
}

.logItem {
  overflow-wrap: anywhere;
}

.logItemQueued {
  opacity: 0.5;
}
</style>
