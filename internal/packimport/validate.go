package packimport

import (
	"fmt"
	"os"
	"regexp"
	"strings"

	"github.com/mechastrider/comm-relay/internal/store"
)

var commandTriggerPattern = regexp.MustCompile(`^[a-z0-9_]{1,32}$`)

var allowedSounds = map[string]bool{
	"":      true,
	"chime": true,
	"ping":  true,
	"soft":  true,
	"alert": true,
}

// ValidatePack checks pack metadata, command fields, and referenced image files.
func ValidatePack(pack *Pack) error {
	if pack == nil {
		return fmt.Errorf("pack is nil")
	}
	if err := validateSchema(pack); err != nil {
		return err
	}

	for i, cmd := range pack.ResolvedCommands() {
		if err := validateResolvedCommand(i, cmd); err != nil {
			return err
		}
	}

	return nil
}

func validateResolvedCommand(index int, cmd ResolvedCommand) error {
	prefix := fmt.Sprintf("commands[%d]", index)

	if err := validateTrigger(cmd.Trigger); err != nil {
		return fmt.Errorf("%s: %w", prefix, err)
	}
	if strings.TrimSpace(cmd.ID) == "" {
		return fmt.Errorf("%s: id is required after defaults merge", prefix)
	}

	action, err := normalizeAction(cmd.Action)
	if err != nil {
		return fmt.Errorf("%s: %w", prefix, err)
	}

	if action == store.CommandActionAlert {
		if cmd.SplashTemplate == "" {
			return fmt.Errorf("%s: splash is required for alert commands", prefix)
		}
		if !allowedSounds[cmd.Sound] {
			return fmt.Errorf("%s: invalid sound %q", prefix, cmd.Sound)
		}
		if cmd.CooldownSeconds < 0 {
			return fmt.Errorf("%s: cooldown_seconds must be non-negative", prefix)
		}
		if cmd.ImagePath == "" {
			return fmt.Errorf("%s: image is required for alert commands", prefix)
		}
		if _, err := os.Stat(cmd.ImagePath); err != nil {
			return fmt.Errorf("%s: image file: %w", prefix, err)
		}
	}

	if msg := store.ValidateCatalogLayoutField(cmd.Layout); msg != "" {
		return fmt.Errorf("%s: %s", prefix, msg)
	}
	if msg := store.ValidateCatalogImageFitField(cmd.ImageFit); msg != "" {
		return fmt.Errorf("%s: %s", prefix, msg)
	}
	if msg := store.ValidateCatalogSoundVolumeField(cmd.SoundVolume); msg != "" {
		return fmt.Errorf("%s: %s", prefix, msg)
	}
	if msg := store.ValidateCatalogImageSizePctField(cmd.ImageSizePct); msg != "" {
		return fmt.Errorf("%s: %s", prefix, msg)
	}

	return nil
}

func validateTrigger(trigger string) error {
	if trigger == "" {
		return fmt.Errorf("trigger is required")
	}
	if strings.Contains(trigger, "!") {
		return fmt.Errorf("trigger must not contain an exclamation mark")
	}
	if strings.ContainsAny(trigger, " \t") {
		return fmt.Errorf("trigger must not contain whitespace")
	}
	if !commandTriggerPattern.MatchString(trigger) {
		return fmt.Errorf("trigger %q must match %s", trigger, commandTriggerPattern.String())
	}
	return nil
}

func normalizeAction(action string) (string, error) {
	action = strings.TrimSpace(strings.ToLower(action))
	if action == "" {
		return store.CommandActionAlert, nil
	}
	switch action {
	case store.CommandActionAlert, store.CommandActionShowLeaderboard:
		return action, nil
	default:
		return "", fmt.Errorf("invalid action %q", action)
	}
}
