package object

import "github.com/qbnk/twitch-announcer/pkg/tgbotapi/shapes"

// Reference: https://core.telegram.org/bots/api#user

type User struct {
	shape shapes.Object

	// User's or bot's first name.
	FirstName string `json:"first_name"`

	// Optional. User's or bot's last name.
	LastName string `json:"last_name"`

	// Optional. User's or bot's username.
	Username string `json:"username"`

	// Optional. IETF language tag of the user's language
	// https://en.wikipedia.org/wiki/IETF_language_tag
	LanguageCode string `json:"language_code"`

	// Optional. True, if this user is a Telegram Premium user.
	IsPremium bool `json:"is_premium"`

	// Optional. True, if this user added the bot to the attachment menu.
	AddedToAttachmentMenu bool `json:"added_to_attachment_menu"`

	// Optional. True, if the bot can be invited to groups. Returned only in
	// getMe method.
	CanJoinGroups bool `json:"can_join_groups"`

	// Optional. True, if privacy mode is disabled for the bot. Returned only
	// in getMe method.
	CanReadAllGroupMessages bool `json:"can_read_all_group_messages"`

	// Optional. True, if the bot supports inline queries. Returned only in
	// getMe method.
	SupportsInlineQueries bool `json:"supports_inline_queries"`
}

func NewUser(id int) User {
	user := User{shape: shapes.Object{}}
	user.SetID(id)

	return user
}

func (u *User) SetID(id int) *User {
	u.shape.Int("id", id)
	return u
}

// func (u *User) SetIsBot(isBot bool) *User {
// 	u.shape.Bool("is_bot", isBot)
// 	return u
// }

func (u *User) SetFirstName(firstName string) *User {
	u.shape.String("first_name", firstName)
	return u
}

func (u *User) Shape() shapes.Object {
	return u.shape
}
