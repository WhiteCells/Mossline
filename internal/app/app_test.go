package app

import (
	"context"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestServeReturnsListenerFailure(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	server := &http.Server{Addr: "invalid:address:format"}
	if err := serve(ctx, server, time.Second); err == nil || !strings.HasPrefix(err.Error(), "server:") {
		t.Fatalf("expected listener error, got %v", err)
	}
}
