package twitchapi

import (
	"net/http"
	"time"
)

type API struct {
	accessToken          string
	accessTokenExpiresAt time.Time
	clientSecret         string
	clientID             string
	client               *http.Client
}

func New(clientID, clientSecret string) *API {
	return &API{
		clientSecret: clientSecret,
		client:       &http.Client{},
		clientID:     clientID,
	}
}

// func (a *API) AccessToken() string {
// 	return a.accessToken
// }
//
// func (a *API) SetAccessToken(accessToken string) {
// 	a.accessToken = accessToken
// }
