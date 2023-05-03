package webhookcallback

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/qbnk/twitch-announcer/pkg/twitch/helix"
)

// Represents a subscription event which contains the information about the
// subscription required to be confirmed.
// Source: https://dev.twitch.tv/docs/eventsub/handling-webhook-events/#responding-to-a-challenge-request
type verificationPendingMessage struct {
	Challenge string `json:"challenge"`
}

// Reference: https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#stream-subscriptions
type notification[T interface{}] struct {
	Subscription struct {
		Type helix.SubscriptionType `json:"type"`
	} `json:"subscription"`
	Event T `json:"event"`
}

// WebhookCallback handles the request from Twitch which was sent via
// webhook.
func (h *Handler) WebhookCallback(ctx *gin.Context) {
	challenge, err := h.webhookCallback(ctx)
	if err != nil {
		h.logFactory.FromContext(ctx.Request.Context()).Error(err)
		ctx.AbortWithStatus(http.StatusBadRequest)
		return
	}

	if len(challenge) == 0 {
		ctx.Status(200)
		return
	}

	ctx.String(200, challenge)
}

func (h *Handler) webhookCallback(ctx *gin.Context) (string, error) {
	body, err := ctx.GetRawData()
	if err != nil {
		return "", fmt.Errorf("get raw data: %w", err)
	}

	// FIXME
	// isValid := h.twitch.ValidateWebhookSignature(
	// 	ctx.GetHeader(_webhookTwitchMessageIDHeader),
	// 	ctx.GetHeader(_webhookTwitchMessageTimestampHeader),
	// 	string(body),
	// 	ctx.GetHeader(_webhookTwitchMessageSignatureHeader),
	// )
	//
	// if !isValid {
	// 	logger.Error(errors.New("signature invalid"))
	// 	ctx.AbortWithStatus(http.StatusBadRequest)
	// 	return
	// }

	switch ctx.GetHeader(_webhookTwitchMessageType) {
	// In case, we received "webhook_callback_verification" message type,
	// we just respond with the HTTP 200 status code with the challenge string
	// received from the Twitch server to make the subscription work.
	case _webhookCallbackVerificationMessageEventType:
		challenge, err := h.processVerificationMessageEvent(body)
		if err != nil {
			return "", fmt.Errorf("process verification message event: %w", err)
		}
		return challenge, nil

	// New event from eventsub was received.
	case _webhookNotificationMessageEventType:
		if err := h.processNotification(ctx, body); err != nil {
			return "", fmt.Errorf("process notification: %w", err)
		}
	}

	return "", nil
}
