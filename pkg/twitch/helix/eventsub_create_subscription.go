package helix

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
)

type createSubscriptionParams struct {
	Type      SubscriptionType             `json:"type"`
	Version   int                          `json:"version"`
	Condition SubscriptionCondition        `json:"condition"`
	Transport SubscriptionWebhookTransport `json:"transport"`
}

// CreateSubscription creates new subscription in eventsub.
func (a *API) CreateSubscription(
	ctx context.Context,
	accessToken string,
	subType SubscriptionType,
	version int,
	condition SubscriptionCondition,
	transport SubscriptionWebhookTransport,
) ([]EventsubSubscription, error) {
	var res []EventsubSubscription
	params := createSubscriptionParams{
		Type:      subType,
		Version:   version,
		Condition: condition,
		Transport: transport,
	}

	err := a.request(ctx, accessToken, http.MethodPost, "eventsub/subscriptions", url.Values{}, params, &res)
	if err != nil {
		return nil, fmt.Errorf("request error: %w", err)
	}

	return res, nil
}
