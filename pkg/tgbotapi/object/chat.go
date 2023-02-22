package tgbotapiobject

// Reference: https://core.telegram.org/bots/api#chat

const (
	ChatTypePrivate    ChatType = "private"
	ChatTypeGroup      ChatType = "group"
	ChatTypeSupergroup ChatType = "supergroup"
	ChatTypeChannel    ChatType = "channel"
)

type ChatType string

// String returns string representation of value.
func (t ChatType) String() string {
	return string(t)
}

// Known returns true in case, current value is known.
func (t ChatType) Known() bool {
	switch t {
	case ChatTypeGroup, ChatTypeSupergroup, ChatTypePrivate, ChatTypeChannel:
		return true
	default:
		return false
	}
}

type Chat struct {
	// Unique identifier for this chat.
	ID int `json:"id"`

	// Type of chat.
	Type ChatType `json:"type"`

	// Optional. Title, for supergroups, channels and group chats.
	Title string `json:"title,omitempty"`

	// Optional. Username, for private chats, supergroups and channels if
	// available.
	Username string `json:"username,omitempty"`

	// Optional. First name of the other party in a private chat.
	FirstName string `json:"first_name,omitempty"`

	// Optional. Last name of the other party in a private chat.
	LastName string `json:"last_name,omitempty"`

	// Optional. True, if the supergroup chat is a forum (has topics enabled).
	IsForum bool `json:"is_forum,omitempty"`

	// Optional. Chat photo. Returned only in getChat.
	Photo *ChatPhoto `json:"photo,omitempty"`

	// Optional. If non-empty, the list of all active chat usernames; for
	// private chats, supergroups and channels. Returned only in getChat.
	ActiveUsernames []string `json:"active_usernames,omitempty"`

	// Optional. Custom emoji identifier of emoji status of the other party in
	// a private chat. Returned only in getChat.
	EmojiStatusCustomEmojiID string `json:"emoji_status_custom_emoji_id,omitempty"`

	// Optional. Bio of the other party in a private chat. Returned only in
	// getChat.
	Bio string `json:"bio,omitempty"`

	// Optional. True, if privacy settings of the other party in the private
	// chat allows to use tg://user?id=<user_id> links only in chats with the user. Returned only in getChat.
	HasPrivateForwards bool `json:"has_private_forwards,omitempty"`

	// Optional. True, if the privacy settings of the other party restrict
	// sending voice and video note messages in the private chat. Returned
	// only in getChat.
	HasRestrictedVoiceAndVideoMessages bool `json:"has_restricted_voice_and_video_messages,omitempty"`

	// Optional. True, if users need to join the supergroup before they can
	// send messages. Returned only in getChat.
	JoinToSendMessages bool `json:"join_to_send_messages,omitempty"`

	// Optional. True, if all users directly joining the supergroup need to
	// be approved by supergroup administrators. Returned only in getChat.
	JoinByRequest bool `json:"join_by_request,omitempty"`

	// Optional. Description, for groups, supergroups and channel chats.
	// Returned only in getChat.
	Description string `json:"description,omitempty"`

	// Optional. Primary invite link, for groups, supergroups and channel
	// chats. Returned only in getChat.
	InviteLink string `json:"invite_link,omitempty"`

	// Optional. The most recent pinned message (by sending date). Returned
	// only in getChat.
	PinnedMessage *Message `json:"pinned_message,omitempty"`

	// Optional. Default chat member permissions, for groups and supergroups.
	// Returned only in getChat.
	Permissions *ChatPermissions `json:"permissions,omitempty"`

	// Optional. For supergroups, the minimum allowed delay between consecutive
	// messages sent by each unpriviledged user; in seconds. Returned only in
	// getChat.
	SlowModeDelay int `json:"slow_mode_delay,omitempty"`

	// Optional. The time after which all messages sent to the chat will be
	// automatically deleted; in seconds. Returned only in getChat.
	MessageAutoDeleteTime int `json:"message_auto_delete_time,omitempty"`

	// Optional. True, if messages from the chat can't be forwarded to other
	// chats. Returned only in getChat.
	HasProtectedContent bool `json:"has_protected_content,omitempty"`

	// Optional. For supergroups, name of group sticker set. Returned only in
	// getChat.
	StickerSetName string `json:"sticker_set_name,omitempty"`

	// Optional. True, if the bot can change the group sticker set. Returned
	// only in getChat.
	CanSetStickerSet bool `json:"can_set_sticker_set,omitempty"`

	// Optional. Unique identifier for the linked chat, i.e. the discussion
	// group identifier for a channel and vice versa; for supergroups and
	// channel chats.
	LinkedChatID int `json:"linked_chat_id,omitempty"`

	// Optional. For supergroups, the location to which the supergroup is
	// connected. Returned only in getChat.
	Location *ChatLocation `json:"location,omitempty"`
}
