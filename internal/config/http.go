package config

import "fmt"

type Http struct {
	BaseURL string
	Port    int
}

// Returns Http configuration.
func getHttp(v viperWrapper, prefix string) (Http, error) {
	prefix = formatPrefix(prefix)

	baseURL, err := v.StringNonEmpty(prefix + "baseURL")
	if err != nil {
		return Http{}, fmt.Errorf("get base URL: %v", err)
	}

	port, err := getPort(v, prefix+"port")
	if err != nil {
		return Http{}, fmt.Errorf("get port: %v", err)
	}

	return Http{
		BaseURL: baseURL,
		Port:    port,
	}, nil
}
