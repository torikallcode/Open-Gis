package config

import "testing"

func TestParseLogLevel(t *testing.T) {
	tests := []struct {
		in      string
		wantErr bool
	}{
		{"debug", false},
		{"INFO", false},
		{"warning", false},
		{"error", false},
		{"verbose", true},
	}

	for _, tt := range tests {
		if _, err := parseLogLevel(tt.in); (err != nil) != tt.wantErr {
			t.Errorf("parseLogLevel(%q) error = %v, wantErr %v", tt.in, err, tt.wantErr)
		}
	}
}

func TestSplitList(t *testing.T) {
	got := splitList(" http://a.test , ,http://b.test ")
	if len(got) != 2 || got[0] != "http://a.test" || got[1] != "http://b.test" {
		t.Fatalf("splitList returned %v", got)
	}
}
