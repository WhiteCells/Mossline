package content

import (
	"github.com/gin-gonic/gin"

	"mossline/internal/auth"
	"mossline/internal/httpx"
)

func (h *Handler) ListPosts(c *gin.Context) {
	opt := listOptions(c)
	items, total, err := h.service.ListPosts(c.Request.Context(), opt)
	if err != nil {
		fail(c, err)
		return
	}
	httpx.Success(c, PostPage{Items: items, Pagination: httpx.NewPagination(opt.Page, opt.Size, total)})
}

func (h *Handler) GetPost(c *gin.Context) {
	item, err := h.service.GetPost(c.Request.Context(), c.Param("identifier"), isAdminRequest(c))
	if err != nil {
		fail(c, err)
		return
	}
	httpx.Success(c, item)
}

func (h *Handler) SavePost(c *gin.Context) {
	var input PostInput
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
	item, err := h.service.SavePost(c.Request.Context(), id, user.ID, input)
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

func (h *Handler) PostStatus(c *gin.Context) {
	var input PostStatusRequest
	if !httpx.BindJSON(c, &input) {
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
	httpx.Success(c, gin.H{})
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
	httpx.Success(c, gin.H{})
}
