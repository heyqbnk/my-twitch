package httphandler

import (
	"context"

	"github.com/qbnk/twitch-announcer/internal/logger"
)

type twitch interface {
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
