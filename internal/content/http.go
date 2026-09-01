package content

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"

	"mossline/internal/auth"
)

type Handler struct{ service *Service }

func NewHandler(service *Service) *Handler { return &Handler{service: service} }

func isAdminRequest(c *gin.Context) bool {
	user, ok := auth.CurrentUser(c)
	return ok && (user.Role == "admin" || user.Role == "editor")
}
func resourceID(c *gin.Context) (uint64, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil || id == 0 {
		auth.Failure(c, 400, "INVALID_ID", "资源 ID 不正确", nil)
		return 0, false
	}
	return id, true
}
func listOptions(c *gin.Context) ListOptions {
	page, size := auth.ParsePagination(c)
	return ListOptions{Page: page, Size: size, Search: strings.TrimSpace(c.Query("search")), Status: strings.TrimSpace(c.Query("status")), Sort: c.Query("sort"), Order: c.Query("order"), Category: strings.TrimSpace(c.Query("category")), Tag: strings.TrimSpace(c.Query("tag")), DateFrom: c.Query("date_from"), DateTo: c.Query("date_to"), Admin: isAdminRequest(c)}
}
func fail(c *gin.Context, err error) {
	switch {
	case errors.Is(err, ErrInvalid):
		auth.Failure(c, 422, "VALIDATION_FAILED", "请检查请求参数", map[string][]string{"body": {"字段格式、状态或关联资源不正确"}})
	case errors.Is(err, ErrNotFound):
		auth.Failure(c, 404, "NOT_FOUND", "资源不存在", nil)
	case errors.Is(err, ErrConflict):
		auth.Failure(c, 409, "CONFLICT", "名称或标识已存在", nil)
	case errors.Is(err, ErrReferenced):
		auth.Failure(c, 409, "RESOURCE_REFERENCED", "资源仍被内容引用，不能删除", nil)
	default:
		auth.Failure(c, 500, "INTERNAL_ERROR", "服务暂时无法完成请求", nil)
	}
}
func idsFromRequest(c *gin.Context) ([]uint64, bool) {
	var input struct {
		IDs []any `json:"ids"`
	}
	if !auth.BindJSON(c, &input) {
		return nil, false
	}
	ids, err := parseIDs(input.IDs)
	if err != nil || len(ids) == 0 {
		fail(c, ErrInvalid)
		return nil, false
	}
	return ids, true
}
func singleOrBatch(c *gin.Context) ([]uint64, bool) {
	if c.Param("id") != "" {
		id, ok := resourceID(c)
		return []uint64{id}, ok
	}
	return idsFromRequest(c)
}
func (h *Handler) ListCategories(c *gin.Context) {
	opt := listOptions(c)
	items, total, err := h.service.ListCategories(c.Request.Context(), opt)
	if err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, gin.H{"items": items, "pagination": auth.NewPagination(opt.Page, opt.Size, total)})
}
func (h *Handler) GetCategory(c *gin.Context) {
	id, ok := resourceID(c)
	if !ok {
		return
	}
	item, err := h.service.GetCategory(c.Request.Context(), id, isAdminRequest(c))
	if err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, item)
}
func (h *Handler) SaveCategory(c *gin.Context) {
	var input ResourceInput
	if !auth.BindJSON(c, &input) {
		return
	}
	id := uint64(0)
	if c.Param("id") != "" {
		var ok bool
		id, ok = resourceID(c)
		if !ok {
			return
		}
	}
	item, err := h.service.SaveCategory(c.Request.Context(), id, input)
	if err != nil {
		fail(c, err)
		return
	}
	if id == 0 {
		auth.Created(c, item)
	} else {
		auth.Success(c, item)
	}
}
func (h *Handler) CategoryStatus(c *gin.Context) {
	id, ok := resourceID(c)
	if !ok {
		return
	}
	var input struct {
		Activate bool `json:"activate"`
	}
	if !auth.BindJSON(c, &input) {
		return
	}
	item, err := h.service.SetCategoryStatus(c.Request.Context(), id, input.Activate)
	if err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, item)
}
func (h *Handler) DeleteCategories(c *gin.Context) {
	ids, ok := singleOrBatch(c)
	if !ok {
		return
	}
	if err := h.service.DeleteCategories(c.Request.Context(), ids); err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, gin.H{})
}

