package config

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestAdminBaseURLForListenAddr_WhenPortOnly_ExpectLoopbackURL(t *testing.T) {
	cfg := Default()
	require.Equal(t, "http://127.0.0.1:17877/", AdminBaseURLForListenAddr(":17877", cfg))
	require.Equal(t, "http://127.0.0.1:17877/health", HealthURLForListenAddr(":17877", cfg))
}

func TestAdminBaseURLForListenAddr_WhenExplicitHostPort_ExpectParsedPort(t *testing.T) {
	cfg := Default()
	require.Equal(t, "http://127.0.0.1:19000/", AdminBaseURLForListenAddr("0.0.0.0:19000", cfg))
}
