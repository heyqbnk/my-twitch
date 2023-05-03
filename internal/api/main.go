package api

import (
	"fmt"

	"github.com/getsentry/sentry-go"
	"github.com/gin-gonic/gin"
	handlerswebhookcallback "github.com/qbnk/twitch-announcer/internal/api/handlers/webhook-callback"
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
	logger *logger.Factory,
) error {
	app := gin.Default()
	app.Use(newSentryMiddleware(sentryHub))

	handler := handlerswebhookcallback.New(cfg.Twitch.ChannelID, cfg.Telegram.ChatID, twitchService, telegramService, logger)
	handler.Apply(app, cfg.Twitch.Webhook.URL)

	if err := app.Run(fmt.Sprintf(":%d", cfg.Http.Port)); err != nil {
		return fmt.Errorf("run http server: %w", err)
	}

	return nil
}
