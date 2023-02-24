package twitch

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
)

// ValidateWebhookSignature validates request sent from Twitch by specified
// message ID, its timestamp and signature.
func (s *Service) ValidateWebhookSignature(messageID, messageTimestamp, body, signature string) bool {
	message := messageID + messageTimestamp + body
	messageSignature := "sha256=" + getHmac(message, s.webhookSecret)

	return messageSignature == signature
}

func getHmac(message, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(message))

	return hex.EncodeToString(h.Sum(nil))
}
