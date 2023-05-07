package tgbotapi

import (
	"context"

	object "github.com/qbnk/twitch-announcer/pkg/tgbotapi/object"
	"github.com/qbnk/twitch-announcer/pkg/tgbotapi/shapes"
)

// Reference: https://core.telegram.org/bots/api#getchatmenubutton

// GetChatMenuButton returns specified by chat identifier chat's menu button.
func (b *Bot) GetChatMenuButton(ctx context.Context, chatID int) (object.MenuButton, error) {
	params := shapes.Object{}
	if chatID != 0 {
		params.Int("chat_id", chatID)
	}

	var data object.MenuButton
	if err := b.request(ctx, "getChatMenuButton", params, &data); err != nil {
		return object.MenuButton{}, err
	}
	return data, nil
}
