//go:build !wails

package main

import (
	"fmt"
	"os"
)

func main() {
	fmt.Fprintln(os.Stderr, "Chat Relay desktop requires Wails. Build with:")
	fmt.Fprintln(os.Stderr, "  go build -tags wails -o chat-relay-app ./cmd/chat-relay-desktop")
	fmt.Fprintln(os.Stderr, "Or: wails build (from repo root, see README)")
	os.Exit(1)
}
