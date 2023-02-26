package helix

import (
	"context"
	"fmt"
	"net/http"
	"net/url"
)

// GetSubscriptions returns list of current client ID subscriptions.
func (a *API) GetSubscriptions(
	ctx context.Context,
	accessToken string,
) ([]EventsubSubscription, error) {
	var res []EventsubSubscription
	err := a.request(ctx, accessToken, http.MethodGet, "eventsub/subscriptions", url.Values{}, nil, &res)
	if err != nil {
		return nil, fmt.Errorf("request error: %w", err)
	}

	return res, nil
}
