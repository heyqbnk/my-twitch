package api

import (
	"fmt"

	"github.com/getsentry/sentry-go"
	sentrygin "github.com/getsentry/sentry-go/gin"
	"github.com/gin-gonic/gin"
	"github.com/qbnk/twitch-announcer/internal/config"
	"github.com/qbnk/twitch-announcer/internal/httphandler"
	"github.com/qbnk/twitch-announcer/internal/logger"
	"github.com/qbnk/twitch-announcer/internal/services/telegram"
	"github.com/qbnk/twitch-announcer/internal/services/twitch"
)

// Run runs http server.
func Run(
	cfg config.Config,
	sentryClient *sentry.Client,
	telegramService *telegram.Service,
	twitchService *twitch.Service,
	log *logger.Logger,
) error {
	handler := httphandler.New(cfg.Twitch.ChannelID, twitchService, telegramService, log)

	app := gin.Default()
	app.Use(newSentryMiddleware(sentryClient))
	app.POST(cfg.Twitch.Webhook.URL, handler.WebhookCallback)

	if err := app.Run(fmt.Sprintf(":%d", cfg.Http.Port)); err != nil {
		return fmt.Errorf("run http server: %w", err)
	}

	return nil
}

// Returns new sentry middleware handling event with specified sentry hub.
func newSentryMiddleware(sentryClient *sentry.Client) gin.HandlerFunc {
	sentryMiddleware := sentrygin.New(sentrygin.Options{Repanic: true})

	return func(ctx *gin.Context) {
		// Set sentry hub by ourselves as long as next sentry middleware will
		// extract it. Otherwise, it will extract global sentry Hub.
		hub := sentry.NewHub(sentryClient, sentry.NewScope())
		ctx.Request = ctx.Request.WithContext(
			sentry.SetHubOnContext(ctx.Request.Context(), hub),
		)
		sentryMiddleware(ctx)
	}
}
