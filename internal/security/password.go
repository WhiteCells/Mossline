// security 提供账号安全规则
package security

import "errors"

// ValidatePassword 要求密码为 8 至 72 字节，且包含 ASCII 字母和数字
func ValidatePassword(password string) error {
	if len(password) < 8 || len(password) > 72 {
		return errors.New("password must be 8 to 72 characters")
	}
	var letter, number bool
	for _, r := range password {
		switch {
		case r >= '0' && r <= '9':
			number = true
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z':
			letter = true
		}
	}
	if !letter || !number {
		return errors.New("password must contain a letter and a number")
	}
	return nil
}
