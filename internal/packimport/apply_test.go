package packimport_test

import (
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/mechastrider/comm-relay/internal/packimport"
	"github.com/mechastrider/comm-relay/internal/store"
)

func TestPlanApplyDurationsOnly(t *testing.T) {
	pack := &packimport.Pack{
		SchemaVersion: 1,
		Pack:          packimport.PackMeta{Slug: "test"},
		Commands: []packimport.CommandSpec{
			{Trigger: "gg", Splash: "Hi", DurationMs: 12000, CooldownSeconds: 30, Image: "images/jake-gg.png"},
		},
	}

	existing := []store.Command{
		{ID: "gg", Trigger: "gg", DurationMs: 5000},
	}

	planned := packimport.PlanApply(pack, existing, packimport.ApplyOptions{DurationsOnly: true})
	require.Len(t, planned, 1)
	require.Equal(t, packimport.ActionUpdate, planned[0].Kind)
	require.Contains(t, planned[0].Detail, "12000")
}

func TestPlanApplySkipUnchanged(t *testing.T) {
	pack := &packimport.Pack{
		SchemaVersion: 1,
		Pack:          packimport.PackMeta{Slug: "test"},
		Defaults: packimport.CommandDefaults{
			Enabled:      boolPtr(true),
			Action:       "alert",
			Layout:       "fullscreen",
			ImageFit:     "contain",
			SoundVolume:  intPtr(70),
			ImageSizePct: intPtr(100),
		},
		Commands: []packimport.CommandSpec{
			{
				Trigger:         "gg",
				Splash:          "Good game",
				Sound:           "chime",
				DurationMs:      5000,
				CooldownSeconds: 30,
				Image:           "images/jake-gg.png",
			},
		},
	}

	existing := []store.Command{
		{
			ID:              "gg",
			Trigger:         "gg",
			Action:          store.CommandActionAlert,
			Enabled:         true,
			CooldownSeconds: 30,
			SplashTemplate:  "Good game",
			Sound:           "chime",
			DurationMs:      5000,
			SoundVolume:     70,
			Layout:          "fullscreen",
			ImageFit:        "contain",
			ImageSizePct:    100,
			ImageAsset:      "asset_test.png",
		},
	}

	planned := packimport.PlanApply(pack, existing, packimport.ApplyOptions{})
	require.Len(t, planned, 1)
	require.Equal(t, packimport.ActionSkip, planned[0].Kind)
}

func boolPtr(v bool) *bool { return &v }

func intPtr(v int) *int { return &v }
