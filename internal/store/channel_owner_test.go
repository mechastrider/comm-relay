package store

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNormalizeChannelToken_WhenDecorated_ExpectComparableLogin(t *testing.T) {
	assert.Equal(t, "mechastrider", NormalizeChannelToken(" #MechaStrider "))
	assert.Equal(t, "mechastrider", NormalizeChannelToken("@MechaStrider"))
	assert.Equal(t, "mechastrider", NormalizeChannelToken("https://www.youtube.com/@MechaStrider"))
	assert.Equal(t, "", NormalizeChannelToken("   "))
}

func TestIdentityIsChannelOwner_WhenOrdinaryViewer_ExpectFalse(t *testing.T) {
	accounts := NewChannelAccounts("mechastrider", "@channel", "vk-slug")
	assert.False(t, IdentityIsChannelOwner("twitch", "alice", "Alice", "1", nil, accounts))
	assert.True(t, IdentityIsChannelOwner("twitch", "MechaStrider", "Mecha", "1", nil, accounts))
	assert.True(t, IdentityIsChannelOwner("vk", "VK-Slug", "VK", "9", nil, accounts))
	assert.False(t, IdentityIsChannelOwner("youtube", "Someone", "Someone", "UC-other", []string{"moderator"}, accounts))
}
