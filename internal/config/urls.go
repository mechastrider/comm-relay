package config

import (
	"fmt"
	"net"
	"strconv"
)

// AdminBaseURL returns the admin panel URL for loopback clients (desktop window, docs).
func AdminBaseURL(cfg *Config) string {
	return fmt.Sprintf("http://127.0.0.1:%d/", cfg.ServerPort)
}

// HealthURL returns the health check URL for the configured server port.
func HealthURL(cfg *Config) string {
	return fmt.Sprintf("http://127.0.0.1:%d/health", cfg.ServerPort)
}

// AdminBaseURLForListenAddr derives the admin URL when HTTP listen addr overrides config port.
func AdminBaseURLForListenAddr(listenAddr string, cfg *Config) string {
	port := cfg.ServerPort
	if listenAddr != "" {
		if _, p, err := net.SplitHostPort(listenAddr); err == nil {
			if parsed, err := strconv.Atoi(p); err == nil {
				port = parsed
			}
		}
	}

	return fmt.Sprintf("http://127.0.0.1:%d/", port)
}

// HealthURLForListenAddr derives the health URL for a listen address override.
func HealthURLForListenAddr(listenAddr string, cfg *Config) string {
	base := AdminBaseURLForListenAddr(listenAddr, cfg)
	return base[:len(base)-1] + "/health"
}
