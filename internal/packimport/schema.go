package packimport

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/muonsoft/errors"
	"gopkg.in/yaml.v3"

	"github.com/mechastrider/comm-relay/internal/store"
)

const currentSchemaVersion = 1

const packFileName = "pack.yaml"

// Pack is the machine-readable command catalog for one content pack.
type Pack struct {
	SchemaVersion int             `yaml:"schema_version"`
	Pack          PackMeta        `yaml:"pack"`
	Defaults      CommandDefaults `yaml:"defaults"`
	Greetings     []GreetingSpec  `yaml:"greetings"`
	Commands      []CommandSpec   `yaml:"commands"`
	packDir       string
}

// PackMeta describes pack identity metadata.
type PackMeta struct {
	Slug   string `yaml:"slug"`
	Title  string `yaml:"title"`
	Locale string `yaml:"locale"`
}

// CommandDefaults are applied to every command unless overridden.
type CommandDefaults struct {
	Enabled      *bool  `yaml:"enabled"`
	Action       string `yaml:"action"`
	Layout       string `yaml:"layout"`
	ImageFit     string `yaml:"image_fit"`
	SoundVolume  *int   `yaml:"sound_volume"`
	ImageSizePct *int   `yaml:"image_size_pct"`
}

// GreetingSpec is one automatic greeting entry from pack.yaml.
type GreetingSpec struct {
	ID           string `yaml:"id"`
	Enabled      *bool  `yaml:"enabled"`
	Splash       string `yaml:"splash"`
	Sound        string `yaml:"sound"`
	SoundFile    string `yaml:"sound_file"`
	DurationMs   int    `yaml:"duration_ms"`
	Layout       string `yaml:"layout"`
	ImageFit     string `yaml:"image_fit"`
	SoundVolume  *int   `yaml:"sound_volume"`
	ImageSizePct *int   `yaml:"image_size_pct"`
	Image        string `yaml:"image"`
	Audio        string `yaml:"audio"`
}

// ResolvedGreeting merges defaults and per-greeting fields for import.
type ResolvedGreeting struct {
	ID             string
	Enabled        bool
	SplashTemplate string
	Sound          string
	SoundFile      string
	DurationMs     int
	Layout         string
	ImageFit       string
	SoundVolume    int
	ImageSizePct   int
	ImagePath      string
	AudioPath      string
}

// CommandSpec is one chat command entry from pack.yaml.
type CommandSpec struct {
	ID              string `yaml:"id"`
	Trigger         string `yaml:"trigger"`
	Action          string `yaml:"action"`
	Enabled         *bool  `yaml:"enabled"`
	Splash          string `yaml:"splash"`
	Sound           string `yaml:"sound"`
	SoundFile       string `yaml:"sound_file"`
	DurationMs      int    `yaml:"duration_ms"`
	CooldownSeconds int    `yaml:"cooldown_seconds"`
	Layout          string `yaml:"layout"`
	ImageFit        string `yaml:"image_fit"`
	SoundVolume     *int   `yaml:"sound_volume"`
	ImageSizePct    *int   `yaml:"image_size_pct"`
	Image           string `yaml:"image"`
	Audio           string `yaml:"audio"`
}

// ResolvedCommand merges defaults and per-command fields for import.
type ResolvedCommand struct {
	ID              string
	Trigger         string
	Action          string
	Enabled         bool
	SplashTemplate  string
	Sound           string
	SoundFile       string
	DurationMs      int
	CooldownSeconds int
	Layout          string
	ImageFit        string
	SoundVolume     int
	ImageSizePct    int
	ImagePath       string
	AudioPath       string
}

// LoadPackDir reads pack.yaml from a pack directory.
func LoadPackDir(packDir string) (*Pack, error) {
	absDir, err := filepath.Abs(packDir)
	if err != nil {
		return nil, errors.Errorf("resolve pack directory: %w", err)
	}

	path := filepath.Join(absDir, packFileName)
	raw, err := os.ReadFile(path)
	if err != nil {
		return nil, errors.Errorf("read %s: %w", packFileName, err)
	}

	var pack Pack
	if err := yaml.Unmarshal(raw, &pack); err != nil {
		return nil, errors.Errorf("parse %s: %w", packFileName, err)
	}

	pack.packDir = absDir
	return &pack, nil
}

// Dir returns the absolute pack directory path.
func (p *Pack) Dir() string {
	return p.packDir
}

// ResolvedGreetings returns import-ready greetings with defaults applied.
func (p *Pack) ResolvedGreetings() []ResolvedGreeting {
	out := make([]ResolvedGreeting, 0, len(p.Greetings))
	for _, spec := range p.Greetings {
		out = append(out, p.resolveGreeting(spec))
	}
	return out
}

// ResolvedCommands returns import-ready commands with defaults applied.
func (p *Pack) ResolvedCommands() []ResolvedCommand {
	out := make([]ResolvedCommand, 0, len(p.Commands))
	for _, spec := range p.Commands {
		out = append(out, p.resolveCommand(spec))
	}
	return out
}

