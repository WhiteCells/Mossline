package user

import "context"

type Service struct{}

func NewService() *Service {
	return &Service{}
}

func (s *Service) GetUser(ctx context.Context, id int) (*User, error) {
	return &User{
		ID:   id,
		Name: "Tom",
	}, nil
}
