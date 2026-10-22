package apidoc

import (
	"fmt"
	"reflect"
	"strings"

	"github.com/danielgtaylor/huma/v2"
)

// schemaName 将包路径和泛型类型名纳入模型名称，避免不同包的同名类型冲突
func schemaName(t reflect.Type, hint string) string {
	name := t.Name()
	if name == "" {
		name = hint
	}
	replacer := strings.NewReplacer("/", "_", ".", "_", "[", "_", "]", "", "*", "", ",", "_", " ", "_")
	return replacer.Replace(t.PkgPath() + "_" + name)
}

// requestBody 根据输入类型生成 JSON 或 multipart 模型，无输入时不声明请求体
func requestBody(registry huma.Registry, input any, optional bool) *huma.RequestBody {
	if input == nil {
		return nil
	}
	inputType := reflect.TypeOf(input)
	contentType := "application/json"
	schemaType := inputType
	if fields := multipartFields(inputType); len(fields) > 0 {
		contentType = "multipart/form-data"
		schemaType = reflect.StructOf(fields)
	}
	return &huma.RequestBody{
		Required: !optional,
		Content: map[string]*huma.MediaType{
			contentType: {Schema: registry.Schema(schemaType, true, inputType.Name())},
		},
	}
}

// multipartFields 将上传文件描述为 OpenAPI 二进制字符串
// 仅转换文档模型，Gin 绑定请求时仍使用原始 Go 类型
func multipartFields(inputType reflect.Type) []reflect.StructField {
	var fields []reflect.StructField
	for i := 0; i < inputType.NumField(); i++ {
		field := inputType.Field(i)
		name := field.Tag.Get("formData")
		if name == "" {
			continue
		}
		if field.Tag.Get("required") != "true" {
			name += ",omitempty"
		}
		tag := fmt.Sprintf(`json:%q`, name)
		fileType := field.Type
		if fileType.Kind() == reflect.Pointer {
			fileType = fileType.Elem()
		}
		if fileType.PkgPath() == "mime/multipart" {
			field.Type = reflect.TypeOf("")
			tag += ` format:"binary"`
		}
		field.Tag = reflect.StructTag(tag)
		fields = append(fields, field)
	}
	return fields
}
