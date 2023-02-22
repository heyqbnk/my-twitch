package tgbotapiobject

const (
	// MessageEntityTypeMention "@username".
	MessageEntityTypeMention MessageEntityType = "mention"

	// MessageEntityTypeHashtag "#hashtag".
	MessageEntityTypeHashtag MessageEntityType = "hashtag"

	// MessageEntityTypeCashtag "$USD".
	MessageEntityTypeCashtag MessageEntityType = "cashtag"

	// MessageEntityTypeBotCommand "/start@jobs_bot".
	MessageEntityTypeBotCommand MessageEntityType = "bot_command"

	// MessageEntityTypeURL "https://telegram.org".
	MessageEntityTypeURL MessageEntityType = "url"

	// MessageEntityTypeEmail "do-not-reply@telegram.org".
	MessageEntityTypeEmail MessageEntityType = "email"

	// MessageEntityTypePhoneNumber "+1-212-555-0123".
	MessageEntityTypePhoneNumber MessageEntityType = "phone_number"

	// MessageEntityTypeBold bold text.
	MessageEntityTypeBold MessageEntityType = "bold"

	// MessageEntityTypeItalic italic text.
	MessageEntityTypeItalic MessageEntityType = "italic"

	// MessageEntityTypeUnderline underlined text.
	MessageEntityTypeUnderline MessageEntityType = "underline"

	// MessageEntityTypeStrikethrough strikethrough text.
	MessageEntityTypeStrikethrough MessageEntityType = "strikethrough"

	// MessageEntityTypeSpoiler spoiler message.
	MessageEntityTypeSpoiler MessageEntityType = "spoiler"

	// MessageEntityTypeCode monowidth string.
	MessageEntityTypeCode MessageEntityType = "code"

	// MessageEntityTypePre monowidth block.
	MessageEntityTypePre MessageEntityType = "pre"

	// MessageEntityTypeTextLink for clickable text URLs.
	MessageEntityTypeTextLink MessageEntityType = "text_link"

	// MessageEntityTypeTextMention for users without usernames.
	MessageEntityTypeTextMention MessageEntityType = "text_mention"

	// MessageEntityTypeCustomEmoji for inline custom emoji stickers.
	MessageEntityTypeCustomEmoji MessageEntityType = "custom_emoji"
)

type MessageEntityType string

// String returns string representation of message entity type.
func (t MessageEntityType) String() string {
	return string(t)
}

// IsTextStyle returns true in case, current value is text style.
func (t MessageEntityType) IsTextStyle() bool {
	switch t {
	case MessageEntityTypeBold,
		MessageEntityTypeItalic,
		MessageEntityTypeUnderline,
		MessageEntityTypeStrikethrough,
		MessageEntityTypeSpoiler,
		MessageEntityTypeCode:
		return true
	default:
		return false
	}
}

// IsKnown return true in case, current value is known.
func (t MessageEntityType) IsKnown() bool {
	switch t {
	case MessageEntityTypeMention, MessageEntityTypeBold, MessageEntityTypeCode,
		MessageEntityTypeBotCommand, MessageEntityTypeCustomEmoji,
		MessageEntityTypeCashtag, MessageEntityTypeHashtag, MessageEntityTypeURL,
		MessageEntityTypeItalic, MessageEntityTypeEmail,
		MessageEntityTypePhoneNumber, MessageEntityTypeUnderline,
		MessageEntityTypeStrikethrough, MessageEntityTypeSpoiler,
		MessageEntityTypePre, MessageEntityTypeTextLink,
		MessageEntityTypeTextMention:
		return true
	default:
		return false
	}
}

type MessageEntity struct {
	// Type of the entity.
	Type MessageEntityType `json:"type"`

	// Offset in UTF-16 code units to the start of the entity.
	Offset int `json:"offset"`

	// Length of the entity in UTF-16 code units.
	Length int `json:"length"`

	// Optional. For "text_link" only, URL that will be opened after user taps
	// on the text.
	URL string `json:"url,omitempty"`

	// Optional. For "text_mention" only, the mentioned user.
	User *User `json:"user,omitempty"`

	// Optional. For "pre" only, the programming language of the entity text.
	Language string `json:"language,omitempty"`

	// Optional. For "custom_emoji" only, unique identifier of the custom emoji.
	// Use getCustomEmojiStickers to get full information about the sticker.
	CustomEmojiID string `json:"custom_emoji_id,omitempty"`
}

// NewMessageEntityBold creates new MessageEntity of type "bold".
func NewMessageEntityBold(offset, length int) MessageEntity {
	return MessageEntity{
		Type:   MessageEntityTypeBold,
		Offset: offset,
		Length: length,
	}
}
