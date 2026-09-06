package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/muonsoft/errors"
)

// ErrInvalidConfig is returned when loaded settings fail validation.
var ErrInvalidConfig = errors.New("invalid config")

// Config holds application settings persisted in config.json.
type Config struct {
	ServerPort              int                         `json:"server_port"`
	PointsPerMessage        int                         `json:"points_per_message,omitempty"`
	ActivityIntervalSeconds int                         `json:"activity_interval_seconds"`
	ActivitySessionLimit    int                         `json:"activity_session_limit"`
	ActivityXP              int                         `json:"activity_xp"`
	DayResetHour            int                         `json:"day_reset_hour"`
	HideCommandMessages     bool                        `json:"hide_command_messages"`
	CustomAvatarsEnabled    bool                        `json:"custom_avatars_enabled"`
	StreamerDisplayName     string                      `json:"streamer_display_name"`
	LeaderboardVisibility   LeaderboardVisibilityConfig `json:"leaderboard_visibility"`
	Network                 NetworkConfig               `json:"network"`
	Twitch                  TwitchConfig                `json:"twitch"`
	YouTube                 YouTubeConfig               `json:"youtube"`
	VK                      VKConfig                    `json:"vk"`
	Overlay                 OverlayConfig               `json:"overlay"`
	Admin                   AdminConfig                 `json:"admin"`
	Logging                 LoggingConfig               `json:"logging"`
}

// Leaderboard visibility policies.
const (
	LeaderboardVisibilityPolicyAlways    = "always"
	LeaderboardVisibilityPolicyAutomatic = "automatic"
	LeaderboardVisibilityPolicyOnRequest = "on_request"

	LeaderboardVisibilityDisplaySecondsDefault       = 15
	LeaderboardVisibilityCooldownSecondsDefault      = 300
	LeaderboardVisibilityDirtyIntervalSecondsDefault = 900
)

// LeaderboardVisibilityConfig controls the global production leaderboard lifecycle.
type LeaderboardVisibilityConfig struct {
	Policy               string `json:"policy"`
	DisplaySeconds       int    `json:"display_seconds"`
	CooldownSeconds      int    `json:"cooldown_seconds"`
	DirtyIntervalSeconds int    `json:"dirty_interval_seconds"`
	ShowOnAward          bool   `json:"show_on_award"`
	ShowOnRankChange     bool   `json:"show_on_rank_change"`
}

func defaultLeaderboardVisibility() LeaderboardVisibilityConfig {
	return LeaderboardVisibilityConfig{
		Policy:               LeaderboardVisibilityPolicyAutomatic,
		DisplaySeconds:       LeaderboardVisibilityDisplaySecondsDefault,
		CooldownSeconds:      LeaderboardVisibilityCooldownSecondsDefault,
		DirtyIntervalSeconds: LeaderboardVisibilityDirtyIntervalSecondsDefault,
		ShowOnAward:          true,
		ShowOnRankChange:     true,
	}
}

func legacyLeaderboardVisibility() LeaderboardVisibilityConfig {
	cfg := defaultLeaderboardVisibility()
	cfg.Policy = LeaderboardVisibilityPolicyAlways
	return cfg
}

// TwitchConfig holds Twitch connector settings.
type TwitchConfig struct {
	Enabled bool   `json:"enabled"`
	Channel string `json:"channel"`
}

// VKConfig holds VK Live / VK Video connector settings.
type VKConfig struct {
	Enabled  bool   `json:"enabled"`
	Channel  string `json:"channel"`
	UseProxy bool   `json:"use_proxy"`
}

// Overlay display density modes.
const (
	OverlayDisplayModeNormal  = "normal"
	OverlayDisplayModeCompact = "compact"
)

// Overlay visual themes.
const (
	OverlayThemeDefault       = "default"
	OverlayThemeDashboard     = "dashboard"
	OverlayThemeCockpitPanel  = "cockpit_panel"
	OverlayThemeCockpitPopups = "cockpit_popups"
	OverlayThemeGRebelsPopups = "g_rebels_popups"
)

