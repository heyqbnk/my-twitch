package config

import (
	"strings"
)

type Sentry struct {
	Dsn string `json:"dsn"`
}

// Returns Sentry configuration.
func getSentry(v viperWrapper, prefix string) (Sentry, error) {
	if !strings.HasSuffix(prefix, ".") {
		prefix += "."
	}

	return Sentry{Dsn: v.String(prefix + "dsn")}, nil
}
