export function createTwitchChatWidgetPageNavParams(options: {
  background?: string;
  channel: string;
}) {
  return {
    name: PageNames.TwitchChatWidget,
    params: { channel: options.channel },
    query: options.background ? { background: options.background } : undefined,
  };
}
