package apidoc_test

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"

	"mossline/internal/apidoc"
)

func TestHumaGinMiddlewareAndJSONBody(t *testing.T) {
	engine := gin.New()
	doc := apidoc.NewDocument(engine, map[string]any{})
	root := apidoc.NewRouter(engine.Group(""), doc)
	var calls []string
	api := root.Group("/api", func(c *gin.Context) {
		calls = append(calls, "before")
		c.Next()
		calls = append(calls, "after")
	})
	api.POST("/items/:id", apidoc.Operation{Input: struct {
		Name string `json:"name"`
	}{}, Output: map[string]any{}}, func(c *gin.Context) {
		calls = append(calls, "guard")
		if c.GetHeader("Authorization") == "" {
			c.AbortWithStatus(http.StatusUnauthorized)
		}
	}, func(c *gin.Context) {
		calls = append(calls, "handler")
		var input struct {
			Name string `json:"name"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			t.Fatal(err)
		}
		c.JSON(http.StatusCreated, gin.H{"name": input.Name, "id": c.Param("id")})
	})
	for _, authorized := range []bool{false, true} {
		calls = nil
		request := httptest.NewRequest(http.MethodPost, "/api/items/42", strings.NewReader(`{"name":"example"}`))
		request.Header.Set("Content-Type", "application/json")
		if authorized {
			request.Header.Set("Authorization", "Bearer test")
		}
		response := httptest.NewRecorder()
		engine.ServeHTTP(response, request)
		expected := []string{"before", "guard", "after"}
		status := http.StatusUnauthorized
		if authorized {
			expected = []string{"before", "guard", "handler", "after"}
			status = http.StatusCreated
			if !strings.Contains(response.Body.String(), `"name":"example"`) || !strings.Contains(response.Body.String(), `"id":"42"`) {
				t.Fatalf("request data lost: %s", response.Body.String())
			}
		}
		if response.Code != status || !reflect.DeepEqual(calls, expected) {
			t.Fatalf("unexpected middleware execution: %d %v", response.Code, calls)
		}
	}
}

func TestHumaGinMultipartBody(t *testing.T) {
	engine := gin.New()
	doc := apidoc.NewDocument(engine, map[string]any{})
	root := apidoc.NewRouter(engine.Group(""), doc)
	root.POST("/upload", apidoc.Operation{Input: struct {
		File *multipart.FileHeader `formData:"file" required:"true"`
	}{}, Output: map[string]any{}}, func(c *gin.Context) {
		file, err := c.FormFile("file")
		if err != nil {
			t.Fatal(err)
		}
		c.JSON(http.StatusCreated, gin.H{"filename": file.Filename, "size": file.Size})
	})
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	file, err := writer.CreateFormFile("file", "example.txt")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := file.Write([]byte("hello")); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	request := httptest.NewRequest(http.MethodPost, "/upload", &body)
	request.Header.Set("Content-Type", writer.FormDataContentType())
	response := httptest.NewRecorder()
	engine.ServeHTTP(response, request)
	if response.Code != http.StatusCreated || !strings.Contains(response.Body.String(), `"filename":"example.txt"`) || !strings.Contains(response.Body.String(), `"size":5`) {
		t.Fatalf("upload data lost: %d %s", response.Code, response.Body.String())
	}
}
