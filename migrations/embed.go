// migrations 将版本化 SQL 文件嵌入服务程序，同时保留原文件供人工审查和执行
package migrations

import "embed"

// FS 包含当前目录下的所有 SQL 迁移文件
//
//go:embed *.sql
var FS embed.FS
