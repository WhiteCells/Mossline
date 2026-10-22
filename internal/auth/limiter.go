package auth

import (
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"mossline/internal/httpx"
)

type attemptBucket struct {
	count int
	reset time.Time
}

// loginLimiter 按客户端 IP 统计五分钟内的登录失败次数，达到二十次后拒绝请求
// 计数仅保存在当前进程内，多实例部署需要共享限流存储
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
			httpx.Failure(c, 429, "TOO_MANY_ATTEMPTS", "登录尝试过于频繁，请稍后再试", nil)
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
