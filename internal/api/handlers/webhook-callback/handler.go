package webhookcallback

import (
	"github.com/gin-gonic/gin"
	"github.com/qbnk/twitch-announcer/internal/logger"
)

type Handler struct {
	channelID  string
	chatID     int64
	twitch     Twitch
	telegram   Telegram
	logFactory *logger.Factory
}

func New(channelID string, chatID int64, twitch Twitch, telegram Telegram, logFactory *logger.Factory) *Handler {
	return &Handler{
		channelID:  channelID,
		chatID:     chatID,
		twitch:     twitch,
		telegram:   telegram,
		logFactory: logFactory,
	}
}

func (h *Handler) Apply(app *gin.Engine, baseURL string) {
	app.POST(baseURL, h.WebhookCallback)
}
