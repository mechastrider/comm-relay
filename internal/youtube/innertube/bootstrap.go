package innertube

import (
	"encoding/json"
	"regexp"
	"strings"

	"github.com/muonsoft/errors"
)

var (
	apiKeyPattern    = regexp.MustCompile(`"INNERTUBE_API_KEY"\s*:\s*"([^"]+)"`)
	clientVerPattern = regexp.MustCompile(`"INNERTUBE_CLIENT_VERSION"\s*:\s*"([^"]+)"`)
)

const defaultClientVersion = "2.20240101.00.00"

// LiveChatBootstrap holds InnerTube session data extracted from a live chat popout page.
type LiveChatBootstrap struct {
	Continuation  string
	APIKey        string
	ClientVersion string
}

// ExtractInitialData parses ytInitialData JSON from a YouTube HTML page.
func ExtractInitialData(html string) ([]byte, error) {
	markers := []string{
		`window["ytInitialData"] = `,
		`var ytInitialData = `,
		`ytInitialData = `,
	}

	start := -1
	for _, marker := range markers {
		if idx := strings.Index(html, marker); idx >= 0 {
			start = idx + len(marker)
			break
		}
	}
	if start < 0 {
		return nil, errors.New("ytInitialData not found in live chat page")
	}

	jsonStart := strings.IndexByte(html[start:], '{')
	if jsonStart < 0 {
		return nil, errors.New("ytInitialData json object not found")
	}
	start += jsonStart

	depth := 0
	inString := false
	escaped := false

	for i := start; i < len(html); i++ {
		ch := html[i]
		if inString {
			if escaped {
				escaped = false
				continue
			}
			if ch == '\\' {
				escaped = true
				continue
			}
			if ch == '"' {
				inString = false
			}
			continue
		}

		switch ch {
		case '"':
			inString = true
		case '{':
			depth++
		case '}':
			depth--
			if depth == 0 {
				return []byte(html[start : i+1]), nil
			}
		}
	}

	return nil, errors.New("ytInitialData json object is incomplete")
}

// ParseLiveChatBootstrap reads the initial continuation token from ytInitialData.
func ParseLiveChatBootstrap(initialData []byte) (LiveChatBootstrap, error) {
	var root map[string]json.RawMessage
	if err := json.Unmarshal(initialData, &root); err != nil {
		return LiveChatBootstrap{}, errors.Errorf("decode ytInitialData: %w", err)
	}

	continuation, ok := findContinuation(root)
	if !ok || strings.TrimSpace(continuation) == "" {
		return LiveChatBootstrap{}, errors.New("live chat continuation not found in ytInitialData")
	}

	return LiveChatBootstrap{
		Continuation:  continuation,
		ClientVersion: defaultClientVersion,
	}, nil
}

// ParsePageBootstrap extracts InnerTube bootstrap data from a live chat popout HTML page.
func ParsePageBootstrap(html string) (LiveChatBootstrap, error) {
	initialData, err := ExtractInitialData(html)
	if err != nil {
		return LiveChatBootstrap{}, err
	}

	bootstrap, err := ParseLiveChatBootstrap(initialData)
	if err != nil {
		return LiveChatBootstrap{}, err
	}

	if key := extractPattern(apiKeyPattern, html); key != "" {
		bootstrap.APIKey = key
	}
	if bootstrap.APIKey == "" {
		return LiveChatBootstrap{}, errors.New("INNERTUBE_API_KEY not found in live chat page")
	}

	if version := extractPattern(clientVerPattern, html); version != "" {
		bootstrap.ClientVersion = version
	}

	return bootstrap, nil
}

func extractPattern(pattern *regexp.Regexp, html string) string {
	match := pattern.FindStringSubmatch(html)
	if len(match) < 2 {
		return ""
	}
	return strings.TrimSpace(match[1])
}

func findContinuation(value any) (string, bool) {
	switch typed := value.(type) {
	case map[string]json.RawMessage:
		if token, ok := continuationFromObject(typed); ok {
			return token, true
		}
		for _, raw := range typed {
			var nested any
			if err := json.Unmarshal(raw, &nested); err != nil {
				continue
			}
			if token, ok := findContinuation(nested); ok {
				return token, true
			}
		}
	case []any:
		for _, item := range typed {
			if token, ok := findContinuation(item); ok {
				return token, true
			}
		}
	case map[string]any:
		if token, ok := continuationFromAnyMap(typed); ok {
			return token, true
		}
		for _, nested := range typed {
			if token, ok := findContinuation(nested); ok {
				return token, true
			}
		}
	}
	return "", false
}

func continuationFromObject(obj map[string]json.RawMessage) (string, bool) {
	keys := []string{
		"continuation",
		"invalidationContinuationData",
		"liveChatContinuationData",
		"liveChatReplayContinuationData",
		"timedContinuationData",
	}
	for _, key := range keys {
		raw, ok := obj[key]
		if !ok {
			continue
		}
		if key == "continuation" {
			var token string
			if err := json.Unmarshal(raw, &token); err == nil && strings.TrimSpace(token) != "" {
				return token, true
			}
		}
		var nested map[string]json.RawMessage
		if err := json.Unmarshal(raw, &nested); err != nil {
			continue
		}
		if token, ok := continuationFromObject(nested); ok {
			return token, true
		}
	}
	return "", false
}

func continuationFromAnyMap(obj map[string]any) (string, bool) {
	if raw, ok := obj["continuation"]; ok {
		if token, ok := raw.(string); ok && strings.TrimSpace(token) != "" {
			return token, true
		}
	}
	for _, key := range []string{"invalidationContinuationData", "liveChatContinuationData", "liveChatReplayContinuationData", "timedContinuationData"} {
		nested, ok := obj[key].(map[string]any)
		if !ok {
			continue
		}
		if token, ok := continuationFromAnyMap(nested); ok {
			return token, true
		}
	}
	return "", false
}
