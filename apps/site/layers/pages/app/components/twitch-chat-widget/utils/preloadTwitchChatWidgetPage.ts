export function preloadTwitchChatWidgetPage(options: {
  background?: string;
  channel: string;
}) {
  preloadRouteComponents(createTwitchChatWidgetPageNavParams(options));
}
