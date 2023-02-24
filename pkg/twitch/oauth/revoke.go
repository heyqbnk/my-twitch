package oauth

import (
	"context"
	"net/url"
)

// RevokeAccessToken revokes specified access token.
func (a *API) RevokeAccessToken(ctx context.Context, accessToken string) error {
	params := url.Values{}
	params.Set("client_id", a.clientID)
	params.Set("token", accessToken)

	return a.request(ctx, "revoke", params, nil)
}
