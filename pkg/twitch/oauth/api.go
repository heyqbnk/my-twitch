package oauth

import (
	"time"

	httpext "github.com/qbnk/twitch-announcer/pkg/http-ext"
)

type API struct {
	client       *httpext.Client
	clientID     string
	clientSecret string
}

func New(clientID, clientSecret string, timeout time.Duration, rps int) *API {
	return &API{
		client:       httpext.New(timeout, rps),
		clientID:     clientID,
		clientSecret: clientSecret,
	}
}

func NewDefault(clientID, clientSecret string) *API {
	return New(clientID, clientSecret, 0, 0)
}
