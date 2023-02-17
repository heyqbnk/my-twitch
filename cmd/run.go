package main

import (
	"fmt"
	"log"

	"github.com/qbnk/twitch-announcer/internal/api"
)

func main() {
	if err := api.Run(); err != nil {
		log.Fatal(err)
	}
	fmt.Println("Shut down gracefully")
}
