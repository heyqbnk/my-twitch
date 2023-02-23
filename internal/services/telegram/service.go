package telegram

import (
	"context"
	"fmt"

	"github.com/qbnk/twitch-announcer/pkg/tgbotapi"
)

type Service struct {
	chatID int64
	tgbot  *tgbotapi.Bot
}

func New(secretToken string, chatID int64) Service {
	return Service{chatID: chatID, tgbot: tgbotapi.New(secretToken)}
}

// SendStreamStartedMessage sends a message to a chat notifying about
// the stream was started.
func (s Service) SendStreamStartedMessage(
	ctx context.Context,
	streamTitle string,
) error {
	_, err := s.tgbot.SendMessage(ctx, tgbotapi.
		NewSendMessageBuilder().
		SetChatID(s.chatID).
		// AddStyledText(
		// 	"Это сообщение из нашего ультра мега нового, супер молодежного анонсера.",
		// 	tgbotapiobject.MessageEntityTypeItalic,
		// ).
		AddText(streamTitle).
		AddText("\ntwitch.tv/qbnk").
		Build())
	if err != nil {
		return fmt.Errorf("send message via API: %v", err)
	}

	return nil
}
