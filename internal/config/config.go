package config

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

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
	Logging    LoggingConfig `json:"logging"`
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
	OverlayThemeDefault       = "default"
	OverlayThemeDashboard     = "dashboard"
	OverlayThemeCockpitPanel  = "cockpit_panel"
	OverlayThemeCockpitPopups = "cockpit_popups"
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
}

// Default returns safe prototype defaults.
func Default() *Config {
	return &Config{
		ServerPort: 17877,
		Twitch: TwitchConfig{
			Enabled: false,
			Channel: "",
		},
		YouTube: YouTubeConfig{
			Enabled:  false,
			ChatMode: YouTubeChatModeStream,
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
		},
		Logging: defaultLogging(),
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
	c.Overlay.Emotes.applyDefaults()
	c.Overlay.ImagePreviews.applyDefaults()
	c.Admin.MessageSound.applyDefaults()
	c.Logging.applyDefaults()
	c.YouTube.ApplyYouTubeDefaults()
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

	cfg.ApplyDefaults()
	if !overlayEmotesPresent(data) {
		cfg.Overlay.Emotes = defaultEmotes()
	}

	if err := cfg.Validate(); err != nil {
		return nil, err
	}

	return cfg, nil
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
