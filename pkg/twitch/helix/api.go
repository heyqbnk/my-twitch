package helix

import (
	"time"

	httpext "github.com/qbnk/twitch-announcer/pkg/http-ext"
)

// API is wrapper for Twitch API v4.
type API struct {
	client   *httpext.Client
	clientID string
}

func New(clientID string, timeout time.Duration, rps int) *API {
	return &API{
		client:   httpext.New(timeout, rps),
		clientID: clientID,
	}
}

func NewDefault(clientID string) *API {
	return New(clientID, 0, 0)
}
