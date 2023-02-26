package twitch

import (
	"context"
	"fmt"

	"github.com/qbnk/twitch-announcer/pkg/twitch/helix"

	"github.com/qbnk/twitch-announcer/internal/models"
)

// CreateStreamOnlineSubscription creates new eventsub subscription for
// event "stream.online".
func (s *Service) CreateStreamOnlineSubscription(
	ctx context.Context,
	channelID, callbackURL, secret string,
) error {
	accessToken, err := s.getAccessToken(ctx)
	if err != nil {
		return fmt.Errorf("%w: %v", models.ErrNoAccessToken, err)
	}

	_, err = withAuthRetry[[]helix.EventsubSubscription](
		ctx, s, func(ctx context.Context) ([]helix.EventsubSubscription, error) {
			return s.api.CreateSubscription(
				ctx, accessToken, helix.SubscriptionTypeStreamOnline,
				1, helix.SubscriptionCondition{BroadcasterUserID: channelID},
				helix.SubscriptionWebhookTransport{
					Method:   "webhook",
					Callback: callbackURL,
					Secret:   secret,
				},
			)
		},
	)
	if err != nil {
		return fmt.Errorf("create via API: %v", err)
	}

	return nil
}

// DeleteSubscription deletes eventsub subscription by its identifier.
func (s *Service) DeleteSubscription(ctx context.Context, id string) error {
	accessToken, err := s.getAccessToken(ctx)
	if err != nil {
		return fmt.Errorf("%w: %v", models.ErrNoAccessToken, err)
	}

	_, err = withAuthRetry[any](
		ctx, s, func(ctx context.Context) (any, error) {
			if err := s.api.DeleteSubscription(ctx, accessToken, id); err != nil {
				return nil, err
			}

			return nil, nil
		},
	)
	if err != nil {
		return fmt.Errorf("delete via API: %v", err)
	}

	return nil
}

// GetSubscriptions returns all eventsub subscriptions of current client ID.
func (s *Service) GetSubscriptions(ctx context.Context) ([]helix.EventsubSubscription, error) {
	accessToken, err := s.getAccessToken(ctx)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", models.ErrNoAccessToken, err)
	}

	subs, err := withAuthRetry[[]helix.EventsubSubscription](
		ctx, s, func(ctx context.Context) ([]helix.EventsubSubscription, error) {
			return s.api.GetSubscriptions(ctx, accessToken)
		},
	)
	if err != nil {
		return nil, fmt.Errorf("get eventsubs from API: %v", err)
	}

	return subs, nil
}
