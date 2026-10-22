package httpserver

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"mossline/internal/config"
)

func TestServerRequestPipeline(t *testing.T) {
	cfg := config.Config{
		Storage: config.Storage{LocalDirectory: t.TempDir(), PublicURLPrefix: "/uploads"},
		CORS:    config.CORS{AllowedOrigins: []string{"https://admin.example.com"}},
	}
	server, err := New(cfg, nil, time.Time{})
	if err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name, method, path, body, origin, code string
		status                                 int
	}{
		{"allowed preflight", http.MethodOptions, "/api/post", "", "https://admin.example.com", "", 204},
		{"blocked preflight", http.MethodOptions, "/api/post", "", "https://other.example.com", "CORS_FORBIDDEN", 403},
		{"invalid JSON", http.MethodPost, "/api/login", "{", "", "INVALID_JSON", 400},
		{"missing route", http.MethodGet, "/missing", "", "", "ROUTE_NOT_FOUND", 404},
	} {
		t.Run(tc.name, func(t *testing.T) {
			request := httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body))
			request.Header.Set("Content-Type", "application/json")
			request.Header.Set("Origin", tc.origin)
			response := httptest.NewRecorder()
			server.Handler.ServeHTTP(response, request)
			if response.Code != tc.status {
				t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
			}
			if response.Header().Get("X-Content-Type-Options") != "nosniff" {
				t.Fatal("security middleware was not installed")
			}
			if tc.name == "allowed preflight" && response.Header().Get("Access-Control-Allow-Origin") != tc.origin {
				t.Fatal("allowed origin was not reflected")
			}
			if tc.name == "blocked preflight" && response.Header().Get("Access-Control-Allow-Origin") != "" {
				t.Fatal("blocked origin must not receive access headers")
			}
			if tc.code != "" {
				var body struct {
					Code      int    `json:"code"`
					ErrorCode string `json:"error_code"`
				}
				if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
					t.Fatal(err)
				}
				if body.Code != tc.status || body.ErrorCode != tc.code {
					t.Fatalf("unexpected envelope: %s", response.Body.String())
				}
			}
		})
	}
}

func TestRecoveryUsesCommonResponse(t *testing.T) {
	router := gin.New()
	router.Use(recovery())
	router.GET("/panic", func(*gin.Context) { panic("test failure") })
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/panic", nil))
	var body struct {
		ErrorCode string `json:"error_code"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if response.Code != 500 || body.ErrorCode != "INTERNAL_ERROR" {
		t.Fatalf("unexpected panic response: %d %s", response.Code, response.Body.String())
	}
}
