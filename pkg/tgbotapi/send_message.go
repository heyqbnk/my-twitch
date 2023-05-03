package tgbotapi

// Reference: https://core.telegram.org/bots/api#sendmessage

// type SendMessageOptions struct {
// 	// Unique identifier for the target chat or username of the target
// 	// channel (in the format @channelusername)
// 	ChatID interface{} `json:"chat_id"`
//
// 	// Unique identifier for the target message thread (topic) of the forum;
// 	// for forum supergroups only.
// 	MessageThreadID int `json:"message_thread_id,omitempty"`
//
// 	// Text of the message to be sent, 1-4096 characters after entities parsing.
// 	Text string `json:"text"`
//
// 	// Mode for parsing entities in the message text.
// 	ParseMode string `json:"parse_mode,omitempty"`
//
// 	// A JSON-serialized list of special entities that appear in message text,
// 	// which can be specified instead of parse_mode.
// 	Entities []tgbotapiobject.MessageEntity `json:"entities,omitempty"`
//
// 	// Disables link previews for links in this message.
// 	DisableWebPagePreview bool `json:"disable_web_page_preview,omitempty"`
//
// 	// Sends the message silently. Users will receive a notification with no
// 	// sound.
// 	DisableNotification bool `json:"disable_notification,omitempty"`
//
// 	// Protects the contents of the sent message from forwarding and saving.
// 	ProtectContent bool `json:"protect_content,omitempty"`
//
// 	// If the message is a reply, ID of the original message.
// 	ReplyToMessageID int `json:"reply_to_message_id,omitempty"`
//
// 	// Pass True if the message should be sent even if the specified replied-to
// 	// message is not found.
// 	AllowSendingWithoutReply bool `json:"allow_sending_without_reply,omitempty"`
//
// 	// Additional interface options. A JSON-serialized object for an inline
// 	// keyboard, custom reply keyboard, instructions to remove reply keyboard
// 	// or to force a reply from the user.
// 	ReplyMarkup interface{} `json:"reply_markup,omitempty"`
// }
//
// type SendMessageResult = tgbotapiobject.Message
//
// // SendMessage sends new message.
// func (b *Bot) SendMessage(ctx context.Context, options SendMessageOptions) (SendMessageResult, error) {
// 	var data SendMessageResult
// 	if err := b.request(ctx, "sendMessage", options, &data); err != nil {
// 		return SendMessageResult{}, err
// 	}
// 	return data, nil
// }
