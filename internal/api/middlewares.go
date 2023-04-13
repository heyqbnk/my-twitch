package api

import (
	"github.com/getsentry/sentry-go"
	sentrygin "github.com/getsentry/sentry-go/gin"
	"github.com/gin-gonic/gin"
)

// Returns new sentry middleware handling event with specified sentry hub.
func newSentryMiddleware(hub *sentry.Hub) gin.HandlerFunc {
	sentryMiddleware := sentrygin.New(sentrygin.Options{Repanic: true})

	return func(ctx *gin.Context) {
		// Set sentry hub by ourselves as long as next sentry middleware will
		// extract it. Otherwise, it will extract global sentry Hub.
		ctx.Request = ctx.Request.WithContext(
			sentry.SetHubOnContext(ctx.Request.Context(), hub),
		)
		sentryMiddleware(ctx)
	}
}
