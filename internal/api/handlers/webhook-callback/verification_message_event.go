package webhookcallback

import (
	"encoding/json"
)

// Processes request from Twitch sent to confirm subscription existence.
func (h *Handler) processVerificationMessageEvent(bodyBytes []byte) (challenge string, err error) {
	var body verificationPendingMessage
	if err = json.Unmarshal(bodyBytes, &body); err != nil {
		return "", err
	}

	return body.Challenge, nil
}
