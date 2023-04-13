package tgbotapi

import (
	"time"

	httpext "github.com/qbnk/twitch-announcer/pkg/http-ext"
)

type Bot struct {
	token  string
	client *httpext.Client
}

func New(token string, timeout time.Duration, rps int) *Bot {
	return &Bot{
		token:  token,
		client: httpext.New(timeout, rps),
	}
}

func NewDefault(token string) *Bot {
	return New(token, 0, 0)
}
