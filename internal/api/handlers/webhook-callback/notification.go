package webhookcallback

import (
	"encoding/json"
	"fmt"

	"github.com/gin-gonic/gin"

	"github.com/qbnk/twitch-announcer/pkg/twitch/helix"
)

// Processes webhook request recognized as some notification.
func (h *Handler) processNotification(ctx *gin.Context, bodyBytes []byte) error {
	var body notification[struct{}]
	if err := json.Unmarshal(bodyBytes, &body); err != nil {
		return fmt.Errorf("unmarshal json: %w", err)
	}

	switch body.Subscription.Type {
	case helix.SubscriptionTypeStreamOnline:
		if err := h.processStreamOnlineMessage(ctx, bodyBytes); err != nil {
			return fmt.Errorf("process stream online message: %w", err)
		}

	case helix.SubscriptionTypeStreamOffline:
		if err := h.processStreamOfflineMessage(ctx, bodyBytes); err != nil {
			return fmt.Errorf("process stream offline message: %w", err)
		}
	}

	return nil
}
