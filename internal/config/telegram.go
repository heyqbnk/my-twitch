package config

import (
	"fmt"
	"strings"
)

type Telegram struct {
	SecretToken string
	ChatID      int64
}

// Returns configuration related to Telegram.
func getTelegram(v viperWrapper, prefix string) (Telegram, error) {
	if !strings.HasSuffix(prefix, ".") {
		prefix += "."
	}

	secretToken, err := v.StringNonEmpty(prefix + "secretToken")
	if err != nil {
		return Telegram{}, fmt.Errorf("get secret token: %v", err)
	}

	chatID, err := v.Int64(prefix + "chatID")
	if err != nil {
		return Telegram{}, fmt.Errorf("get chat ID: %v", err)
	}

	return Telegram{
		ChatID:      chatID,
		SecretToken: secretToken,
	}, nil
}
