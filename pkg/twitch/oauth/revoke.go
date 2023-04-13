package oauth

import (
	"context"
	"fmt"
	"net/url"
)

// RevokeAccessToken revokes specified access token.
func (a *API) RevokeAccessToken(ctx context.Context, accessToken string) error {
	params := url.Values{}
	params.Set("client_id", a.clientID)
	params.Set("token", accessToken)

	if err := a.request(ctx, "revoke", params, nil); err != nil {
		return fmt.Errorf("send request to API: %w", err)
	}

	return nil
}
