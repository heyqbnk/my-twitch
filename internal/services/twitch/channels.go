package twitch

import (
	"context"
	"errors"
	"fmt"

	"github.com/qbnk/twitch-announcer/pkg/twitch/helix"

	"github.com/qbnk/twitch-announcer/internal/models"
)

// GetChannel returns information about specified Twitch channel by its
// identifier.
func (s *Service) GetChannel(ctx context.Context, channelID int) (helix.Channel, error) {
	accessToken, err := s.getAccessToken(ctx)
	if err != nil {
		return helix.Channel{}, fmt.Errorf("%w: %v", models.ErrNoAccessToken, err)
	}

	channel, err := withAuthRetry[helix.Channel](
		ctx, s, func(ctx context.Context) (helix.Channel, error) {
			return s.api.GetChannel(ctx, accessToken, channelID)
		},
	)
	if err != nil {
		return helix.Channel{}, fmt.Errorf("get channel from API: %v", err)
	}

	return channel, nil
}

// Attempts to call specified function. In case, it returns
// helix.ErrNotAuthorized, it refreshes specified service access token and
// calls passed function again.
func withAuthRetry[T interface{}](
	ctx context.Context,
	s *Service,
	f func(ctx context.Context) (T, error),
) (T, error) {
	res, err := f(ctx)
	if err != nil {
		if !errors.Is(err, helix.ErrNotAuthorized) {
			return res, err
		}

		if s.renewAccessToken(ctx) == nil {
			return f(ctx)
		}

		return res, err
	}

	return res, nil
}
