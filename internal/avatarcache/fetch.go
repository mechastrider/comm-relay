package avatarcache

import (
	"context"
	"io"
	"net"
	"net/http"
	"time"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/overlayassets"
)

const maxRedirects = 5

// Fetch downloads a validated remote avatar URL with redirect re-checks.
func Fetch(ctx context.Context, client *http.Client, rawURL string) ([]byte, error) {
	if client == nil {
		return nil, errors.New("http client is required")
	}
	if !ValidateFetchURL(rawURL) {
		return nil, errors.New("avatar fetch url rejected")
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, rawURL, nil)
	if err != nil {
		return nil, errors.Errorf("create avatar fetch request: %w", err)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, errors.Errorf("fetch avatar: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, errors.Errorf("avatar fetch status %d", resp.StatusCode)
	}

	body, err := readAvatarBody(resp.Body, overlayassets.MaxViewerAvatarBytes)
	if err != nil {
		return nil, err
	}
	if err := overlayassets.ValidateViewerAvatar(body); err != nil {
		return nil, errors.Errorf("validate fetched avatar: %w", err)
	}

	return body, nil
}

func readAvatarBody(body io.Reader, maxBytes int) ([]byte, error) {
	data, err := io.ReadAll(io.LimitReader(body, int64(maxBytes)+1))
	if err != nil {
		return nil, errors.Errorf("read avatar body: %w", err)
	}
	if len(data) > maxBytes {
		return nil, errors.Errorf("avatar exceeds %d bytes", maxBytes)
	}
	if len(data) == 0 {
		return nil, errors.New("avatar body is empty")
	}
	return data, nil
}

// NewHTTPClient returns a client that re-validates every redirect target and resolved IP.
func NewHTTPClient(timeout time.Duration) *http.Client {
	dialer := &net.Dialer{Timeout: timeout}
	transport := &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			dialAddr, err := publicDialAddr(ctx, net.DefaultResolver, addr)
			if err != nil {
				return nil, err
			}
			return dialer.DialContext(ctx, network, dialAddr)
		},
	}

	return &http.Client{
		Timeout:   timeout,
		Transport: transport,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= maxRedirects {
				return errors.New("avatar fetch exceeded redirect limit")
			}
			if !ValidateFetchURL(req.URL.String()) {
				return errors.New("avatar fetch redirect rejected")
			}
			return nil
		},
	}
}

// PublicDialAddr resolves addr to a public IP target suitable for avatar fetching.
func PublicDialAddr(ctx context.Context, resolver ipAddrResolver, addr string) (string, error) {
	return publicDialAddr(ctx, resolver, addr)
}

type ipAddrResolver interface {
	LookupIPAddr(ctx context.Context, host string) ([]net.IPAddr, error)
}

func publicDialAddr(ctx context.Context, resolver ipAddrResolver, addr string) (string, error) {
	host, port, err := net.SplitHostPort(addr)
	if err != nil {
		return "", errors.Errorf("parse avatar fetch address: %w", err)
	}

	if ip := net.ParseIP(host); ip != nil {
		if !isPublicIP(ip) {
			return "", errors.New("avatar fetch address is not public")
		}
		return addr, nil
	}

	ips, err := resolver.LookupIPAddr(ctx, host)
	if err != nil {
		return "", errors.Errorf("resolve avatar fetch host: %w", err)
	}
	if len(ips) == 0 {
		return "", errors.New("avatar fetch host resolved to no addresses")
	}

	var targetIP string
	for _, resolved := range ips {
		if !isPublicIP(resolved.IP) {
			return "", errors.New("avatar fetch host resolved to private address")
		}
		if targetIP == "" {
			targetIP = resolved.IP.String()
		}
	}

	return net.JoinHostPort(targetIP, port), nil
}
