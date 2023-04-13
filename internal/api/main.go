package api

import (
	"fmt"

	"github.com/getsentry/sentry-go"
	"github.com/gin-gonic/gin"
	"github.com/qbnk/twitch-announcer/internal/api/handler"

	"github.com/qbnk/twitch-announcer/internal/config"
	"github.com/qbnk/twitch-announcer/internal/logger"
	"github.com/qbnk/twitch-announcer/internal/services/telegram"
	"github.com/qbnk/twitch-announcer/internal/services/twitch"
)

// Run runs http server.
func Run(
	cfg config.Config,
	sentryHub *sentry.Hub,
	telegramService *telegram.Service,
	twitchService *twitch.Service,
	log *logger.Logger,
) error {
	hnd := handler.New(cfg.Twitch.ChannelID, cfg.Telegram.ChatID, twitchService, telegramService, log)

	app := gin.Default()
	app.Use(newSentryMiddleware(sentryHub))
	app.POST(cfg.Twitch.Webhook.URL, hnd.WebhookCallback)

	if err := app.Run(fmt.Sprintf(":%d", cfg.Http.Port)); err != nil {
		return fmt.Errorf("run http server: %w", err)
	}

	return nil
}
