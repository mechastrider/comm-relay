package avatarcache

import (
	"net"
	"net/netip"
	"net/url"
	"strings"
)

// ValidateFetchURL reports whether rawURL is safe for server-side avatar fetching.
func ValidateFetchURL(rawURL string) bool {
	parsed, ok := parseHTTPSURL(rawURL)
	if !ok {
		return false
	}
	return isPublicHost(parsed.Hostname())
}

func parseHTTPSURL(rawURL string) (*url.URL, bool) {
	rawURL = strings.TrimSpace(rawURL)
	if rawURL == "" {
		return nil, false
	}

	parsed, err := url.Parse(rawURL)
	if err != nil || parsed == nil {
		return nil, false
	}
	if parsed.Scheme != "https" {
		return nil, false
	}
	if parsed.User != nil {
		return nil, false
	}
	if parsed.Host == "" || parsed.Hostname() == "" {
		return nil, false
	}
	if parsed.Fragment != "" {
		return nil, false
	}
	if !isPublicHost(parsed.Hostname()) {
		return nil, false
	}

	return parsed, true
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
