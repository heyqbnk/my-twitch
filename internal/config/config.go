package config

import (
	"fmt"
)

type Config struct {
	AppEnv   AppEnv
	Debug    bool
	Port     int
	Sentry   Sentry
	Twitch   Twitch
	Telegram Telegram
}

func New(path string) (Config, error) {
	v, err := newViperWrapper(path)
	if err != nil {
		return Config{}, fmt.Errorf("create viper wrapper: %v", err)
	}

	appEnv, err := getAppEnv(v, "app.env")
	if err != nil {
		return Config{}, fmt.Errorf("get app environment: %v", err)
	}

	port, err := getPort(v, "app.port")
	if err != nil {
		return Config{}, fmt.Errorf("get port: %v", err)
	}

	sentry, err := getSentry(v, "sentry")
	if err != nil {
		return Config{}, fmt.Errorf("get sentry: %v", err)
	}

	twitch, err := getTwitch(v, "twitch")
	if err != nil {
		return Config{}, fmt.Errorf("get twitch: %v", err)
	}

	telegram, err := getTelegram(v, "telegram")
	if err != nil {
		return Config{}, fmt.Errorf("get telegram: %v", err)
	}

	return Config{
		AppEnv:   appEnv,
		Debug:    v.Bool("app.debug"),
		Port:     port,
		Sentry:   sentry,
		Twitch:   twitch,
		Telegram: telegram,
	}, nil
}
