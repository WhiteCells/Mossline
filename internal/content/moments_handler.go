package content

import (
	"github.com/gin-gonic/gin"

	"mossline/internal/auth"
	"mossline/internal/httpx"
)

func (h *Handler) ListMoments(c *gin.Context) {
	opt := listOptions(c)
	items, total, err := h.service.ListMoments(c.Request.Context(), opt)
	if err != nil {
		fail(c, err)
		return
	}
	httpx.Success(c, MomentPage{Items: items, Pagination: httpx.NewPagination(opt.Page, opt.Size, total)})
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
	httpx.Success(c, item)
}

func (h *Handler) SaveMoment(c *gin.Context) {
	var input MomentInput
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
	user, _ := auth.CurrentUser(c)
	item, err := h.service.SaveMoment(c.Request.Context(), id, user.ID, input)
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

func (h *Handler) MomentStatus(c *gin.Context) {
	id, ok := resourceID(c)
	if !ok {
		return
	}
	var input StatusRequest
	if !httpx.BindJSON(c, &input) {
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
	httpx.Success(c, item)
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
	httpx.Success(c, gin.H{})
}
