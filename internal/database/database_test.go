package database

import "testing"

func TestValidatePassword(t *testing.T) {
	for _, value := range []string{"short1", "onlyletters", "12345678"} {
		if ValidatePassword(value) == nil {
			t.Fatalf("ValidatePassword(%q) accepted a weak password", value)
		}
	}
	if err := ValidatePassword("Mossline123!"); err != nil {
		t.Fatalf("strong password rejected: %v", err)
	}
}
