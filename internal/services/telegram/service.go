package telegram

import (
	"context"
	"fmt"
	"time"

	"github.com/qbnk/twitch-announcer/pkg/tgbotapi"
	tgbotapiobject "github.com/qbnk/twitch-announcer/pkg/tgbotapi/object"
)

type Service struct {
	tgbot *tgbotapi.Bot
}

func New(secretToken string) *Service {
	// TODO: Check Telegram Bot API rps.
	return &Service{tgbot: tgbotapi.New(secretToken, 10*time.Second, 3)}
}

// SendStreamStartedMessage sends a message to a chat notifying about
// the stream has started.
func (s *Service) SendStreamStartedMessage(
	ctx context.Context,
	chatID int64,
	streamTitle, gameName string, thumbnailURL string,
) error {
	// _, err := s.tgbot.SendPhoto(ctx, tgbotapi.
	// 	NewSendMessageBuilder().
	// 	SetChatID(chatID).
	// 	// AddStyledText(
	// 	// 	"Это сообщение из нашего ультра мега нового, супер молодежного анонсера.",
	// 	// 	tgbotapiobject.MessageEntityTypeItalic,
	// 	// ).
	// 	AddText(streamTitle).
	// 	AddText("\ntwitch.tv/qbnk").
	// 	Build())

	options := tgbotapi.NewSendPhotoBuilder(tgbotapiobject.NewIntChatID(chatID), thumbnailURL)

	// Configure caption.
	options.Caption.
		Bold(streamTitle).
		NewLine().
		NewLine().
		Text("— ", gameName).
		NewLine().
		Text("— ").URL("twitch.tv/qbnk")

	_, err := s.tgbot.SendPhoto(ctx, options.Build())
	if err != nil {
		return fmt.Errorf("send photo via API: %v", err)
	}

	return nil
}
