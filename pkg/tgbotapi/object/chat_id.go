package tgbotapiobject

type ChatID struct {
	// channel string
	id int64
}

// func (c ChatID) Channel() (string, bool) {
// 	if len(c.channel) == 0 {
// 		return "", false
// 	}
//
// 	return c.channel, true
// }

func (c ChatID) IsEmpty() bool {
	return c.id == 0
}

func (c ChatID) ID() (int64, bool) {
	if c.id == 0 {
		return 0, false
	}

	return c.id, true
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
