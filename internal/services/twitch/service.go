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
	// TODO: Check Oauth and helix rps.
	return &Service{
		api:           helix.New(clientID, 10*time.Second, 3),
		oauth:         oauth.New(clientID, clientSecret, 10*time.Second, 3),
		webhookSecret: webhookSecret,
	}
}

// Returns cached access token to perform requests to Twitch API.
func (s *Service) getAccessToken(ctx context.Context) (string, error) {
	if len(s.accessToken) == 0 || time.Now().After(s.accessTokenExpiresAt) {
		if err := s.renewAccessToken(ctx); err != nil {
			return "", fmt.Errorf("renew access token: %w", err)
		}
	}

	return s.accessToken, nil
}

// Returns fresh access token to perform requests to Twitch API.
func (s *Service) renewAccessToken(ctx context.Context) error {
	authResult, err := s.oauth.AuthenticateApp(ctx)
	if err != nil {
		return fmt.Errorf("authenticate via API: %w", err)
	}

	s.accessToken = authResult.AccessToken
	s.accessTokenExpiresAt = time.Now().Add(time.Duration(authResult.ExpiresIn) * time.Second)

	return nil
}
