package object

type Update struct {
	// Optional. NewMessageEntity incoming channel post of any kind - text, photo,
	// sticker, etc.
	ChannelPost *Message `json:"channel_post,omitempty"`

	// Optional. The result of an inline query that was chosen by a user and
	// sent to their chat partner. Please see our documentation on the feedback
	// collecting for details on how to enable these updates for your bot.
	ChosenInlineResult *ChosenInlineResult `json:"chosen_inline_result,omitempty"`

	// Optional. A chat member's status was updated in a chat. The bot must
	// be an administrator in the chat and must explicitly specify
	// "chat_member" in the list of allowed_updates to receive these updates.
	ChatMember *ChatMemberUpdated `json:"chat_member,omitempty"`

	// Optional. A request to join the chat has been sent. The bot must
	// have the can_invite_users administrator right in the chat to receive
	// these updates.
	ChatJoinRequest *ChatJoinRequest `json:"chat_join_request,omitempty"`

	// Optional. NewMessageEntity incoming callback query.
	CallbackQuery *CallbackQuery `json:"callback_query,omitempty"`

	// Optional. NewMessageEntity version of a message that is known to the bot and was
	// edited.
	EditedMessage *Message `json:"edited_message,omitempty"`

	// Optional. NewMessageEntity version of a channel post that is known to the bot and
	// was edited.
	EditedChannelPost *Message `json:"edited_channel_post,omitempty"`

	// Optional. NewMessageEntity incoming inline query.
	InlineQuery *InlineQuery `json:"inline_query,omitempty"`

	// Optional. NewMessageEntity incoming message of any kind - text, photo, sticker, etc.
	Message *Message `json:"message,omitempty"`

	// Optional. The bot's chat member status was updated in a chat. For
	// private chats, this update is received only when the bot is blocked
	// or unblocked by the user.
	MyChatMember *ChatMemberUpdated `json:"my_chat_member,omitempty"`

	// Optional. NewMessageEntity incoming pre-checkout query. Contains full information
	// about checkout.
	PreCheckoutQuery *PreCheckoutQuery `json:"pre_checkout_query,omitempty"`

	// Optional. NewMessageEntity poll state. Bots receive only updates about stopped
	// polls and polls, which are sent by the bot.
	Poll *Poll `json:"poll,omitempty"`

	// Optional. A user changed their answer in a non-anonymous poll. Bots
	// receive new votes only in polls that were sent by the bot itself.
	PollAnswer *PollAnswer `json:"poll_answer,omitempty"`

	// Optional. NewMessageEntity incoming shipping query. Only for invoices with flexible
	// price.
	ShippingQuery *ShippingQuery `json:"shipping_query,omitempty"`

	// The update's unique identifier. Update identifiers start from a certain
	// positive number and increase sequentially. This ID becomes especially
	// handy if you're using webhooks, since it allows you to ignore repeated
	// updates or to restore the correct update sequence, should they get out
	// of order. If there are no new updates for at least a week, then
	// identifier of the next update will be chosen randomly instead of
	// sequentially.
	UpdateID int `json:"update_id"`
}
