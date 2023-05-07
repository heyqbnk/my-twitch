package telegram

import (
	"context"
	"fmt"
	"time"

	"github.com/qbnk/twitch-announcer/pkg/tgbotapi"
	"github.com/qbnk/twitch-announcer/pkg/tgbotapi/object"
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
	channel, streamTitle, gameName string,
) error {
	options := tgbotapi.NewSendMessageOptions(object.ChatIDInt64(chatID), "")

	options.TextBuilder().
		Add("Трансляция запущена!").AddNewLines(2).
		AddBold(streamTitle).AddNewLines(2).
		Add("— ", gameName).AddNewLine().
		Add("— ").AddURL(fmt.Sprintf("twitch.tv/%s", channel))

	if _, err := s.tgbot.SendMessage(ctx, options); err != nil {
		return fmt.Errorf("send message via Telegram: %v", err)
	}

	return nil
}
