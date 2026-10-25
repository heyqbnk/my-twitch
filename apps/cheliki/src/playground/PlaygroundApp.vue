<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ChatScene from '../components/ChatScene.vue';
import MessageText from '../components/MessageText.vue';
import RoleBadge from '../components/RoleBadge.vue';
import { DEFAULT_SCALE } from '../composables/useChannelQuery';
import { provideMentionColor } from '../composables/useMentionColor';
import { provideMessageParts } from '../composables/useMessageParts';
import { useSceneActors } from '../composables/useSceneActors';
import { useThirdPartyEmotes } from '../composables/useThirdPartyEmotes';
import { actorColor } from '../scene/actorStyle';
import type { ChatRole } from '../twitch/badges';
import { fetchUserId } from '../twitch/ivr';
import LookEditor from './LookEditor.vue';
import { randomDude, randomMessage, usePlayground, withLooks } from './usePlayground';

const SETTINGS_KEY = 'cheliki-playground:settings:v1';
// Задержка между сообщениями «все говорят», чтобы облачка появлялись по очереди
const CHORUS_STEP_MS = 300;

interface Settings {
  scale: number;
  // Минуты на сцене после последнего сообщения, null — без ограничения
  stay: number | null;
  background: string;
  emoteChannel: string;
}

function loadSettings(): Settings {
  const defaults: Settings = {
    scale: DEFAULT_SCALE, stay: null, background: '#1f2028', emoteChannel: '',
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
    // хранилище недоступно — настройки не запомнятся
  }
}, { deep: true });

const {
  dudes, messages, followDates, lastMessageOf,
  send, deleteMessage, timeout, clearChat, addDude, removeDude, renameDude,
} = usePlayground();

// Эмодзи 7TV и BTTV — с настоящего канала, как на его сцене
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
loadEmotes();
provideMessageParts(useThirdPartyEmotes(roomId));
provideMentionColor(messages);

const stay = computed(() => (settings.value.stay ? settings.value.stay * 60_000 : null));
const actors = withLooks(useSceneActors(messages, stay, followDates), dudes);

const selectedLogin = ref(dudes.value[0]?.login ?? null);
const selected = computed(() => dudes.value.find(d => d.login === selectedLogin.value) ?? null);
const onStage = computed(() => new Set(actors.value.filter(a => !a.leaving).map(a => a.login)));

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

// Сообщение
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

