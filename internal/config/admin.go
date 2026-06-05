package config

// Message sound presets for the admin panel (Web Audio in the browser).
const (
	MessageSoundChime = "chime"
	MessageSoundPing  = "ping"
	MessageSoundSoft  = "soft"
	MessageSoundAlert = "alert"
)

var validMessageSounds = map[string]struct{}{
	MessageSoundChime: {},
	MessageSoundPing:  {},
	MessageSoundSoft:  {},
	MessageSoundAlert: {},
}

// AdminConfig holds admin UI preferences (not used by OBS overlay).
type AdminConfig struct {
	MessageSound MessageSoundConfig `json:"message_sound"`
}

// MessageSoundConfig controls notification sound in the admin panel.
type MessageSoundConfig struct {
	Enabled bool    `json:"enabled"`
	Volume  float64 `json:"volume"`
	Sound   string  `json:"sound"`
}

func defaultMessageSound() MessageSoundConfig {
	return MessageSoundConfig{
		Enabled: false,
		Volume:  0.5,
		Sound:   MessageSoundChime,
	}
}

func (m *MessageSoundConfig) applyDefaults() {
	if m == nil {
		return
	}
	if *m == (MessageSoundConfig{}) {
		*m = defaultMessageSound()
		return
	}
	if m.Sound == "" {
		m.Sound = defaultMessageSound().Sound
	}
}

func (m MessageSoundConfig) validate() error {
	if fields := m.validateFields(); len(fields) > 0 {
		return fields
	}
	return nil
}

func (m MessageSoundConfig) validateFields() FieldErrors {
	fields := FieldErrors{}
	if m.Volume < 0 || m.Volume > 1 {
		fields["admin_message_sound_volume"] = "Volume must be between 0% and 100%."
	}
	if _, ok := validMessageSounds[m.Sound]; !ok {
		fields["admin_message_sound_sound"] = "Choose a sound type."
	}
	return fields
}
