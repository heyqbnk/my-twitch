package oauth

import (
	"context"
	"fmt"
	"net/url"
)

type AppAuthResult struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

// AuthenticateApp authenticates application by its credentials in Twitch.
// Returns authentication result.
func (a *API) AuthenticateApp(ctx context.Context) (AppAuthResult, error) {
	var res AppAuthResult
	params := url.Values{}
	params.Set("client_id", a.clientID)
	params.Set("client_secret", a.clientSecret)
	params.Set("grant_type", "client_credentials")

	if err := a.request(ctx, "token", params, &res); err != nil {
		return AppAuthResult{}, fmt.Errorf("send request to API: %w", err)
	}

	return res, nil
}