function chorus() {
  dudes.value.forEach((dude, i) => {
    setTimeout(() => send(dude.login, randomMessage()), i * CHORUS_STEP_MS);
  });
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

const value = (event: Event) => (event.target as HTMLInputElement).value;
const optionalNumber = (raw: string) => (raw.trim() === '' ? null : Math.max(0, Number(raw)));
</script>

<template>
  <div class="pg">
    <ChatScene
      class="pg__scene"
      :style="{ background: settings.background }"
      :actors="actors"
      :scale="settings.scale"
    />

    <div class="pg__panel">
      <section class="pg__card">
        <h2>Зрители</h2>
        <ul class="pg__dudes">
          <li
            v-for="dude in dudes"
            :key="dude.login"
            class="pg__dude"
            :class="{ 'pg__dude--selected': dude.login === selectedLogin }"
            @click="selectedLogin = dude.login"
          >
            <span class="pg__swatch" :style="{ background: actorColor(dude) }" />
            <RoleBadge v-if="dude.role" :role="dude.role" :size="14" />
            <span class="pg__dude-name">{{ dude.bot ? '🤖 ' : '' }}{{ dude.name }}</span>
            <span v-if="onStage.has(dude.login)" class="pg__on-stage" title="На сцене">●</span>
            <button type="button" title="Упомянуть" @click.stop="mention(dude.login)">@</button>
            <button type="button" title="Удалить зрителя" @click.stop="remove(dude.login)">
              ✕
            </button>
          </li>
        </ul>
        <div class="pg__buttons">
          <button type="button" @click="add()">+ Зритель</button>
          <button type="button" @click="add(true)">+ Бот</button>
          <button type="button" @click="chorus">Все говорят</button>
        </div>
      </section>

      <section v-if="selected" :key="selected.login" class="pg__card">
        <h2>Профиль</h2>
        <label class="pg__field">
          <span>Логин</span>
          <input :value="selected.login" @change="rename" />
        </label>
        <label class="pg__field">
          <span>Ник</span>
          <input v-model.trim="selected.name" />
        </label>
        <label class="pg__field">
          <span>Цвет ника</span>
          <span class="pg__inline">
            <input
              type="color"
              :disabled="selected.color === null"
              :value="selected.color ?? '#000000'"
              @input="selected.color = value($event)"
            />
            <label><input
              type="checkbox"
              :checked="selected.color === null"
              @change="selected.color = selected.color === null ? '#1e90ff' : null"
            /> не выбран</label>
          </span>
        </label>
        <label class="pg__field">
          <span>Роль</span>
          <select v-model="selected.role">
            <option v-for="role in ROLES" :key="role.label" :value="role.value">
              {{ role.label }}
            </option>
          </select>
        </label>
        <label class="pg__field">
          <span>Подписка, мес.</span>
          <input v-model.number="selected.subMonths" type="number" min="0" />
        </label>
        <label class="pg__field">
          <span>Фолловит, дней</span>
          <input
            type="number"
            min="0"
            placeholder="не фолловер"
            :value="selected.followDays ?? ''"
            @change="selected.followDays = optionalNumber(value($event))"
          />
        </label>
        <label class="pg__field">
          <span>Бот</span>
          <input v-model="selected.bot" type="checkbox" />
        </label>
        <p class="pg__note">
          Ник, роль и подписка применяются со следующего сообщения — как в настоящем чате.
          Бот — только у нового человечка на сцене.
        </p>
      </section>

      <section v-if="selected && !selected.bot" :key="`look-${selected.login}`" class="pg__card">
        <h2>Внешность</h2>
        <LookEditor :dude="selected" />
      </section>

      <section v-if="selected" class="pg__card">
        <h2>Написать от {{ selected.name }}</h2>
        <form class="pg__composer" @submit.prevent="say()">
          <input v-model="text" placeholder="Сообщение, @ник для упоминания" autofocus />
          <button type="submit">Отправить</button>
        </form>
        <div class="pg__options">
          <label><input v-model="highlighted" type="checkbox" /> выделенное</label>
          <label><input v-model="firstMessage" type="checkbox" /> первое сообщение</label>
          <label>
            ответ
            <select v-model="replyTo">
              <option :value="null">—</option>
              <option
                v-for="dude in dudes.filter(d => d.login !== selected!.login)"
                :key="dude.login"
                :value="dude.login"
              >{{ dude.name }}</option>
            </select>
          </label>
        </div>
        <div class="pg__buttons">
          <button type="button" @click="say(randomMessage())">Случайное</button>
          <button type="button" @click="say('bb')">bb</button>
          <button type="button" @click="say('!vanish')">!vanish</button>
        </div>
        <h3>Модерация</h3>
        <div class="pg__buttons">
          <button type="button" @click="deleteLast">Удалить последнее</button>
          <button type="button" @click="timeout(selected.login)">Таймаут</button>
          <button type="button" @click="clearChat">Очистить чат</button>
        </div>
      </section>

      <section class="pg__card">
        <h2>Сцена</h2>
        <label class="pg__field">
          <span>Масштаб: {{ settings.scale }}</span>
          <input v-model.number="settings.scale" type="range" min="1" max="10" />
        </label>
        <label class="pg__field">
          <span>На сцене, мин</span>
          <input
            type="number"
            min="0"
            step="0.1"
            placeholder="без ограничения"
            :value="settings.stay ?? ''"
            @change="settings.stay = optionalNumber(value($event)) || null"
          />
        </label>
        <label class="pg__field">
          <span>Фон</span>
          <input v-model="settings.background" type="color" />
        </label>
        <form class="pg__field" @submit.prevent="loadEmotes">
          <span>Эмодзи канала</span>
          <span class="pg__inline">
            <input v-model.trim="settings.emoteChannel" placeholder="логин" />
            <button type="submit">Загрузить</button>
          </span>
        </form>
        <p v-if="emoteStatus" class="pg__note">7TV и BTTV: {{ emoteStatus }}</p>
      </section>

      <section class="pg__card pg__card--log">
        <h2>Чат</h2>
        <ul class="pg__log">
          <li v-if="!messages.length" class="pg__note">Пока тихо</li>
          <li v-for="msg in [...messages].reverse()" :key="msg.id" class="pg__log-item">
            <b :style="{ color: actorColor(msg) }">{{ msg.author }}</b>:
            <MessageText :message="msg" />
            <button type="button" title="Удалить сообщение" @click="deleteMessage(msg.id)">
              ✕
            </button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.pg {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg);
}

.pg__scene {
  flex: 1;
  min-height: 200px;
}

.pg__panel {
  display: flex;
  gap: 12px;
  height: 45vh;
  padding: 12px;
  overflow-x: auto;
  border-top: 1px solid var(--border);
  font-size: 14px;
  color: var(--text-h);
}

.pg__card {
  display: flex;
  flex: 0 0 280px;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--code-bg);
}

.pg__card--log {
  flex-basis: 360px;
}

.pg__card h2,
.pg__card h3 {
  margin: 0 0 4px;
  font-size: 1em;
}

.pg__card h3 {
  margin-top: 8px;
  font-size: 0.9em;
  opacity: 0.8;
}

.pg__dudes,
.pg__log {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pg__dude {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  border-radius: 4px;
  cursor: pointer;
}

.pg__dude:hover {
  background: var(--border);
}

.pg__dude--selected {
  outline: 2px solid var(--accent);
}

.pg__dude-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pg__swatch {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.pg__on-stage {
  color: #22c55e;
  font-size: 0.8em;
}

.pg__field {
  display: grid;
  grid-template-columns: 110px 1fr;
  align-items: center;
  gap: 6px;
}

.pg__field input:not([type='checkbox']),
.pg__field select {
  min-width: 0;
}

.pg__inline {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pg__inline input:not([type='checkbox'], [type='color']) {
  flex: 1;
}

.pg__buttons,
.pg__options {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.pg__composer {
  display: flex;
  gap: 6px;
}

.pg__composer input {
  flex: 1;
  min-width: 0;
}

.pg__note {
  margin: 0;
  font-size: 0.8em;
  opacity: 0.7;
}

.pg__log-item {
  overflow-wrap: anywhere;
}

.pg__log-item button {
  margin-left: 4px;
  padding: 0 4px;
  font-size: 0.75em;
}
</style>
