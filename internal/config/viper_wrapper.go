package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"

	"github.com/spf13/viper"
)

type viperWrapper struct {
	viper *viper.Viper
}

func newViperWrapper(path string) (viperWrapper, error) {
	v := viper.New()
	v.SetConfigFile(path)
	wrapper := viperWrapper{viper: v}

	if err := v.ReadInConfig(); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return wrapper, nil
		}
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return viperWrapper{}, fmt.Errorf("read config: %v", err)
		}
	}

	return wrapper, nil
}

// AppEnv returns application environment by specified key.
func (v viperWrapper) AppEnv(key string) (AppEnv, error) {
	value := AppEnv(v.String(key))

	if value.IsKnown() {
		return value, nil
	}

	return "", fmt.Errorf("incorrect value %q for app env", value)
}

// Bool returns boolean value by specified key.
func (v viperWrapper) Bool(key string) bool {
	return v.viper.GetBool(key)
}

// Int returns int by specified key.
func (v viperWrapper) Int(key string) (int, error) {
	str := v.String(key)
	asInt, err := strconv.Atoi(str)
	if err != nil {
		return 0, fmt.Errorf("incorrect value %q for int: %v", str, err)
	}

	return asInt, nil
}

// Int64 returns int64 by specified key.
func (v viperWrapper) Int64(key string) (int64, error) {
	str := v.String(key)
	asInt, err := strconv.ParseInt(str, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("incorrect value %q for int64: %v", str, err)
	}

	return asInt, nil
}

// // MapIntString returns map[int]string by specified key.
// func (v viperWrapper) MapIntString(key string) (map[int]string, error) {
// 	str := v.String(key)
// 	if str == "" {
// 		return nil, nil
// 	}
//
// 	parts := strings.Split(str, ",")
// 	res := make(map[int]string, len(parts))
//
// 	for _, part := range parts {
// 		partItems := strings.Split(part, ":")
// 		if len(partItems) < 2 {
// 			return nil, errors.Errorf("%q key contains incorrect item", key)
// 		}
//
// 		resKey, err := strconv.Atoi(partItems[0])
// 		if err != nil {
// 			return nil, errors.Wrapf(
// 				err, "%q key contains incorrect item with invalid key %q",
// 				key, partItems[0],
// 			)
// 		}
//
// 		res[resKey] = strings.Join(partItems[1:], ":")
// 	}
//
// 	return res, nil
// }

// String returns string value by specified key.
func (v viperWrapper) String(key string) string {
	return v.viper.GetString(key)
}

// StringNonEmpty returns string value by specified key. Returns error in case,
// value is empty.
func (v viperWrapper) StringNonEmpty(key string) (string, error) {
	str := v.String(key)

	if len(str) == 0 {
		return "", fmt.Errorf("value by key %q is empty", key)
	}

	return str, nil
}
