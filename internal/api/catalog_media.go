package api

import "github.com/mechastrider/comm-relay/internal/store"

func catalogSoundVolumeFromRequest(value *int) int {
	if value == nil {
		return store.DefaultCatalogSoundVolume
	}
	return store.NormalizeCatalogSoundVolume(*value)
}
