package object

const (
	// MessageEntityTypeBold bold text.
	MessageEntityTypeBold MessageEntityType = "bold"

	// MessageEntityTypeBotCommand "/start@jobs_bot".
	MessageEntityTypeBotCommand MessageEntityType = "bot_command"

	// MessageEntityTypeCashtag "$USD".
	MessageEntityTypeCashtag MessageEntityType = "cashtag"

	// MessageEntityTypeCode monowidth string.
	MessageEntityTypeCode MessageEntityType = "code"

	// MessageEntityTypeCustomEmoji for inline custom emoji stickers.
	MessageEntityTypeCustomEmoji MessageEntityType = "custom_emoji"

	// MessageEntityTypeEmail "do-not-reply@telegram.org".
	MessageEntityTypeEmail MessageEntityType = "email"

	// MessageEntityTypeHashtag "#hashtag".
	MessageEntityTypeHashtag MessageEntityType = "hashtag"

	// MessageEntityTypeItalic italic text.
	MessageEntityTypeItalic MessageEntityType = "italic"

	// MessageEntityTypeMention "@username".
	MessageEntityTypeMention MessageEntityType = "mention"

	// MessageEntityTypePhoneNumber "+1-212-555-0123".
	MessageEntityTypePhoneNumber MessageEntityType = "phone_number"

	// MessageEntityTypePre monowidth block.
	MessageEntityTypePre MessageEntityType = "pre"

	// MessageEntityTypeStrikethrough strikethrough text.
	MessageEntityTypeStrikethrough MessageEntityType = "strikethrough"

	// MessageEntityTypeSpoiler spoiler message.
	MessageEntityTypeSpoiler MessageEntityType = "spoiler"

	// MessageEntityTypeTextLink for clickable text URLs.
	MessageEntityTypeTextLink MessageEntityType = "text_link"

	// MessageEntityTypeTextMention for users without usernames.
	MessageEntityTypeTextMention MessageEntityType = "text_mention"

	// MessageEntityTypeURL "https://telegram.org".
	MessageEntityTypeURL MessageEntityType = "url"

	// MessageEntityTypeUnderline underlined text.
	MessageEntityTypeUnderline MessageEntityType = "underline"
)

type MessageEntityType string

func (t MessageEntityType) String() string {
	return string(t)
}
