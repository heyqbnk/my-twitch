package object

import (
	"encoding/json"
	"fmt"

	"github.com/qbnk/twitch-announcer/pkg/tgbotapi/shapes"
)

const (
	_messageEntityFieldCustomEmojiID = "custom_emoji_id"
	_messageEntityFieldType          = "type"
	_messageEntityFieldLanguage      = "language"
	_messageEntityFieldLength        = "length"
	_messageEntityFieldOffset        = "offset"
	_messageEntityFieldURL           = "url"
	_messageEntityFieldUser          = "user"
)

type messageEntityJson struct {
	// For type "custom_emoji" only, unique identifier of the custom emoji. Use
	// getCustomEmojiStickers to get full information about the sticker.
	CustomEmojiID string            `json:"custom_emoji_id"`
	Type          MessageEntityType `json:"type"`
	// For type "pre" type only, the programming language of the entity text.
	Language string `json:"language"`
	Length   int    `json:"length"`
	Offset   int    `json:"offset"`
	// For type "text_link" only, URL that will be opened after user taps on the
	// text.
	URL string `json:"url"`
	// For type "text_mention" only, the mentioned user.
	User User `json:"user"`
}

type MessageEntity struct {
	shape shapes.Object
	json  messageEntityJson
}

func NewMessageEntity(entType MessageEntityType, offset, length int) MessageEntity {
	entity := MessageEntity{shape: shapes.Object{}}
	entity.
		SetType(entType).
		SetOffset(offset).
		SetLength(length)

	return entity
}

func (m *MessageEntity) Shape() shapes.Object {
	return m.shape
}

func (m *MessageEntity) SetCustomEmojiID(emojiID string) *MessageEntity {
	m.shape.String(_messageEntityFieldCustomEmojiID, emojiID)
	m.json.CustomEmojiID = emojiID
	return m
}

func (m *MessageEntity) SetLanguage(language string) *MessageEntity {
	m.shape.String(_messageEntityFieldLanguage, language)
	m.json.Language = language
	return m
}

func (m *MessageEntity) SetLength(length int) *MessageEntity {
	m.shape.Int(_messageEntityFieldLength, length)
	m.json.Length = length
	return m
}

func (m *MessageEntity) SetOffset(offset int) *MessageEntity {
	m.shape.Int(_messageEntityFieldOffset, offset)
	m.json.Offset = offset
	return m
}

func (m *MessageEntity) SetType(entType MessageEntityType) *MessageEntity {
	m.shape.String(_messageEntityFieldType, entType.String())
	m.json.Type = entType
	return m
}

func (m *MessageEntity) SetURL(url string) *MessageEntity {
	m.shape.String(_messageEntityFieldURL, url)
	m.json.URL = url
	return m
}

// SetUser sets the user of the entity. For MessageEntityType "text_mention" only,
// the mentioned user.
func (m *MessageEntity) SetUser(user User) *MessageEntity {
	m.shape.Object(_messageEntityFieldUser, user.Shape())
	m.json.User = user
	return m
}

func (m *MessageEntity) CustomEmojiID() string {
	return m.json.CustomEmojiID
}

func (m *MessageEntity) Type() MessageEntityType {
	return m.json.Type
}

func (m *MessageEntity) Language() string {
	return m.json.Language
}

func (m *MessageEntity) Length() int {
	return m.json.Length
}

func (m *MessageEntity) Offset() int {
	return m.json.Offset
}

func (m *MessageEntity) URL() string {
	return m.json.URL
}

func (m *MessageEntity) User() User {
	return m.json.User
}

func (m *MessageEntity) UnmarshalJSON(data []byte) error {
	var j messageEntityJson
	if err := json.Unmarshal(data, &j); err != nil {
		return fmt.Errorf("unmarshal json: %w", err)
	}

	// Set common properties.
	m.SetType(j.Type).SetOffset(j.Offset).SetLength(j.Length)

	// Set specific properties.
	switch j.Type {
	case MessageEntityTypeCustomEmoji:
		m.SetCustomEmojiID(j.CustomEmojiID)
	case MessageEntityTypePre:
		m.SetLanguage(j.Language)
	case MessageEntityTypeTextMention:
		m.SetUser(j.User)
	case MessageEntityTypeTextLink:
		m.SetURL(j.URL)
	}

	return nil
}
