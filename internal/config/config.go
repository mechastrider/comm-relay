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
	ServerPort int           `json:"server_port"`
	Twitch     TwitchConfig  `json:"twitch"`
	YouTube    YouTubeConfig `json:"youtube"`
	VK         VKConfig      `json:"vk"`
	Overlay    OverlayConfig `json:"overlay"`
	Admin      AdminConfig   `json:"admin"`
}

// TwitchConfig holds Twitch connector settings.
type TwitchConfig struct {
	Enabled bool   `json:"enabled"`
	Channel string `json:"channel"`
}

// VKConfig holds VK Live / VK Video connector settings.
type VKConfig struct {
	Enabled bool   `json:"enabled"`
	Channel string `json:"channel"`
}

// Overlay display density modes.
const (
	OverlayDisplayModeNormal  = "normal"
	OverlayDisplayModeCompact = "compact"
)

// Overlay visual themes.
const (
	OverlayThemeDefault   = "default"
	OverlayThemeDashboard = "dashboard"
)

// OverlayConfig controls OBS overlay appearance and message retention.
type OverlayConfig struct {
	MaxMessages       int                 `json:"max_messages"`
	MessageTTLSeconds int                 `json:"message_ttl_seconds"`
	FontSizePx        int                 `json:"font_size_px"`
	DisplayMode       string              `json:"display_mode"`
	Theme             string              `json:"theme"`
	ImagePreviews     ImagePreviewsConfig `json:"image_previews"`
}

// Default returns safe prototype defaults.
func Default() *Config {
	return &Config{
		ServerPort: 17877,
		Twitch: TwitchConfig{
			Enabled: false,
			Channel: "",
		},
		YouTube: YouTubeConfig{Enabled: false},
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
			ImagePreviews:     defaultImagePreviews(),
		},
		Admin: AdminConfig{
			MessageSound: defaultMessageSound(),
		},
	}
}

// ApplyDefaults fills in settings omitted from older config.json files.
func (c *Config) ApplyDefaults() {
	def := Default()
	if c.Overlay.FontSizePx < 1 {
		c.Overlay.FontSizePx = def.Overlay.FontSizePx
	}
	if c.Overlay.DisplayMode == "" {
		c.Overlay.DisplayMode = def.Overlay.DisplayMode
	}
	if c.Overlay.Theme == "" {
		c.Overlay.Theme = def.Overlay.Theme
	}
	c.Overlay.ImagePreviews.applyDefaults()
	c.Admin.MessageSound.applyDefaults()
}

// ListenAddr returns the HTTP listen address for ServerPort.
func (c *Config) ListenAddr() string {
	return fmt.Sprintf(":%d", c.ServerPort)
}

// Validate checks settings after load or before save.
func (c *Config) Validate() error {
	if c.ServerPort < 1 || c.ServerPort > 65535 {
		return errors.Errorf("%w: server_port must be between 1 and 65535", ErrInvalidConfig)
	}
	if c.Overlay.MaxMessages < 1 {
		return errors.Errorf("%w: overlay.max_messages must be at least 1", ErrInvalidConfig)
	}
	if c.Overlay.MessageTTLSeconds < 0 {
		return errors.Errorf("%w: overlay.message_ttl_seconds must be non-negative", ErrInvalidConfig)
	}
	if c.Overlay.FontSizePx < 12 || c.Overlay.FontSizePx > 32 {
		return errors.Errorf("%w: overlay.font_size_px must be between 12 and 32", ErrInvalidConfig)
	}
	switch c.Overlay.DisplayMode {
	case OverlayDisplayModeNormal, OverlayDisplayModeCompact:
	default:
		return errors.Errorf(
			"%w: overlay.display_mode must be %q or %q",
			ErrInvalidConfig,
			OverlayDisplayModeNormal,
			OverlayDisplayModeCompact,
		)
	}
	switch c.Overlay.Theme {
	case OverlayThemeDefault, OverlayThemeDashboard:
	default:
		return errors.Errorf(
			"%w: overlay.theme must be %q or %q",
			ErrInvalidConfig,
			OverlayThemeDefault,
			OverlayThemeDashboard,
		)
	}
	if err := c.Overlay.ImagePreviews.validate(); err != nil {
		return err
	}
	if c.Twitch.Enabled && c.Twitch.Channel == "" {
		return errors.Errorf("%w: twitch.channel is required when twitch is enabled", ErrInvalidConfig)
	}
	if c.VK.Enabled && strings.TrimSpace(c.VK.Channel) == "" {
		return errors.Errorf("%w: vk.channel is required when vk is enabled", ErrInvalidConfig)
	}
	if err := c.Admin.MessageSound.validate(); err != nil {
		return err
	}
	return nil
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

	cfg.ApplyDefaults()

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

// Save writes config to path using a temp file and atomic rename.
func (c *Config) Save(path string) error {
	if err := c.Validate(); err != nil {
		return err
	}

	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return errors.Errorf("marshal config: %w", err)
	}
	data = append(data, '\n')

	dir := filepath.Dir(path)
	if dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return errors.Errorf("create config directory: %w", err, errors.String("path", dir))
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
