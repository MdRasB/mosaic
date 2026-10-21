package review

import (
	"testing"
	"time"
)

func TestLimiterAllowsBurstThenBlocks(t *testing.T) {
	now := time.Unix(1000, 0)
	clock := func() time.Time { return now }
	l := newLimiter(2, time.Minute)
	l.now = clock

	if !l.allow("user-a") || !l.allow("user-a") {
		t.Fatal("burst within the limit was rejected")
	}
	if l.allow("user-a") {
		t.Fatal("request over the limit was allowed")
	}
	if !l.allow("user-b") {
		t.Fatal("a different key should have its own budget")
	}
}

func TestLimiterRefillsAfterWindow(t *testing.T) {
	now := time.Unix(2000, 0)
	l := newLimiter(1, time.Minute)
	l.now = func() time.Time { return now }

	if !l.allow("user") {
		t.Fatal("first request was rejected")
	}
	if l.allow("user") {
		t.Fatal("second request inside the window was allowed")
	}

	now = now.Add(time.Minute + time.Second)
	if !l.allow("user") {
		t.Fatal("request after the window was rejected")
	}
}
