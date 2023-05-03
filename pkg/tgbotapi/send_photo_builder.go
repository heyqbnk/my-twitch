package tgbotapi

import (
	tgbotapiobject "github.com/qbnk/twitch-announcer/pkg/tgbotapi/object"
)

type SendPhotoBuilder struct {
	options SendPhotoOptions
	Caption messageBuilder
}

func BeginSendPhotoOptions(chatID tgbotapiobject.ChatID, photo tgbotapiobject.InputFile) SendPhotoBuilder {
	return SendPhotoBuilder{
		options: SendPhotoOptions{
			ChatID: chatID,
			Photo:  photo,
		},
		Caption: messageBuilder{},
	}
}

func (b *SendPhotoBuilder) Build() SendPhotoOptions {
	b.options.Caption = b.Caption.text
	b.options.CaptionEntities = make([]tgbotapiobject.MessageEntity, len(b.Caption.entities))

	copy(b.options.CaptionEntities, b.Caption.entities)

	return b.options
}
