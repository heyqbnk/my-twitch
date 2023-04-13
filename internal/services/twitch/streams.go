package twitch

import (
	"context"
	"fmt"

	"github.com/qbnk/twitch-announcer/internal/models"
	"github.com/qbnk/twitch-announcer/pkg/twitch/helix"
)

// GetStream returns stream information by user login.
func (s *Service) GetStream(ctx context.Context, login string) (helix.Stream, error) {
	accessToken, err := s.getAccessToken(ctx)
	if err != nil {
		return helix.Stream{}, fmt.Errorf("%w: %v", models.ErrNoAccessToken, err)
	}

	stream, err := withAuthRetry[helix.Stream](
		ctx, s, func(ctx context.Context) (helix.Stream, error) {
			return s.api.GetStream(ctx, accessToken, login)
		},
	)
	if err != nil {
		return helix.Stream{}, fmt.Errorf("get stream from API: %v", err)
	}

	return stream, nil
}
