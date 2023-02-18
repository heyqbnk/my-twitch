package twitch

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
)

type Service struct {
	webhookSecret string
}

func New(webhookSecret string) Service {
	return Service{webhookSecret: webhookSecret}
}

// ValidateSignature validates request sent from Twitch by specified
// message ID, its timestamp and signature.
func (s Service) ValidateSignature(messageID, messageTimestamp, body, signature string) bool {
	message := messageID + messageTimestamp + body
	messageSignature := "sha256=" + getHmac(message, s.webhookSecret)

	return messageSignature == signature
}

func getHmac(message, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(message))

	return hex.EncodeToString(h.Sum(nil))
}
