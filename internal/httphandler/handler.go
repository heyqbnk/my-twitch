package httphandler

import (
	"context"

	"github.com/qbnk/twitch-announcer/internal/logger"
	"github.com/qbnk/twitch-announcer/pkg/twitchapi"
)

type twitch interface {
	GetChannel(ctx context.Context, channelID int) (twitchapi.Channel, error)
	ValidateSignature(messageID, messageTimestamp, body, signature string) bool
}

type telegram interface {
	SendStreamStartedMessage(ctx context.Context, streamTitle string) error
}

type Handler struct {
	twitch   twitch
	telegram telegram
	logger   logger.Logger
}

func New(twitch twitch, telegram telegram, logger logger.Logger) Handler {
	return Handler{
		twitch:   twitch,
		telegram: telegram,
		logger:   logger,
	}
}
