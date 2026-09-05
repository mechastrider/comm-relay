package config

import "encoding/json"

// ValidateIncomingJSONFields checks top-level JSON field types before unmarshaling into Config.
func ValidateIncomingJSONFields(data []byte) FieldErrors {
	fields := FieldErrors{}

	var doc map[string]json.RawMessage
	if err := json.Unmarshal(data, &doc); err != nil {
		return fields
	}

	if raw, ok := doc["custom_avatars_enabled"]; ok {
		var value bool
		if err := json.Unmarshal(raw, &value); err != nil {
			fields["custom_avatars_enabled"] = "Custom portraits setting must be true or false."
		}
	}

	if len(fields) > 0 {
		return fields
	}
	return nil
}
