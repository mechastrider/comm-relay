package config

import (
	"net"
	"net/url"
	"regexp"
	"strings"
	"unicode/utf8"
)

// Features controls explicitly enabled experimental behavior.
type Features struct {
	ExperimentalAIMessages bool `json:"experimental_ai_messages"`
}

// AIProvider keeps credentials out of configuration: APIKeyEnv names a process variable.
type AIProvider struct {
	Preset         string `json:"preset"`
	BaseURL        string `json:"base_url"`
	Model          string `json:"model"`
	APIKeyEnv      string `json:"api_key_env"`
	OutputMode     string `json:"output_mode"`
	OutputFormat   string `json:"output_format"`
	TimeoutSeconds int    `json:"timeout_seconds"`
}

// AIImage identifies an operator-approved command image.
type AIImage struct {
	ID          string `json:"id"`
	CommandID   string `json:"command_id"`
	Description string `json:"description"`
}

// AICharacter binds a selectable persona to a voice and image catalog.
type AICharacter struct {
	ID              string    `json:"id"`
	Label           string    `json:"label"`
	Description     string    `json:"description"`
	VoiceID         string    `json:"voice_id"`
	DefaultDelivery string    `json:"default_delivery"`
	Images          []AIImage `json:"images"`
}

// AILimits bounds paid work and on-stream duration.
type AILimits struct {
	InputMaxChars         int `json:"input_max_chars"`
	SpeechMaxChars        int `json:"speech_max_chars"`
	AudioMaxSeconds       int `json:"audio_max_seconds"`
	ViewerCooldownSeconds int `json:"viewer_cooldown_seconds"`
	GlobalIntervalSeconds int `json:"global_interval_seconds"`
	QueueCapacity         int `json:"queue_capacity"`
	LifetimeSeconds       int `json:"lifetime_seconds"`
	ReviewCapacity        int `json:"review_capacity"`
	ReviewTTLSeconds      int `json:"review_ttl_seconds"`
}

// AIMessages contains provider-independent experiment settings.
type AIMessages struct {
	LLM           AIProvider    `json:"llm"`
	TTS           AIProvider    `json:"tts"`
	StreamContext string        `json:"stream_context"`
	Denylist      []string      `json:"denylist"`
	Limits        AILimits      `json:"limits"`
	Characters    []AICharacter `json:"characters"`
}

// DefaultAIMessages returns conservative experiment defaults.
func DefaultAIMessages() AIMessages {
	return AIMessages{
		LLM:        AIProvider{Preset: "openai", BaseURL: "https://api.openai.com/v1", APIKeyEnv: "OPENAI_API_KEY", OutputMode: "json_schema", TimeoutSeconds: 15},
		TTS:        AIProvider{Preset: "elevenlabs", BaseURL: "https://api.elevenlabs.io/v1", Model: "eleven_v3", APIKeyEnv: "ELEVENLABS_API_KEY", OutputFormat: "mp3_44100_128", TimeoutSeconds: 30},
		Limits:     AILimits{InputMaxChars: 300, SpeechMaxChars: 600, AudioMaxSeconds: 30, ViewerCooldownSeconds: 60, GlobalIntervalSeconds: 10, QueueCapacity: 3, LifetimeSeconds: 90, ReviewCapacity: 10, ReviewTTLSeconds: 300},
		Characters: []AICharacter{}, Denylist: []string{},
	}
}

var aiIdentifier = regexp.MustCompile(`^[a-zA-Z0-9_-]{1,64}$`)
var aiEnvName = regexp.MustCompile(`^[A-Za-z_][A-Za-z0-9_]{0,127}$`)

// ValidAIEndpoint permits TLS providers and explicit loopback development servers only.
func ValidAIEndpoint(raw string) bool {
	u, err := url.Parse(raw)
	if err != nil || u.Hostname() == "" || u.User != nil || u.RawQuery != "" || u.Fragment != "" {
		return false
	}
	if u.Scheme == "https" {
		return true
	}
	ip := net.ParseIP(u.Hostname())
	return u.Scheme == "http" && (u.Hostname() == "localhost" || (ip != nil && ip.IsLoopback()))
}

