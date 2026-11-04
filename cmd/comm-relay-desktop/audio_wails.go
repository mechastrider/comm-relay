//go:build wails

package main

import (
	"fmt"
	"math"

	"github.com/muonsoft/errors"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// PrepareMessageAudio activates the trusted shell's audio without a user click.
func (api *DesktopAPI) PrepareMessageAudio() error {
	if api == nil || api.app == nil || api.app.wailsCtx == nil {
		return errors.Errorf("desktop api not ready")
	}
	runtime.WindowExecJS(api.app.wailsCtx, "window.prepareMessageAudio();")
	return nil
}

// PlayMessageSound accepts only built-in presets and normalized volume, never code.
func (api *DesktopAPI) PlayMessageSound(sound string, volume float64) error {
	if api == nil || api.app == nil || api.app.wailsCtx == nil {
		return errors.Errorf("desktop api not ready")
	}
	if (sound != "chime" && sound != "ping" && sound != "soft" && sound != "alert") ||
		math.IsNaN(volume) || math.IsInf(volume, 0) || volume < 0 || volume > 1 {
		return errors.Errorf("invalid message sound")
	}
	if volume == 0 {
		return nil
	}
	runtime.WindowExecJS(api.app.wailsCtx, fmt.Sprintf("window.playDesktopMessageSound(%q, %g);", sound, volume))
	return nil
}
