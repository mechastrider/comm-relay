package twitch

import (
	"sort"
	"strings"
	"time"

	"github.com/gempir/go-twitch-irc/v4"

	"github.com/mechastrider/comm-relay/internal/bus"
)

const platformTwitch = "twitch"

// MapPrivateMessage converts a Twitch IRC private message to the unified chat model.
func MapPrivateMessage(msg twitch.PrivateMessage, twitchEmotesEnabled bool) bus.ChatMessage {
	ts := msg.Time
	if ts.IsZero() {
		ts = time.Now().UTC()
	} else {
		ts = ts.UTC()
	}

	id := strings.TrimSpace(msg.ID)
	if id == "" {
		id = msg.User.ID + "-" + ts.Format(time.RFC3339Nano)
	}

	displayName := strings.TrimSpace(msg.User.DisplayName)
	if displayName == "" {
		displayName = msg.User.Name
	}

	var fragments []bus.MessageFragment
	if twitchEmotesEnabled {
		fragments = mapEmoteFragments(msg.Message, msg.Emotes)
	}

	return bus.ChatMessage{
		ID:          id,
		Platform:    platformTwitch,
		UserID:      msg.User.ID,
		Username:    msg.User.Name,
		DisplayName: displayName,
		Message:     msg.Message,
		Fragments:   fragments,
		Badges:      badgeNames(msg.User.Badges),
		Timestamp:   ts,
	}
}

func badgeNames(badges map[string]int) []string {
	if len(badges) == 0 {
		return nil
	}

	names := make([]string, 0, len(badges))
	for name := range badges {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

func normalizeChannel(channel string) string {
	channel = strings.TrimSpace(channel)
	channel = strings.TrimPrefix(channel, "#")
	return strings.ToLower(channel)
}
