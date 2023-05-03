package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log"
	"math/rand"
	"strconv"
	"sync"
	"time"

	"github.com/getsentry/sentry-go"
	"github.com/gin-gonic/gin"

	"github.com/qbnk/twitch-announcer/internal/api"
	"github.com/qbnk/twitch-announcer/internal/config"
	"github.com/qbnk/twitch-announcer/internal/logger"
	"github.com/qbnk/twitch-announcer/internal/services/telegram"
	"github.com/qbnk/twitch-announcer/internal/services/twitch"

	"github.com/qbnk/twitch-announcer/pkg/twitch/helix"
)

func main() {
	cfg := getConfig()
	ctx := context.Background()

	// Disable gin debug mode in case, we are currently not debugging.
	if !cfg.Debug {
		gin.SetMode(gin.ReleaseMode)
	}

	// Create Sentry Hub.
	sentryHub := getSentryHub(cfg)

	// Create secret which will be used in Twitch webhooks.
	subscriptionSecret := getTwitchSubscriptionSecret()

	// Create services.
	customLogFactory := logger.NewFactory()
	telegramService := telegram.New(cfg.Telegram.SecretToken)
	twitchService := twitch.New(
		subscriptionSecret,
		cfg.Twitch.API.ClientID,
		cfg.Twitch.API.ClientSecret,
	)

	// TODO: Graceful shutdown?

	var wg sync.WaitGroup
	wg.Add(2)

	// HTTP API goroutine.
	go func() {
		defer wg.Done()

		if err := api.Run(cfg, sentryHub, telegramService, twitchService, customLogFactory); err != nil {
			logFatalError(err, sentryHub)
		}
	}()

	// HTTP API goroutine.
	go func() {
		defer wg.Done()

		if err := ensureSubscriptionsExist(ctx, cfg, twitchService, subscriptionSecret); err != nil {
			logFatalError(err, sentryHub)
		}
	}()

	wg.Wait()
}

// Checks if required twitch subscriptions are configured properly.
func ensureSubscriptionsExist(
	ctx context.Context,
	cfg config.Config,
	twitchService *twitch.Service,
	secret string,
) error {
	// Get list of all eventsub subscriptions.
	subs, err := twitchService.GetSubscriptions(ctx)
	if err != nil {
		return fmt.Errorf("get subscriptions: %v", err)
	}

	// This value is expected webhook callback URL.
	callbackURL := cfg.Http.BaseURL + cfg.Twitch.Webhook.URL

	// List of subscriptions we need.
	requiredSubs := map[helix.SubscriptionType]bool{
		helix.SubscriptionTypeStreamOffline: true,
		helix.SubscriptionTypeStreamOnline:  true,
	}

	// Try to find out if current server is already receiving events from Twitch.
	for _, sub := range subs {
		if sub.Transport.Callback == callbackURL && requiredSubs[sub.Type] {
			// Eventsub subscription already exists. We should delete it.
			if err := twitchService.DeleteSubscription(ctx, sub.ID); err != nil {
				return fmt.Errorf("delete subscription: %v", err)
			}

			break
		}
	}

	// Create all required subscriptions.
	for subType := range requiredSubs {
		err = twitchService.CreateSubscription(ctx, subType, cfg.Twitch.ChannelID, callbackURL, secret)
		if err != nil {
			return fmt.Errorf("create %s subscription: %v", subType, err)
		}
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

// Returns secret used during creating a subscription via Twitch.
func getTwitchSubscriptionSecret() string {
	return strconv.Itoa(rand.New(rand.NewSource(time.Now().UnixNano())).Int())
}

func logFatalError(err error, sentryHub *sentry.Hub) {
	sentryHub.WithScope(func(scope *sentry.Scope) {
		scope.SetLevel(sentry.LevelFatal)
		sentryHub.CaptureException(err)
	})
	log.Fatal(err)
}
