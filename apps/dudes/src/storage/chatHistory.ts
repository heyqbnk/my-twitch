import type { ChatMessage } from '../composables/useTwitchChat'

// Версия в ключе: при изменении формата ChatMessage старые записи просто не прочитаются
const KEY_PREFIX = 'twitch-chat:v1:'

function isChatMessage(value: unknown): value is ChatMessage {
  const m = value as ChatMessage
  return (
    typeof m === 'object' &&
    m !== null &&
    typeof m.id === 'string' &&
    typeof m.login === 'string' &&
    typeof m.author === 'string' &&
    typeof m.timestamp === 'number' &&
    Array.isArray(m.parts)
  )
}

export function loadChatHistory(channel: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + channel)
    if (!raw) return []
    const data: unknown = JSON.parse(raw)
    return Array.isArray(data) ? data.filter(isChatMessage) : []
  } catch {
    return [] // хранилище недоступно или данные битые
  }
}

export function saveChatHistory(channel: string, messages: ChatMessage[]) {
  try {
    localStorage.setItem(KEY_PREFIX + channel, JSON.stringify(messages))
  } catch (err) {
    console.warn('Не удалось сохранить историю чата', err)
  }
}
