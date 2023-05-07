package messagebuilder

import (
	"github.com/qbnk/twitch-announcer/pkg/tgbotapi/object"
)

type addOption = func(entity *object.MessageEntity)

type Builder struct {
	text     string
	entities []object.MessageEntity
}

func (b *Builder) Entities() []object.MessageEntity {
	entities := make([]object.MessageEntity, len(b.entities))
	copy(entities, b.entities)

	return entities
}

// Reset drops current Builder state.
func (b *Builder) Reset() *Builder {
	b.text = ""
	b.entities = nil
	return b
}

// Text returns current text.
func (b *Builder) Text() string {
	return b.text
}

func (b *Builder) offset() int {
	return utf16length(b.text)
}

// Returns utf-16 text length.
//
// Pseudocode:
// length := 0
//
//	for byte in text {
//	   if (byte & 0xc0) != 0x80 {
//	       length += 1 + (byte >= 0xf0)
//	   }
//	}
//
// Reference: https://core.telegram.org/api/entities#computing-entity-length
func utf16length(text string) (length int) {
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
