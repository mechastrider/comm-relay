package api

import (
	"os"
	"regexp"
	"strings"
	"testing"
)

func TestRoutes_PostActionStyle(t *testing.T) {
	t.Parallel()

	src, err := os.ReadFile("server.go")
	if err != nil {
		t.Fatalf("read server.go: %v", err)
	}

	re := regexp.MustCompile(`(?:HandleFunc|Handle)\("(GET|POST|PUT|DELETE|PATCH) ([^"]+)"`)
	matches := re.FindAllStringSubmatch(string(src), -1)
	if len(matches) == 0 {
		t.Fatal("no routes matched in server.go — regex may be broken")
	}

	restVerbs := map[string]bool{"PUT": true, "DELETE": true, "PATCH": true}
	for _, m := range matches {
		method, path := m[1], m[2]
		if restVerbs[method] {
			t.Errorf("route %s %s uses REST verb %s; comm-relay is POST-action/RPC only — see .agents/skills/api-conventions/SKILL.md", method, path, method)
		}
		if strings.HasPrefix(path, "/api/") && strings.Contains(path, "{") {
			t.Errorf("route %s %s has path-param addressing under /api/; use POST /api/<resource>/<action> with ids in the JSON body — see .agents/skills/api-conventions/SKILL.md", method, path)
		}
	}
}
