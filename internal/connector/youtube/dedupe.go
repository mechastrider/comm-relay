package youtube

import "strings"

type recentMessageIDs struct {
	capacity int
	order    []string
	seen     map[string]struct{}
}

func newRecentMessageIDs(capacity int) *recentMessageIDs {
	if capacity <= 0 {
		capacity = recentYouTubeMessageIDCapacity
	}

	return &recentMessageIDs{
		capacity: capacity,
		order:    make([]string, 0, capacity),
		seen:     make(map[string]struct{}, capacity),
	}
}

func (ids *recentMessageIDs) add(id string) bool {
	id = strings.TrimSpace(id)
	if id == "" {
		return true
	}

	if _, ok := ids.seen[id]; ok {
		return false
	}

	if len(ids.order) >= ids.capacity {
		oldest := ids.order[0]
		delete(ids.seen, oldest)
		copy(ids.order, ids.order[1:])
		ids.order[len(ids.order)-1] = id
	} else {
		ids.order = append(ids.order, id)
	}
	ids.seen[id] = struct{}{}

	return true
}
