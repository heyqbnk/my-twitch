package tgbotapi

import (
	"strings"

	tgbotapiobject "github.com/qbnk/twitch-announcer/pkg/tgbotapi/object"
)

type sendPhotoCaptionBuilder struct {
	text     string
	entities []tgbotapiobject.MessageEntity
}

func (b *sendPhotoCaptionBuilder) Bold(text string) *sendPhotoCaptionBuilder {
	b.entities = append(b.entities, tgbotapiobject.MessageEntity{
		Type:   tgbotapiobject.MessageEntityTypeBold,
		Offset: len(b.text),
		Length: len(text),
	})
	return b.Text(text)
}

func (b *sendPhotoCaptionBuilder) Text(text ...string) *sendPhotoCaptionBuilder {
	b.text += strings.Join(text, "")
	return b
}

func (b *sendPhotoCaptionBuilder) URL(url string) *sendPhotoCaptionBuilder {
	b.entities = append(b.entities, tgbotapiobject.MessageEntity{
		Type:   tgbotapiobject.MessageEntityTypeURL,
		Offset: len(b.text),
		Length: len(url),
	})
	return b.Text(url)
}

func (b *sendPhotoCaptionBuilder) NewLine() *sendPhotoCaptionBuilder {
	return b.Text("\n")
}

type SendPhotoBuilder struct {
	options SendPhotoOptions
	Caption sendPhotoCaptionBuilder
}

func NewSendPhotoBuilder(chatID tgbotapiobject.ChatID, photo string) SendPhotoBuilder {
	return SendPhotoBuilder{
		options: SendPhotoOptions{
			ChatID: chatID,
			Photo:  photo,
		},
		Caption: sendPhotoCaptionBuilder{},
	}
}

func (b *SendPhotoBuilder) Build() SendPhotoOptions {
	b.options.Caption = b.Caption.text
	b.options.CaptionEntities = b.Caption.entities

	return b.options
}
