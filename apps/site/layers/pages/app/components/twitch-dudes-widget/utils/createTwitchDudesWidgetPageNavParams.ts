export function createTwitchDudesWidgetPageNavParams(options: {
  channel: string;
  msgDelay?: number;
  scale?: number;
  stay?: number;
}) {
  const query: Record<string, string> = {};
  if (options.msgDelay !== undefined) {
    query.msg_delay = String(options.msgDelay);
  }
  if (options.scale !== undefined) {
    query.scale = String(options.scale);
  }
  if (options.stay !== undefined) {
    query.stay = String(options.stay);
  }
  return {
    name: PageNames.TwitchDudesWidget,
    params: { channel: options.channel },
    query,
  };
}
