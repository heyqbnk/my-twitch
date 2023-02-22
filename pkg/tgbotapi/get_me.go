package tgbotapi

import (
	"context"

	tgbotapiobject "github.com/qbnk/twitch-announcer/pkg/tgbotapi/object"
)

// Reference: https://core.telegram.org/bots/api#getme

// GetMe returns information about current bot.
func (b *Bot) GetMe(ctx context.Context) (tgbotapiobject.User, error) {
	var res tgbotapiobject.User
	if err := b.request(ctx, "getMe", nil, &res); err != nil {
		return tgbotapiobject.User{}, err
	}
	return res, nil
}
