package tgbotapi

import (
	"context"

	tgbotapiobject "github.com/qbnk/twitch-announcer/pkg/tgbotapi/object"
)

// Reference: https://core.telegram.org/bots/api#getchatmenubutton

type getChatMenuButtonOptions struct {
	// Unique identifier for the target private chat. If not specified, default
	// bot's menu button will be returned.
	ChatID int `json:"chat_id,omitempty"`
}

// GetChatMenuButton returns specified by chat identifier chat's menu button.
func (b *Bot) GetChatMenuButton(
	ctx context.Context,
	chatID int,
) (tgbotapiobject.MenuButton, error) {
	var data tgbotapiobject.MenuButton
	err := b.request(
		ctx, "getChatMenuButton", getChatMenuButtonOptions{ChatID: chatID},
		&data,
	)
	if err != nil {
		return tgbotapiobject.MenuButton{}, err
	}
	return data, nil
}
