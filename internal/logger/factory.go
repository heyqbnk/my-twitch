package logger

import (
	"context"

	"github.com/getsentry/sentry-go"
	"github.com/sirupsen/logrus"
)

type Factory struct {
}

func NewFactory() *Factory {
	return &Factory{}
}

func (f *Factory) FromContext(ctx context.Context) *Logger {
	log := logrus.New()
	log.AddHook(&hook{sentryHub: sentry.GetHubFromContext(ctx)})

	return &Logger{log}
}
