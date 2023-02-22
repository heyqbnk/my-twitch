package tgwebappslaunchparams

const (
	LaunchParamInitData LaunchParam = "tgWebAppData"
	LaunchParamPlatform LaunchParam = "tgWebAppPlatform"
	LaunchParamVersion  LaunchParam = "tgWebAppVersion"
)

// LaunchParam describes known parameter provided by Telegram.
type LaunchParam string
