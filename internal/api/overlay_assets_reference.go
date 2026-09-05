package api

import (
	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/store"
)

func overlayAssetReferenced(name string, cfg config.Config, viewerStore *store.Store) (bool, error) {
	if name == "" {
		return false, nil
	}

	for _, preset := range cfg.Overlay.Presets {
		if preset.Style.PanelImage == name {
			return true, nil
		}
	}

	if viewerStore == nil {
		return false, nil
	}

	commands, err := viewerStore.ListCommands()
	if err != nil {
		return false, errors.Errorf("list commands for overlay asset reference: %w", err)
	}
	for _, cmd := range commands {
		if cmd.ImageAsset == name || cmd.SoundFile == name {
			return true, nil
		}
	}

	awards, err := viewerStore.ListAwards()
	if err != nil {
		return false, errors.Errorf("list awards for overlay asset reference: %w", err)
	}
	for _, award := range awards {
		if award.ImageAsset == name || award.SoundFile == name {
			return true, nil
		}
	}

	return false, nil
}
