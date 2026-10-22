package attachment

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"mossline/internal/auth"
	"mossline/internal/httpx"
)

type Handler struct{ service *Service }

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func attachmentID(c *gin.Context) (uint64, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		httpx.Failure(c, http.StatusBadRequest, "INVALID_ID", "附件 ID 不正确", nil)
		return 0, false
	}
	return id, true
}

func fail(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrNotFound):
		httpx.Failure(c, 404, "NOT_FOUND", "附件不存在", nil)
	case errors.Is(err, ErrReferenced):
		httpx.Failure(c, 409, "ATTACHMENT_REFERENCED", "附件仍被内容引用，不能删除", nil)
	case errors.Is(err, ErrInvalid):
		httpx.Failure(c, 400, "INVALID_ATTACHMENT", "文件为空、过大或类型不受支持", nil)
	default:
		httpx.Failure(c, 500, "INTERNAL_ERROR", "附件操作失败", nil)
	}
}

func (h *Handler) List(c *gin.Context) {
	page, size := httpx.ParsePagination(c)
	items, total, err := h.service.List(c.Request.Context(), ListOptions{Page: page, Size: size, Search: strings.TrimSpace(c.Query("search")), Type: c.Query("type"), Referenced: c.Query("referenced"), DateFrom: c.Query("date_from"), DateTo: c.Query("date_to"), Sort: c.Query("sort"), Order: c.Query("order")})
	if err != nil {
		fail(c, err)
		return
	}
	httpx.Success(c, AttachmentPage{Items: items, Pagination: httpx.NewPagination(page, size, total)})
}

func (h *Handler) Get(c *gin.Context) {
	id, ok := attachmentID(c)
	if !ok {
		return
	}
	item, err := h.service.Get(c.Request.Context(), id)
	if err != nil {
		fail(c, err)
		return
	}
	httpx.Success(c, item)
}

func (h *Handler) Upload(c *gin.Context) {
	user, ok := auth.CurrentUser(c)
	if !ok {
		httpx.Failure(c, 401, "UNAUTHORIZED", "请先登录", nil)
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, h.service.storage.MaxUploadBytes+(1<<20))
	file, err := c.FormFile("file")
	if err != nil {
		fail(c, ErrInvalid)
		return
	}
	item, err := h.service.Upload(c.Request.Context(), user.ID, file, c.PostForm("filename"), c.PostForm("relation_type"), c.PostForm("relation_id"), c.PostForm("relation_key"))
	if err != nil {
		fail(c, err)
		return
	}
	httpx.Created(c, item)
}

func (h *Handler) Rename(c *gin.Context) {
	id, ok := attachmentID(c)
	if !ok {
		return
	}
	var req RenameRequest
	if !httpx.BindJSON(c, &req) {
		return
	}
	item, err := h.service.Rename(c.Request.Context(), id, req.Name)
	if err != nil {
		fail(c, err)
		return
	}
	httpx.Success(c, item)
}

func (h *Handler) Delete(c *gin.Context) {
	id, ok := attachmentID(c)
	if !ok {
		return
	}
	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		fail(c, err)
		return
	}
	httpx.Success(c, gin.H{})
}

func (h *Handler) DeleteBatch(c *gin.Context) {
	var req httpx.BatchIDsRequest
	if !httpx.BindJSON(c, &req) {
		return
	}
	if len(req.IDs) == 0 || len(req.IDs) > 200 {
		httpx.Failure(c, 400, "INVALID_IDS", "请选择 1 至 200 个附件", nil)
		return
	}
	if err := h.service.DeleteBatch(c.Request.Context(), req.IDs); err != nil {
		fail(c, err)
		return
	}
	httpx.Success(c, gin.H{})
}
