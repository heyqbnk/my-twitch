package helix

import (
	"net/http"
)

type API struct {
	client   *http.Client
	clientID string
}

func New(clientID string) *API {
	return &API{
		client:   &http.Client{},
		clientID: clientID,
	}
}
