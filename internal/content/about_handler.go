package content

import (
	"github.com/gin-gonic/gin"

	"mossline/internal/auth"
	"mossline/internal/httpx"
)

func (h *Handler) GetAbout(c *gin.Context) {
	item, err := h.service.GetAbout(c.Request.Context(), isAdminRequest(c))
	if err != nil {
		fail(c, err)
		return
	}
	httpx.Success(c, item)
}

func (h *Handler) SaveAbout(c *gin.Context) {
	var input AboutInput
	if !httpx.BindJSON(c, &input) {
		return
	}
	user, _ := auth.CurrentUser(c)
	item, err := h.service.SaveAbout(c.Request.Context(), user.ID, input)
	if err != nil {
		fail(c, err)
		return
	}
	httpx.Success(c, item)
}
