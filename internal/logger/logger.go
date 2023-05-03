package logger

import "github.com/sirupsen/logrus"

type Logger struct {
	log *logrus.Logger
}

func (l *Logger) Error(err error) {
	l.log.Error(err)
}
