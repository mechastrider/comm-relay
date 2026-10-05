package store

import (
	"net/url"
	"strings"

	"github.com/muonsoft/errors"
)

// viewerRankingEligibleSQL keeps merge-hidden, manually hidden, and channel-owner rows out of rankings.
const viewerRankingEligibleSQL = `v.hidden = 0 AND v.leaderboard_hidden = 0 AND v.channel_owner = 0`

// ChannelAccounts are the operator's own channel logins, already normalized.
type ChannelAccounts struct {
	Twitch  string
	YouTube string
	VK      string
}

// NormalizeChannelToken reduces a configured channel login, handle, slug, or URL to a comparable token.
func NormalizeChannelToken(raw string) string {
	raw = strings.TrimSpace(raw)
	raw = strings.TrimPrefix(raw, "#")
	if strings.Contains(raw, "://") {
		if parsed, err := url.Parse(raw); err == nil {
			parts := strings.Split(strings.Trim(parsed.Path, "/"), "/")
			if last := parts[len(parts)-1]; last != "" {
				raw = last
			}
		}
	}
	raw = strings.TrimPrefix(raw, "@")
	raw = strings.TrimPrefix(raw, "/")
	return strings.ToLower(raw)
}

// NewChannelAccounts normalizes the configured Twitch login, YouTube handle, and VK slug.
func NewChannelAccounts(twitch, youtube, vk string) ChannelAccounts {
	return ChannelAccounts{
		Twitch:  NormalizeChannelToken(twitch),
		YouTube: NormalizeChannelToken(youtube),
		VK:      NormalizeChannelToken(vk),
	}
}

// IdentityIsChannelOwner reports whether a chat identity is the broadcasting account.
func IdentityIsChannelOwner(platform, username, displayName, userID string, badges []string, accounts ChannelAccounts) bool {
	for _, badge := range badges {
		switch strings.ToLower(strings.TrimSpace(badge)) {
		case "broadcaster", "owner":
			return true
		}
	}
	switch strings.ToLower(strings.TrimSpace(platform)) {
	case "twitch":
		return accounts.Twitch != "" && channelTokenMatches(accounts.Twitch, username, displayName, userID)
	case "youtube":
		return accounts.YouTube != "" && channelTokenMatches(accounts.YouTube, username, displayName, userID)
	case "vk":
		return accounts.VK != "" && channelTokenMatches(accounts.VK, username, displayName, userID)
	default:
		return false
	}
}

func channelTokenMatches(account, username, displayName, userID string) bool {
	return NormalizeChannelToken(username) == account ||
		NormalizeChannelToken(displayName) == account ||
		NormalizeChannelToken(userID) == account
}

// SyncChannelOwners marks existing viewers whose platform identity matches a configured channel.
// It does not clear a mark when the channel setting later changes.
func (s *Store) SyncChannelOwners(accounts ChannelAccounts) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.db == nil {
		return false, errors.New("store closed")
	}
	result, err := s.db.Exec(`
		UPDATE viewers
		SET channel_owner = 1
		WHERE channel_owner = 0
		  AND id IN (
			SELECT vi.viewer_id
			FROM viewer_identities vi
			WHERE (? != '' AND vi.platform = 'twitch' AND (
				lower(ltrim(vi.username, '@#')) = ?
				OR lower(ltrim(vi.display_name, '@#')) = ?
				OR lower(vi.user_id) = ?
			))
			OR (? != '' AND vi.platform = 'youtube' AND (
				lower(ltrim(vi.username, '@#')) = ?
				OR lower(ltrim(vi.display_name, '@#')) = ?
				OR lower(vi.user_id) = ?
			))
			OR (? != '' AND vi.platform = 'vk' AND (
				lower(ltrim(vi.username, '@#')) = ?
				OR lower(ltrim(vi.display_name, '@#')) = ?
				OR lower(vi.user_id) = ?
			))
		  )`,
		accounts.Twitch, accounts.Twitch, accounts.Twitch, accounts.Twitch,
		accounts.YouTube, accounts.YouTube, accounts.YouTube, accounts.YouTube,
		accounts.VK, accounts.VK, accounts.VK, accounts.VK,
	)
	if err != nil {
		return false, errors.Errorf("sync channel owners: %w", err)
	}
	updated, err := result.RowsAffected()
	if err != nil {
		return false, errors.Errorf("sync channel owners: %w", err)
	}
	return updated > 0, nil
}

// MarkChannelOwner marks the canonical viewer for one platform identity as the channel account.
func (s *Store) MarkChannelOwner(platform, userID string) (bool, error) {
	platform = strings.TrimSpace(platform)
	userID = strings.TrimSpace(userID)
	if platform == "" || userID == "" {
		return false, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()
	if s.db == nil {
		return false, errors.New("store closed")
	}
	result, err := s.db.Exec(`
		UPDATE viewers
		SET channel_owner = 1
		WHERE channel_owner = 0
		  AND id = (
			SELECT viewer_id FROM viewer_identities WHERE platform = ? AND user_id = ?
		  )`, platform, userID)
	if err != nil {
		return false, errors.Errorf("mark channel owner: %w", err)
	}
	updated, err := result.RowsAffected()
	if err != nil {
		return false, errors.Errorf("mark channel owner: %w", err)
	}
	return updated > 0, nil
}
