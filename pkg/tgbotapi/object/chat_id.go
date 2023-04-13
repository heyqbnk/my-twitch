package tgbotapiobject

import "encoding/json"

type ChatID struct {
	channel string
	id      int64
}

func (c ChatID) Channel() (string, bool) {
	if len(c.channel) == 0 {
		return "", false
	}

	return c.channel, true
}

func (c ChatID) ID() (int64, bool) {
	if c.id == 0 {
		return 0, false
	}

	return c.id, true
}

func (c ChatID) MarshalJSON() ([]byte, error) {
	if len(c.channel) == 0 {
		return json.Marshal(c.id)
	}

	return json.Marshal(c.channel)
}

// NewStringChatID returns an instance of ChatID with specified channel. In case,
// the channel is empty, the panic will be called.
func NewStringChatID(channelUsername string) ChatID {
	if len(channelUsername) == 0 {
		panic("channelUsername is empty")
	}

	return ChatID{channel: channelUsername}
}

// NewIntChatID returns an instance of ChatID with specified channel identifier.
// In case, the id is zero, the panic will be called.
func NewIntChatID(id int64) ChatID {
	if id == 0 {
		panic("id is zero")
	}

	return ChatID{id: id}
}
