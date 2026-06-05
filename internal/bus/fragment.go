package bus

// FragmentType identifies a structured message fragment for rich chat rendering.
type FragmentType string

const (
	// FragmentTypeText is plain message text.
	FragmentTypeText FragmentType = "text"
	// FragmentTypeEmote is a chat emote image from a provider.
	FragmentTypeEmote FragmentType = "emote"
	// FragmentTypeImageLink is a linked image preview.
	FragmentTypeImageLink FragmentType = "image_link"
)

// MessageFragment is a provider-neutral structured content block inside a chat message.
// Fields are optional depending on Type; unknown types should be ignored by clients.
type MessageFragment struct {
	Type     FragmentType `json:"type"`
	Text     string       `json:"text,omitempty"`
	Provider string       `json:"provider,omitempty"`
	ID       string       `json:"id,omitempty"`
	URL      string       `json:"url,omitempty"`
	Width    int          `json:"width,omitempty"`
	Height   int          `json:"height,omitempty"`
	Animated bool         `json:"animated,omitempty"`
}
