package content

import (
	"github.com/gin-gonic/gin"

	"mossline/internal/httpx"
)

func (h *Handler) ListTags(c *gin.Context) {
	opt := listOptions(c)
	items, total, err := h.service.ListTags(c.Request.Context(), opt)
	if err != nil {
		fail(c, err)
		return
	}
	httpx.Success(c, TagPage{Items: items, Pagination: httpx.NewPagination(opt.Page, opt.Size, total)})
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
	httpx.Success(c, item)
}

func (h *Handler) SaveTag(c *gin.Context) {
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
	item, err := h.service.SaveTag(c.Request.Context(), id, input)
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

func (h *Handler) TagStatus(c *gin.Context) {
	id, ok := resourceID(c)
	if !ok {
		return
	}
	var input ActivateRequest
	if !httpx.BindJSON(c, &input) {
		return
	}
	item, err := h.service.SetTagStatus(c.Request.Context(), id, input.Activate)
	if err != nil {
		fail(c, err)
		return
	}
	httpx.Success(c, item)
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
	httpx.Success(c, gin.H{})
}
