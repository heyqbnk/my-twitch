package tgbotapi

import (
	"context"

	"github.com/qbnk/twitch-announcer/pkg/tgbotapi/message-builder"
	object "github.com/qbnk/twitch-announcer/pkg/tgbotapi/object"
	"github.com/qbnk/twitch-announcer/pkg/tgbotapi/shapes"
)

// Reference: https://core.telegram.org/bots/api#sendmessage

type SendMessageOptions struct {
	shape shapes.Object

	chatID object.ChatID
	text   messagebuilder.Builder

	// // Unique identifier for the target message thread (topic) of the forum;
	// // for forum supergroups only.
	// MessageThreadID int `json:"message_thread_id,omitempty"`
	//
	// // Mode for parsing entities in the message text.
	// ParseMode string `json:"parse_mode,omitempty"`
	//
	// // Disables link previews for links in this message.
	// DisableWebPagePreview bool `json:"disable_web_page_preview,omitempty"`
	//
	// // Sends the message silently. Users will receive a notification with no
	// // sound.
	// DisableNotification bool `json:"disable_notification,omitempty"`
	//
	// // Protects the contents of the sent message from forwarding and saving.
	// ProtectContent bool `json:"protect_content,omitempty"`
	//
	// // If the message is a reply, ID of the original message.
	// ReplyToMessageID int `json:"reply_to_message_id,omitempty"`
	//
	// // Pass True if the message should be sent even if the specified replied-to
	// // message is not found.
	// AllowSendingWithoutReply bool `json:"allow_sending_without_reply,omitempty"`
	//
	// // Additional interface options. A JSON-serialized object for an inline
	// // keyboard, custom reply keyboard, instructions to remove reply keyboard
	// // or to force a reply from the user.
	// ReplyMarkup interface{} `json:"reply_markup,omitempty"`
}

func NewSendMessageOptions(chatID object.ChatID, text string) SendMessageOptions {
	options := SendMessageOptions{
		shape: shapes.Object{},
		text:  messagebuilder.Builder{},
	}
	options.SetChatID(chatID)
	options.TextBuilder().Add(text)

	return options
}

func (o *SendMessageOptions) Shape() shapes.Object {
	var entities shapes.Array
	for _, ent := range o.text.Entities() {
		entities.Object(ent.Shape())
	}

	o.shape.String("text", o.Text())
	o.shape.Array("entities", entities)

	return o.shape
}

// ChatID returns the unique identifier for the target chat or username of the
// target channel (in the format @channelusername).
func (o *SendMessageOptions) ChatID() object.ChatID {
	return o.chatID
}

func (o *SendMessageOptions) SetChatID(chatID object.ChatID) *SendMessageOptions {
	object.ChatIDToShape("chat_id", &o.shape, chatID)
	o.chatID = chatID
	return o
}

func (o *SendMessageOptions) SetText(text string) *SendMessageOptions {
	o.text.Reset().Add(text)
	return o
}

// Text of the message to be sent, 1-4096 characters after entities parsing.
func (o *SendMessageOptions) Text() string {
	return o.text.Text()
}

func (o *SendMessageOptions) TextBuilder() *messagebuilder.Builder {
	return &o.text
}

// SendMessage sends new message.
func (b *Bot) SendMessage(ctx context.Context, options SendMessageOptions) (object.Message, error) {
	var data object.Message
	if err := b.request(ctx, "sendMessage", options.Shape(), &data); err != nil {
		return object.Message{}, err
	}

	return data, nil
}
