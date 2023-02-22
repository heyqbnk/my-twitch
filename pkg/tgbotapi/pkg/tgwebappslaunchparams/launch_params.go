package tgwebappslaunchparams

import (
	"net/url"
	"strconv"
	"time"

	"github.com/pkg/errors"

	initdata "github.com/Telegram-Web-Apps/init-data-golang"
)

type LaunchParams struct {
	form     url.Values
	initData initdata.InitData
}

// Platform returns platform identifier.
func (lp *LaunchParams) Platform() string {
	return lp.form.Get(LaunchParamPlatform)
}

// InitData returns parsed init data information.
func (lp *LaunchParams) InitData() initdata.InitData {
	return lp.initData
}

// InitDataRaw returns raw init data information.
func (lp *LaunchParams) InitDataRaw() string {
	return lp.form.Get(LaunchParamInitData)
}

// SignInitData sign current init data with new key.
func (lp *LaunchParams) SignInitData(secretKey string) error {
	initData := lp.InitDataRaw()
	signedAt := time.Now()
	sign, err := initdata.SignQueryString(initData, secretKey, signedAt)
	if err != nil {
		return errors.Wrap(err, "initdata.SignQueryString")
	}

	// Present init data as query parameters, so we could easily override "hash"
	// and "auth_date" parameters.
	initDataQp, err := url.ParseQuery(initData)
	if err != nil {
		return errors.Wrap(err, "url.ParseQuery")
	}
	initDataQp.Set("hash", sign)
	initDataQp.Set("auth_date", strconv.FormatInt(signedAt.Unix(), 10))

	// Reassign init data.
	lp.initData.AuthDateRaw = int(signedAt.Unix())
	lp.initData.Hash = sign
	lp.form.Set(LaunchParamInitData, initDataQp.Encode())

	return nil
}

// SetInitData sets new init data.
func (lp *LaunchParams) SetInitData(initDataStr string) error {
	initData, err := initdata.Parse(initDataStr)
	if err != nil {
		return errors.Wrap(err, "initdata.Parse")
	}

	lp.form.Set(LaunchParamInitData, initDataStr)
	lp.initData = *initData

	return nil
}

// Version returns version number.
func (lp *LaunchParams) Version() string {
	return lp.form.Get(LaunchParamVersion)
}

// Encode presents launch params as query string.
func (lp *LaunchParams) Encode() string {
	return lp.form.Encode()
}
