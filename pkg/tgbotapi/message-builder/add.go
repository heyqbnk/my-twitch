package messagebuilder

import (
	"strings"

	"github.com/qbnk/twitch-announcer/pkg/tgbotapi/object"
)

func (b *Builder) AddBold(texts ...string) *Builder {
	b.addEntities(object.MessageEntityTypeBold, texts)
	return b
}

func (b *Builder) AddBotCommand(commands ...string) *Builder {
	b.addEntities(object.MessageEntityTypeBotCommand, commands)
	return b
}

func (b *Builder) AddCashtag(cashtags ...string) *Builder {
	b.addEntities(object.MessageEntityTypeCashtag, cashtags)
	return b
}

func (b *Builder) AddCode(codes ...string) *Builder {
	b.addEntities(object.MessageEntityTypeCode, codes)
	return b
}

func (b *Builder) AddCustomEmoji(emojis ...string) *Builder {
	for _, emoji := range emojis {
		b.addEntity(object.MessageEntityTypeCustomEmoji, emoji, func(entity *object.MessageEntity) {
			entity.SetCustomEmojiID(emoji)
		})
	}
	return b
}

func (b *Builder) AddEmail(emails ...string) *Builder {
	b.addEntities(object.MessageEntityTypeEmail, emails)
	return b
}

func (b *Builder) AddHashtag(hashtags ...string) *Builder {
	b.addEntities(object.MessageEntityTypeHashtag, hashtags)
	return b
}

func (b *Builder) AddItalic(texts ...string) *Builder {
	b.addEntities(object.MessageEntityTypeItalic, texts)
	return b
}

func (b *Builder) AddMention(mentions ...string) *Builder {
	b.addEntities(object.MessageEntityTypeMention, mentions)
	return b
}

func (b *Builder) AddPhoneNumber(phoneNumbers ...string) *Builder {
	b.addEntities(object.MessageEntityTypePhoneNumber, phoneNumbers)
	return b
}

func (b *Builder) AddPre(text, language string) *Builder {
	b.addEntity(object.MessageEntityTypeCode, text, func(entity *object.MessageEntity) {
		entity.SetLanguage(language)
	})
	return b
}

func (b *Builder) AddStrikethrough(texts ...string) *Builder {
	b.addEntities(object.MessageEntityTypeStrikethrough, texts)
	return b
}

func (b *Builder) AddSpoiler(texts ...string) *Builder {
	b.addEntities(object.MessageEntityTypeSpoiler, texts)
	return b
}

func (b *Builder) AddTextLink(text, url string) *Builder {
	b.addEntity(object.MessageEntityTypeTextLink, text, func(entity *object.MessageEntity) {
		entity.SetURL(url)
	})
	return b
}

func (b *Builder) AddTextMention(text string, user object.User) *Builder {
	b.addEntity(object.MessageEntityTypeTextMention, text, func(entity *object.MessageEntity) {
		entity.SetUser(user)
	})
	return b
}

func (b *Builder) AddURL(urls ...string) *Builder {
	b.addEntities(object.MessageEntityTypeURL, urls)
	return b
}

func (b *Builder) AddUnderline(texts ...string) *Builder {
	b.addEntities(object.MessageEntityTypeUnderline, texts)
	return b
}

func (b *Builder) AddNewLine() *Builder {
	return b.Add("\n")
}

func (b *Builder) AddNewLines(count int) *Builder {
	return b.Add(strings.Repeat("\n", count))
}

func (b *Builder) Add(text ...string) *Builder {
	b.text += strings.Join(text, "")
	return b
}

func (b *Builder) addEntity(entType object.MessageEntityType, item string, options ...addOption) {
	entity := object.NewMessageEntity(entType, b.offset(), utf16length(item))

	for _, opt := range options {
		opt(&entity)
	}

	b.entities = append(b.entities, entity)
	b.Add(item)
}

func (b *Builder) addEntities(entType object.MessageEntityType, items []string, options ...addOption) {
	b.addEntity(entType, strings.Join(items, ""), options...)
}
