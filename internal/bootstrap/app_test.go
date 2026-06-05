package bootstrap

import (
	"context"
	"fmt"
	"net"
	"path/filepath"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestApp_StartStop_WhenDefaultConfig_ExpectHealthReady(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "config.json")

	app, err := New(Options{
		ConfigPath: configPath,
		Addr:       randomListenAddr(t),
	})
	require.NoError(t, err)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	require.NoError(t, app.Start(ctx))

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer shutdownCancel()

	require.NoError(t, app.Stop(shutdownCtx))
}

func TestApp_Start_WhenAlreadyStarted_ExpectError(t *testing.T) {
	dir := t.TempDir()
	configPath := filepath.Join(dir, "config.json")

	app, err := New(Options{
		ConfigPath: configPath,
		Addr:       randomListenAddr(t),
	})
	require.NoError(t, err)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	require.NoError(t, app.Start(ctx))
	require.Error(t, app.Start(ctx))

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer shutdownCancel()
	require.NoError(t, app.Stop(shutdownCtx))
}

func randomListenAddr(t *testing.T) string {
	t.Helper()

	ln, err := net.Listen("tcp", "127.0.0.1:0")
	require.NoError(t, err)
	port := ln.Addr().(*net.TCPAddr).Port
	require.NoError(t, ln.Close())

	return fmt.Sprintf("127.0.0.1:%d", port)
}
