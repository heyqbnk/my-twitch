package tgbotapi

import (
	"context"

	object "github.com/qbnk/twitch-announcer/pkg/tgbotapi/object"
	"github.com/qbnk/twitch-announcer/pkg/tgbotapi/shapes"
)

// Reference: https://core.telegram.org/bots/api#getme

// GetMe returns information about current bot.
func (b *Bot) GetMe(ctx context.Context) (object.User, error) {
	var res object.User
	if err := b.request(ctx, "getMe", shapes.Object{}, &res); err != nil {
		return object.User{}, err
	}
	return res, nil
}
