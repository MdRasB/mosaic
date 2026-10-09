package auth

import "testing"

func TestPasswordHashRoundTrip(t *testing.T) {
	hash, err := hashPassword("a sufficiently long test password")
	if err != nil {
		t.Fatalf("hashPassword() error = %v", err)
	}
	if hash == "a sufficiently long test password" {
		t.Fatal("password was returned in plaintext")
	}
	valid, err := verifyPassword("a sufficiently long test password", hash)
	if err != nil || !valid {
		t.Fatalf("verifyPassword() valid = %t, error = %v", valid, err)
	}
	invalid, err := verifyPassword("a different sufficiently long password", hash)
	if err != nil || invalid {
		t.Fatalf("verifyPassword() accepted an invalid password")
	}
}
