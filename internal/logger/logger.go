package logger

import (
	"github.com/getsentry/sentry-go"
	"github.com/sirupsen/logrus"
	"golang.org/x/net/context"
)

type Logger struct {
	log       *logrus.Logger
	sentryHub *sentry.Hub
}

func New() Logger {
	return Logger{
		log: logrus.New(),
	}
}

func (l Logger) Error(err error) {
	l.log.Error(err)

	if l.sentryHub != nil {
		l.sentryHub.CaptureException(err)
	}
}

func (l Logger) WithContext(ctx context.Context) Logger {
	newLogger := New()
	newLogger.sentryHub = sentry.GetHubFromContext(ctx)

	return newLogger
}

// TODO: We could probably implement something like WithFields(...).Error()
//  for Sentry in a logger.
