import type { PageNavOptions } from '~pages/types';

export function navigateToTwitchDudesWidgetPage(options: {
  channel: string;
  msgDelay?: number;
  scale?: number;
  stay?: number;
}, navOptions?: PageNavOptions) {
  return navigateTo(createTwitchDudesWidgetPageNavParams(options), navOptions);
}
