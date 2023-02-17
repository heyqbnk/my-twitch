package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"

	"github.com/pkg/errors"

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
	_webhookSecret                      = "some secret"

	_webhookTwitchMessageIDHeader        = "twitch-eventsub-message-id"
	_webhookTwitchMessageTimestampHeader = "twitch-eventsub-message-timestamp"
	_webhookTwitchMessageSignatureHeader = "twitch-eventsub-message-signature"
)

func Run() error {
	app := gin.Default()

	app.POST("/", func(ctx *gin.Context) {
		messageType := ctx.GetHeader("Twitch-Eventsub-Message-Type")

		body, err := ctx.GetRawData()
		if err != nil {
			log.Println(err)
			ctx.AbortWithStatus(400)
			return
		}

		// In case, we received "webhook_callback_verification" message type,
		// we just respond with the HTTP 200 status code with the challenge string
		// received from the Twitch server to make the subscription work.
		if messageType == _webhookCallbackVerificationMessage {
			hmacMessage := ctx.GetHeader(_webhookTwitchMessageIDHeader) +
				ctx.GetHeader(_webhookTwitchMessageTimestampHeader) +
				string(body)
			signature := "sha256=" + getHmac(hmacMessage, _webhookSecret)

			if signature != ctx.GetHeader(_webhookTwitchMessageSignatureHeader) {
				log.Println("signature validation failed")
				ctx.AbortWithStatus(400)
				return
			}

			var bodyStruct WebhookCallbackVerificationPendingMessage
			if err := json.Unmarshal(body, &bodyStruct); err != nil {
				log.Println(err)
				ctx.AbortWithStatus(400)
				return
			}

			ctx.String(200, bodyStruct.Challenge)
			return
		}

		ctx.AbortWithStatus(400)
	})

	if err := app.Run(":25000"); err != nil {
		return errors.Wrap(err, "unable to run http server")
	}
	return nil
}

func getHmac(message, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(message))

	return hex.EncodeToString(h.Sum(nil))
}
