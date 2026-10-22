package content

import (
	"github.com/gin-gonic/gin"

	"mossline/internal/httpx"
)

func (h *Handler) ListCategories(c *gin.Context) {
	opt := listOptions(c)
	items, total, err := h.service.ListCategories(c.Request.Context(), opt)
	if err != nil {
		fail(c, err)
		return
	}
	httpx.Success(c, CategoryPage{Items: items, Pagination: httpx.NewPagination(opt.Page, opt.Size, total)})
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
	httpx.Success(c, item)
}

func (h *Handler) SaveCategory(c *gin.Context) {
	var input ResourceInput
	if !httpx.BindJSON(c, &input) {
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
		httpx.Created(c, item)
	} else {
		httpx.Success(c, item)
	}
}

func (h *Handler) CategoryStatus(c *gin.Context) {
	id, ok := resourceID(c)
	if !ok {
		return
	}
	var input ActivateRequest
	if !httpx.BindJSON(c, &input) {
		return
	}
	item, err := h.service.SetCategoryStatus(c.Request.Context(), id, input.Activate)
	if err != nil {
		fail(c, err)
		return
	}
	httpx.Success(c, item)
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
	httpx.Success(c, gin.H{})
}
