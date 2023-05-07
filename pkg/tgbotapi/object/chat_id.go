package object

import "github.com/qbnk/twitch-announcer/pkg/tgbotapi/shapes"

type ChatID struct {
	id       int64
	username string
}

func (c ChatID) IsEmpty() bool {
	return c.id == 0
}

func (c ChatID) ID() (int64, bool) {
	if c.id == 0 {
		return 0, false
	}

	return c.id, true
}

func (c ChatID) Username() (string, bool) {
	if len(c.username) == 0 {
		return "", false
	}

	return c.username, true
}

// // NewStringChatID returns an instance of ChatID with specified channel. In case,
// // the channel is empty, the panic will be called.
// func NewStringChatID(channelUsername string) ChatID {
// 	if len(channelUsername) == 0 {
// 		panic("channelUsername is empty")
// 	}
//
// 	return ChatID{channel: channelUsername}
// }

func ChatIDInt64(id int64) ChatID {
	return ChatID{id: id}
}

func ChatIDToShape(key string, object *shapes.Object, chatID ChatID) {
	if id, ok := chatID.ID(); ok {
		object.Int64(key, id)
	} else {
		username, _ := chatID.Username()
		object.String(key, username)
	}
}