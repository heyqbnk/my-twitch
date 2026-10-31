export function preloadTwitchDudesWidgetPage(options: {
  channel: string;
  msgDelay?: number;
  scale?: number;
  stay?: number;
}) {
  preloadRouteComponents(createTwitchDudesWidgetPageNavParams(options));
}
