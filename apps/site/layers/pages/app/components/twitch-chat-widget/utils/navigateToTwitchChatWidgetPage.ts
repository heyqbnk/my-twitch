import type { PageNavOptions } from '~pages/types';

export function navigateToTwitchChatWidgetPage(options: {
  background?: string;
  channel: string;
}, navOptions?: PageNavOptions) {
  return navigateTo(createTwitchChatWidgetPageNavParams(options), navOptions);
}
