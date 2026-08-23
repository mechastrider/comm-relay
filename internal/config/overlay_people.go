package config

import (
	"fmt"
	"strings"
	"unicode"
	"unicode/utf8"
)

const (
	// MaxOverlayPeople is the maximum number of overlay people rows.
	MaxOverlayPeople         = 64
	overlayPersonLabelMax    = 64
	overlayPersonUsernameMax = 64
	overlayPersonUsernameMin = 1
)

// OverlayPerson is one viewer mapped across platforms with a shared icon.
type OverlayPerson struct {
	ID         string                  `json:"id"`
	Label      string                  `json:"label"`
	Icon       string                  `json:"icon,omitempty"`
	Identities []OverlayPersonIdentity `json:"identities"`
}

// OverlayPersonIdentity is a platform username for a person.
type OverlayPersonIdentity struct {
	Platform string `json:"platform"`
	Username string `json:"username"`
}

func (p *OverlayPerson) applyDefaults() {
	if strings.TrimSpace(p.ID) == "" {
		id, err := newOverlayID("person")
		if err != nil {
			p.ID = "person"
		} else {
			p.ID = id
		}
	}
	if p.Identities == nil {
		p.Identities = []OverlayPersonIdentity{}
	}
}

func (o OverlayConfig) validatePeopleFields() FieldErrors {
	fields := FieldErrors{}
	if len(o.People) > MaxOverlayPeople {
		fields["overlay_people"] = fmt.Sprintf("Maximum %d people allowed.", MaxOverlayPeople)
	}
	seenIDs := make(map[string]struct{}, len(o.People))
	seenIdentities := make(map[string]struct{})
	for i := range o.People {
		prefix := fmt.Sprintf("overlay_person_%d", i)
		person := o.People[i]
		id := strings.TrimSpace(person.ID)
		if id == "" {
			fields[prefix+"_id"] = "Person id is required."
		} else if _, exists := seenIDs[id]; exists {
			fields[prefix+"_id"] = "Duplicate person id."
		} else {
			seenIDs[id] = struct{}{}
		}
		if label := strings.TrimSpace(person.Label); utf8.RuneCountInString(label) > overlayPersonLabelMax {
			fields[prefix+"_label"] = fmt.Sprintf("Label must be at most %d characters.", overlayPersonLabelMax)
		}
		if person.Icon != "" && !validOverlayAssetName(person.Icon) {
			fields[prefix+"_icon"] = "Icon must be a stored overlay asset filename."
		}
		if len(person.Identities) == 0 {
			fields[prefix+"_identities"] = "Add at least one platform username."
		}
		seenPlatforms := make(map[string]struct{}, 3)
		for j, identity := range person.Identities {
			idPrefix := fmt.Sprintf("%s_identity_%d", prefix, j)
			platform := strings.TrimSpace(strings.ToLower(identity.Platform))
			switch platform {
			case "twitch", "youtube", "vk":
			default:
				fields[idPrefix+"_platform"] = "Choose twitch, youtube, or vk."
				continue
			}
			if _, exists := seenPlatforms[platform]; exists {
				fields[idPrefix+"_platform"] = "This person already has that platform."
				continue
			}
			seenPlatforms[platform] = struct{}{}
			username := strings.TrimSpace(identity.Username)
			if errMsg := overlayPersonUsernameError(username); errMsg != "" {
				fields[idPrefix+"_username"] = errMsg
				continue
			}
			identityKey := platform + "\x00" + strings.ToLower(username)
			if _, exists := seenIdentities[identityKey]; exists {
				fields[idPrefix+"_username"] = "This platform username is already assigned."
				continue
			}
			seenIdentities[identityKey] = struct{}{}
		}
	}
	return fields
}

func overlayPersonUsernameError(username string) string {
	if username == "" {
		return "Username is required."
	}
	n := utf8.RuneCountInString(username)
	if n < overlayPersonUsernameMin || n > overlayPersonUsernameMax {
		return fmt.Sprintf("Username must be between %d and %d characters.", overlayPersonUsernameMin, overlayPersonUsernameMax)
	}
	for _, r := range username {
		if r == '/' || r == '\\' || r == 0 {
			return "Username cannot contain slashes."
		}
		if unicode.IsControl(r) {
			return "Username cannot contain control characters."
		}
	}
	return ""
}
