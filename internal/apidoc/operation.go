package apidoc

import (
	"net/http"
	"reflect"
	"strconv"
	"strings"

	"github.com/danielgtaylor/huma/v2"
)

// operation 根据路由元数据生成参数、请求体、鉴权和响应描述
// 此处只生成文档，请求绑定和业务校验仍由 Gin 处理函数完成
func (d *Document) operation(method, fullPath string, info Operation) *huma.Operation {
	pattern := ginParam.ReplaceAllString(fullPath, "{$1}")
	op := &huma.Operation{
		Method:      method,
		Path:        pattern,
		Summary:     info.Summary,
		Description: info.Description,
		Tags:        []string{info.Tag},
		OperationID: operationID(method, pattern),
		Responses:   map[string]*huma.Response{},
	}
	registry := d.api.OpenAPI().Components.Schemas
	for _, match := range ginParam.FindAllStringSubmatch(fullPath, -1) {
		schema := &huma.Schema{Type: "integer", Minimum: ptr(float64(1))}
		if match[1] == "identifier" {
			schema = &huma.Schema{Type: "string"}
		}
		op.Parameters = append(op.Parameters, &huma.Param{Name: match[1], In: "path", Required: true, Schema: schema})
	}
	op.Parameters = append(op.Parameters, queryParameters(registry, info.Query)...)
	op.RequestBody = requestBody(registry, info.Input, info.OptionalBody)
	if info.Protected || info.OptionalAuth {
		op.Security = []map[string][]string{{"bearerAuth": {}}}
	}
	if info.OptionalAuth {
		op.Security = append(op.Security, map[string][]string{})
	}
	status := http.StatusOK
	if info.Created {
		status = http.StatusCreated
	}
	responseSchema := registry.Schema(reflect.TypeOf(info.Output), true, "Response")
	op.Responses[strconv.Itoa(status)] = response(http.StatusText(status), responseSchema)
	if len(info.FailureStatuses) > 0 {
		for _, status := range info.FailureStatuses {
			op.Responses[strconv.Itoa(status)] = response(http.StatusText(status), responseSchema)
		}
	} else {
		op.Responses["default"] = response("请求失败；code 为 HTTP 状态码，error_code 为业务错误码", registry.Schema(reflect.TypeOf(d.errorResponse), true, "ErrorResponse"))
	}
	return op
}

// queryParameters 从结构体的 query 标签生成查询参数描述
func queryParameters(registry huma.Registry, query any) []*huma.Param {
	var parameters []*huma.Param
	if query == nil {
		return nil
	}
	t := reflect.TypeOf(query)
	for i := 0; i < t.NumField(); i++ {
		field := t.Field(i)
		if name := field.Tag.Get("query"); name != "" {
			parameters = append(parameters, &huma.Param{Name: name, In: "query", Schema: huma.SchemaFromField(registry, field, field.Name)})
		}
	}
	return parameters
}

func response(description string, schema *huma.Schema) *huma.Response {
	return &huma.Response{
		Description: description,
		Content: map[string]*huma.MediaType{
			"application/json": {Schema: schema},
		},
	}
}

func ptr[T any](value T) *T { return &value }

func operationID(method, path string) string {
	return strings.ToLower(method) + "_" + strings.NewReplacer("/", "_", "{", "", "}", "").Replace(path)
}
