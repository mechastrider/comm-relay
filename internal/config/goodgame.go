package config

import (
	"net/url"
	"regexp"
	"strings"
)

// GoodGameConfig selects one public stream chat.
type GoodGameConfig struct {
	Enabled bool   `json:"enabled"`
	Channel string `json:"channel"`
}

var goodGameKey = regexp.MustCompile(`^[\pL\pN_-][\pL\pN_.-]*$`)

// ChannelKey accepts a channel key or GoodGame channel page URL.
func (c GoodGameConfig) ChannelKey() string {
	key := strings.TrimSpace(c.Channel)
	if strings.HasPrefix(key, "goodgame.ru/") || strings.HasPrefix(key, "www.goodgame.ru/") {
		key = "https://" + key
	}
	if strings.Contains(key, "://") {
		u, err := url.Parse(key)
		if err != nil || (u.Scheme != "https" && u.Scheme != "http") || u.User != nil {
			return ""
		}
		if !strings.EqualFold(u.Host, "goodgame.ru") && !strings.EqualFold(u.Host, "www.goodgame.ru") {
			return ""
		}
		key = strings.TrimPrefix(strings.Trim(u.Path, "/"), "channel/")
	}
	if !goodGameKey.MatchString(key) {
		return ""
	}
	return key
}
