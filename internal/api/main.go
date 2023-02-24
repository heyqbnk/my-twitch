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
func Run(cfg config.Config) error {
	sentryClient, err := sentry.NewClient(sentry.ClientOptions{
		Dsn:         cfg.Sentry.Dsn,
		Debug:       cfg.Debug,
		Environment: cfg.AppEnv.String(),
	})
	if err != nil {
		return fmt.Errorf("create Sentry client: %v", err)
	}

	log := logger.New()
	twitchService := twitch.New(
		cfg.Twitch.Webhook.Secret,
		cfg.Twitch.API.ClientID,
		cfg.Twitch.API.ClientSecret,
	)
	tgbot := telegram.New(cfg.Telegram.SecretToken, cfg.Telegram.ChatID)

	handler := httphandler.New(cfg.Twitch.ChannelID, twitchService, tgbot, log)

	app := gin.Default()
	app.Use(newSentryMiddleware(sentryClient))
	app.POST(cfg.Twitch.Webhook.URL, handler.WebhookCallback)

	if err := app.Run(fmt.Sprintf(":%d", cfg.Port)); err != nil {
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
