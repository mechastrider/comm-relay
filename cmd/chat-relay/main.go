package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/mechastrider/comm-relay/internal/bootstrap"
)

func main() {
	configPath := flag.String("config", "config.json", "path to config.json")
	addr := flag.String("addr", "", "HTTP listen address (overrides config server_port)")
	webRoot := flag.String("web", "", "path to web static assets on disk (default: embedded in binary)")
	debug := flag.Bool("debug", false, "enable debug logging")
	flag.Parse()

	if err := bootstrap.Run(bootstrap.Options{
		ConfigPath: *configPath,
		Addr:       *addr,
		WebRoot:    *webRoot,
		Debug:      *debug,
	}); err != nil {
		fmt.Fprintf(os.Stderr, "chat-relay: %v\n", err)
		os.Exit(1)
	}
}
