package webhookcallback

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/gin-gonic/gin"
)

// Reference: https://dev.twitch.tv/docs/eventsub/eventsub-subscription-types/#streamonline

type streamOnlineMessageEvent struct {
	BroadcasterUserLogin string `json:"broadcaster_user_login"`
}

type streamOnlineNotification = notification[streamOnlineMessageEvent]

// Processes "stream.online" subscription event.
func (h *Handler) processStreamOnlineMessage(ctx *gin.Context, bodyBytes []byte) error {
	var body streamOnlineNotification
	if err := json.Unmarshal(bodyBytes, &body); err != nil {
		return fmt.Errorf("unmarshal json: %w", err)
	}

	stream, err := h.twitch.GetStream(ctx, body.Event.BroadcasterUserLogin)
	if err != nil {
		return fmt.Errorf("get stream from Twitch: %w", err)
	}

	streamURL := strings.Replace(stream.ThumbnailURL, "{width}", "960", 1)
	streamURL = strings.Replace(streamURL, "{height}", "540", 1)

	err = h.telegram.SendStreamStartedMessage(ctx, h.chatID, stream.Title, stream.GameName, streamURL)
	if err != nil {
		return fmt.Errorf("send stream started message: %w", err)
	}

	return nil
}
