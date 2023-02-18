package api

import (
	"fmt"

	"github.com/qbnk/twitch-announcer/internal/config"
	"github.com/qbnk/twitch-announcer/internal/httphandler"
	"github.com/qbnk/twitch-announcer/internal/services/twitch"

	"github.com/gin-gonic/gin"
)

// Run runs http server.
func Run(cfg config.Config) error {
	twitchService := twitch.New(cfg.Twitch.Webhook.Secret)
	handler := httphandler.New(twitchService)

	app := gin.Default()
	app.POST(cfg.Twitch.Webhook.URL, handler.WebhookCallback)

	if err := app.Run(fmt.Sprintf(":%d", cfg.Port)); err != nil {
		return fmt.Errorf("run http server: %w", err)
	}

	return nil
}