func (p *Pack) resolveGreeting(spec GreetingSpec) ResolvedGreeting {
	enabled := false
	if p.Defaults.Enabled != nil {
		enabled = *p.Defaults.Enabled
	}
	if spec.Enabled != nil {
		enabled = *spec.Enabled
	}

	layout := strings.TrimSpace(spec.Layout)
	if layout == "" {
		layout = strings.TrimSpace(p.Defaults.Layout)
	}

	imageFit := strings.TrimSpace(spec.ImageFit)
	if imageFit == "" {
		imageFit = strings.TrimSpace(p.Defaults.ImageFit)
	}

	soundVolume := 0
	if p.Defaults.SoundVolume != nil {
		soundVolume = *p.Defaults.SoundVolume
	}
	if spec.SoundVolume != nil {
		soundVolume = *spec.SoundVolume
	}

	imageSizePct := 0
	if p.Defaults.ImageSizePct != nil {
		imageSizePct = *p.Defaults.ImageSizePct
	}
	if spec.ImageSizePct != nil {
		imageSizePct = *spec.ImageSizePct
	}

	imagePath := ""
	if strings.TrimSpace(spec.Image) != "" {
		imagePath = filepath.Join(p.packDir, filepath.FromSlash(strings.TrimSpace(spec.Image)))
	}

	audioPath := ""
	if strings.TrimSpace(spec.Audio) != "" {
		audioPath = filepath.Join(p.packDir, filepath.FromSlash(strings.TrimSpace(spec.Audio)))
	}

	return ResolvedGreeting{
		ID:             strings.TrimSpace(spec.ID),
		Enabled:        enabled,
		SplashTemplate: strings.TrimSpace(spec.Splash),
		Sound:          strings.TrimSpace(spec.Sound),
		SoundFile:      strings.TrimSpace(spec.SoundFile),
		DurationMs:     spec.DurationMs,
		Layout:         layout,
		ImageFit:       imageFit,
		SoundVolume:    soundVolume,
		ImageSizePct:   imageSizePct,
		ImagePath:      imagePath,
		AudioPath:      audioPath,
	}
}

func (p *Pack) resolveCommand(spec CommandSpec) ResolvedCommand {
	enabled := true
	if p.Defaults.Enabled != nil {
		enabled = *p.Defaults.Enabled
	}
	if spec.Enabled != nil {
		enabled = *spec.Enabled
	}

	action := strings.TrimSpace(spec.Action)
	if action == "" {
		action = strings.TrimSpace(p.Defaults.Action)
	}

	layout := strings.TrimSpace(spec.Layout)
	if layout == "" {
		layout = strings.TrimSpace(p.Defaults.Layout)
	}

	imageFit := strings.TrimSpace(spec.ImageFit)
	if imageFit == "" {
		imageFit = strings.TrimSpace(p.Defaults.ImageFit)
	}

	soundVolume := 0
	if p.Defaults.SoundVolume != nil {
		soundVolume = *p.Defaults.SoundVolume
	}
	if spec.SoundVolume != nil {
		soundVolume = *spec.SoundVolume
	}

	imageSizePct := 0
	if p.Defaults.ImageSizePct != nil {
		imageSizePct = *p.Defaults.ImageSizePct
	}
	if spec.ImageSizePct != nil {
		imageSizePct = *spec.ImageSizePct
	}

	id := strings.TrimSpace(spec.ID)
	if id == "" {
		id = strings.TrimSpace(spec.Trigger)
	}

	imagePath := ""
	if strings.TrimSpace(spec.Image) != "" {
		imagePath = filepath.Join(p.packDir, filepath.FromSlash(strings.TrimSpace(spec.Image)))
	}

	audioPath := ""
	if strings.TrimSpace(spec.Audio) != "" {
		audioPath = filepath.Join(p.packDir, filepath.FromSlash(strings.TrimSpace(spec.Audio)))
	}

	return ResolvedCommand{
		ID:              id,
		Trigger:         strings.TrimSpace(spec.Trigger),
		Action:          action,
		Enabled:         enabled,
		SplashTemplate:  strings.TrimSpace(spec.Splash),
		Sound:           strings.TrimSpace(spec.Sound),
		SoundFile:       strings.TrimSpace(spec.SoundFile),
		DurationMs:      spec.DurationMs,
		CooldownSeconds: spec.CooldownSeconds,
		Layout:          layout,
		ImageFit:        imageFit,
		SoundVolume:     soundVolume,
		ImageSizePct:    imageSizePct,
		ImagePath:       imagePath,
		AudioPath:       audioPath,
	}
}

func validateSchema(pack *Pack) error {
	if pack.SchemaVersion != currentSchemaVersion {
		return fmt.Errorf("unsupported schema_version %d (expected %d)", pack.SchemaVersion, currentSchemaVersion)
	}
	if strings.TrimSpace(pack.Pack.Slug) == "" {
		return errors.New("pack.slug is required")
	}
	if len(pack.Commands) == 0 {
		return errors.New("commands must contain at least one entry")
	}

	seenTriggers := make(map[string]struct{}, len(pack.Commands))
	for i, spec := range pack.Commands {
		trigger := strings.TrimSpace(spec.Trigger)
		if trigger == "" {
			return fmt.Errorf("commands[%d]: trigger is required", i)
		}
		if _, ok := seenTriggers[trigger]; ok {
			return fmt.Errorf("commands[%d]: duplicate trigger %q", i, trigger)
		}
		seenTriggers[trigger] = struct{}{}
	}

	if len(pack.Greetings) > 0 {
		seenIDs := make(map[string]struct{}, len(pack.Greetings))
		for i, spec := range pack.Greetings {
			id := strings.TrimSpace(spec.ID)
			if id == "" {
				return fmt.Errorf("greetings[%d]: id is required", i)
			}
			if !validGreetingID(id) {
				return fmt.Errorf("greetings[%d]: invalid id %q", i, id)
			}
			if _, ok := seenIDs[id]; ok {
				return fmt.Errorf("greetings[%d]: duplicate id %q", i, id)
			}
			seenIDs[id] = struct{}{}
		}
	}

	return nil
}

func validGreetingID(id string) bool {
	return id == string(store.GreetingNewViewer) || id == string(store.GreetingReturningViewer)
}
