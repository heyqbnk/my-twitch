package oauth

import (
	"net/http"
)

type API struct {
	client       *http.Client
	clientID     string
	clientSecret string
}

func New(clientID, clientSecret string) *API {
	return &API{
		client:       &http.Client{},
		clientID:     clientID,
		clientSecret: clientSecret,
	}
}
