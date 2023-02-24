package twitch

import (
	"context"
	"fmt"
	"time"

	"github.com/qbnk/twitch-announcer/pkg/twitch/helix"
	"github.com/qbnk/twitch-announcer/pkg/twitch/oauth"
)

type Service struct {
	accessToken          string
	accessTokenExpiresAt time.Time
	api                  *helix.API
	oauth                *oauth.API
	webhookSecret        string
}

func New(webhookSecret, clientID, clientSecret string) *Service {
	return &Service{
		api:           helix.New(clientID),
		oauth:         oauth.New(clientID, clientSecret),
		webhookSecret: webhookSecret,
	}
}

// Returns fresh access token to perform requests to Twitch API.
func (s *Service) getAccessToken(ctx context.Context) (string, error) {
	if len(s.accessToken) == 0 || time.Now().After(s.accessTokenExpiresAt) {
		authResult, err := s.oauth.AuthenticateApp(ctx)
		if err != nil {
			return "", fmt.Errorf("authenticate via API: %w", err)
		}

		s.accessToken = authResult.AccessToken
		s.accessTokenExpiresAt = time.Now().Add(time.Duration(authResult.ExpiresIn) * time.Second)
	}

	return s.accessToken, nil
}
