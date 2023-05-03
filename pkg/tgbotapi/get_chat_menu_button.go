package tgbotapi

import (
	"context"

	tgbotapiobject "github.com/qbnk/twitch-announcer/pkg/tgbotapi/object"
)

// Reference: https://core.telegram.org/bots/api#getchatmenubutton

// GetChatMenuButton returns specified by chat identifier chat's menu button.
func (b *Bot) GetChatMenuButton(ctx context.Context, chatID int) (tgbotapiobject.MenuButton, error) {
	params := requestParams{}
	params.Int("chat_id", chatID, _reqParamOptionOptional)

	var data tgbotapiobject.MenuButton
	if err := b.request(ctx, "getChatMenuButton", params, &data); err != nil {
		return tgbotapiobject.MenuButton{}, err
	}
	return data, nil
}
