package webhookcallback

import (
	"context"

	"github.com/qbnk/twitch-announcer/pkg/twitch/helix"
)

type Twitch interface {
	GetStream(ctx context.Context, channelID string) (helix.Stream, error)
	ValidateWebhookSignature(messageID, messageTimestamp, body, signature string) bool
}

type Telegram interface {
	SendStreamStartedMessage(ctx context.Context, chatID int64, streamTitle, gameName, thumbnailURL string) error
}
