package config

import (
	"fmt"
	"regexp"
	"strings"
)

const MaxOverlayUserIcons = 128

var overlayUsernameRe = regexp.MustCompile(`^[a-z0-9_]{1,64}$`)

// OverlayUserIcon maps a platform username to a local overlay asset icon.
type OverlayUserIcon struct {
	Platform string `json:"platform"`
	Username string `json:"username"`
	Icon     string `json:"icon"`
}

func (u OverlayUserIcon) validateFields(prefix string) FieldErrors {
	fields := FieldErrors{}
	platform := strings.TrimSpace(strings.ToLower(u.Platform))
	switch platform {
	case "twitch", "youtube", "vk":
	default:
		fields[prefix+"_platform"] = "Choose twitch, youtube, or vk."
	}
	username := strings.TrimSpace(strings.ToLower(u.Username))
	if username == "" || !overlayUsernameRe.MatchString(username) {
		fields[prefix+"_username"] = "Username must use lowercase letters, numbers, or underscore."
	}
	if !overlayAssetFilenameValid(u.Icon) {
		fields[prefix+"_icon"] = "Icon filename is invalid."
	}
	return fields
}

func (o OverlayConfig) validateUserIconFields() FieldErrors {
	fields := FieldErrors{}
	if len(o.UserIcons) > MaxOverlayUserIcons {
		fields["overlay_user_icons"] = fmt.Sprintf("Maximum %d user icons allowed.", MaxOverlayUserIcons)
	}
	seen := make(map[string]struct{}, len(o.UserIcons))
	for i, icon := range o.UserIcons {
		prefix := fmt.Sprintf("overlay_user_icon_%d", i)
		mergeFieldErrors(fields, icon.validateFields(prefix))
		platform := strings.TrimSpace(strings.ToLower(icon.Platform))
		username := strings.TrimSpace(strings.ToLower(icon.Username))
		if platform != "" && username != "" {
			key := platform + "\x00" + username
			if _, dup := seen[key]; dup {
				fields[prefix+"_username"] = "Duplicate user icon for this platform."
			}
			seen[key] = struct{}{}
		}
	}
	return fields
}
