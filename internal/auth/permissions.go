package auth

func permissionsForRole(role string) []string {
	switch role {
	case "admin":
		return []string{"*"}
	case "editor":
		return []string{"content:read", "content:write", "attachment:write"}
	default:
		return []string{"content:read"}
	}
}

func decorateUser(user *User) {
	user.Roles = []string{user.Role}
	user.Permissions = permissionsForRole(user.Role)
}
