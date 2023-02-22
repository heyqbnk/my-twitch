package tgbotapi

import (
	"net/http"
)

type Bot struct {
	token  string
	client *http.Client
}

// New creates new instance of Telegram Bot API client.
func New(token string) *Bot {
	return &Bot{
		token:  token,
		client: &http.Client{},
	}
}
