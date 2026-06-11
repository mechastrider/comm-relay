//go:build !wails

package main

import (
	"fmt"
	"os"
)

func main() {
	fmt.Fprintln(os.Stderr, "CommRelay desktop requires Wails. Build with:")
	fmt.Fprintln(os.Stderr, "  go build -tags wails -o comm-relay-desktop ./cmd/comm-relay-desktop")
	fmt.Fprintln(os.Stderr, "Or: wails build (from repo root, see README)")
	os.Exit(1)
}
