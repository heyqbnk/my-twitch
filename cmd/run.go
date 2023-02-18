package main

import (
	"errors"
	"flag"
	"fmt"
	"log"

	"github.com/gin-gonic/gin"

	"github.com/qbnk/twitch-announcer/internal/api"
	"github.com/qbnk/twitch-announcer/internal/config"
)

func main() {
	configPath := flag.String("config", "", "path to config file")
	flag.Parse()

	if len(*configPath) == 0 {
		log.Fatal(errors.New("path to config file is empty"))
	}

	cfg, err := config.New(*configPath)
	if err != nil {
		log.Fatal(err)
	}

	// Disable gin debug mode in case, we are currently not debugging.
	if !cfg.Debug {
		gin.SetMode(gin.ReleaseMode)
	}

	if err := api.Run(cfg); err != nil {
		log.Fatal(err)
	}
	fmt.Println("Shut down gracefully")
}
