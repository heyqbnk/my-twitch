package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"strconv"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/gin-gonic/gin"
	"github.com/qbnk/twitch-announcer/internal/logger"
	"github.com/qbnk/twitch-announcer/internal/services/telegram"
	"github.com/qbnk/twitch-announcer/internal/services/twitch"

	"github.com/qbnk/twitch-announcer/internal/api"
	"github.com/qbnk/twitch-announcer/internal/config"
)

func main() {
	cfg := getConfig()

	// Disable gin debug mode in case, we are currently not debugging.
	if !cfg.Debug {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create Sentry Hub.
	sentryHub := getSentryHub(cfg)

	// Create secret which will be used in Twitch webhooks.
	subscriptionSecret := strconv.Itoa(rand.New(rand.NewSource(time.Now().UnixNano())).Int())

	// Create services.
	customLog := logger.New()
	telegramService := telegram.New(cfg.Telegram.SecretToken)
	twitchService := twitch.New(
		subscriptionSecret,
		cfg.Twitch.API.ClientID,
		cfg.Twitch.API.ClientSecret,
	)

	// Create stream online subscription.
	err := ensureStreamOnlineSubscription(cfg, twitchService, subscriptionSecret)
	if err != nil {
		logFatalError(err, sentryHub)
	}

	if err := api.Run(cfg, sentryHub, telegramService, twitchService, customLog); err != nil {
		logFatalError(err, sentryHub)
	}
}

// Checks if "stream.online" subscription exists. In case, it does not, function
// creates it.
func ensureStreamOnlineSubscription(cfg config.Config, twitchService *twitch.Service, secret string) error {
	ctx := context.Background()

	// Get list of all eventsub subscriptions.
	subs, err := twitchService.GetSubscriptions(ctx)
	if err != nil {
		return fmt.Errorf("get subscriptions: %v", err)
	}

	callbackURL := cfg.Http.BaseURL + cfg.Twitch.Webhook.URL

	// Try to find out if current server is already receiving events from Twitch.
	for _, sub := range subs {
		// FIXME: "stream.online" only. We are currently looking for all
		//  events.
		if sub.Transport.Callback == callbackURL {
			// Eventsub subscription already exists. We should delete it.
			if err := twitchService.DeleteSubscription(ctx, sub.ID); err != nil {
				return fmt.Errorf("delete subscription: %v", err)
			}
			break
		}
	}

	// Create new subscription.
	err = twitchService.CreateStreamOnlineSubscription(
		ctx, cfg.Twitch.ChannelID, callbackURL, secret,
	)
	if err != nil {
		return fmt.Errorf("create stream.online subscription: %v", err)
	}

	return nil
}

func getConfig() config.Config {
	configPath := flag.String("config", "", "path to config file")
	flag.Parse()

	if len(*configPath) == 0 {
		log.Fatal(errors.New("path to config file is empty"))
	}

	cfg, err := config.New(*configPath)
	if err != nil {
		log.Fatal(err)
	}

	return cfg
}

func getSentryHub(cfg config.Config) *sentry.Hub {
	sentryClient, err := sentry.NewClient(sentry.ClientOptions{
		Dsn:         cfg.Sentry.Dsn,
		Debug:       cfg.Debug,
		Environment: cfg.AppEnv.String(),
	})
	if err != nil {
		log.Fatal(fmt.Errorf("create Sentry client: %v", err))
	}

	return sentry.NewHub(sentryClient, sentry.NewScope())
}

func logFatalError(err error, sentryHub *sentry.Hub) {
	sentryHub.WithScope(func(scope *sentry.Scope) {
		scope.SetLevel(sentry.LevelFatal)
		sentryHub.CaptureException(err)
	})
	log.Fatal(err)
}
