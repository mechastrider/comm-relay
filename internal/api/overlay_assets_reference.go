package api

import (
	"github.com/mechastrider/comm-relay/internal/config"
	"github.com/mechastrider/comm-relay/internal/store"
)

func overlayAssetReferenced(name string, cfg config.Config, viewerStore *store.Store) bool {
	if name == "" {
		return false
	}

	for _, preset := range cfg.Overlay.Presets {
		if preset.Style.PanelImage == name {
			return true
		}
	}

	if viewerStore == nil {
		return false
	}

	commands, err := viewerStore.ListCommands()
	if err == nil {
		for _, cmd := range commands {
			if cmd.ImageAsset == name || cmd.SoundFile == name {
				return true
			}
		}
	}

	awards, err := viewerStore.ListAwards()
	if err == nil {
		for _, award := range awards {
			if award.ImageAsset == name || award.SoundFile == name {
				return true
			}
		}
	}

	return false
}
