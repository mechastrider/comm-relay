package config

// Message sound presets for the admin panel (Web Audio in the browser).
const (
	MessageSoundChime = "chime"
	MessageSoundPing  = "ping"
	MessageSoundSoft  = "soft"
	MessageSoundAlert = "alert"
)

// Time display locales shared by the admin panel and OBS message dock.
const (
	TimeLocaleRussian = "ru-RU"
	TimeLocaleEnglish = "en-GB"
)

var validTimeLocales = map[string]struct{}{
	TimeLocaleRussian: {},
	TimeLocaleEnglish: {},
}

var validMessageSounds = map[string]struct{}{
	MessageSoundChime: {},
	MessageSoundPing:  {},
	MessageSoundSoft:  {},
	MessageSoundAlert: {},
}

// AdminConfig holds preferences shared by operator-facing admin and dock UIs.
type AdminConfig struct {
	MessageSound MessageSoundConfig `json:"message_sound"`
	TimeLocale   string             `json:"time_locale"`
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

func (a *AdminConfig) applyDefaults() {
	if a.TimeLocale == "" {
		a.TimeLocale = TimeLocaleRussian
	}
	a.MessageSound.applyDefaults()
}

func (a AdminConfig) validateFields() FieldErrors {
	fields := a.MessageSound.validateFields()
	if _, ok := validTimeLocales[a.TimeLocale]; !ok {
		fields["admin_time_locale"] = "Choose a supported time locale."
	}
	return fields
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
