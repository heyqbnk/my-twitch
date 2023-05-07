package object

import (
	"time"
)

type CommandParams struct {
	// Command name including slash sign ("/start").
	Name string
	// Argument passed along with command.
	Arg string
}

// NewCommandParams returns new CommandParams.
func NewCommandParams(name, arg string) CommandParams {
	return CommandParams{
		Name: name,
		Arg:  arg,
	}
}

// Message represents a message.
// Reference: https://core.telegram.org/bots/api#message
type Message struct {
	// Unique message identifier inside this chat.
	MessageID int `json:"message_id"`

	// Optional. Unique identifier of a message thread to which the message
	// belongs; for supergroups only.
	MessageThreadID int `json:"message_thread_id,omitempty"`

	// Optional. Sender of the message; empty for messages sent to channels.
	// For backward compatibility, the field contains a fake sender user in
	// non-channel chats, if the message was sent on behalf of a chat.
	From *User `json:"from,omitempty"`

	// Optional. Sender of the message, sent on behalf of a chat. For example,
	// the channel itself for channel posts, the supergroup itself for messages
	// from anonymous group administrators, the linked channel for messages
	// automatically forwarded to the discussion group. For backward
	// compatibility, the field from contains a fake sender user in
	// non-channel chats, if the message was sent on behalf of a chat.
	SenderChat *Chat `json:"sender_chat,omitempty"`
	DateRaw    int   `json:"date"`

	// Conversation the message belongs to.
	Chat Chat `json:"chat"`

	// Optional. For forwarded messages, sender of the original message.
	ForwardFrom *User `json:"forward_from,omitempty"`

	// Optional. For messages forwarded from channels or from anonymous
	// administrators, information about the original sender chat.
	ForwardFromChat *Chat `json:"forward_from_chat,omitempty"`

	// Optional. For messages forwarded from channels, identifier of the original
	// message in the channel.
	ForwardFromMessageID int `json:"forward_from_message_id,omitempty"`

	// Optional. For forwarded messages that were originally sent in channels
	// or by an anonymous chat administrator, signature of the message sender
	// if present.
	ForwardSignature string `json:"forward_signature,omitempty"`

	// Optional. Sender's name for messages forwarded from users who disallow
	// adding a link to their account in forwarded messages.
	ForwardSenderName string `json:"forward_sender_name,omitempty"`
	ForwardDateRaw    int    `json:"forward_date,omitempty"`

	// Optional. True, if the message is sent to a forum topic.
	IsTopicMessage bool `json:"is_topic_message,omitempty"`

	// Optional. True, if the message is a channel post that was automatically
	// forwarded to the connected discussion group.
	IsAutomaticForward bool `json:"is_automatic_forward,omitempty"`

	// Optional. For replies, the original message. Note that the Message
	// object in this field will not contain further reply_to_message fields
	// even if it itself is a reply.
	ReplyToMessage *Message `json:"reply_to_message,omitempty"`

	// Optional. Bot through which the message was sent.
	ViaBot      *User `json:"via_bot,omitempty"`
	EditDateRaw int   `json:"edit_date,omitempty"`

	// Optional. True, if the message can't be forwarded.
	HasProtectedContent bool `json:"has_protected_content,omitempty"`

	// Optional. The unique identifier of a media message group this message
	// belongs to.
	MediaGroupID string `json:"media_group_id,omitempty"`

	// Optional. Signature of the post author for messages in channels, or
	// the custom title of an anonymous group administrator.
	AuthorSignature string `json:"author_signature,omitempty"`

	// Optional. For text messages, the actual UTF-8 text of the message.
	Text string `json:"text,omitempty"`

	// Optional. For text messages, special entities like usernames, URLs,
	// bot commands, etc. that appear in the text.
	Entities []MessageEntity `json:"entities,omitempty"`

	// Optional. Message is an animation, information about the animation.
	// For backward compatibility, when this field is set, the document field
	// will also be set.
	Animation *Animation `json:"animation,omitempty"`

	// Optional. Message is an audio file, information about the file.
	Audio *Audio `json:"audio,omitempty"`

	// Optional. Message is a general file, information about the file.
	Document *Document `json:"document,omitempty"`

	// Optional. Message is a photo, available sizes of the photo.
	Photo []PhotoSize `json:"photo,omitempty"`

	// Optional. Message is a sticker, information about the sticker.
	Sticker *Sticker `json:"sticker,omitempty"`

	// Optional. Message is a video, information about the video.
	Video *Video `json:"video,omitempty"`

	// Optional. Message is a video note, information about the video message.
	VideoNote *VideoNote `json:"video_note,omitempty"`

	// Optional. Message is a voice message, information about the file.
	Voice *Voice `json:"voice,omitempty"`

	// Optional. Caption for the animation, audio, document, photo, video or
	// voice.
	Caption string `json:"caption,omitempty"`

	// Optional. For messages with a caption, special entities like usernames,
	// URLs, bot commands, etc. that appear in the caption.
	CaptionEntities []MessageEntity `json:"caption_entities,omitempty"`

	// Optional. Message is a shared contact, information about the contact.
	Contact []Contact `json:"contact,omitempty"`

	// Optional. Message is a dice with random value.
	Dice *Dice `json:"dice,omitempty"`

	// Optional. Message is a game, information about the game.
	Game *Game `json:"game,omitempty"`

	// Optional. Message is a native poll, information about the poll.
	Poll *Poll `json:"poll,omitempty"`

	// Optional. Message is a venue, information about the venue. For backward
	// compatibility, when this field is set, the location field will also be
	// set.
	Venue *Venue `json:"venue,omitempty"`

	// Optional. Message is a shared location, information about the location.
	Location *Location `json:"location,omitempty"`

	// Optional. NewMessageEntity members that were added to the group or supergroup and
	// information about them (the bot itself may be one of these members).
	NewChatMembers []User `json:"new_chat_members,omitempty"`

	// Optional. A member was removed from the group, information about them
	// (this member may be the bot itself).
	LeftChatMember *User `json:"left_chat_member,omitempty"`

	// Optional. A chat title was changed to this value.
	NewChatTitle string `json:"new_chat_title,omitempty"`

	// Optional. A chat photo was change to this value.
	NewChatPhoto []PhotoSize `json:"new_chat_photo,omitempty"`

	// Optional. Service message: the chat photo was deleted.
	DeleteChatPhoto bool `json:"delete_chat_photo,omitempty"`

	// Optional. Service message: the group has been created.
	GroupChatCreated bool `json:"group_chat_created,omitempty"`

	// Optional. Service message: the supergroup has been created. This field
	// can't be received in a message coming through updates, because bot can't be a member of a supergroup when it is created. It can only be found in reply_to_message if someone replies to a very first message in a directly created supergroup.
	SupergroupChatCreated bool `json:"supergroup_chat_created,omitempty"`

	// Optional. Service message: the channel has been created. This field can't
	// be received in a message coming through updates, because bot can't be a
	// member of a channel when it is created. It can only be found in
	// reply_to_message if someone replies to a very first message in a channel.
	ChannelChatCreated bool `json:"channel_chat_created,omitempty"`

	// Optional. Service message: auto-delete timer settings changed in
	// the chat.
	MessageAutoDeleteTimerChanged *MessageAutoDeleteTimerChanged `json:"message_auto_delete_timer_changed,omitempty"`

	// Optional. The group has been migrated to a supergroup with the specified
	// identifier. This number may have more than 32 significant bits and some
	// programming languages may have difficulty/silent defects in interpreting
	// it. But it has at most 52 significant bits, so a signed 64-bit integer
	// or double-precision float type are safe for storing this identifier.
	MigrateToChatID int `json:"migrate_to_chat_id,omitempty"`

	// Optional. The supergroup has been migrated from a group with the
	// specified identifier. This number may have more than 32 significant bits and some programming languages may have difficulty/silent defects in interpreting it. But it has at most 52 significant bits, so a signed 64-bit integer or double-precision float type are safe for storing this identifier.
	MigrateFromChatID int `json:"migrate_from_chat_id,omitempty"`

	// Optional. Specified message was pinned. Note that the Message object in
	// this field will not contain further reply_to_message fields even if it
	// is itself a reply.
	PinnedMessage *Message `json:"pinned_message,omitempty"`

	// Optional. Message is an invoice for a payment, information about the
	// invoice.
	Invoice *Invoice `json:"invoice,omitempty"`

	// Optional. Message is a service message about a successful payment,
	// information about the payment.
	SuccessfulPayment *SuccessfulPayment `json:"successful_payment,omitempty"`

	// Optional. The domain name of the website on which the user has logged in.
	ConnectedWebsite string `json:"connected_website,omitempty"`

	// Optional. Telegram Passport data.
	PassportData *PassportData `json:"passport_data,omitempty"`

	// Optional. Service message. A user in the chat triggered another user's
	// proximity alert while sharing Live Location.
	ProximityAlertTriggered *ProximityAlertTriggered `json:"proximity_alert_triggered,omitempty"`

	// Optional. Service message: forum topic created.
	ForumTopicCreated *ForumTopicCreated `json:"forum_topic_created,omitempty"`

	// Optional. Service message: forum topic closed
	ForumTopicClosed *ForumTopicClosed `json:"forum_topic_closed,omitempty"`

	// Optional. Service message: forum topic reopened
	ForumTopicReopened *ForumTopicReopened `json:"forum_topic_reopened,omitempty"`

	// Optional. Service message: video chat scheduled.
	VideoChatScheduled *VideoChatScheduled `json:"video_chat_scheduled,omitempty"`

	// Optional. Service message: video chat started.
	VideoChatStarted *VideoChatStarted `json:"video_chat_started,omitempty"`

	// Optional. Service message: video chat ended
	VideoChatEnded *VideoChatEnded `json:"video_chat_ended,omitempty"`

	// Optional. Service message: new participants invited to a video chat.
	VideoChatParticipantsInvited *VideoChatParticipantsInvited `json:"video_chat_participants_invited,omitempty"`

	// Optional. Service message: data sent by a Web App.
	WebAppData *WebAppData `json:"web_app_data,omitempty"`

	// Optional. Inline keyboard attached to the message. login_url buttons
	// are represented as ordinary url buttons.
	ReplyMarkup *InlineKeyboardMarkup `json:"reply_markup,omitempty"`
}

