package config

import (
	"fmt"
)

type twitchWebhook struct {
	Secret string
	URL    string
}

type twitchAPI struct {
	AccessToken  string
	ClientID     string
	ClientSecret string
}

type Twitch struct {
	API     twitchAPI
	Webhook twitchWebhook
}

// Returns configuration related to Twitch.
func getTwitch(v viperWrapper, prefix string) (Twitch, error) {
	prefix = formatPrefix(prefix)

	api, err := getTwitchAPI(v, prefix+"api")
	if err != nil {
		return Twitch{}, fmt.Errorf("get api: %v", err)
	}

	webhook, err := getTwitchWebhook(v, prefix+"webhook")
	if err != nil {
		return Twitch{}, fmt.Errorf("get webhook: %v", err)
	}

	return Twitch{Webhook: webhook, API: api}, nil
}

// Returns configuration related to Twitch Webhook.
func getTwitchWebhook(v viperWrapper, prefix string) (twitchWebhook, error) {
	prefix = formatPrefix(prefix)

	secret, err := v.StringNonEmpty(prefix + "secret")
	if err != nil {
		return twitchWebhook{}, fmt.Errorf("get webhook secret: %v", err)
	}

	url := v.String(prefix + "url")
	if len(url) == 0 {
		url = "/"
	}

	return twitchWebhook{Secret: secret, URL: url}, nil
}

// Returns configuration related to Twitch API.
func getTwitchAPI(v viperWrapper, prefix string) (twitchAPI, error) {
	prefix = formatPrefix(prefix)

	accessToken, err := v.StringNonEmpty(prefix + "accessToken")
	if err != nil {
		return twitchAPI{}, fmt.Errorf("get access token: %v", err)
	}

	clientID, err := v.StringNonEmpty(prefix + "clientID")
	if err != nil {
		return twitchAPI{}, fmt.Errorf("get client ID: %v", err)
	}

	clientSecret, err := v.StringNonEmpty(prefix + "clientSecret")
	if err != nil {
		return twitchAPI{}, fmt.Errorf("get client secret: %v", err)
	}

	return twitchAPI{
		AccessToken:  accessToken,
		ClientID:     clientID,
		ClientSecret: clientSecret,
	}, nil
}
