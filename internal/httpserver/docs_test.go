package httpserver_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"

	"mossline/internal/config"
	"mossline/internal/httpserver"
)

func TestOpenAPIDocument(t *testing.T) {
	router := gin.New()
	doc := httpserver.RegisterRoutes(router, nil, config.Storage{}, time.Time{})
	data, err := doc.JSON()
	if err != nil {
		t.Fatal(err)
	}
	var spec struct {
		OpenAPI string `json:"openapi"`
		Paths   map[string]map[string]struct {
			Parameters []struct {
				Name, In string
				Required bool
			} `json:"parameters"`
			RequestBody *struct {
				Required bool
				Content  map[string]any
			} `json:"requestBody"`
			Security []map[string][]string `json:"security"`
		} `json:"paths"`
		Components struct {
			SecuritySchemes map[string]struct{ Type, Scheme string } `json:"securitySchemes"`
			Schemas         map[string]any                           `json:"schemas"`
		} `json:"components"`
	}
	if err := json.Unmarshal(data, &spec); err != nil {
		t.Fatal(err)
	}
	if spec.OpenAPI != "3.1.0" {
		t.Fatalf("unexpected OpenAPI version %s", spec.OpenAPI)
	}
	if scheme := spec.Components.SecuritySchemes["bearerAuth"]; scheme.Type != "http" || scheme.Scheme != "bearer" {
		t.Fatal("missing native Bearer authentication")
	}
	params := regexp.MustCompile(`:([^/]+)`)
	registered := map[string]bool{}
	for _, route := range router.Routes() {
		path := params.ReplaceAllString(route.Path, "{$1}")
		method := strings.ToLower(route.Method)
		registered[method+" "+path] = true
		if _, ok := spec.Paths[path][method]; !ok {
			t.Errorf("undocumented route: %s %s", route.Method, route.Path)
		}
	}
	for path, operations := range spec.Paths {
		for method, operation := range operations {
			if !registered[method+" "+path] {
				t.Errorf("unregistered operation: %s %s", method, path)
			}
			for _, param := range operation.Parameters {
				if param.In == "path" && (!param.Required || !strings.Contains(path, "{"+param.Name+"}")) {
					t.Errorf("invalid path parameter %s on %s", param.Name, path)
				}
			}
			for _, requirement := range operation.Security {
				for name := range requirement {
					if _, ok := spec.Components.SecuritySchemes[name]; !ok {
						t.Errorf("undefined security scheme %q", name)
					}
				}
			}
			if method == "delete" && !strings.Contains(path, "{") && operation.RequestBody == nil {
				t.Errorf("batch delete %s is missing request body", path)
			}
			if method == "delete" && strings.Contains(path, "{") && operation.RequestBody != nil {
				t.Errorf("single delete %s should not require a body", path)
			}
		}
	}
	if body := spec.Paths["/api/attachment"]["post"].RequestBody; body == nil || !body.Required || body.Content["multipart/form-data"] == nil {
		t.Fatal("upload must describe a required multipart body")
	}
	if body := spec.Paths["/api/logout"]["post"].RequestBody; body == nil || body.Required {
		t.Fatal("logout token body must remain optional")
	}
	anonymous := false
	for _, requirement := range spec.Paths["/api/post"]["get"].Security {
		if len(requirement) == 0 {
			anonymous = true
		}
	}
	if !anonymous {
		t.Fatal("public content must permit anonymous requests")
	}
	if len(spec.Paths["/api/admin/users"]["get"].Security) != 1 {
		t.Fatal("admin users must require authentication")
	}
	// 检查所有本地模型引用都能找到对应定义
	var tree any
	if err := json.Unmarshal(data, &tree); err != nil {
		t.Fatal(err)
	}
	var walk func(any)
	walk = func(value any) {
		switch node := value.(type) {
		case map[string]any:
			if ref, ok := node["$ref"].(string); ok {
				name := strings.TrimPrefix(ref, "#/components/schemas/")
				if _, exists := spec.Components.Schemas[name]; !exists {
					t.Errorf("unresolved reference %s", ref)
				}
			}
			for _, child := range node {
				walk(child)
			}
		case []any:
			for _, child := range node {
				walk(child)
			}
		}
	}
	walk(tree)
	for name, schema := range spec.Components.Schemas {
		if strings.HasSuffix(name, "PostInput") || strings.HasSuffix(name, "ResourceInput") || strings.HasSuffix(name, "UpdateRequest") {
			if required, ok := schema.(map[string]any)["required"].([]any); ok && len(required) > 0 {
				t.Errorf("partial update schema %s must not require all fields", name)
			}
		}
		if strings.HasSuffix(name, "UploadRequest") {
			file := schema.(map[string]any)["properties"].(map[string]any)["file"].(map[string]any)
			if file["type"] != "string" || file["format"] != "binary" {
				t.Fatal("upload file must use binary schema")
			}
		}
	}
	for path, expected := range map[string][]byte{"../../docs/openapi.json": data} {
		actual, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		if !bytes.Equal(actual, expected) {
			t.Fatalf("%s is outdated; run make docs", path)
		}
	}
	yaml, err := doc.YAML()
	if err != nil {
		t.Fatal(err)
	}
	exportedYAML, err := os.ReadFile("../../docs/openapi.yaml")
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.Equal(yaml, exportedYAML) {
		t.Fatal("YAML export is outdated; run make docs")
	}
	if err := doc.Mount(router); err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{"/docs", "/openapi.json", "/openapi.yaml"} {
		response := httptest.NewRecorder()
		router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, path, nil))
		if response.Code != http.StatusOK {
			t.Errorf("%s returned %d", path, response.Code)
		}
		if path == "/docs" && (!strings.Contains(response.Body.String(), "<elements-api") || !strings.Contains(response.Body.String(), `apiDescriptionUrl="/openapi.yaml"`) || strings.Contains(response.Body.String(), "scalar")) {
			t.Fatal("Huma's default documentation page must reference the generated specification")
		}
		if path == "/openapi.json" {
			var served any
			if err := json.Unmarshal(response.Body.Bytes(), &served); err != nil {
				t.Fatal(err)
			}
			actual, _ := json.Marshal(served)
			expected, _ := json.Marshal(tree)
			if !bytes.Equal(actual, expected) {
				t.Fatal("served specification differs from generated document")
			}
		}
	}
}

