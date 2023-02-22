package httphandler

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/qbnk/twitch-announcer/internal/logger"
)

// WebhookCallback handles the request from Twitch which was sent via
// webhook.
func (h Handler) WebhookCallback(ctx *gin.Context) {
	log := h.logger.WithContext(ctx.Request.Context())

	messageType := ctx.GetHeader("Twitch-Eventsub-Message-Type")

	body, err := ctx.GetRawData()
	if err != nil {
		log.Error(err)
		ctx.AbortWithStatus(http.StatusBadRequest)
		return
	}

	// isValid := h.twitch.ValidateSignature(
	// 	ctx.GetHeader(_webhookTwitchMessageIDHeader),
	// 	ctx.GetHeader(_webhookTwitchMessageTimestampHeader),
	// 	string(body),
	// 	ctx.GetHeader(_webhookTwitchMessageSignatureHeader),
	// )
	//
	// if !isValid {
	// 	logger.Error(err)
	// 	ctx.AbortWithStatus(http.StatusBadRequest)
	// 	return
	// }

	switch messageType {
	// In case, we received "webhook_callback_verification" message type,
	// we just respond with the HTTP 200 status code with the challenge string
	// received from the Twitch server to make the subscription work.
	case _webhookCallbackVerificationMessageEventType:
		h.processWebhookVerificationMessageEvent(ctx, log, body)

	// New event from eventsub was received.
	case _webhookNotificationMessageEventType:
		h.processWebhookNotification(ctx, log, body)

	default:
		ctx.AbortWithStatus(200)
	}
}

// Processes request from Twitch sent to confirm subscription.
func (h Handler) processWebhookVerificationMessageEvent(
	ctx *gin.Context,
	log logger.Logger,
	bodyBytes []byte,
) {
	var body webhookCallbackVerificationPendingMessage
	if err := json.Unmarshal(bodyBytes, &body); err != nil {
		log.WithContext(ctx.Request.Context()).Error(err)
		ctx.AbortWithStatus(http.StatusBadRequest)
	} else {
		ctx.String(http.StatusOK, body.Challenge)
	}
}

func (h Handler) processWebhookNotification(
	ctx *gin.Context,
	log logger.Logger,
	bodyBytes []byte,
) {
	var body webhookNotificationMessage[struct{}]
	if err := json.Unmarshal(bodyBytes, &body); err != nil {
		log.Error(err)
		ctx.AbortWithStatus(http.StatusBadRequest)
		return
	}

	switch body.Subscription.Type {
	case _webhookStreamOnlineMessageType:
		h.processStreamOnlineMessage(ctx, log, bodyBytes)
	}
}

func (h Handler) processStreamOnlineMessage(
	ctx *gin.Context,
	log logger.Logger,
	bodyBytes []byte,
) {
	var body webhookStreamOnlineMessage
	if err := json.Unmarshal(bodyBytes, &body); err != nil {
		log.Error(err)
		ctx.AbortWithStatus(http.StatusBadRequest)
		return
	}

	// TODO: Get stream title.

	if err := h.telegram.SendStreamStartedMessage(ctx, "Some stream title"); err != nil {
		log.Error(err)
		ctx.AbortWithStatus(http.StatusBadRequest)
		return
	}
}
