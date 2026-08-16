package browser

import (
	"os/exec"
	"runtime"

	"github.com/muonsoft/errors"
)

// Opener opens a URL in the user's default browser.
type Opener func(url string) error

// OpenURL opens url in the system default browser.
var OpenURL Opener = openURL

func openURL(url string) error {
	var cmd *exec.Cmd

	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("rundll32", "url.dll,FileProtocolHandler", url)
	case "darwin":
		cmd = exec.Command("open", url)
	default:
		cmd = exec.Command("xdg-open", url)
	}

	if err := cmd.Start(); err != nil {
		return errors.Errorf("open browser: %w", err)
	}

	return nil
}
