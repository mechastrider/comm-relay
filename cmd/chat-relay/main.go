package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/mechastrider/comm-relay/internal/bootstrap"
)

func main() {
	addr := flag.String("addr", ":17877", "HTTP listen address")
	webRoot := flag.String("web", "", "path to web static assets (default: auto-detect)")
	debug := flag.Bool("debug", false, "enable debug logging")
	flag.Parse()

	if err := bootstrap.Run(bootstrap.Options{
		Addr:    *addr,
		WebRoot: *webRoot,
		Debug:   *debug,
	}); err != nil {
		fmt.Fprintf(os.Stderr, "chat-relay: %v\n", err)
		os.Exit(1)
	}
}
