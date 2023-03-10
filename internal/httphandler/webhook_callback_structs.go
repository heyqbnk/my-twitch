package httphandler

// Represents a subscription event which contains the information about the
// subscription required to be confirmed.
// Source: https://dev.twitch.tv/docs/eventsub/handling-webhook-events/#responding-to-a-challenge-request
type webhookCallbackVerificationPendingMessage struct {
	Challenge string `json:"challenge"`
}

/* EVENTSUB NOTIFICATION. */

type webhookNotificationMessageSubscription struct {
	Type string `json:"type"`
}

// Reference: https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#stream-subscriptions
type webhookNotificationMessage[T interface{}] struct {
	Subscription webhookNotificationMessageSubscription `json:"subscription"`
	Event        T                                      `json:"event"`
}

/* EVENTSUB NOTIFICATION TYPES. */

type webhookStreamOnlineMessageEvent struct {
	ID string `json:"id"`
}

type webhookStreamOnlineMessage = webhookNotificationMessage[webhookStreamOnlineMessageEvent]
