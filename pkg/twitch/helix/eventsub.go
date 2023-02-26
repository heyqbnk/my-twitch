package helix

const (
	SubscriptionTypeStreamOnline SubscriptionType = "stream.online"
)

type SubscriptionType string

type SubscriptionCondition struct {
	BroadcasterUserID string `json:"broadcaster_user_id"`
}

type SubscriptionWebhookTransport struct {
	Method   string `json:"method"`
	Callback string `json:"callback"`
	Secret   string `json:"secret"`
}

type EventsubSubscriptionTransport struct {
	Method   string `json:"method"`
	Callback string `json:"callback"`
}

type EventsubSubscription struct {
	ID        string                        `json:"id"`
	Status    string                        `json:"status"`
	Type      string                        `json:"type"`
	Transport EventsubSubscriptionTransport `json:"transport"`
}
