package telegram

import (
	"context"
	"fmt"
	"io"
	"net/http"
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
	streamTitle, gameName, thumbnailURL string,
) error {
	thumbnailBytes, err := downloadFile(thumbnailURL)
	if err != nil {
		return fmt.Errorf("download file: %w", err)
	}

	options := tgbotapi.BeginSendPhotoOptions(
		tgbotapiobject.ChatIDInt64(chatID), tgbotapiobject.InputFileFromData(thumbnailBytes),
	)

	options.Caption.
		Bold(streamTitle).
		NewLine().
		NewLine().
		Text("— ", gameName).
		NewLine().
		Text("— ").URL("twitch.tv/qbnk")

	if _, err = s.tgbot.SendPhoto(ctx, options.Build()); err != nil {
		return fmt.Errorf("send photo via API: %v", err)
	}

	return nil
}

func downloadFile(url string) ([]byte, error) {
	response, err := http.Get(url)
	if err != nil {
		return nil, fmt.Errorf("get file: %w", err)
	}

	defer response.Body.Close()

	content, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, fmt.Errorf("read response content: %w", err)
	}

	return content, nil
}
