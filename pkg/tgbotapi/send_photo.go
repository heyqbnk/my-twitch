package tgbotapi

import (
	"context"
	"fmt"

	tgbotapiobject "github.com/qbnk/twitch-announcer/pkg/tgbotapi/object"
)

// Reference: https://core.telegram.org/bots/api#sendphoto

type SendPhotoOptions struct {
	// Unique identifier for the target chat or username of the target
	// channel (in the format @channelusername)
	ChatID tgbotapiobject.ChatID `json:"chat_id"`

	// Photo caption (may also be used when resending photos by file_id),
	// 0-1024 characters after entities parsing.
	Caption string `json:"caption,omitempty"`

	// A JSON-serialized list of special entities that appear in the caption,
	// which can be specified instead of parse_mode
	CaptionEntities []tgbotapiobject.MessageEntity `json:"caption_entities,omitempty"`

	// Mode for parsing entities in the photo caption. See formatting options
	// for more details.
	ParseMode tgbotapiobject.ParseMode `json:"parse_mode,omitempty"`

	// Photo to send. Pass a file_id as String to send a photo that exists
	// on the Telegram servers (recommended), pass an HTTP URL as a String
	// for Telegram to get a photo from the Internet, or upload a new photo
	// using multipart/form-data. The photo must be at most 10 MB in size.
	// The photo's width and height must not exceed 10000 in total. Width and
	// height ratio must be at most 20.
	Photo string `json:"photo"`
}

type SendPhotoResult = tgbotapiobject.Message

// SendPhoto sends a new photo.
func (b *Bot) SendPhoto(ctx context.Context, options SendPhotoOptions) (SendPhotoResult, error) {
	var data SendPhotoResult
	if err := b.request(ctx, "sendPhoto", options, &data); err != nil {
		return SendPhotoResult{}, fmt.Errorf("send request: %w", err)
	}

	return data, nil
}