func (h *Handler) ListTags(c *gin.Context) {
	opt := listOptions(c)
	items, total, err := h.service.ListTags(c.Request.Context(), opt)
	if err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, gin.H{"items": items, "pagination": auth.NewPagination(opt.Page, opt.Size, total)})
}
func (h *Handler) GetTag(c *gin.Context) {
	id, ok := resourceID(c)
	if !ok {
		return
	}
	item, err := h.service.GetTag(c.Request.Context(), id, isAdminRequest(c))
	if err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, item)
}
func (h *Handler) SaveTag(c *gin.Context) {
	var input ResourceInput
	if !auth.BindJSON(c, &input) {
		return
	}
	id := uint64(0)
	if c.Param("id") != "" {
		var ok bool
		id, ok = resourceID(c)
		if !ok {
			return
		}
	}
	item, err := h.service.SaveTag(c.Request.Context(), id, input)
	if err != nil {
		fail(c, err)
		return
	}
	if id == 0 {
		auth.Created(c, item)
	} else {
		auth.Success(c, item)
	}
}
func (h *Handler) TagStatus(c *gin.Context) {
	id, ok := resourceID(c)
	if !ok {
		return
	}
	var input struct {
		Activate bool `json:"activate"`
	}
	if !auth.BindJSON(c, &input) {
		return
	}
	item, err := h.service.SetTagStatus(c.Request.Context(), id, input.Activate)
	if err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, item)
}
func (h *Handler) DeleteTags(c *gin.Context) {
	ids, ok := singleOrBatch(c)
	if !ok {
		return
	}
	if err := h.service.DeleteTags(c.Request.Context(), ids); err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, gin.H{})
}

func (h *Handler) ListFriends(c *gin.Context) {
	opt := listOptions(c)
	items, total, err := h.service.ListFriends(c.Request.Context(), opt)
	if err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, gin.H{"items": items, "pagination": auth.NewPagination(opt.Page, opt.Size, total)})
}
func (h *Handler) GetFriend(c *gin.Context) {
	id, ok := resourceID(c)
	if !ok {
		return
	}
	item, err := h.service.GetFriend(c.Request.Context(), id, isAdminRequest(c))
	if err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, item)
}
func (h *Handler) SaveFriend(c *gin.Context) {
	var input ResourceInput
	if !auth.BindJSON(c, &input) {
		return
	}
	id := uint64(0)
	if c.Param("id") != "" {
		var ok bool
		id, ok = resourceID(c)
		if !ok {
			return
		}
	}
	item, err := h.service.SaveFriend(c.Request.Context(), id, input)
	if err != nil {
		fail(c, err)
		return
	}
	if id == 0 {
		auth.Created(c, item)
	} else {
		auth.Success(c, item)
	}
}
func (h *Handler) FriendStatus(c *gin.Context) {
	id, ok := resourceID(c)
	if !ok {
		return
	}
	var input struct {
		Activate bool `json:"activate"`
	}
	if !auth.BindJSON(c, &input) {
		return
	}
	item, err := h.service.SetFriendStatus(c.Request.Context(), id, input.Activate)
	if err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, item)
}
func (h *Handler) DeleteFriends(c *gin.Context) {
	ids, ok := singleOrBatch(c)
	if !ok {
		return
	}
	if err := h.service.DeleteFriends(c.Request.Context(), ids); err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, gin.H{})
}

