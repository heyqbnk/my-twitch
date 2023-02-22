package tgbotapi

import tgbotapiobject "github.com/qbnk/twitch-announcer/pkg/tgbotapi/object"

type SendMessageBuilder struct {
	o SendMessageOptions
}

func NewSendMessageBuilder() *SendMessageBuilder {
	return &SendMessageBuilder{}
}

// Build returns constructed SendMessageOptions.
func (b *SendMessageBuilder) Build() SendMessageOptions {
	return b.o
}

// AddStyledText adds text of specified style. Allowed "style" values:
// - MessageEntityTypeBold
// - MessageEntityTypeItalic
// - MessageEntityTypeUnderline
// - MessageEntityTypeStrikethrough
// - MessageEntityTypeSpoiler
// - MessageEntityTypeCode
// In case, not allowed value was passed, panic will be called.
func (b *SendMessageBuilder) AddStyledText(
	text string,
	style tgbotapiobject.MessageEntityType,
) *SendMessageBuilder {
	if !style.IsTextStyle() {
		panic("incorrect text style")
	}
	b.o.Entities = append(b.o.Entities, tgbotapiobject.MessageEntity{
		Type:   style,
		Offset: len(b.o.Text),
		Length: len(text),
	})
	return b.AddText(text)
}

// AddText adds new text.
func (b *SendMessageBuilder) AddText(text string) *SendMessageBuilder {
	b.o.Text += text
	return b
}

// SetChatIDByUsername sets chat_id assuming, passed value is user username in
// format like "@username".
func (b *SendMessageBuilder) SetChatIDByUsername(username string) *SendMessageBuilder {
	b.o.ChatID = username
	return b
}

// SetChatID sets chat_id assuming, passed value is chat identifier.
func (b *SendMessageBuilder) SetChatID(id int64) *SendMessageBuilder {
	b.o.ChatID = id
	return b
}

// SetText updates message text. As long as this method fully replaces current
// text, it also removes all entities connected with text styling.
func (b *SendMessageBuilder) SetText(text string) *SendMessageBuilder {
	b.o.Text = text

	ent := make([]tgbotapiobject.MessageEntity, 0, len(b.o.Entities))
	for _, e := range b.o.Entities {
		if !e.Type.IsTextStyle() {
			ent = append(ent, e)
		}
	}
	b.o.Entities = ent
	return b
}

// SetReplyMarkupInlineKeyboardMarkup sets "reply_markup" assuming, passed
// value is InlineKeyboardMarkup.
func (b *SendMessageBuilder) SetReplyMarkupInlineKeyboardMarkup(
	markup tgbotapiobject.InlineKeyboardMarkup,
) *SendMessageBuilder {
	b.o.ReplyMarkup = markup
	return b
}

// SetReplyMarkupReplyKeyboardMarkup sets "reply_markup" assuming, passed
// value is ReplyKeyboardMarkup.
func (b *SendMessageBuilder) SetReplyMarkupReplyKeyboardMarkup(
	markup tgbotapiobject.ReplyKeyboardMarkup,
) *SendMessageBuilder {
	b.o.ReplyMarkup = markup
	return b
}

// SetReplyMarkupReplyKeyboardRemove sets "reply_markup" assuming, passed
// value is ReplyKeyboardRemove.
func (b *SendMessageBuilder) SetReplyMarkupReplyKeyboardRemove(
	markup tgbotapiobject.ReplyKeyboardRemove,
) *SendMessageBuilder {
	b.o.ReplyMarkup = markup
	return b
}

// SetReplyMarkupForceReply sets "reply_markup" assuming, passed value is
// ForceReply.
func (b *SendMessageBuilder) SetReplyMarkupForceReply(
	markup tgbotapiobject.ForceReply,
) *SendMessageBuilder {
	b.o.ReplyMarkup = markup
	return b
}
