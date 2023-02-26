package httphandler

import (
	"context"

	"github.com/qbnk/twitch-announcer/pkg/twitch/helix"

	"github.com/qbnk/twitch-announcer/internal/logger"
)

type twitch interface {
	GetChannel(ctx context.Context, channelID string) (helix.Channel, error)
	ValidateWebhookSignature(messageID, messageTimestamp, body, signature string) bool
}

type telegram interface {
	SendStreamStartedMessage(ctx context.Context, streamTitle string) error
}

type Handler struct {
	channelID string
	twitch    twitch
	telegram  telegram
	logger    *logger.Logger
}

func New(
	channelID string,
	twitch twitch,
	telegram telegram,
	logger *logger.Logger,
) Handler {
	return Handler{
		channelID: channelID,
		twitch:    twitch,
		telegram:  telegram,
		logger:    logger,
	}
}