// Overlay font size bounds (px).
const (
	OverlayFontSizeMin = 12
	OverlayFontSizeMax = 48
)

// OverlayConfig controls OBS overlay appearance and message retention.
type OverlayConfig struct {
	MaxMessages       int                 `json:"max_messages"`
	MessageTTLSeconds int                 `json:"message_ttl_seconds"`
	FontSizePx        int                 `json:"font_size_px"`
	DisplayMode       string              `json:"display_mode"`
	Theme             string              `json:"theme"`
	Emotes            EmotesConfig        `json:"emotes"`
	ImagePreviews     ImagePreviewsConfig `json:"image_previews"`
	Presets           []OverlayPreset     `json:"presets"`
	ActivePresetID    string              `json:"active_preset_id"`
	// PageOpacity is rejected when present so the overlay page stays transparent for OBS.
	PageOpacity *float64 `json:"page_opacity,omitempty"`
}

// Default returns safe prototype defaults.
func Default() *Config {
	cfg := &Config{
		ServerPort:              17877,
		ActivityIntervalSeconds: 300,
		ActivitySessionLimit:    10,
		ActivityXP:              1,
		DayResetHour:            6,
		CustomAvatarsEnabled:    true,
		LeaderboardVisibility:   defaultLeaderboardVisibility(),
		Twitch: TwitchConfig{
			Enabled: false,
			Channel: "",
		},
		YouTube: YouTubeConfig{
			Enabled:        false,
			ConnectionMode: YouTubeConnectionModePage,
			ChatMode:       YouTubeChatModeStream,
		},
		VK: VKConfig{
			Enabled: false,
			Channel: "",
		},
		Overlay: OverlayConfig{
			MaxMessages:       30,
			MessageTTLSeconds: 20,
			FontSizePx:        18,
			DisplayMode:       OverlayDisplayModeNormal,
			Theme:             OverlayThemeDefault,
			Emotes:            defaultEmotes(),
			ImagePreviews:     defaultImagePreviews(),
		},
		Admin: AdminConfig{
			MessageSound: defaultMessageSound(),
			TimeLocale:   TimeLocaleRussian,
		},
		Logging: defaultLogging(),
	}
	cfg.Overlay.EnsurePresets()
	return cfg
}

// ApplyDefaults fills in settings omitted from older config.json files.
func (c *Config) ApplyDefaults() {
	def := Default()
	if c.LeaderboardVisibility.Policy == "" {
		c.LeaderboardVisibility = def.LeaderboardVisibility
	}
	if c.Overlay.FontSizePx < 1 {
		c.Overlay.FontSizePx = def.Overlay.FontSizePx
	}
	if c.Overlay.DisplayMode == "" {
		c.Overlay.DisplayMode = def.Overlay.DisplayMode
	}
	if c.Overlay.Theme == "" {
		c.Overlay.Theme = def.Overlay.Theme
	}
	c.Overlay.Emotes.applyDefaults()
	c.Overlay.ImagePreviews.applyDefaults()
	c.Overlay.EnsurePresets()
	c.Admin.applyDefaults()
	c.Logging.applyDefaults()
	c.YouTube.ApplyYouTubeDefaults()
	c.StreamerDisplayName = strings.TrimSpace(c.StreamerDisplayName)
}

// ListenAddr returns the HTTP listen address for ServerPort.
func (c *Config) ListenAddr() string {
	return fmt.Sprintf(":%d", c.ServerPort)
}

// Validate checks settings after load or before save.
func (c *Config) Validate() error {
	return c.validateFields()
}

