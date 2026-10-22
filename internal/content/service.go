package content

import "database/sql"

// Service 提供公开站点与管理端共用的内容业务操作
type Service struct {
	db *sql.DB
}

func NewService(db *sql.DB) *Service {
	return &Service{db: db}
}
