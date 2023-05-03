package webhookcallback

import (
	"fmt"

	"github.com/gin-gonic/gin"
)

// Processes "stream.offline" subscription event.
func (h *Handler) processStreamOfflineMessage(ctx *gin.Context, bodyBytes []byte) error {
	// FIXME
	fmt.Println("Oh yeah")
	return nil
}
