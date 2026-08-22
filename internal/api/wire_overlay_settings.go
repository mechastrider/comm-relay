package api

import (
	"encoding/json"

	"github.com/muonsoft/errors"

	"github.com/mechastrider/comm-relay/internal/config"
)

const wireOverlaySettingsType = "overlay_settings"

type wireOverlaySettings struct {
	Type    string               `json:"type"`
	Overlay config.OverlayConfig `json:"overlay"`
}

func overlaySettingsWirePayload(overlay config.OverlayConfig) ([]byte, error) {
	data, err := json.Marshal(wireOverlaySettings{
		Type:    wireOverlaySettingsType,
		Overlay: overlay,
	})
	if err != nil {
		return nil, errors.Errorf("marshal overlay settings wire event: %w", err)
	}
	return data, nil
}
