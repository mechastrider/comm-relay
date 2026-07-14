package netproxy

import (
	"context"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/muonsoft/errors"
	"golang.org/x/net/proxy"
	"google.golang.org/grpc"

	"github.com/mechastrider/comm-relay/internal/config"
)

// DialContext returns a dial function. Nil cfg uses direct TCP.
func DialContext(cfg *config.SOCKS5Config) (func(context.Context, string, string) (net.Conn, error), error) {
	if cfg == nil {
		return directDialContext, nil
	}

	address := strings.TrimSpace(cfg.Address)
	if address == "" {
		return nil, errors.New("socks5 address is required")
	}

	var auth *proxy.Auth
	if cfg.Username != "" || cfg.Password != "" {
		auth = &proxy.Auth{
			User:     cfg.Username,
			Password: cfg.Password,
		}
	}

	socksDialer, err := proxy.SOCKS5("tcp", address, auth, proxy.Direct)
	if err != nil {
		return nil, errors.Errorf("create socks5 dialer: %w", err)
	}

	contextDialer, ok := socksDialer.(proxy.ContextDialer)
	if !ok {
		return nil, errors.New("socks5 dialer does not support context")
	}

	return func(ctx context.Context, network, addr string) (net.Conn, error) {
		if shouldBypassProxy(addr) {
			return directDialContext(ctx, network, addr)
		}
		conn, err := contextDialer.DialContext(ctx, network, addr)
		if err != nil {
			return nil, errors.Errorf("dial via socks5: %w", err)
		}
		return conn, nil
	}, nil
}

// HTTPTransport builds an HTTP transport. Nil cfg uses the default direct dialer.
func HTTPTransport(cfg *config.SOCKS5Config) (*http.Transport, error) {
	dialContext, err := DialContext(cfg)
	if err != nil {
		return nil, err
	}

	return &http.Transport{
		Proxy:       nil,
		DialContext: dialContext,
	}, nil
}

// HTTPClient returns an HTTP client with the given timeout.
func HTTPClient(cfg *config.SOCKS5Config, timeout time.Duration) (*http.Client, error) {
	transport, err := HTTPTransport(cfg)
	if err != nil {
		return nil, err
	}

	return &http.Client{
		Timeout:   timeout,
		Transport: transport,
	}, nil
}

// WebSocketDialer returns a WebSocket dialer. Nil cfg uses direct TCP.
func WebSocketDialer(cfg *config.SOCKS5Config, handshakeTimeout time.Duration) (*websocket.Dialer, error) {
	dialContext, err := DialContext(cfg)
	if err != nil {
		return nil, err
	}

	return &websocket.Dialer{
		Proxy:            http.ProxyFromEnvironment,
		HandshakeTimeout: handshakeTimeout,
		NetDialContext:   dialContext,
	}, nil
}

// GRPCDialOptions returns gRPC dial options for SOCKS5. Nil cfg uses direct dial.
func GRPCDialOptions(cfg *config.SOCKS5Config) ([]grpc.DialOption, error) {
	dialContext, err := DialContext(cfg)
	if err != nil {
		return nil, err
	}

	return []grpc.DialOption{
		grpc.WithContextDialer(func(ctx context.Context, addr string) (net.Conn, error) {
			return dialContext(ctx, "tcp", addr)
		}),
	}, nil
}

func directDialContext(ctx context.Context, network, addr string) (net.Conn, error) {
	dialer := &net.Dialer{}
	conn, err := dialer.DialContext(ctx, network, addr)
	if err != nil {
		return nil, errors.Errorf("dial: %w", err)
	}
	return conn, nil
}

func shouldBypassProxy(addr string) bool {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		host = addr
	}

	host = strings.Trim(host, "[]")
	switch strings.ToLower(host) {
	case "localhost", "127.0.0.1", "::1":
		return true
	default:
		return false
	}
}
