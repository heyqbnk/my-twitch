package config

import "fmt"

const (
	AppEnvLocal      AppEnv = "local"
	AppEnvStaging    AppEnv = "staging"
	AppEnvProduction AppEnv = "production"
)

// AppEnv is application environment.
type AppEnv string

func (e AppEnv) String() string {
	return string(e)
}

func (e AppEnv) IsKnown() bool {
	switch e {
	case AppEnvLocal, AppEnvProduction, AppEnvStaging:
		return true
	default:
		return false
	}
}

// Returns application environment by specified key.
func getAppEnv(v viperWrapper, key string) (AppEnv, error) {
	value := AppEnv(v.String(key))

	if value.IsKnown() {
		return value, nil
	}

	return "", fmt.Errorf("incorrect value %q for app env", value)
}
