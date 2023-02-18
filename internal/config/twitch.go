package config

import (
	"fmt"
	"strings"
)

type twitchWebhook struct {
	Secret string
	URL    string
}

type Twitch struct {
	Webhook twitchWebhook
}

// Returns configuration related to Twitch.
func getTwitch(v viperWrapper, prefix string) (Twitch, error) {
	if !strings.HasSuffix(prefix, ".") {
		prefix += "."
	}

	webhookSecret, err := v.StringNonEmpty(prefix + "webhook.secret")
	if err != nil {
		return Twitch{}, fmt.Errorf("get webhook secret: %v", err)
	}

	webhookURL := v.String(prefix + "webhook.url")
	if len(webhookURL) == 0 {
		webhookURL = "/"
	}

	return Twitch{
		Webhook: twitchWebhook{
			Secret: webhookSecret,
			URL:    webhookURL,
		},
	}, nil
}
