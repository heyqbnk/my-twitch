package twitch

import (
	"context"
	"errors"

	"github.com/qbnk/twitch-announcer/pkg/twitch/helix"
)

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
