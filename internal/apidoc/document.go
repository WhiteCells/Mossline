package apidoc

import (
	"encoding/json"
	"fmt"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humagin"
	"github.com/gin-gonic/gin"
)

type Document struct {
	api           huma.API
	engine        *gin.Engine
	errorResponse any
	mounted       bool
}

func config(spec *huma.OpenAPI) huma.Config {
	return huma.Config{
		OpenAPI:       spec,
		Formats:       huma.DefaultFormats,
		DefaultFormat: "application/json",
	}
}

// NewDocument 创建共享模型注册表和 Bearer 鉴权描述，文档页面需另行挂载
func NewDocument(engine *gin.Engine, errorResponse any) *Document {
	cfg := huma.DefaultConfig("Mossline Content Management API", "1.0.0")
	cfg.Info.Description = "公开内容及管理接口。受保护接口使用登录返回的 Bearer 令牌。"
	cfg.Components.Schemas = huma.NewMapRegistry("#/components/schemas/", schemaName)
	cfg.Components.SecuritySchemes = map[string]*huma.SecurityScheme{
		"bearerAuth": {
			Type:        "http",
			Scheme:      "bearer",
			Description: "登录接口返回的会话令牌",
		},
	}
	return &Document{
		api:           humagin.New(engine, config(cfg.OpenAPI)),
		engine:        engine,
		errorResponse: errorResponse,
	}
}

// JSON 将当前已注册的接口导出为带缩进的 OpenAPI JSON
func (d *Document) JSON() ([]byte, error) {
	return json.MarshalIndent(d.api.OpenAPI(), "", "  ")
}

// YAML 将当前已注册的接口导出为 OpenAPI YAML
func (d *Document) YAML() ([]byte, error) {
	return d.api.OpenAPI().YAML()
}

// Mount 在注册路由的同一引擎上挂载 Huma 默认文档页面及 OpenAPI 接口
// 只允许挂载一次，避免重复注册路由
func (d *Document) Mount(engine *gin.Engine) error {
	if d.mounted {
		return fmt.Errorf("API documentation is already mounted")
	}
	if engine != d.engine {
		return fmt.Errorf("API documentation must use its registered Gin engine")
	}
	cfg := config(d.api.OpenAPI())
	cfg.OpenAPIPath = "/openapi"
	cfg.DocsPath = "/docs"
	humagin.New(engine, cfg)
	d.mounted = true
	return nil
}
