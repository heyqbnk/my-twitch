package logger

import (
	"github.com/getsentry/sentry-go"
	"github.com/sirupsen/logrus"
)

type hook struct {
	sentryHub *sentry.Hub
}

func (h *hook) Levels() []logrus.Level {
	return []logrus.Level{logrus.ErrorLevel, logrus.PanicLevel, logrus.FatalLevel}
}

func (h *hook) Fire(entry *logrus.Entry) error {
	h.sentryHub.WithScope(func(scope *sentry.Scope) {
		switch entry.Level {
		case logrus.PanicLevel, logrus.FatalLevel:
			scope.SetLevel(sentry.LevelFatal)
		default:
			scope.SetLevel(sentry.LevelError)
		}

		h.sentryHub.CaptureMessage(entry.Message)
	})

	return nil
}