func (c *Config) validateAI(fields FieldErrors) {
	a := c.AIMessages
	// Zero-value configs used by legacy callers do not configure the experiment.
	if !c.Features.ExperimentalAIMessages && a.LLM.BaseURL == "" && a.TTS.BaseURL == "" {
		return
	}
	for name, p := range map[string]AIProvider{"llm": a.LLM, "tts": a.TTS} {
		if !ValidAIEndpoint(p.BaseURL) {
			fields["ai_messages."+name+".base_url"] = "Use HTTPS or an explicit loopback HTTP endpoint."
		}
		maxTimeout := 60
		if name == "tts" {
			maxTimeout = 120
		}
		if p.TimeoutSeconds < 1 || p.TimeoutSeconds > maxTimeout {
			fields["ai_messages."+name+".timeout_seconds"] = "Timeout is outside the supported range."
		}
		if !aiEnvName.MatchString(p.APIKeyEnv) {
			fields["ai_messages."+name+".api_key_env"] = "Enter an environment variable name, never a key value."
		}
		if utf8.RuneCountInString(p.Model) > 200 || (c.Features.ExperimentalAIMessages && strings.TrimSpace(p.Model) == "") {
			fields["ai_messages."+name+".model"] = "Choose a model (maximum 200 characters)."
		}
	}
	if a.LLM.OutputMode != "json_schema" && a.LLM.OutputMode != "json_object" {
		fields["ai_messages.llm.output_mode"] = "Choose json_schema or json_object."
	}
	if a.TTS.OutputFormat != "mp3_44100_128" {
		fields["ai_messages.tts.output_format"] = "Use mp3_44100_128 for this experiment."
	}
	limits := []struct {
		name            string
		value, min, max int
	}{
		{"input_max_chars", a.Limits.InputMaxChars, 1, 2000}, {"speech_max_chars", a.Limits.SpeechMaxChars, 1, 4000},
		{"audio_max_seconds", a.Limits.AudioMaxSeconds, 1, 60}, {"viewer_cooldown_seconds", a.Limits.ViewerCooldownSeconds, 0, 3600},
		{"global_interval_seconds", a.Limits.GlobalIntervalSeconds, 0, 3600}, {"queue_capacity", a.Limits.QueueCapacity, 1, 20},
		{"lifetime_seconds", a.Limits.LifetimeSeconds, 1, 600}, {"review_capacity", a.Limits.ReviewCapacity, 1, 50}, {"review_ttl_seconds", a.Limits.ReviewTTLSeconds, 1, 1800},
	}
	for _, v := range limits {
		if v.value < v.min || v.value > v.max {
			fields["ai_messages.limits."+v.name] = "Value is outside the supported range."
		}
	}
	if utf8.RuneCountInString(a.StreamContext) > 4000 || len(a.Denylist) > 200 || len(a.Characters) > 32 {
		fields["ai_messages"] = "Context, denylist or character catalog is too large."
	}
	for _, word := range a.Denylist {
		if strings.TrimSpace(word) == "" || utf8.RuneCountInString(word) > 200 {
			fields["ai_messages.denylist"] = "Use nonempty phrases of at most 200 characters."
		}
	}
	seen := map[string]bool{}
	for _, ch := range a.Characters {
		if !aiIdentifier.MatchString(ch.ID) || seen[ch.ID] || !aiIdentifier.MatchString(ch.VoiceID) || strings.TrimSpace(ch.Label) == "" || utf8.RuneCountInString(ch.Label) > 100 || utf8.RuneCountInString(ch.Description) > 1000 || len(ch.Images) == 0 || len(ch.Images) > 50 {
			fields["ai_messages.characters"] = "Each character needs a unique ID, label, voice and 1–50 described images."
		}
		seen[ch.ID] = true
		if !ValidAIDelivery(ch.DefaultDelivery) {
			fields["ai_messages.characters"] = "Choose a supported default delivery."
		}
		images := map[string]bool{}
		for _, im := range ch.Images {
			if !aiIdentifier.MatchString(im.ID) || images[im.ID] || im.CommandID == "" || utf8.RuneCountInString(im.Description) > 1000 {
				fields["ai_messages.characters"] = "Image IDs must be unique per character and reference a command."
			}
			images[im.ID] = true
		}
	}
	if c.Features.ExperimentalAIMessages && len(a.Characters) == 0 {
		fields["ai_messages.characters"] = "Add at least one character before enabling."
	}
}

// ValidAIDelivery reports whether a semantic direction belongs to the fixed vocabulary.
func ValidAIDelivery(s string) bool {
	switch s {
	case "neutral", "warm", "excited", "dry", "urgent", "whisper":
		return true
	}
	return false
}

// Clone returns a settings snapshot with independent slice storage.
func (a AIMessages) Clone() AIMessages {
	a.Denylist = append([]string{}, a.Denylist...)
	a.Characters = append([]AICharacter{}, a.Characters...)
	for i := range a.Characters {
		a.Characters[i].Images = append([]AIImage{}, a.Characters[i].Images...)
	}
	return a
}
