package config

import (
	"testing"

	"github.com/stretchr/testify/require"
)

func TestEffectiveSOCKS5_WhenUseProxyFalse_ExpectNil(t *testing.T) {
	global := SOCKS5Config{Address: "127.0.0.1:1080", Username: "u", Password: "p"}

	require.Nil(t, EffectiveSOCKS5(global, false))
}

func TestEffectiveSOCKS5_WhenUseProxyTrue_ExpectCopy(t *testing.T) {
	global := SOCKS5Config{Address: "127.0.0.1:1080", Username: "u", Password: "p"}

	got := EffectiveSOCKS5(global, true)
	require.NotNil(t, got)
	require.Equal(t, global, *got)
}

func TestProxyRequired_WhenAnyPlatformUsesProxy_ExpectTrue(t *testing.T) {
	cfg := Default()
	require.False(t, cfg.ProxyRequired())

	cfg.YouTube.UseProxy = true
	require.True(t, cfg.ProxyRequired())

	cfg.YouTube.UseProxy = false
	cfg.VK.UseProxy = true
	require.True(t, cfg.ProxyRequired())
}

func TestMergeNetworkSOCKS5From_WhenPasswordEmpty_ExpectPreviousKept(t *testing.T) {
	prev := Default()
	prev.Network.SOCKS5.Password = "secret"

	incoming := Default()
	incoming.MergeNetworkSOCKS5From(*prev)

	require.Equal(t, "secret", incoming.Network.SOCKS5.Password)
}

func TestPublic_NetworkSOCKS5_ExpectPasswordHidden(t *testing.T) {
	cfg := Default()
	cfg.Network.SOCKS5 = SOCKS5Config{
		Address:  "127.0.0.1:1080",
		Username: "user",
		Password: "secret",
	}
	cfg.YouTube.UseProxy = true
	cfg.VK.UseProxy = true

	pub := cfg.Public()
	require.Equal(t, "127.0.0.1:1080", pub.Network.SOCKS5.Address)
	require.Equal(t, "user", pub.Network.SOCKS5.Username)
	require.True(t, pub.Network.SOCKS5.HasPassword)
	require.True(t, pub.YouTube.UseProxy)
	require.True(t, pub.VK.UseProxy)
}

func TestValidate_WhenUseProxyWithoutAddress_ExpectFieldError(t *testing.T) {
	cfg := Default()
	cfg.YouTube.UseProxy = true

	err := cfg.Validate()
	fields := ValidationFields(err)
	require.Contains(t, fields, "network_socks5_address")
}

func TestValidate_WhenUseProxyWithValidAddress_ExpectOK(t *testing.T) {
	cfg := Default()
	cfg.VK.UseProxy = true
	cfg.Network.SOCKS5.Address = "127.0.0.1:1080"

	require.NoError(t, cfg.Validate())
}
