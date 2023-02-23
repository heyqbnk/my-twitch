package config

type Sentry struct {
	Dsn string `json:"dsn"`
}

// Returns Sentry configuration.
func getSentry(v viperWrapper, prefix string) (Sentry, error) {
	prefix = formatPrefix(prefix)

	return Sentry{Dsn: v.String(prefix + "dsn")}, nil
}
