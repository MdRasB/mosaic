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

func TestPasswordValidationAcceptsEightCharacters(t *testing.T) {
	if err := validateCredentials("user@example.com", "12345678"); err != nil {
		t.Fatalf("validateCredentials() rejected eight-character password: %v", err)
	}
}

func TestPasswordValidationRejectsSevenCharacters(t *testing.T) {
	if err := validateCredentials("user@example.com", "1234567"); err == nil {
		t.Fatal("validateCredentials() accepted seven-character password")
	}
}
