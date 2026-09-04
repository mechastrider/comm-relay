package config

import (
	"encoding/json"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/muonsoft/errors"
	"github.com/stretchr/testify/require"
)

func TestLoad_WhenMissingFile_ExpectDefaultsAndCreatesFile(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")

	cfg, err := Load(path)
	require.NoError(t, err)
	require.Equal(t, Default(), cfg)

	data, err := os.ReadFile(path)
	require.NoError(t, err)

	var onDisk Config
	require.NoError(t, json.Unmarshal(data, &onDisk))
	require.Equal(t, cfg.ServerPort, onDisk.ServerPort)
	require.Equal(t, cfg.Overlay.MaxMessages, onDisk.Overlay.MaxMessages)
	require.Equal(t, cfg.Admin.MessageSound, onDisk.Admin.MessageSound)
	require.Equal(t, TimeLocaleRussian, onDisk.Admin.TimeLocale)
}

func TestLoad_WhenValidFile_ExpectParsed(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	require.NoError(t, os.WriteFile(path, []byte(`{
  "server_port": 19000,
  "twitch": { "enabled": true, "channel": "streamer" },
  "youtube": { "enabled": false },
  "vk": { "enabled": false },
  "overlay": { "max_messages": 10, "message_ttl_seconds": 5 }
}
`), 0o644))

	cfg, err := Load(path)
	require.NoError(t, err)
	require.Equal(t, 19000, cfg.ServerPort)
	require.True(t, cfg.Twitch.Enabled)
	require.Equal(t, "streamer", cfg.Twitch.Channel)
	require.Equal(t, 10, cfg.Overlay.MaxMessages)
	require.Equal(t, OverlayThemeDefault, cfg.Overlay.Theme)
}

func TestLoad_WhenInvalidJSON_ExpectError(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	require.NoError(t, os.WriteFile(path, []byte(`{`), 0o644))

	_, err := Load(path)
	require.Error(t, err)
}

func TestValidate_WhenTwitchEnabledWithoutChannel_ExpectInvalidConfig(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Twitch.Enabled = true

	err := cfg.Validate()
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrInvalidConfig))
}

func TestValidate_WhenVKEnabledWithoutChannel_ExpectInvalidConfig(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.VK.Enabled = true

	err := cfg.Validate()
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrInvalidConfig))
}

func TestSave_WhenRoundTrip_ExpectEqual(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")

	original := Default()
	original.ServerPort = 18080
	original.Twitch.Channel = "example"

	require.NoError(t, original.Save(path))

	loaded, err := Load(path)
	require.NoError(t, err)
	require.Equal(t, original.ServerPort, loaded.ServerPort)
	require.Equal(t, original.Twitch.Channel, loaded.Twitch.Channel)
}

func TestListenAddr_WhenDefaultPort_ExpectFormattedAddr(t *testing.T) {
	t.Parallel()

	cfg := Default()
	require.Equal(t, ":17877", cfg.ListenAddr())
}

func TestApplyDefaults_WhenOverlayFieldsOmitted_ExpectOverlayDefaults(t *testing.T) {
	t.Parallel()

	cfg := &Config{
		ServerPort: 17877,
		Overlay: OverlayConfig{
			MaxMessages:       10,
			MessageTTLSeconds: 5,
		},
	}
	cfg.ApplyDefaults()

	require.Equal(t, 18, cfg.Overlay.FontSizePx)
	require.Equal(t, OverlayDisplayModeNormal, cfg.Overlay.DisplayMode)
	require.Equal(t, OverlayThemeDefault, cfg.Overlay.Theme)
	require.Equal(t, TimeLocaleRussian, cfg.Admin.TimeLocale)
}

func TestValidate_WhenAdminTimeLocaleInvalid_ExpectInvalidConfig(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Admin.TimeLocale = "browser"

	err := cfg.Validate()
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrInvalidConfig))
	require.Contains(t, ValidationFields(err), "admin_time_locale")
}