// Load reads config from path. If the file is missing, defaults are written and returned.
func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			cfg := Default()
			if saveErr := cfg.Save(path); saveErr != nil {
				return nil, saveErr
			}
			return cfg, nil
		}
		return nil, errors.Errorf("read config: %w", err, errors.String("path", path))
	}

	cfg := Default()
	if err := json.Unmarshal(data, cfg); err != nil {
		return nil, errors.Errorf("parse config: %w", err, errors.String("path", path))
	}

	if !overlayPresetsPresent(data) {
		cfg.Overlay.Presets = nil
		cfg.Overlay.ActivePresetID = ""
	}

	cfg.ApplyDefaults()
	cfg.PointsPerMessage = 0
	if !activitySettingsPresent(data) {
		def := Default()
		cfg.ActivityIntervalSeconds = def.ActivityIntervalSeconds
		cfg.ActivitySessionLimit = def.ActivitySessionLimit
		cfg.ActivityXP = def.ActivityXP
	}
	if !overlayEmotesPresent(data) {
		cfg.Overlay.Emotes = defaultEmotes()
	}
	if !customAvatarsEnabledPresent(data) {
		cfg.CustomAvatarsEnabled = true
	}
	if !leaderboardVisibilityPresent(data) {
		cfg.LeaderboardVisibility = legacyLeaderboardVisibility()
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func leaderboardVisibilityPresent(data []byte) bool {
	var doc struct {
		LeaderboardVisibility *json.RawMessage `json:"leaderboard_visibility"`
	}
	if err := json.Unmarshal(data, &doc); err != nil {
		return false
	}
	return doc.LeaderboardVisibility != nil
}

func overlayEmotesPresent(data []byte) bool {
	var doc struct {
		Overlay *struct {
			Emotes *json.RawMessage `json:"emotes"`
		} `json:"overlay"`
	}
	if err := json.Unmarshal(data, &doc); err != nil {
		return false
	}
	return doc.Overlay != nil && doc.Overlay.Emotes != nil
}

func activitySettingsPresent(data []byte) bool {
	var doc struct {
		ActivityIntervalSeconds *json.RawMessage `json:"activity_interval_seconds"`
		ActivitySessionLimit    *json.RawMessage `json:"activity_session_limit"`
		ActivityXP              *json.RawMessage `json:"activity_xp"`
	}
	if err := json.Unmarshal(data, &doc); err != nil {
		return false
	}
	return doc.ActivityIntervalSeconds != nil ||
		doc.ActivitySessionLimit != nil ||
		doc.ActivityXP != nil
}

func customAvatarsEnabledPresent(data []byte) bool {
	var doc struct {
		CustomAvatarsEnabled *json.RawMessage `json:"custom_avatars_enabled"`
	}
	if err := json.Unmarshal(data, &doc); err != nil {
		return false
	}
	return doc.CustomAvatarsEnabled != nil
}

func overlayPresetsPresent(data []byte) bool {
	var doc struct {
		Overlay *struct {
			Presets *json.RawMessage `json:"presets"`
		} `json:"overlay"`
	}
	if err := json.Unmarshal(data, &doc); err != nil {
		return false
	}
	return doc.Overlay != nil && doc.Overlay.Presets != nil
}

// Save writes config to path using a temp file and atomic rename.
func (c *Config) Save(path string) error {
	if err := c.Validate(); err != nil {
		return err
	}

	c.PointsPerMessage = 0
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return errors.Errorf("marshal config: %w", err)
	}
	data = append(data, '\n')

	dir := filepath.Dir(path)
	if dir != "" && dir != "." {
		if mkdirErr := os.MkdirAll(dir, 0o755); mkdirErr != nil {
			return errors.Errorf("create config directory: %w", mkdirErr, errors.String("path", dir))
		}
	}

	tmp, err := os.CreateTemp(dir, filepath.Base(path)+".*.tmp")
	if err != nil {
		return errors.Errorf("create temp config: %w", err, errors.String("path", path))
	}
	tmpPath := tmp.Name()

	cleanup := func() {
		_ = tmp.Close()
		_ = os.Remove(tmpPath)
	}

	if _, err := tmp.Write(data); err != nil {
		cleanup()
		return errors.Errorf("write temp config: %w", err, errors.String("path", tmpPath))
	}
	if err := tmp.Close(); err != nil {
		cleanup()
		return errors.Errorf("close temp config: %w", err, errors.String("path", tmpPath))
	}

	if err := os.Rename(tmpPath, path); err != nil {
		_ = os.Remove(tmpPath)
		return errors.Errorf("rename config: %w", err, errors.String("path", path))
	}

	return nil
}
