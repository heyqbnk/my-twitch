package twitchapi

import (
	"context"
	"errors"
	"fmt"
	"net/url"
	"time"
)

type AppAccessTokenInfo struct {
	AccessToken string `json:"access_token"`
	ExpiresIn   int    `json:"expires_in"`
}

// Authenticate is helper which retrieves application access token information
// and specifies it in the current API instance.
func (a *API) Authenticate(ctx context.Context) error {
	// Revoke access token in case, it was specified before.
	if len(a.accessToken) > 0 {
		if err := a.RevokeAccessToken(ctx, a.accessToken); err != nil {
			switch {
			case errors.Is(err, ErrAuth400), errors.Is(err, ErrAuth404):
			default:
				return fmt.Errorf("revoke access token: %v", err)
			}
		}
	}

	// Retrieve new access token information.
	accessTokenInfo, err := a.GetAppAccessToken(ctx)
	if err != nil {
		return fmt.Errorf("get app access token: %v", err)
	}

	a.accessToken = accessTokenInfo.AccessToken
	a.accessTokenExpiresAt = time.Now().Add(time.Duration(accessTokenInfo.ExpiresIn) * time.Second)

	return nil
}

// GetAppAccessToken returns information about newly created access token.
func (a *API) GetAppAccessToken(ctx context.Context) (AppAccessTokenInfo, error) {
	var res AppAccessTokenInfo
	params := url.Values{}
	params.Set("client_id", a.clientID)
	params.Set("client_secret", a.clientSecret)
	params.Set("grant_type", "client_credentials")

	if err := a.requestAuth(ctx, "token", params, &res); err != nil {
		return AppAccessTokenInfo{}, fmt.Errorf("send request to API: %v", err)
	}

	return res, nil
}

// RevokeAccessToken revokes specified access token.
func (a *API) RevokeAccessToken(ctx context.Context, accessToken string) error {
	params := url.Values{}
	params.Set("client_id", a.clientID)
	params.Set("token", accessToken)

	if err := a.requestAuth(ctx, "revoke", params, nil); err != nil {
		return fmt.Errorf("send request to API: %w", err)
	}

	return nil
}
