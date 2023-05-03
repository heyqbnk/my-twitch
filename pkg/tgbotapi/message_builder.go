package tgbotapi

import (
	"strings"

	tgbotapiobject "github.com/qbnk/twitch-announcer/pkg/tgbotapi/object"
)

// Represents builder used to create message texts.
type messageBuilder struct {
	text     string
	entities []tgbotapiobject.MessageEntity
}

// Bold appends bold text.
func (b *messageBuilder) Bold(texts ...string) *messageBuilder {
	for _, text := range texts {
		b.entities = append(b.entities, tgbotapiobject.MessageEntity{
			Type:   tgbotapiobject.MessageEntityTypeBold,
			Offset: b.offset(),
			Length: utf16length(text),
		})
		b.Text(text)
	}

	return b
}

// NewLine appends new line.
func (b *messageBuilder) NewLine() *messageBuilder {
	return b.Text("\n")
}

// Text appends usual text.
func (b *messageBuilder) Text(text ...string) *messageBuilder {
	b.text += strings.Join(text, "")
	return b
}

// URL appends link.
func (b *messageBuilder) URL(urls ...string) *messageBuilder {
	for _, url := range urls {
		b.entities = append(b.entities, tgbotapiobject.MessageEntity{
			Type:   tgbotapiobject.MessageEntityTypeURL,
			Offset: b.offset(),
			Length: utf16length(url),
		})
		b.Text(url)
	}

	return b
}

func (b *messageBuilder) offset() int {
	return utf16length(b.text)
}

// Returns utf-16 text length.
// Reference: https://core.telegram.org/api/entities#computing-entity-length
func utf16length(text string) (length int) {
	// Pseudocode:
	// length := 0
	// for byte in text {
	//    if (byte & 0xc0) != 0x80 {
	//        length += 1 + (byte >= 0xf0)
	//    }
	// }

	for i := 0; i < len(text); i++ {
		b := text[i]

		if (b & 0xc0) != 0x80 {
			length += 1

			if b >= 0xf0 {
				length++
			}
		}
	}

	return length
}