// IsCommand returns true in case, current message starts with command.
func (m *Message) IsCommand() bool {
	for _, e := range m.Entities {
		if e.Type() == MessageEntityTypeBotCommand && e.Offset() == 0 {
			return true
		}
	}
	return false
}

// CommandParams returns command parameters in case, current message is command.
// See IsCommand for more.
func (m *Message) CommandParams() (CommandParams, bool) {
	for _, e := range m.Entities {
		if e.Type() == MessageEntityTypeBotCommand && e.Offset() == 0 {
			var (
				commandEndsAt = e.Offset() + e.Length()
				name          = m.Text[e.Offset():commandEndsAt]
				args          = ""
			)

			if commandEndsAt < len(m.Text) {
				args = m.Text[commandEndsAt+1:]
			}
			return NewCommandParams(name, args), true
		}
	}
	return CommandParams{}, false
}

// Date the message was sent in Unix time.
func (m *Message) Date() time.Time {
	return time.Unix(int64(m.DateRaw), 0)
}

// ForwardDate Optional. For forwarded messages, date the original message was
// sent in Unix time.
func (m *Message) ForwardDate() (time.Time, bool) {
	if m.ForwardDateRaw == 0 {
		return time.Time{}, false
	}
	return time.Unix(int64(m.ForwardDateRaw), 0), true
}

// EditDate Optional. Date the message was last edited in Unix time
func (m *Message) EditDate() (time.Time, bool) {
	if m.EditDateRaw == 0 {
		return time.Time{}, false
	}
	return time.Unix(int64(m.EditDateRaw), 0), true
}
