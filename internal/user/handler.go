package user

import (
	"context"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

func (h *Handler) GetUser(ctx context.Context, input *GetUserInput) (*User, error) {
	return h.service.GetUser(ctx, input.ID)
}