func (h *Handler) ListPosts(c *gin.Context) {
	opt := listOptions(c)
	items, total, err := h.service.ListPosts(c.Request.Context(), opt)
	if err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, gin.H{"items": items, "pagination": auth.NewPagination(opt.Page, opt.Size, total)})
}
func (h *Handler) GetPost(c *gin.Context) {
	item, err := h.service.GetPost(c.Request.Context(), c.Param("identifier"), isAdminRequest(c))
	if err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, item)
}
func (h *Handler) SavePost(c *gin.Context) {
	var input PostInput
	if !auth.BindJSON(c, &input) {
		return
	}
	id := uint64(0)
	if c.Param("id") != "" {
		var ok bool
		id, ok = resourceID(c)
		if !ok {
			return
		}
	}
	user, _ := auth.CurrentUser(c)
	item, err := h.service.SavePost(c.Request.Context(), id, user.ID, input)
	if err != nil {
		fail(c, err)
		return
	}
	if id == 0 {
		auth.Created(c, item)
	} else {
		auth.Success(c, item)
	}
}
func (h *Handler) PostStatus(c *gin.Context) {
	var input struct {
		IDs    []any  `json:"ids"`
		Status string `json:"status"`
	}
	if !auth.BindJSON(c, &input) {
		return
	}
	ids, err := parseIDs(input.IDs)
	if err != nil {
		fail(c, err)
		return
	}
	if err = h.service.SetPostStatus(c.Request.Context(), ids, input.Status); err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, gin.H{})
}
func (h *Handler) DeletePosts(c *gin.Context) {
	ids, ok := singleOrBatch(c)
	if !ok {
		return
	}
	if err := h.service.DeletePosts(c.Request.Context(), ids); err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, gin.H{})
}

func (h *Handler) ListMoments(c *gin.Context) {
	opt := listOptions(c)
	items, total, err := h.service.ListMoments(c.Request.Context(), opt)
	if err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, gin.H{"items": items, "pagination": auth.NewPagination(opt.Page, opt.Size, total)})
}
func (h *Handler) GetMoment(c *gin.Context) {
	id, ok := resourceID(c)
	if !ok {
		return
	}
	item, err := h.service.GetMoment(c.Request.Context(), id, isAdminRequest(c))
	if err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, item)
}
func (h *Handler) SaveMoment(c *gin.Context) {
	var input MomentInput
	if !auth.BindJSON(c, &input) {
		return
	}
	id := uint64(0)
	if c.Param("id") != "" {
		var ok bool
		id, ok = resourceID(c)
		if !ok {
			return
		}
	}
	user, _ := auth.CurrentUser(c)
	item, err := h.service.SaveMoment(c.Request.Context(), id, user.ID, input)
	if err != nil {
		fail(c, err)
		return
	}
	if id == 0 {
		auth.Created(c, item)
	} else {
		auth.Success(c, item)
	}
}
func (h *Handler) MomentStatus(c *gin.Context) {
	id, ok := resourceID(c)
	if !ok {
		return
	}
	var input struct {
		Status string `json:"status"`
	}
	if !auth.BindJSON(c, &input) {
		return
	}
	if err := h.service.SetMomentStatus(c.Request.Context(), []uint64{id}, input.Status); err != nil {
		fail(c, err)
		return
	}
	item, err := h.service.GetMoment(c.Request.Context(), id, true)
	if err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, item)
}
func (h *Handler) DeleteMoments(c *gin.Context) {
	ids, ok := singleOrBatch(c)
	if !ok {
		return
	}
	if err := h.service.DeleteMoments(c.Request.Context(), ids); err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, gin.H{})
}

func (h *Handler) GetAbout(c *gin.Context) {
	item, err := h.service.GetAbout(c.Request.Context(), isAdminRequest(c))
	if err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, item)
}
func (h *Handler) SaveAbout(c *gin.Context) {
	var input AboutInput
	if !auth.BindJSON(c, &input) {
		return
	}
	user, _ := auth.CurrentUser(c)
	item, err := h.service.SaveAbout(c.Request.Context(), user.ID, input)
	if err != nil {
		fail(c, err)
		return
	}
	auth.Success(c, item)
}

func MethodNotAllowed(c *gin.Context) {
	auth.Failure(c, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "请求方法不受支持", nil)
}
