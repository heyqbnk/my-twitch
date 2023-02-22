package tgwebappslaunchparams

import (
	"net/url"

	initdata "github.com/Telegram-Web-Apps/init-data-golang"
	"github.com/pkg/errors"
)

// New creates LaunchParams instance from query string.
func New(qs string) (LaunchParams, error) {
	q, err := url.ParseQuery(qs)
	if err != nil {
		return LaunchParams{}, errors.Wrap(ErrInvalid, "query string invalid")
	}

	// Check platform.
	if len(q.Get(LaunchParamPlatform)) == 0 {
		return LaunchParams{}, errors.Wrap(ErrInvalid, "platform invalid")
	}

	// Check version.
	if len(q.Get(LaunchParamVersion)) == 0 {
		return LaunchParams{}, errors.Wrap(ErrInvalid, "version invalid")
	}

	// Check init data.
	initData, err := initdata.Parse(q.Get(LaunchParamInitData))
	if err != nil {
		return LaunchParams{}, errors.Wrap(ErrInvalid, "init data invalid")
	}
	return LaunchParams{form: q, initData: *initData}, nil
}
