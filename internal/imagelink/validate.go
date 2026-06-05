package imagelink

import (
	"net"
	"net/netip"
	"net/url"
	"strings"
)

var imageExtensions = []string{".png", ".jpg", ".jpeg", ".gif", ".webp", ".avif"}

// ValidateURL checks whether rawURL is safe to expose as an overlay image preview.
// The backend must never fetch the URL; this only gates client-side rendering metadata.
func ValidateURL(rawURL string, allowedHosts []string) bool {
	parsed, ok := parseHTTPSURL(rawURL)
	if !ok {
		return false
	}
	if !hostAllowed(parsed.Hostname(), allowedHosts) {
		return false
	}
	return hasImageExtension(parsed)
}

func parseHTTPSURL(rawURL string) (*url.URL, bool) {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return falseURL()
	}

	parsed, err := url.Parse(rawURL)
	if err != nil || parsed == nil {
		return falseURL()
	}
	if parsed.Scheme != "https" {
		return falseURL()
	}
	if parsed.User != nil {
		return falseURL()
	}
	if parsed.Host == "" || parsed.Hostname() == "" {
		return falseURL()
	}
	if parsed.Port() != "" && parsed.Port() != "443" {
		return falseURL()
	}
	if parsed.Fragment != "" {
		return falseURL()
	}
	if !isPublicHost(parsed.Hostname()) {
		return falseURL()
	}

	return parsed, true
}

func falseURL() (*url.URL, bool) {
	return nil, false
}

func hasImageExtension(parsed *url.URL) bool {
	path := strings.ToLower(parsed.Path)
	if path == "" || path == "/" {
		return false
	}

	for _, ext := range imageExtensions {
		if strings.HasSuffix(path, ext) {
			return true
		}
	}
	return false
}

func isPublicHost(host string) bool {
	host = strings.ToLower(strings.TrimSpace(host))
	if host == "" {
		return false
	}
	if host == "localhost" || strings.HasSuffix(host, ".localhost") {
		return false
	}
	if strings.HasSuffix(host, ".local") {
		return false
	}

	if ip := net.ParseIP(host); ip != nil {
		return isPublicIP(ip)
	}

	return true
}

func isPublicIP(ip net.IP) bool {
	addr, ok := netip.AddrFromSlice(ip)
	if !ok {
		return false
	}
	if !addr.IsValid() {
		return false
	}
	if addr.IsLoopback() || addr.IsPrivate() || addr.IsLinkLocalUnicast() || addr.IsLinkLocalMulticast() {
		return false
	}
	if addr.IsMulticast() || addr.IsUnspecified() {
		return false
	}

	if addr.Is4() {
		return isPublicIPv4(addr)
	}
	return isPublicIPv6(addr)
}

func isPublicIPv4(addr netip.Addr) bool {
	// CGNAT, documentation, and benchmarking blocks.
	blocked := []string{
		"0.0.0.0/8",
		"100.64.0.0/10",
		"169.254.0.0/16",
		"192.0.0.0/24",
		"192.0.2.0/24",
		"198.18.0.0/15",
		"198.51.100.0/24",
		"203.0.113.0/24",
		"240.0.0.0/4",
	}
	return !matchesAnyPrefix(addr, blocked)
}

func isPublicIPv6(addr netip.Addr) bool {
	blocked := []string{
		"::/128",
		"::1/128",
		"100::/64",
		"2001:db8::/32",
		"fc00::/7",
		"fe80::/10",
	}
	return !matchesAnyPrefix(addr, blocked)
}

func matchesAnyPrefix(addr netip.Addr, cidrs []string) bool {
	for _, cidr := range cidrs {
		network, err := netip.ParsePrefix(cidr)
		if err != nil {
			continue
		}
		if network.Contains(addr) {
			return true
		}
	}
	return false
}

func hostAllowed(host string, allowedHosts []string) bool {
	host = strings.ToLower(strings.TrimSpace(host))
	if host == "" || len(allowedHosts) == 0 {
		return false
	}

	for _, allowed := range allowedHosts {
		allowed = strings.ToLower(strings.TrimSpace(allowed))
		if allowed == "" {
			continue
		}
		if host == allowed {
			return true
		}
		if strings.HasSuffix(host, "."+allowed) {
			return true
		}
	}
	return false
}
