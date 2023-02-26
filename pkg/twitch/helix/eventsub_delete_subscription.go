package helix

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
)

// DeleteSubscription deletes eventsub subscription.
func (a *API) DeleteSubscription(
	ctx context.Context,
	accessToken, id string,
) error {
	query := url.Values{}
	query.Set("id", id)

	err := a.request(ctx, accessToken, http.MethodDelete, "eventsub/subscriptions", query, nil, nil)
	if err != nil {
		return fmt.Errorf("request error: %w", err)
	}

	return nil
}
