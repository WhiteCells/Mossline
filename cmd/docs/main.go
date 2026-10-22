// docs 命令复用接口注册过程导出 OpenAPI 文档，无需连接 MySQL
package main

import (
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"

	"mossline/internal/config"
	"mossline/internal/httpserver"
)

// main 仅注册路由和模型，将当前接口定义导出到 docs 目录
func main() {
	gin.SetMode(gin.ReleaseMode)
	doc := httpserver.RegisterRoutes(gin.New(), nil, config.Storage{}, time.Time{})
	jsonDoc, err := doc.JSON()
	if err != nil {
		log.Fatal(err)
	}
	yamlDoc, err := doc.YAML()
	if err != nil {
		log.Fatal(err)
	}
	if err := os.MkdirAll("docs", 0755); err != nil {
		log.Fatal(err)
	}
	for path, data := range map[string][]byte{"docs/openapi.json": jsonDoc, "docs/openapi.yaml": yamlDoc} {
		if err := os.WriteFile(path, data, 0644); err != nil {
			log.Fatal(err)
		}
	}
	log.Print("OpenAPI 3.1 documentation generated in docs/")
}
