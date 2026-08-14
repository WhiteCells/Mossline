package user

type User struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type GetUserInput struct {
	ID int `path:"id"`
}
