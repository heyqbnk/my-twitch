package httphandler

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

// WebhookCallbackVerificationPendingMessage represents a subscription event
// which contains the information about the subscription required to be
// confirmed.
// Source: https://dev.twitch.tv/docs/eventsub/handling-webhook-events/#responding-to-a-challenge-request
type WebhookCallbackVerificationPendingMessage struct {
	Challenge string `json:"challenge"`
}

const (
	_webhookCallbackVerificationMessage = "webhook_callback_verification"

	_webhookTwitchMessageIDHeader        = "twitch-eventsub-message-id"
	_webhookTwitchMessageTimestampHeader = "twitch-eventsub-message-timestamp"
	_webhookTwitchMessageSignatureHeader = "twitch-eventsub-message-signature"
)

// WebhookCallback handles the request from Twitch which was sent via
// webhook.
func (h Handler) WebhookCallback(ctx *gin.Context) {
	messageType := ctx.GetHeader("Twitch-Eventsub-Message-Type")

	body, err := ctx.GetRawData()
	if err != nil {
		log.Println(err)
		ctx.AbortWithStatus(http.StatusBadRequest)
		return
	}

	// In case, we received "webhook_callback_verification" message type,
	// we just respond with the HTTP 200 status code with the challenge string
	// received from the Twitch server to make the subscription work.
	if messageType == _webhookCallbackVerificationMessage {
		// Extract request body.
		var bodyStruct WebhookCallbackVerificationPendingMessage
		if err := json.Unmarshal(body, &bodyStruct); err != nil {
			log.Println(err)
			ctx.AbortWithStatus(http.StatusBadRequest)
			return
		}

		// Validate signature.
		isValid := h.twitch.ValidateSignature(
			ctx.GetHeader(_webhookTwitchMessageIDHeader),
			ctx.GetHeader(_webhookTwitchMessageTimestampHeader),
			string(body),
			ctx.GetHeader(_webhookTwitchMessageSignatureHeader),
		)

		if !isValid {
			log.Println("signature validation failed")
			ctx.AbortWithStatus(http.StatusBadRequest)
			return
		}

		ctx.String(http.StatusOK, bodyStruct.Challenge)
		return
	}

	ctx.AbortWithStatus(400)
}
