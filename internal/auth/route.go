package auth

import (
	"database/sql"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

// RegisterRoutes mounts authentication endpoints below an /api router group.
func RegisterRoutes(api *gin.RouterGroup, db *sql.DB) {
	handler := NewHandler(NewService(db))
	api.POST("/login", loginLimiter(), handler.Login)
	api.POST("/logout", handler.Logout)
	api.GET("/me", Middleware(db), handler.Me)
}

type attemptBucket struct {
	count int
	reset time.Time
}

// loginLimiter intentionally keys by client address only and keeps a small,
// bounded in-memory window. Distributed deployments can replace it with a
// Redis-backed middleware without changing the handler or authentication API.
func loginLimiter() gin.HandlerFunc {
	var mu sync.Mutex
	buckets := map[string]attemptBucket{}
	return func(c *gin.Context) {
		now := time.Now()
		key := c.ClientIP()
		mu.Lock()
		bucket := buckets[key]
		if now.After(bucket.reset) {
			bucket = attemptBucket{}
		}
		blocked := bucket.count >= 20
		mu.Unlock()
		if blocked {
			Failure(c, 429, "TOO_MANY_ATTEMPTS", "登录尝试过于频繁，请稍后再试", nil)
			c.Abort()
			return
		}
		c.Next()
		mu.Lock()
		if c.Writer.Status() == 401 {
			bucket = buckets[key]
			if now.After(bucket.reset) {
				bucket = attemptBucket{reset: now.Add(5 * time.Minute)}
			}
			bucket.count++
			buckets[key] = bucket
		} else if c.Writer.Status() < 400 {
			delete(buckets, key)
		}
		if len(buckets) > 2048 {
			for ip, item := range buckets {
				if now.After(item.reset) {
					delete(buckets, ip)
				}
			}
		}
		mu.Unlock()
	}
}
