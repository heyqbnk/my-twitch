package config

import (
	"fmt"
)

// Returns port by specified key.
func getPort(v viperWrapper, key string) (int, error) {
	num, err := v.Int(key)
	if err != nil {
		return 0, fmt.Errorf("get int value: %v", err)
	}
	return num, nil
}