func TestHumaGinErrorResponses(t *testing.T) {
	router := gin.New()
	httpserver.RegisterRoutes(router, nil, config.Storage{}, time.Time{})
	for _, tc := range []struct {
		method, path, body, code string
		status                   int
	}{
		{http.MethodPost, "/api/login", "{", "INVALID_JSON", http.StatusBadRequest},
		{http.MethodPost, "/api/login", `{}`, "VALIDATION_FAILED", http.StatusUnprocessableEntity},
		{http.MethodGet, "/api/me", "", "UNAUTHORIZED", http.StatusUnauthorized},
		{http.MethodPost, "/api/post", `{}`, "UNAUTHORIZED", http.StatusUnauthorized},
		{http.MethodGet, "/api/admin/users", "", "UNAUTHORIZED", http.StatusUnauthorized},
	} {
		t.Run(tc.method+tc.path+tc.code, func(t *testing.T) {
			request := httptest.NewRequest(tc.method, tc.path, strings.NewReader(tc.body))
			request.Header.Set("Content-Type", "application/json")
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			var body struct {
				Code      int    `json:"code"`
				ErrorCode string `json:"error_code"`
			}
			if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
				t.Fatal(err)
			}
			if response.Code != tc.status || body.Code != tc.status || body.ErrorCode != tc.code {
				t.Fatalf("unexpected response: %d %s", response.Code, response.Body.String())
			}
		})
	}
}
