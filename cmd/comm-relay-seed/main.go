package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/mechastrider/comm-relay/internal/devseed"
)

func main() {
	configPath := flag.String("config", "var/data/config.json", "path to config.json")
	reset := flag.Bool("reset", true, "remove existing comm-relay.db before seeding")
	flag.Parse()

	result, err := devseed.Run(devseed.Options{
		ConfigPath: *configPath,
		Reset:      *reset,
	})
	if err != nil {
		fmt.Fprintf(os.Stderr, "comm-relay-seed: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("Seeded %s\n", result.DBPath)
	fmt.Printf("  viewers:  %d\n", result.Viewers)
	fmt.Printf("  awards:   %d\n", result.Awards)
	fmt.Printf("  messages: %d\n", result.Messages)
	fmt.Printf("Run server: go run ./cmd/comm-relay-server -config %s -web ./web\n", result.ConfigPath)
}
