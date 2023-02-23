package config

import (
	"fmt"
	"strings"
)

// Returns port by specified key.
func getPort(v viperWrapper, key string) (int, error) {
	num, err := v.Int(key)
	if err != nil {
		return 0, fmt.Errorf("get int value: %v", err)
	}
	return num, nil
}

// Appends "." to the end of specified string in case, it has no such suffix.
func formatPrefix(prefix string) string {
	if !strings.HasSuffix(prefix, ".") {
		prefix += "."
	}
	return prefix
}