func TestValidate_WhenOverlayFontSizeOutOfRange_ExpectInvalidConfig(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Overlay.FontSizePx = 8

	err := cfg.Validate()
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrInvalidConfig))
}

func TestValidate_WhenOverlayDisplayModeInvalid_ExpectInvalidConfig(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Overlay.DisplayMode = "dense"

	err := cfg.Validate()
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrInvalidConfig))
}

func TestValidate_WhenOverlayThemeKnown_ExpectValid(t *testing.T) {
	t.Parallel()

	themes := []string{
		OverlayThemeDefault,
		OverlayThemeDashboard,
		OverlayThemeCockpitPanel,
		OverlayThemeCockpitPopups,
		OverlayThemeGRebelsPopups,
	}

	for _, theme := range themes {
		t.Run(theme, func(t *testing.T) {
			cfg := Default()
			cfg.Overlay.Theme = theme

			require.NoError(t, cfg.Validate())
		})
	}
}

func TestValidate_WhenOverlayThemeInvalid_ExpectInvalidConfig(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.Overlay.Theme = "terminal"

	err := cfg.Validate()
	require.Error(t, err)
	require.True(t, errors.Is(err, ErrInvalidConfig))
}

func TestLoad_WhenLegacyWithoutStatsFields_ExpectDefaults(t *testing.T) {
	t.Parallel()

	dir := t.TempDir()
	path := filepath.Join(dir, "config.json")
	require.NoError(t, os.WriteFile(path, []byte(`{
  "server_port": 19000,
  "twitch": { "enabled": true, "channel": "streamer" },
  "overlay": { "max_messages": 10, "message_ttl_seconds": 5 }
}`), 0o644))

	cfg, err := Load(path)
	require.NoError(t, err)
	require.Equal(t, 19000, cfg.ServerPort)
	require.Equal(t, 300, cfg.ActivityIntervalSeconds)
	require.Equal(t, 10, cfg.ActivitySessionLimit)
	require.Equal(t, 1, cfg.ActivityXP)
	require.Equal(t, 6, cfg.DayResetHour)
	require.True(t, cfg.Twitch.Enabled)
	require.Equal(t, "streamer", cfg.Twitch.Channel)
	require.Equal(t, 10, cfg.Overlay.MaxMessages)
}

func TestValidate_WhenDayResetHourOutOfRange_ExpectFieldError(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.DayResetHour = 24

	err := cfg.Validate()
	require.Error(t, err)
	fields := ValidationFields(err)
	require.Contains(t, fields, "day_reset_hour")
}

func TestValidate_WhenNegativeActivityXP_ExpectFieldError(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.ActivityXP = -1

	err := cfg.Validate()
	require.Error(t, err)
	fields := ValidationFields(err)
	require.Contains(t, fields, "activity_xp")
}

func TestValidate_WhenDayResetHourZero_ExpectValid(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.DayResetHour = 0

	require.NoError(t, cfg.Validate())
}

func TestValidate_WhenStreamerDisplayNameOverlong_ExpectFieldError(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.StreamerDisplayName = strings.Repeat("a", 65)

	err := cfg.Validate()
	require.Error(t, err)
	fields := ValidationFields(err)
	require.Contains(t, fields, "streamer_display_name")
}

func TestApplyDefaults_WhenStreamerDisplayNameHasWhitespace_ExpectTrimmed(t *testing.T) {
	t.Parallel()

	cfg := Default()
	cfg.StreamerDisplayName = "  Jake  "
	cfg.ApplyDefaults()

	require.Equal(t, "Jake", cfg.StreamerDisplayName)
}

func TestPublic_WhenStreamerDisplayNameDefault_ExpectEmptyString(t *testing.T) {
	t.Parallel()

	public := Default().Public()
	require.Equal(t, "", public.StreamerDisplayName)
}
