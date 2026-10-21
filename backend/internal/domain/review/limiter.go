package review

import (
	"sync"
	"time"
)

// limiter is a small in-memory sliding-window limiter for review writes. It is
// per instance, which is enough to protect the free-tier backend from a single
// abusive session without adding a dependency.
type limiter struct {
	mu     sync.Mutex
	limit  int
	window time.Duration
	hits   map[string][]time.Time
	now    func() time.Time
}

func newLimiter(limit int, window time.Duration) *limiter {
	return &limiter{
		limit:  limit,
		window: window,
		hits:   make(map[string][]time.Time),
		now:    time.Now,
	}
}

func (l *limiter) allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	cutoff := now.Add(-l.window)
	kept := l.hits[key][:0]
	for _, at := range l.hits[key] {
		if at.After(cutoff) {
			kept = append(kept, at)
		}
	}
	if len(kept) >= l.limit {
		l.hits[key] = kept
		return false
	}
	l.hits[key] = append(kept, now)
	l.prune(cutoff)
	return true
}

// prune drops buckets with no recent activity once the map grows large, so a
// long-lived server does not accumulate an entry per visitor forever.
func (l *limiter) prune(cutoff time.Time) {
	if len(l.hits) <= 4096 {
		return
	}
	for key, entries := range l.hits {
		if len(entries) == 0 || !entries[len(entries)-1].After(cutoff) {
			delete(l.hits, key)
		}
	}
}
